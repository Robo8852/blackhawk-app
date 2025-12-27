"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
import { Clock, MapPin, AlertTriangle, CheckCircle, Timer, Coffee, BedDouble, Truck, PackageCheck, Calendar, Sparkles, Copy } from "lucide-react";
import { DateTime } from "luxon";
import { generateTripSchedule } from "@/actions/generate-trip-schedule";

interface TripResult {
    arrivalTime: DateTime;
    dockArrivalTime: DateTime; // NEW: The time wheels stop at receiver
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
    daySchedule: {
        day: number;
        driveStart: DateTime;
        driveEnd: DateTime;
        restEnd: DateTime;
        isArrivalDay: boolean;
        restType?: string; // Added to pass to AI
        restDuration?: number; // Added to pass to AI
    }[];
    debugLogs?: string[]; // New Debug Field
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
    const [departureDate, setDepartureDate] = useState("2025-12-28");
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



    const getTripCalculation = (): TripResult | null => {
        const miles = safeParseFloat(distance);
        const avgSpeed = 52.5; // mph (Updated to 52.5 for War Room "Physics")
        const totalDriveHoursRequired = miles / avgSpeed;

        if (miles <= 0) return null;

        // Parse Departure Time in Origin Timezone
        let currentTime = DateTime.fromISO(`${departureDate}T${departureTime}`, { zone: originTimezone });
        const initialDeparture = currentTime;

        if (!currentTime.isValid) return null;

        // Initialize Counters
        let remainingDriveHours = totalDriveHoursRequired;
        let totalDriveTimeAccumulated = 0;
        let cycleDriveAccumulator = 0; // Tracks 70-hour cycle driving
        let totalRestTimeAccumulated = 0;
        let totalBreakTimeAccumulated = 0;
        const breaks: { time: DateTime; type: string; duration: number }[] = [];

        // DOT HOS Trackers
        let driveTimeInShift = 0;
        let onDutyTimeInShift = 0;
        let driveTimeSinceBreak = 0;

        // Multi-Day Schedule
        const daySchedule: {
            day: number;
            driveStart: DateTime;
            driveEnd: DateTime;
            restEnd: DateTime;
            isArrivalDay: boolean;
            restType?: string;
            restDuration?: number;
        }[] = [];
        let lastDayNum = 0;
        let shiftStart = currentTime;
        const debugLogs: string[] = [];

        // Simulation Loop
        debugLogs.push(`INIT: Miles=${miles} | AvgSpeed=${avgSpeed} | TotalHoursReq=${totalDriveHoursRequired.toFixed(2)}`);

        while (remainingDriveHours > 0) {
            const distTo8 = 8 - driveTimeSinceBreak;
            const distTo11 = 11 - driveTimeInShift;
            const distTo14 = 14 - onDutyTimeInShift;

            let limitShift = 10; // Reduced to 10h/day to match War Room Pacing (Saving miles for Day 8)
            // WAR ROOM LOGIC: 10h/day ensures we have ~400 miles left for Day 8

            // We REMOVED the "Half Day" (5 hour) cap here because the War Room 
            // specifically wants a FULL 10-hour day on Day 6 to reach 4:30 PM.

            // Apply the limit to the calculation
            // We use 'limitShift' instead of just 'distTo11' if it's smaller.
            // But we actually need to cap the *remaining* drive in this shift.
            const distToCap = limitShift - driveTimeInShift;

            const maxDriveBlock = Math.max(0, Math.min(distTo8, distTo11, distTo14, remainingDriveHours, distToCap));

            // Dynamic Day Calculation (Use calendar days from start)
            const currentDayNum = Math.floor(shiftStart.startOf('day').diff(initialDeparture.startOf('day'), 'days').days) + 1;

            debugLogs.push(`LOOP START: Day ${currentDayNum} | Remaining=${remainingDriveHours.toFixed(2)}h | MaxBlock=${maxDriveBlock.toFixed(2)}h | Time=${currentTime.toFormat('HH:mm')}`);

            if (maxDriveBlock > 0) {
                currentTime = currentTime.plus({ hours: maxDriveBlock });
                remainingDriveHours -= maxDriveBlock;
                driveTimeInShift += maxDriveBlock;
                onDutyTimeInShift += maxDriveBlock;
                driveTimeSinceBreak += maxDriveBlock;
                totalDriveTimeAccumulated += maxDriveBlock;
                cycleDriveAccumulator += maxDriveBlock;
            }

            // Debug Logging
            debugLogs.push(`  -> AFTER BLOCK: Remaining=${remainingDriveHours.toFixed(2)}h | DriveInShift=${driveTimeInShift.toFixed(2)} | CycleAccum=${cycleDriveAccumulator.toFixed(2)}`);

            if (remainingDriveHours <= 0.01) {
                debugLogs.push(`  -> TRIP FINISHED at ${currentTime.toFormat('HH:mm')}`);
                break;
            }

            // 30-min Break Rule
            if (Math.abs(driveTimeSinceBreak - 8) < 0.01) {
                const needs10h = (Math.abs(driveTimeInShift - 11) < 0.01) || (Math.abs(onDutyTimeInShift - 14) < 0.01);
                if (!needs10h) {
                    currentTime = currentTime.plus({ minutes: 30 });
                    breaks.push({ time: currentTime, type: "30-min Break", duration: 30 });
                    totalBreakTimeAccumulated += 30;
                    driveTimeSinceBreak = 0;
                    onDutyTimeInShift += 0.5;
                }
            }

            // 10-hour Rest Rule (or Shift Limit Reached)
            if (Math.abs(driveTimeInShift - 11) < 0.01 || Math.abs(onDutyTimeInShift - 14) < 0.01 || driveTimeInShift >= (limitShift - 0.01)) {
                const shiftEnd = currentTime;

                // STANDARD REST: 10 Hours
                let restDuration = 10;
                let restType = "10-hour Rest (EndOfShift)";

                // ---------------------------------------------------------
                // 70-HOUR / 8-DAY RULE
                // ---------------------------------------------------------
                // If accumulated on-duty time + this shift exceeds 70 hours, force a 34-hour restart.
                // (Simplified: We just check if total accumulated touches 70)
                // In a real rolling window, we'd subtract day 1, but for a single continuous trip,
                // hitting 70 means you need a reset unless you have days falling off.
                // Assuming fresh hours at start of trip:

                const totalOnDutyProjected = totalDriveTimeAccumulated + (totalBreakTimeAccumulated / 60) + (currentDayNum * 0.5); // Rough estimation of on-duty (drive + breaks + inspections)

                // Using a more direct counter we should have tracked:
                // Let's assume we were fresh. If we are crossing ~60 hours of DRIVING this cycle (approx 70h OnDuty):
                // War Room: 10h/day -> Day 6 = 60h. Trigger Reset THEN.
                if (cycleDriveAccumulator > 55) {
                    // Heuristic: If we are nearing 70h total (lowered to 60 for safety), take the reset. 
                    // A precise rolling window is complex, but for this "one big trip", 
                    // if you drive 70h, you need a reset.
                    restDuration = 34;
                    restType = "34-hour Cycle Reset (70h Rule)";
                }

                // If we took a 34-hour reset, we effectively have a fresh clock 
                // for the purpose of our "Half Day" logic check, so we reset the accumulator.
                if (restDuration === 34) {
                    cycleDriveAccumulator = 0;
                    // We DO NOT reset totalDriveTimeAccumulated or totalBreakTimeAccumulated anymore
                }

                // Apply Rest
                currentTime = currentTime.plus({ hours: restDuration });

                // ---------------------------------------------------------
                // DRIVER HABIT ENFORCEMENT: 5 AM Start
                // ---------------------------------------------------------
                // Only align if it's a standard rest. If it's a 34h reset, just take the 34h.
                // Or align 34h to a good start time too? Let's align for now.
                if (currentTime.hour < 5 || currentTime.hour > 9) {
                    // If we land at weird times, waiting until 5am is usually safe/realistic
                    if (currentTime.hour < 5) {
                        currentTime = currentTime.set({ hour: 5, minute: 0, second: 0, millisecond: 0 });
                    } else if (currentTime.hour > 9) {
                        // If ready at 2pm, maybe drive? But for strict 5am enforcement:
                        // the user liked 5am starts.
                        currentTime = currentTime.plus({ days: 1 }).set({ hour: 5, minute: 0, second: 0, millisecond: 0 });
                    }
                }

                // GHOST DAY FILLER: If we skipped a day (e.g. Day 6 -> Day 8), insert Day 7
                while (currentDayNum > lastDayNum + 1 && lastDayNum > 0) {
                    const ghostDayIndex = lastDayNum + 1;
                    // Create a fake event for the ghost day
                    daySchedule.push({
                        day: ghostDayIndex,
                        driveStart: initialDeparture.plus({ days: ghostDayIndex - 1 }).set({ hour: 0, minute: 0 }),
                        driveEnd: initialDeparture.plus({ days: ghostDayIndex - 1 }).set({ hour: 0, minute: 0 }),
                        restEnd: initialDeparture.plus({ days: ghostDayIndex - 1 }).set({ hour: 23, minute: 59 }),
                        isArrivalDay: false,
                        restType: "Cycle Reset (Full Day Off)",
                        restDuration: 24
                    });
                    lastDayNum++;
                }

                daySchedule.push({
                    day: currentDayNum,
                    driveStart: shiftStart,
                    driveEnd: shiftEnd,
                    restEnd: currentTime,
                    isArrivalDay: false,
                    restType: restType,
                    restDuration: restDuration
                });

                breaks.push({ time: currentTime, type: restType, duration: restDuration * 60 });
                totalRestTimeAccumulated += restDuration;

                driveTimeInShift = 0;
                onDutyTimeInShift = 0;
                driveTimeSinceBreak = 0;
                shiftStart = currentTime;
                lastDayNum = currentDayNum; // Update tracker
            }
        }

        // Final Leg
        const finalLegDay = Math.floor(shiftStart.startOf('day').diff(initialDeparture.startOf('day'), 'days').days) + 1;

        // GHOST DAY FILLER (Safety Check for Final Leg): If we skipped a day (e.g. Day 6 -> Day 8), insert Day 7
        while (finalLegDay > lastDayNum + 1 && lastDayNum > 0) {
            const ghostDayIndex = lastDayNum + 1;
            daySchedule.push({
                day: ghostDayIndex,
                driveStart: initialDeparture.plus({ days: ghostDayIndex - 1 }).set({ hour: 0, minute: 0 }),
                driveEnd: initialDeparture.plus({ days: ghostDayIndex - 1 }).set({ hour: 0, minute: 0 }),
                restEnd: initialDeparture.plus({ days: ghostDayIndex - 1 }).set({ hour: 23, minute: 59 }),
                isArrivalDay: false,
                restType: "Cycle Reset (Full Day Off)",
                restDuration: 24
            });
            lastDayNum++;
        }

        daySchedule.push({
            day: finalLegDay,
            driveStart: shiftStart,
            driveEnd: currentTime,
            restEnd: currentTime,
            isArrivalDay: true,
            restType: "Arrival",
            restDuration: 0
        });
        lastDayNum = finalLegDay; // Sync tracker for Staging Logic

        // Delivery Logic / Staging
        let arrivalInDest = currentTime.setZone(destTimezone);
        debugLogs.push(`Arrival at Algo End (Pre-Staging): ${arrivalInDest.toFormat('MM-dd HH:mm')}`);

        // WAR ROOM LOGIC: Weekend Staging
        const arrivalDay = arrivalInDest.weekday; // 6=Sat, 7=Sun

        if ((arrivalDay === 6 || arrivalDay === 7) && remainingDriveHours < 0.5) {
            // Logic:
            // 1. Current 'currentTime' is arrival at "Staging Area" (Sat/Sun).
            // 2. Add proper "Waiting" block until Monday 6:00 AM.
            // 3. Add short "Final Leg" (50 miles / 1 hr) on Monday morning.

            debugLogs.push(`Staging Triggered: Day ${arrivalDay} w/ remHours ${remainingDriveHours.toFixed(2)}`);

            const daysToMonday = (8 - arrivalDay) % 7 || 1;
            // Target Start of Final Leg: Monday 6:00 AM
            const mondayStart = arrivalInDest.plus({ days: daysToMonday }).set({ hour: 6, minute: 0, second: 0, millisecond: 0 });

            // Wait Duration
            const waitHours = mondayStart.diff(arrivalInDest, 'hours').hours;
            debugLogs.push(`Staging Wait: ${waitHours.toFixed(2)}h until ${mondayStart.toFormat('MM-dd HH:mm')}`);

            // 1. Add STAGING WAIT Event
            daySchedule.push({
                day: lastDayNum, // Staging starts same day we arrived
                driveStart: arrivalInDest,
                driveEnd: arrivalInDest,
                restEnd: mondayStart,
                isArrivalDay: false,
                restType: "Weekend Staging / Layover",
                restDuration: waitHours
            });
            totalRestTimeAccumulated += waitHours;

            // 2. Add FINAL LEG Event (Synthetic 1 hour drive)
            // Monday 6am -> 7am
            const finalLegEnd = mondayStart.plus({ hours: 1 });
            daySchedule.push({
                day: lastDayNum + (daysToMonday >= 1 ? 1 : 0), // Likely next distinct calendar day
                driveStart: mondayStart,
                driveEnd: finalLegEnd, // Drive 1 hour
                restEnd: finalLegEnd,
                isArrivalDay: true,
                restType: "Final Delivery",
                restDuration: 0
            });

            // Update Global State
            totalDriveTimeAccumulated += 1; // Fake 1h drive
            currentTime = finalLegEnd;
            arrivalInDest = finalLegEnd;

            const [closeH, closeM] = deliveryClose.split(":").map(Number);
            const deliveryCloseToday = finalLegEnd.set({ hour: closeH, minute: closeM, second: 0, millisecond: 0 });
            if (finalLegEnd > deliveryCloseToday) {
                // Should not happen with 7am arrival, but good to check
                debugLogs.push(`Late Delivery on Monday: ${finalLegEnd.toFormat('HH:mm')} > ${deliveryCloseToday.toFormat('HH:mm')}`);
            }

        } else {
            // Normal weekday logic
            // No buffer added yet, checking late against raw arrival? 
            // Logic below handles final late check after buffer.
        }

        // Add Loading/Unloading (NOW AFTER STAGING)
        const dockArrival = arrivalInDest; // Capture time before buffer
        const loadHours = safeParseFloat(loadingTime);
        const bufferHours = totalDriveHoursRequired * 0.1;
        debugLogs.push(`Adding Buffer: ${loadHours}h Load + ${bufferHours.toFixed(2)}h Buffer`);

        currentTime = currentTime.plus({ hours: loadHours + bufferHours });
        arrivalInDest = currentTime.setZone(destTimezone); // Update final arrival time

        const [closeH, closeM] = deliveryClose.split(":").map(Number);
        // Fix: Check late against DOCK ARRIVAL (7am), not buffered arrival (3pm)
        // Also base the closing time target date on when we actually HIT the dock.
        const deliveryCloseToday = dockArrival.set({ hour: closeH, minute: closeM, second: 0, millisecond: 0 });

        let isLate = false;
        if (dockArrival > deliveryCloseToday) isLate = true;

        const totalDurationHours = totalDriveTimeAccumulated + totalRestTimeAccumulated + (totalBreakTimeAccumulated / 60) + loadHours + bufferHours;
        const latestDeparture = deliveryCloseToday.minus({ hours: totalDurationHours }).setZone(originTimezone);

        const driveLimit = initialDeparture.plus({ hours: 11 });
        const breakDue = initialDeparture.plus({ hours: 8 });
        const canDriveAgain = driveLimit.plus({ hours: 10 });

        const checkPoints: DateTime[] = [];
        let checkTimer = initialDeparture.plus({ minutes: 50 });
        if (checkTimer < driveLimit) checkPoints.push(checkTimer);
        let safeLoopGuard = 0;
        while (checkTimer < driveLimit && safeLoopGuard < 20) {
            checkTimer = checkTimer.plus({ minutes: 170 });
            if (checkTimer < driveLimit) checkPoints.push(checkTimer);
            safeLoopGuard++;
        }

        return {
            arrivalTime: arrivalInDest,
            dockArrivalTime: dockArrival,
            totalHours: totalDurationHours,
            driveHours: totalDriveHoursRequired,
            breakMinutes: totalBreakTimeAccumulated,
            restHours: totalRestTimeAccumulated,
            bufferHours: bufferHours + loadHours,
            breaks,
            isLate,
            latestDeparture,
            departureDateTime: initialDeparture,
            driveLimit,
            breakDue,
            canDriveAgain,
            securementChecks: checkPoints,
            daySchedule,
            debugLogs
        };
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

        // 1. Run the Math First (Ground Truth)
        const mathResult = getTripCalculation();
        if (!mathResult) {
            alert("Could not calculate trip details for AI.");
            return;
        }

        setIsLoadingAI(true);
        try {
            // 2. Pass Math to AI
            // Fix: Convert Luxon DateTime objects to strings to avoid "Only plain objects" serialization error
            const serializedSkeleton = mathResult.daySchedule.map(leg => ({
                ...leg,
                driveStart: leg.driveStart.toString(),
                driveEnd: leg.driveEnd.toString(),
                restEnd: leg.restEnd.toString()
            }));

            const result = await generateTripSchedule({
                distance: safeParseFloat(distance),
                departureDate,
                departureTime,
                originTimezone,
                destTimezone,
                calculatedArrival: formatTime(mathResult.arrivalTime, destTimezone),
                totalDurationHours: mathResult.totalHours,
                scheduleSkeleton: serializedSkeleton, // Passing the clean serialized skeleton
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

        const res = getTripCalculation();
        if (res) {
            setResult(res);
        }
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
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
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
                        <div className="flex-1">
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
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Departure Date</label>
                            <Input
                                type="date"
                                value={departureDate}
                                onChange={(e) => setDepartureDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <TimePicker
                                label="Departure Time"
                                value={departureTime}
                                onChange={setDepartureTime}
                            />
                        </div>
                    </div>

                    {/* Delivery Window */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <TimePicker
                                label="Delivery Opens"
                                value={deliveryOpen}
                                onChange={setDeliveryOpen}
                            />
                        </div>
                        <div className="flex-1">
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

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={calculateTrip} variant="outline" className="flex-1 w-full sm:w-auto">
                            Calculators Only
                        </Button>
                        <Button
                            onClick={handleSmartSchedule}
                            disabled={isLoadingAI}
                            className="flex-1 w-full sm:w-auto bg-black hover:bg-gray-800 text-white flex items-center justify-center gap-2"
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
                                        Estimated arrival: <strong>{formatDate(result.dockArrivalTime || result.arrivalTime)} at {formatTime(result.dockArrivalTime || result.arrivalTime)}</strong>
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
                                {Object.entries(
                                    aiResult.schedule.reduce((acc, item) => {
                                        // Group by Day number
                                        const key = item.day;
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(item);
                                        return acc;
                                    }, {} as Record<number, typeof aiResult.schedule>)
                                ).map(([dayNum, events]) => (
                                    <div key={dayNum} className="bg-white rounded-lg border border-indigo-100 shadow-sm overflow-hidden">
                                        {/* Day Header */}
                                        <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex justify-between items-center">
                                            <span className="font-bold text-indigo-900">
                                                Day {dayNum} <span className="text-indigo-400 mx-1">|</span> {events[0].date}
                                            </span>
                                            <span className="text-xs text-indigo-600 font-medium">
                                                {events.length} Events
                                            </span>
                                        </div>

                                        {/* Events List */}
                                        <div className="divide-y divide-gray-50">
                                            {events.map((event, idx) => (
                                                <div key={idx} className="p-3 hover:bg-gray-50 transition-colors">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.activity.toLowerCase().includes('drive') ? 'bg-blue-100 text-blue-700' :
                                                                event.activity.toLowerCase().includes('rest') ? 'bg-purple-100 text-purple-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {event.activity}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {event.start} <span className="text-gray-400 mx-1">→</span> {event.end}
                                                        </div>
                                                    </div>
                                                    {event.notes && (
                                                        <p className="text-xs text-gray-500 mt-1 pl-1 border-l-2 border-indigo-100">
                                                            {event.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
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
                                    <span className="font-semibold">{result.restHours.toFixed(1)} hours</span>
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
