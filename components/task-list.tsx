"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useState } from "react";

const initialTasks = [
    { id: 1, label: "Perform Pre-Trip Inspection", checked: false },
    { id: 2, label: "Submit Pre-Trip DVIR", checked: false },
    { id: 3, label: "Perform Post-Trip Inspection", checked: false },
    { id: 4, label: "Submit Post-Trip DVIR", checked: false },
];

export function TaskList() {
    const [tasks, setTasks] = useState(initialTasks);

    const toggleTask = (id: number) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
    };

    return (
        <div className="px-6 w-full">
            <Card className="overflow-hidden border-gray-400 rounded-xl">
                {tasks.map((task, index) => (
                    <div
                        key={task.id}
                        className={`flex items-center p-4 gap-4 ${index !== tasks.length - 1 ? "border-b border-gray-300" : ""}`}
                    >
                        <Checkbox
                            id={`task-${task.id}`}
                            checked={task.checked}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="h-6 w-6 border-2 border-gray-500 data-[state=checked]:bg-black data-[state=checked]:border-black rounded-sm"
                        />
                        <label
                            htmlFor={`task-${task.id}`}
                            className={`text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${task.checked ? "line-through decoration-2" : ""}`}
                        >
                            {task.label}
                        </label>
                    </div>
                ))}
            </Card>
            <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                <p className="text-base font-semibold text-yellow-800">
                    ⚠️ Don't forget to hit the route tabs on Samsara when you arrive and depart a location. ⚠️
                </p>
            </div>
        </div>
    );
}
