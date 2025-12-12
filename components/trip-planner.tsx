"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
import { Clock, MapPin, AlertTriangle, CheckCircle } from "lucide-react";

interface TripResult {
    arrivalTime: Date;
    totalHours: number;
    driveHours: number;
    breakMinutes: number;
    restHours: number;
    bufferHours: number;
    breaks: { time: Date; type: string; duration: number }[];
    isLate: boolean;
    latestDeparture?: Date;
}

export function TripPlanner() {
    const [distance, setDistance] = useState("");
    const [departureDate, setDepartureDate] = useState("");
    const [departureTime, setDepartureTime] = useState("");
    const [deliveryOpen, setDeliveryOpen] = useState("06:00");
    const [deliveryClose, setDeliveryClose] = useState("15:00");
    const [loadingTime, setLoadingTime] = useState("1");
    const [originTimezone, setOriginTimezone] = useState("America/New_York");
    const [destTimezone, setDestTimezone] = useState("America/New_York");
    const [result, setResult] = useState<TripResult | null>(null);

    const timezones = [
        { value: "America/New_York", label: "Eastern (ET)" },
        { value: "America/Chicago", label: "Central (CT)" },
        { value: "America/Denver", label: "Mountain (MT)" },
        { value: "America/Los_Angeles", label: "Pacific (PT)" },
    ];

    const calculateTrip = () => {
        const missing = [];
        if (!distance) missing.push("Distance");
        if (!departureDate) missing.push("Departure Date");
        if (!departureTime) missing.push("Departure Time");

        if (missing.length > 0) {
            alert(`Please fill in: ${missing.join(", ")}`);
            return;
        }

        const miles = parseFloat(distance);
        const avgSpeed = 50; // mph
        const baseDriveHours = miles / avgSpeed;

        // Calculate HOS breaks
        let totalDriveTime = 0;
        let breakTime = 0;
        let restTime = 0;
        const breaks: { time: Date; type: string; duration: number }[] = [];

        let currentTime = new Date(`${departureDate}T${departureTime}`);
        let remainingDrive = baseDriveHours;
        let driveSinceBreak = 0;
        let driveSinceRest = 0;

        while (remainingDrive > 0) {
            // 30-min break after 8 hours
            if (driveSinceBreak >= 8) {
                currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
                breaks.push({ time: new Date(currentTime), type: "30-min Break", duration: 30 });
                breakTime += 0.5;
                driveSinceBreak = 0;
            }

            // 10-hour rest after 11 hours
            if (driveSinceRest >= 11) {
                currentTime = new Date(currentTime.getTime() + 10 * 60 * 60 * 1000);
                breaks.push({ time: new Date(currentTime), type: "10-hour Rest", duration: 600 });
                restTime += 10;
                driveSinceRest = 0;
                driveSinceBreak = 0;
            }

            // Drive for 1 hour increments
            const driveChunk = Math.min(1, remainingDrive);
            currentTime = new Date(currentTime.getTime() + driveChunk * 60 * 60 * 1000);
            totalDriveTime += driveChunk;
            driveSinceBreak += driveChunk;
            driveSinceRest += driveChunk;
            remainingDrive -= driveChunk;
        }

        // Add loading/unloading time
        const loadTime = parseFloat(loadingTime);
        currentTime = new Date(currentTime.getTime() + loadTime * 60 * 60 * 1000);

        // Add 10% buffer for traffic/weather
        const bufferTime = baseDriveHours * 0.1;
        currentTime = new Date(currentTime.getTime() + bufferTime * 60 * 60 * 1000);

        // Check if arrival is after delivery close time
        const deliveryCloseDateTime = new Date(`${departureDate}T${deliveryClose}`);
        // If arrival is next day or later, adjust delivery close time
        if (currentTime.getDate() > deliveryCloseDateTime.getDate()) {
            deliveryCloseDateTime.setDate(currentTime.getDate());
        }
        const isLate = currentTime > deliveryCloseDateTime;

        // Calculate latest departure time (work backwards)
        const totalTripHours = baseDriveHours + breakTime + restTime + loadTime + bufferTime;
        const latestDeparture = new Date(deliveryCloseDateTime.getTime() - totalTripHours * 60 * 60 * 1000);

        setResult({
            arrivalTime: currentTime,
            totalHours: totalTripHours,
            driveHours: baseDriveHours,
            breakMinutes: breakTime * 60,
            restHours: restTime,
            bufferHours: bufferTime + loadTime,
            breaks,
            isLate,
            latestDeparture,
        });
    };

    const formatTime = (date: Date, tz: string) => {
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: tz,
            timeZoneName: "short",
        });
    };

    const formatDate = (date: Date, tz: string) => {
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: tz,
        });
    };

    return (
        <div className="px-6 w-full pb-6">
            <Card className="p-6 border-gray-400 rounded-xl mb-4">
                <h2 className="text-xl font-bold mb-4">Trip Planner</h2>

                <div className="space-y-4">
                    {/* Distance */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Distance (miles)</label>
                        <Input
                            type="number"
                            placeholder="1200"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                        />
                    </div>

                    {/* Origin & Destination Timezones */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Origin Timezone</label>
                            <select
                                value={originTimezone}
                                onChange={(e) => setOriginTimezone(e.target.value)}
                                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm"
                            >
                                {timezones.map((tz) => (
                                    <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Destination Timezone</label>
                            <select
                                value={destTimezone}
                                onChange={(e) => setDestTimezone(e.target.value)}
                                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm"
                            >
                                {timezones.map((tz) => (
                                    <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Departure Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Departure Date</label>
                            <Input
                                type="date"
                                value={departureDate}
                                onChange={(e) => setDepartureDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <TimePicker
                                label="Departure Time"
                                value={departureTime}
                                onChange={setDepartureTime}
                            />
                        </div>
                    </div>

                    {/* Delivery Window */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <TimePicker
                                label="Delivery Opens"
                                value={deliveryOpen}
                                onChange={setDeliveryOpen}
                            />
                        </div>
                        <div>
                            <TimePicker
                                label="Delivery Closes"
                                value={deliveryClose}
                                onChange={setDeliveryClose}
                            />
                        </div>
                    </div>

                    {/* Loading Time */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Loading/Unloading Time (hours)</label>
                        <Input
                            type="number"
                            step="0.5"
                            placeholder="1"
                            value={loadingTime}
                            onChange={(e) => setLoadingTime(e.target.value)}
                        />
                    </div>

                    <Button onClick={calculateTrip} className="w-full bg-black hover:bg-gray-800 text-white">
                        Calculate Trip
                    </Button>
                </div>
            </Card>

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Arrival Status */}
                    <Card className={`p-6 border-2 ${result.isLate ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"}`}>
                        <div className="flex items-center gap-3">
                            {result.isLate ? (
                                <AlertTriangle className="h-8 w-8 text-red-600" />
                            ) : (
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            )}
                            <div>
                                <h3 className={`text-lg font-bold ${result.isLate ? "text-red-800" : "text-green-800"}`}>
                                    {result.isLate ? "⚠️ LATE ARRIVAL" : "✓ On Time"}
                                </h3>
                                <p className={`text-sm ${result.isLate ? "text-red-700" : "text-green-700"}`}>
                                    Estimated arrival: <strong>{formatDate(result.arrivalTime, destTimezone)} at {formatTime(result.arrivalTime, destTimezone)}</strong>
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Trip Summary */}
                    <Card className="p-6 border-gray-400">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Trip Summary
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Trip Time:</span>
                                <span className="font-semibold">{result.totalHours.toFixed(1)} hours</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Driving Time:</span>
                                <span className="font-semibold">{result.driveHours.toFixed(1)} hours</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Break Time:</span>
                                <span className="font-semibold">{result.breakMinutes} minutes</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Rest Time:</span>
                                <span className="font-semibold">{result.restHours} hours</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Loading + Buffer:</span>
                                <span className="font-semibold">{result.bufferHours.toFixed(1)} hours</span>
                            </div>
                        </div>
                    </Card>

                    {/* Latest Departure */}
                    {result.latestDeparture && (
                        <Card className="p-6 border-gray-400 bg-blue-50">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Latest Departure
                            </h3>
                            <p className="text-sm text-gray-700">
                                To arrive by {deliveryClose}, you must leave no later than:
                            </p>
                            <p className="text-xl font-bold mt-1">
                                {formatDate(result.latestDeparture, originTimezone)} at {formatTime(result.latestDeparture, originTimezone)}
                            </p>
                        </Card>
                    )}

                    {/* Break Schedule */}
                    {result.breaks.length > 0 && (
                        <Card className="p-6 border-gray-400">
                            <h3 className="text-lg font-bold mb-3">Break Schedule</h3>
                            <div className="space-y-2">
                                {result.breaks.map((brk, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                        <span className="font-medium">{brk.type}</span>
                                        <span className="text-sm text-gray-600">{formatTime(brk.time, destTimezone)}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
