"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
import { Clock, MapPin, AlertTriangle, CheckCircle, Timer, Coffee, BedDouble, Truck, PackageCheck, Calendar } from "lucide-react";

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
    // Time Activity Projections
    departureDateTime: Date;
    driveLimit: Date;       // departure + 11 hours
    breakDue: Date;         // departure + 8 hours
    canDriveAgain: Date;    // drive limit + 10 hours
    securementChecks: Date[];
    // Multi-Day Schedule
    daySchedule: { day: number; driveStart: Date; driveEnd: Date; restEnd: Date; isArrivalDay: boolean }[];
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

        // If arrival is on Sunday, push to Monday at delivery open time (PODs closed Sundays)
        if (currentTime.getDay() === 0) {
            currentTime.setDate(currentTime.getDate() + 1); // Move to Monday
            const [openHour, openMinute] = deliveryOpen.split(":").map(Number);
            currentTime.setHours(openHour, openMinute, 0, 0);
        }

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

        // Calculate Time Activity Projections
        const departureDateTime = new Date(`${departureDate}T${departureTime}`);
        const driveLimit = new Date(departureDateTime.getTime() + 11 * 60 * 60 * 1000);  // +11 hours
        const breakDue = new Date(departureDateTime.getTime() + 8 * 60 * 60 * 1000);     // +8 hours
        const canDriveAgain = new Date(driveLimit.getTime() + 10 * 60 * 60 * 1000);      // drive limit + 10 hour rest

        // Calculate securement checks: first at 50min, then every 2h 50m (within 11-hour drive window only)
        const securementChecks: Date[] = [];
        const firstCheckInterval = 50 * 60 * 1000; // 50 minutes in ms
        const subsequentInterval = (2 * 60 + 50) * 60 * 1000; // 2h 50m in ms

        // First check at 50 minutes (only within 11-hour drive limit)
        let checkTime = new Date(departureDateTime.getTime() + firstCheckInterval);
        if (checkTime < driveLimit) {
            securementChecks.push(new Date(checkTime));
            // Subsequent checks every 2h 50m
            checkTime = new Date(checkTime.getTime() + subsequentInterval);
            while (checkTime < driveLimit) {
                securementChecks.push(new Date(checkTime));
                checkTime = new Date(checkTime.getTime() + subsequentInterval);
            }
        }

        // Calculate Multi-Day Schedule (11h drive, 10h rest cycles until arrival)
        const daySchedule: { day: number; driveStart: Date; driveEnd: Date; restEnd: Date; isArrivalDay: boolean }[] = [];
        let dayNum = 1;
        let dayDriveStart = new Date(departureDateTime);

        while (dayDriveStart < currentTime) {
            const dayDriveEnd = new Date(dayDriveStart.getTime() + 11 * 60 * 60 * 1000); // +11 hours
            const dayRestEnd = new Date(dayDriveEnd.getTime() + 10 * 60 * 60 * 1000);    // +10 hours rest

            // Check if arrival happens during this driving window
            const isArrivalDay = currentTime <= dayDriveEnd;

            daySchedule.push({
                day: dayNum,
                driveStart: new Date(dayDriveStart),
                driveEnd: isArrivalDay ? new Date(currentTime) : new Date(dayDriveEnd),
                restEnd: new Date(dayRestEnd),
                isArrivalDay
            });

            if (isArrivalDay) break;

            // Next day starts after rest
            dayDriveStart = new Date(dayRestEnd);
            dayNum++;
        }

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
            departureDateTime,
            driveLimit,
            breakDue,
            canDriveAgain,
            securementChecks,
            daySchedule,
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

                    {/* Time Activity Projections */}
                    <Card className="p-6 bg-purple-50 border-purple-300">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-purple-800">
                            <Timer className="h-5 w-5" />
                            Time Activity
                        </h3>
                        <div className="space-y-4">
                            {/* From Departure */}
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">From Your Departure</p>
                                <div className="flex items-center justify-between py-2 border-b border-purple-200">
                                    <div className="flex items-center gap-2">
                                        <Coffee className="h-4 w-4 text-orange-500" />
                                        <span className="text-sm text-gray-700">30-min Break Due</span>
                                    </div>
                                    <span className="font-semibold text-orange-600">
                                        {formatDate(result.breakDue, originTimezone)} {formatTime(result.breakDue, originTimezone)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-purple-200">
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-red-500" />
                                        <span className="text-sm text-gray-700">11-Hour Drive Limit</span>
                                    </div>
                                    <span className="font-semibold text-red-600">
                                        {formatDate(result.driveLimit, originTimezone)} {formatTime(result.driveLimit, originTimezone)}
                                    </span>
                                </div>
                            </div>

                            {/* Securement Checks */}
                            {result.securementChecks.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Securement Checks (50min, then 2h 50m)</p>
                                    {result.securementChecks.map((checkTime, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-2 border-b border-purple-200 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <PackageCheck className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm text-gray-700">Check #{idx + 1}</span>
                                            </div>
                                            <span className="font-semibold text-blue-600">
                                                {formatTime(checkTime, originTimezone)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* From Arrival */}
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">After Your Arrival</p>
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-2">
                                        <BedDouble className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-gray-700">Can Drive Again</span>
                                    </div>
                                    <span className="font-semibold text-green-600">
                                        {formatDate(result.canDriveAgain, destTimezone)} {formatTime(result.canDriveAgain, destTimezone)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Multi-Day Trip Schedule */}
                    {result.daySchedule.length > 0 && (
                        <Card className="p-6 bg-amber-50 border-amber-300">
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-amber-800">
                                <Calendar className="h-5 w-5" />
                                Trip Schedule
                            </h3>
                            <div className="space-y-3">
                                {result.daySchedule.map((day) => (
                                    <div key={day.day} className={`p-3 rounded-lg ${day.isArrivalDay ? 'bg-green-100 border border-green-300' : 'bg-white border border-amber-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-amber-800">{formatDate(day.driveStart, originTimezone)}</span>
                                            {day.isArrivalDay && (
                                                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">Arrival</span>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 flex items-center gap-1">
                                                    <Truck className="h-3 w-3" /> Drive
                                                </span>
                                                <span className="font-medium">
                                                    {formatTime(day.driveStart, originTimezone)} - {formatTime(day.driveEnd, originTimezone)}
                                                </span>
                                            </div>
                                            {!day.isArrivalDay && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 flex items-center gap-1">
                                                        <BedDouble className="h-3 w-3" /> Rest Until
                                                    </span>
                                                    <span className="font-medium">
                                                        {formatDate(day.restEnd, originTimezone)} {formatTime(day.restEnd, originTimezone)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

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

                </div>
            )}
        </div>
    );
}
