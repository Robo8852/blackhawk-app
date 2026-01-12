"use server";

export interface WeatherAlert {
  event: string;
  headline: string;
  severity: string;
  urgency: string;
}

export interface WeatherData {
  city: string;
  temp: number;
  tempF: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  windSpeedMph: number;
  windGustMph: number | null;
  visibilityMiles: number | null;
  alerts: WeatherAlert[];
}

// Geocode a location to coordinates
async function geocodeLocation(input: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const isZipCode = /^\d{5}$/.test(input);

  try {
    if (isZipCode) {
      // Use Census Bureau geocoding for zip codes
      const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${input}&benchmark=2020&format=json`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.result?.addressMatches?.[0]) {
        const match = data.result.addressMatches[0];
        return {
          lat: match.coordinates.y,
          lon: match.coordinates.x,
          name: match.matchedAddress.split(',')[0]
        };
      }
    } else {
      // Use Nominatim (OpenStreetMap) for city names
      const query = input.includes(',') ? input : `${input}, USA`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'BlackhawkTruckingApp/1.0'
        }
      });
      const data = await res.json();

      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          name: data[0].display_name.split(',')[0]
        };
      }
    }
  } catch (e) {
    console.error("Geocoding error:", e);
  }

  return null;
}

// Map NOAA weather codes to simple descriptions and icon codes
function mapNoaaWeatherToIcon(text: string): { description: string; icon: string } {
  const lower = text.toLowerCase();

  if (lower.includes('thunder')) return { description: 'thunderstorm', icon: '11d' };
  if (lower.includes('rain') || lower.includes('shower')) return { description: 'rainy', icon: '10d' };
  if (lower.includes('snow') || lower.includes('flurr')) return { description: 'snowy', icon: '13d' };
  if (lower.includes('cloud')) return { description: 'cloudy', icon: '03d' };
  if (lower.includes('clear') || lower.includes('sunny')) return { description: 'clear sky', icon: '01d' };
  if (lower.includes('fog') || lower.includes('mist')) return { description: 'foggy', icon: '50d' };
  if (lower.includes('partly')) return { description: 'partly cloudy', icon: '02d' };

  return { description: text.toLowerCase(), icon: '01d' };
}

export async function getWeather(city: string): Promise<WeatherData | { error: string }> {
  if (!city.trim()) {
    return { error: "Please enter a city name" };
  }

  try {
    // Step 1: Geocode the location
    const location = await geocodeLocation(city.trim());
    if (!location) {
      return { error: "Location not found" };
    }

    console.log("Geocoded location:", location);

    // Step 2: Get NOAA grid point
    const pointsUrl = `https://api.weather.gov/points/${location.lat.toFixed(4)},${location.lon.toFixed(4)}`;
    const pointsRes = await fetch(pointsUrl, {
      headers: {
        'User-Agent': 'BlackhawkTruckingApp/1.0'
      }
    });

    if (!pointsRes.ok) {
      return { error: "Location not supported by NOAA" };
    }

    const pointsData = await pointsRes.json();

    // Step 3: Get observation station
    const stationsUrl = pointsData.properties.observationStations;
    const stationsRes = await fetch(stationsUrl, {
      headers: {
        'User-Agent': 'BlackhawkTruckingApp/1.0'
      }
    });
    const stationsData = await stationsRes.json();

    if (!stationsData.features || stationsData.features.length === 0) {
      return { error: "No weather stations found nearby" };
    }

    // Step 4: Get latest observation from first station
    const stationId = stationsData.features[0].properties.stationIdentifier;
    const obsUrl = `https://api.weather.gov/stations/${stationId}/observations/latest`;
    const obsRes = await fetch(obsUrl, {
      headers: {
        'User-Agent': 'BlackhawkTruckingApp/1.0'
      }
    });

    if (!obsRes.ok) {
      return { error: "Failed to get current observations" };
    }

    const obsData = await obsRes.json();
    const props = obsData.properties;

    // Extract weather data
    const tempC = props.temperature.value;
    const tempF = tempC !== null ? Math.round((tempC * 9/5) + 32) : 0;
    const windSpeedMs = props.windSpeed.value || 0; // m/s
    const windGustMs = props.windGust.value; // m/s or null
    const humidity = props.relativeHumidity.value || 0;
    const weatherText = props.textDescription || "Clear";
    const visibilityMeters = props.visibility.value; // meters or null

    const { description, icon } = mapNoaaWeatherToIcon(weatherText);

    // Step 5: Get weather alerts for this location
    let alerts: WeatherAlert[] = [];
    try {
      const alertsUrl = `https://api.weather.gov/alerts/active?point=${location.lat.toFixed(4)},${location.lon.toFixed(4)}`;
      const alertsRes = await fetch(alertsUrl, {
        headers: {
          'User-Agent': 'BlackhawkTruckingApp/1.0'
        }
      });

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        alerts = alertsData.features.map((feature: any) => ({
          event: feature.properties.event,
          headline: feature.properties.headline,
          severity: feature.properties.severity,
          urgency: feature.properties.urgency
        }));
      }
    } catch (e) {
      console.log("Failed to fetch alerts, continuing without them");
    }

    return {
      city: location.name,
      temp: tempC !== null ? Math.round(tempC) : 0,
      tempF: tempF,
      description: description,
      icon: icon,
      humidity: Math.round(humidity),
      windSpeed: Math.round((windSpeedMs * 3.6)), // m/s to km/h
      windSpeedMph: Math.round(windSpeedMs * 2.237), // m/s to mph
      windGustMph: windGustMs ? Math.round(windGustMs * 2.237) : null,
      visibilityMiles: visibilityMeters ? Math.round(visibilityMeters / 1609.34) : null, // meters to miles
      alerts: alerts,
    };
  } catch (e) {
    console.error("Weather fetch error:", e);
    return { error: "Failed to fetch weather data" };
  }
}
