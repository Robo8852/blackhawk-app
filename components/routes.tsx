"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export function Routes() {
    const [arrival, setArrival] = useState(false);
    const [departure, setDeparture] = useState(false);

    return (
        <div className="px-6 w-full">
            <Card className="overflow-hidden border-gray-400 rounded-xl">
                <div className="flex items-center p-4 gap-4 border-b border-gray-300">
                    <Checkbox
                        id="arrival"
                        checked={arrival}
                        onCheckedChange={(checked) => setArrival(checked as boolean)}
                        className="h-6 w-6 border-2 border-gray-500 data-[state=checked]:bg-black data-[state=checked]:border-black rounded-sm"
                    />
                    <label
                        htmlFor="arrival"
                        className={`text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${arrival ? "line-through decoration-2" : ""}`}
                    >
                        Hit Route Tab on Samsara - Arrival
                    </label>
                </div>
                <div className="flex items-center p-4 gap-4">
                    <Checkbox
                        id="departure"
                        checked={departure}
                        onCheckedChange={(checked) => setDeparture(checked as boolean)}
                        className="h-6 w-6 border-2 border-gray-500 data-[state=checked]:bg-black data-[state=checked]:border-black rounded-sm"
                    />
                    <label
                        htmlFor="departure"
                        className={`text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${departure ? "line-through decoration-2" : ""}`}
                    >
                        Hit Route Tab on Samsara - Departure
                    </label>
                </div>
            </Card>
        </div>
    );
}
