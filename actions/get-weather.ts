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
}

export async function getWeather(city: string): Promise<WeatherData | { error: string }> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return { error: "Weather API key not configured" };
  }

  if (!city.trim()) {
    return { error: "Please enter a city name" };
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    );

    const data = await res.json();

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
    };
  } catch {
    return { error: "Failed to fetch weather data" };
  }
}
