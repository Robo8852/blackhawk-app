"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Thermometer, Wind, Droplets, Snowflake } from "lucide-react";
import { getWeather, WeatherData } from "@/actions/get-weather";

export function WeatherWizard() {
    const [city, setCity] = useState("");
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async () => {
        if (!city.trim()) return;

        setIsLoading(true);
        setError(null);

        const result = await getWeather(city);

        if ("error" in result) {
            setError(result.error);
            setWeather(null);
        } else {
            setWeather(result);
            setError(null);
        }

        setIsLoading(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <div className="px-6 w-full pb-6">
            <Card className="p-6 border-gray-400 rounded-xl mb-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Snowflake className="h-5 w-5" />
                    Weather Wizard
                </h2>

                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Enter city name..."
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="pl-10"
                        />
                    </div>
                    <Button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="bg-black hover:bg-gray-800 text-white"
                    >
                        {isLoading ? "..." : "Search"}
                    </Button>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {weather && (
                    <div className="space-y-4">
                        {/* Main weather display */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white">
                            <h3 className="text-2xl font-bold mb-1">{weather.city}</h3>
                            <p className="text-blue-100 capitalize mb-4">{weather.description}</p>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Thermometer className="h-8 w-8" />
                                    <span className="text-5xl font-bold">{weather.tempF}°F</span>
                                </div>
                                <span className="text-blue-200 text-lg">({weather.temp}°C)</span>
                            </div>
                        </div>

                        {/* Weather details */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                                <Wind className="h-6 w-6 text-gray-500" />
                                <div>
                                    <p className="text-xs text-gray-500">Wind Speed</p>
                                    <p className="font-semibold">{weather.windSpeedMph} mph</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                                <Droplets className="h-6 w-6 text-gray-500" />
                                <div>
                                    <p className="text-xs text-gray-500">Humidity</p>
                                    <p className="font-semibold">{weather.humidity}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Trucker tip */}
                        {weather.windSpeedMph > 25 && (
                            <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                                <p className="text-sm font-medium text-yellow-800">
                                    ⚠️ High winds detected. Use caution with high-profile loads.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {!weather && !error && (
                    <p className="text-center text-gray-500 py-8">
                        Enter a city to check the weather along your route.
                    </p>
                )}
            </Card>
        </div>
    );
}
