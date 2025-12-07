"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useState } from "react";

const deliverySteps = [
    { id: 1, label: "Hit Routes Tab on Samsara" },
    { id: 2, label: "Hit Manually Arrive" },
    { id: 3, label: "Hit Submit Document" },
    { id: 4, label: "Hit Manually Depart" },
];

export function Routes() {
    const [steps, setSteps] = useState(deliverySteps.map(step => ({ ...step, checked: false })));

    const toggleStep = (id: number) => {
        setSteps(steps.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
    };

    return (
        <div className="px-6 w-full">
            <Card className="overflow-hidden border-gray-400 rounded-xl">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={`flex items-center p-4 gap-4 ${index !== steps.length - 1 ? "border-b border-gray-300" : ""}`}
                    >
                        <Checkbox
                            id={`step-${step.id}`}
                            checked={step.checked}
                            onCheckedChange={() => toggleStep(step.id)}
                            className="h-6 w-6 border-2 border-gray-500 data-[state=checked]:bg-black data-[state=checked]:border-black rounded-sm"
                        />
                        <label
                            htmlFor={`step-${step.id}`}
                            className={`text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${step.checked ? "line-through decoration-2" : ""}`}
                        >
                            {step.label}
                        </label>
                    </div>
                ))}
            </Card>
        </div>
    );
}
