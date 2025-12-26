"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
import { Clock, MapPin, AlertTriangle, CheckCircle, Timer, Coffee, BedDouble, Truck, PackageCheck, Calendar, Sparkles } from "lucide-react";
import { DateTime } from "luxon";
import { generateTripSchedule } from "@/actions/generate-trip-schedule";

interface TripResult {
    arrivalTime: DateTime;
    totalHours: number;
    driveHours: number;
    breakMinutes: number;
    restHours: number;
    bufferHours: number;
    breaks: { time: DateTime; type: string; duration: number }[];
    isLate: boolean;
    latestDeparture?: DateTime;
    // Time Activity Projections
    departureDateTime: DateTime;
    driveLimit: DateTime;       // departure + 11 hours
    breakDue: DateTime;         // departure + 8 hours
    canDriveAgain: DateTime;    // drive limit + 10 hours
    securementChecks: DateTime[];
    // Multi-Day Schedule
    daySchedule: { day: number; driveStart: DateTime; driveEnd: DateTime; restEnd: DateTime; isArrivalDay: boolean }[];
}

interface AISchedule {
    summary: {
        totalDurationHours: number;
        estimatedArrival: string;
    };
    schedule: {
        day: number;
        date: string;
        activity: string;
        start: string;
        end: string;
        notes: string;
    }[];
}

export function TripPlanner() {
    const [distance, setDistance] = useState("3300");
    const [departureDate, setDepartureDate] = useState("2025-12-26");
    const [departureTime, setDepartureTime] = useState("09:00");
    const [deliveryOpen, setDeliveryOpen] = useState("06:00");
    const [deliveryClose, setDeliveryClose] = useState("15:00");
    const [loadingTime, setLoadingTime] = useState("1");
    const [originTimezone, setOriginTimezone] = useState("America/New_York");
    const [destTimezone, setDestTimezone] = useState("America/New_York");
    const [result, setResult] = useState<TripResult | null>(null);
    const [aiResult, setAiResult] = useState<AISchedule | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    const timezones = [
        { value: "America/New_York", label: "Eastern (ET)" },
        { value: "America/Chicago", label: "Central (CT)" },
        { value: "America/Denver", label: "Mountain (MT)" },
        { value: "America/Los_Angeles", label: "Pacific (PT)" },
    ];

    const safeParseFloat = (val: string) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    const handleSmartSchedule = async () => {
        const missing = [];
        if (!distance) missing.push("Distance");
        if (!departureDate) missing.push("Departure Date");
        if (!departureTime) missing.push("Departure Time");

        if (missing.length > 0) {
            alert(`Please fill in: ${missing.join(", ")}`);
            return;
        }

        setIsLoadingAI(true);
        try {
            const result = await generateTripSchedule({
                distance: safeParseFloat(distance),
                departureDate,
                departureTime,
                originTimezone,
                destTimezone,
            });
            setAiResult(result);
        } catch (error) {
            alert("Failed to generate AI schedule. Check console.");
            console.error(error);
        } finally {
            setIsLoadingAI(false);
        }
    };

    const calculateTrip = () => {
        const missing = [];
        if (!distance) missing.push("Distance");
        if (!departureDate) missing.push("Departure Date");
        if (!departureTime) missing.push("Departure Time");

        if (missing.length > 0) {
            alert(`Please fill in: ${missing.join(", ")}`);
            return;
        }

        const miles = safeParseFloat(distance);
        const avgSpeed = 50; // mph
        const totalDriveHoursRequired = miles / avgSpeed;

        // Parse Departure Time in Origin Timezone
        // input format is YYYY-MM-DD and HH:MM
        let currentTime = DateTime.fromISO(`${departureDate}T${departureTime}`, { zone: originTimezone });
        const initialDeparture = currentTime;

        // Verify valid date
        if (!currentTime.isValid) {
            alert("Invalid Date/Time entered.");
            return;
        }

        // Initialize Counters
        let remainingDriveHours = totalDriveHoursRequired;
        let totalDriveTimeAccumulated = 0;
        let totalRestTimeAccumulated = 0; // hours
        let totalBreakTimeAccumulated = 0; // minutes
        const breaks: { time: DateTime; type: string; duration: number }[] = [];

        // DOT HOS Trackers
        let driveTimeInShift = 0;      // max 11
        let onDutyTimeInShift = 0;     // max 14 (simplified: driving is on-duty)
        let driveTimeSinceBreak = 0;   // max 8

        // Multi-Day Schedule
        const daySchedule: { day: number; driveStart: DateTime; driveEnd: DateTime; restEnd: DateTime; isArrivalDay: boolean }[] = [];
        let dayNum = 1;
        let shiftStart = currentTime;

        // Simulation Loop (1-minute resolution for better accuracy, or chunked logic)
        // Optimized chunk logic:
        while (remainingDriveHours > 0) {
            // Determine max drive we can do in this state
            // Constraints:
            // 1. 8-hour break limit: (8 - driveTimeSinceBreak)
            // 2. 11-hour drive limit: (11 - driveTimeInShift)
            // 3. 14-hour window: (14 - onDutyTimeInShift) -> simplified, assumes continuous driving
            // 4. Remaining trip distance

            const distTo8 = 8 - driveTimeSinceBreak;
            const distTo11 = 11 - driveTimeInShift;
            const distTo14 = 14 - onDutyTimeInShift; // simplified

            // The constraint hitting 0 first determines the event
            const maxDriveBlock = Math.max(0, Math.min(distTo8, distTo11, distTo14, remainingDriveHours));

            // Advance time by this block
            if (maxDriveBlock > 0) {
                currentTime = currentTime.plus({ hours: maxDriveBlock });
                remainingDriveHours -= maxDriveBlock;
                driveTimeInShift += maxDriveBlock;
                onDutyTimeInShift += maxDriveBlock;
                driveTimeSinceBreak += maxDriveBlock;
                totalDriveTimeAccumulated += maxDriveBlock;
            }

            // Check what triggered the stop
            if (remainingDriveHours <= 0.01) {
                // Trip Done!
                break;
            }

            // DOT Rule Triggers
            if (Math.abs(driveTimeSinceBreak - 8) < 0.01) {
                // 30-min break required
                // BUT: if we also hit 11/14, the 10h rest overrides the 30m break usually? 
                // Actually 30m break counts against 14h window but extends 8h driving.
                // If we need a 10h rest anyway, we just take the 10h rest.

                const needs10h = (Math.abs(driveTimeInShift - 11) < 0.01) || (Math.abs(onDutyTimeInShift - 14) < 0.01);

                if (!needs10h) {
                    currentTime = currentTime.plus({ minutes: 30 });
                    breaks.push({ time: currentTime, type: "30-min Break", duration: 30 });
                    totalBreakTimeAccumulated += 30;
                    driveTimeSinceBreak = 0; // Reset 8h clock
                    onDutyTimeInShift += 0.5; // Break counts against 14h window? DOT: Off-duty break extends window? No, usually counts against 14h unless split sleeper. Simplified: counts.
                }
            }

            if (Math.abs(driveTimeInShift - 11) < 0.01 || Math.abs(onDutyTimeInShift - 14) < 0.01) {
                // 10-hour rest required (End of Shift)
                const shiftEnd = currentTime;

                // Record Day Schedule
                daySchedule.push({
                    day: dayNum,
                    driveStart: shiftStart,
                    driveEnd: shiftEnd,
                    restEnd: shiftEnd.plus({ hours: 10 }),
                    isArrivalDay: false
                });

                // Take 10h rest
                currentTime = currentTime.plus({ hours: 10 });
                breaks.push({ time: currentTime, type: "10-hour Rest (EndOfShift)", duration: 600 });
                totalRestTimeAccumulated += 10;

                // Reset Shift Clocks
                driveTimeInShift = 0;
                onDutyTimeInShift = 0;
                driveTimeSinceBreak = 0;
                shiftStart = currentTime;
                dayNum++;
            }
        }

        // Final Leg Schedule
        daySchedule.push({
            day: dayNum,
            driveStart: shiftStart,
            driveEnd: currentTime,
            restEnd: currentTime, // No rest needed after arrival
            isArrivalDay: true
        });

        // Add Loading/Unloading Time
        const loadHours = safeParseFloat(loadingTime);
        const bufferHours = totalDriveHoursRequired * 0.1; // 10% buffer

        // Add Loading + Buffer to final time
        currentTime = currentTime.plus({ hours: loadHours + bufferHours });

        // Delivery Window Logic (Convert Arrival to Dest Timezone)
        let arrivalInDest = currentTime.setZone(destTimezone);

        // Check if arrival is on Sunday => Move to Monday delivery open
        if (arrivalInDest.weekday === 7) { // Luxon: 1=Mon ... 7=Sun
            // Move to next day (Monday)
            arrivalInDest = arrivalInDest.plus({ days: 1 });
            // Set to Open Time
            const [openH, openM] = deliveryOpen.split(":").map(Number);
            arrivalInDest = arrivalInDest.set({ hour: openH, minute: openM, second: 0, millisecond: 0 });
        }

        // Parse Delivery Window for the *Arrival Day*
        const [closeH, closeM] = deliveryClose.split(":").map(Number);
        const deliveryCloseToday = arrivalInDest.set({ hour: closeH, minute: closeM, second: 0, millisecond: 0 });

        // Late Check
        let isLate = false;
        // If arrival is after close time?
        if (arrivalInDest > deliveryCloseToday) {
            isLate = true;
            // Optionally, we could say "Available next morning" logic, but basic late check is fine.
        }

        // Latest Departure Calculation (Work Backwards)
        // We take the delivery deadline and subtract total trip duration
        const totalDurationHours = totalDriveTimeAccumulated + totalRestTimeAccumulated + (totalBreakTimeAccumulated / 60) + loadHours + bufferHours;
        // This is a rough estimate; exact reverse HOS is hard. Simple subtraction is usually "good enough" for latest departure estimate.
        // We target the *Delivery Close* time of the arrival day.
        const idealArrival = deliveryCloseToday; // Target arriving exactly at close?
        const latestDeparture = idealArrival.minus({ hours: totalDurationHours }).setZone(originTimezone);

        // Projections
        const driveLimit = initialDeparture.plus({ hours: 11 });
        const breakDue = initialDeparture.plus({ hours: 8 });
        const canDriveAgain = driveLimit.plus({ hours: 10 }); // simplified

        // Securement Checks (50m, then 2h50m = 170m)
        const checkPoints: DateTime[] = [];
        let checkTimer = initialDeparture.plus({ minutes: 50 });
        if (checkTimer < driveLimit) checkPoints.push(checkTimer);

        let safeLoopGuard = 0;
        while (checkTimer < driveLimit && safeLoopGuard < 20) {
            checkTimer = checkTimer.plus({ minutes: 170 }); // 2h 50m
            if (checkTimer < driveLimit) checkPoints.push(checkTimer);
            safeLoopGuard++;
        }

        setResult({
            arrivalTime: arrivalInDest,
            totalHours: totalDurationHours,
            driveHours: totalDriveHoursRequired,
            breakMinutes: totalBreakTimeAccumulated,
            restHours: totalRestTimeAccumulated,
            bufferHours: bufferHours + loadHours,
            breaks,
            isLate,
            latestDeparture: latestDeparture,
            departureDateTime: initialDeparture,
            driveLimit,
            breakDue,
            canDriveAgain,
            securementChecks: checkPoints,
            daySchedule
        });
    };

    const formatTime = (dt: DateTime, tz?: string) => {
        // Luxon objects already handle timezone if setZone is used.
        // If tz is passed, we might want to re-zone for display?
        // In the state, we store DateTimes with their specific zones.
        // The render calls pass 'destTimezone' or 'originTimezone' strings.
        // If the DateTime is already in that zone, .toFormat is fine.
        // If not, we setZone.
        return dt.setZone(tz || dt.zoneName || undefined).toFormat("h:mm a ZZZZ");
    };

    const formatDate = (dt: DateTime, tz?: string) => {
        return dt.setZone(tz || dt.zoneName || undefined).toFormat("ccc, MMM d");
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

                    <div className="flex gap-4">
                        <Button onClick={calculateTrip} variant="outline" className="flex-1">
                            Calculators Only
                        </Button>
                        <Button
                            onClick={handleSmartSchedule}
                            disabled={isLoadingAI}
                            className="flex-1 bg-black hover:bg-gray-800 text-white flex items-center justify-center gap-2"
                        >
                            {isLoadingAI ? (
                                <span>Thinking...</span>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Smart Schedule (AI)
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Results */}
            {(result || aiResult) && (
                <div className="space-y-4">
                    {/* Arrival Status */}
                    {result && (
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
                                        Estimated arrival: <strong>{formatDate(result.arrivalTime)} at {formatTime(result.arrivalTime)}</strong>
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* AI Schedule Result */}
                    {aiResult && (
                        <Card className="p-6 bg-indigo-50 border-indigo-300">
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-indigo-800">
                                <Sparkles className="h-5 w-5" />
                                AI Trip Schedule
                            </h3>
                            <div className="mb-4 p-3 bg-white rounded-lg border border-indigo-100">
                                <p className="text-sm text-gray-600">Total Duration: <strong>{aiResult.summary.totalDurationHours} hours</strong></p>
                                <p className="text-sm text-gray-600">Estimated Arrival: <strong>{aiResult.summary.estimatedArrival}</strong></p>
                            </div>
                            <div className="space-y-3">
                                {aiResult.schedule.map((day, idx) => (
                                    <div key={idx} className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-indigo-900">Day {day.day} - {day.date}</span>
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{day.activity}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-700 mb-1">
                                            <span>{day.start}</span>
                                            <span>→</span>
                                            <span>{day.end}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2 mt-2">
                                            {day.notes}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Standard Trip Summary (Calculated) */}
                    {result && (
                        <Card className="p-6 border-gray-400">
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Trip Summary (Calculated)
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
                    )}

                    {/* Time Activity Projections */}
                    {result && (
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
                                            {formatDate(result.breakDue)} {formatTime(result.breakDue)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-purple-200">
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-red-500" />
                                            <span className="text-sm text-gray-700">11-Hour Drive Limit</span>
                                        </div>
                                        <span className="font-semibold text-red-600">
                                            {formatDate(result.driveLimit)} {formatTime(result.driveLimit)}
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
                                                    {formatTime(checkTime)}
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
                    )}

                    {/* Latest Departure */}
                    {result && result.latestDeparture && (
                        <Card className="p-6 border-gray-400 bg-blue-50">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Latest Departure
                            </h3>
                            <p className="text-sm text-gray-700">
                                To arrive by {deliveryClose}, you must leave no later than:
                            </p>
                            <p className="text-xl font-bold mt-1">
                                {formatDate(result.latestDeparture)} at {formatTime(result.latestDeparture)}
                            </p>
                        </Card>
                    )}

                </div>
            )}
        </div>
    );
}
