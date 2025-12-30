"use server";

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
}

export async function getWeather(city: string): Promise<WeatherData | { error: string }> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return { error: "Weather API key not configured" };
  }

  if (!city.trim()) {
    return { error: "Please enter a city name" };
  }

  // Clean up input
  const input = city.trim();

  // Detect if it's a US zip code (5 digits)
  const isZipCode = /^\d{5}$/.test(input);

  let url: string;
  if (isZipCode) {
    // Use zip code endpoint
    url = `https://api.openweathermap.org/data/2.5/weather?zip=${input},US&appid=${apiKey}&units=metric`;
  } else {
    // City name - clean up and handle state abbreviations
    let query = input.replace(/\s*,\s*/g, ","); // Remove spaces around commas
    const parts = query.split(",");
    if (parts.length === 2 && parts[1].length === 2) {
      query = `${query},US`;
    }
    url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric`;
  }

  try {
    console.log("Fetching weather from:", url.replace(apiKey!, "API_KEY"));

    const res = await fetch(url);
    const data = await res.json();

    console.log("API Response:", JSON.stringify(data).substring(0, 200));

    if (data.cod != 200) {
      return { error: data.message || "City not found" };
    }

    return {
      city: data.name,
      temp: Math.round(data.main.temp),
      tempF: Math.round((data.main.temp * 9/5) + 32),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
      windSpeedMph: Math.round(data.wind.speed * 2.237), // m/s to mph
      windGustMph: data.wind.gust ? Math.round(data.wind.gust * 2.237) : null, // m/s to mph
    };
  } catch (e) {
    return { error: "Failed to fetch weather data" };
  }
}
