"use client";

import { ClipboardList, CheckSquare, Calendar, Settings } from "lucide-react";

type BottomNavProps = {
    activeTab: string;
    onTabChange: (tab: string) => void;
};

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 pb-6 pt-2">
            <div className="flex justify-around items-center max-w-md mx-auto">
                <button
                    onClick={() => onTabChange("inspections")}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={`p-2 rounded-lg ${activeTab === "inspections" ? "bg-black" : ""}`}>
                        <ClipboardList className={`h-6 w-6 ${activeTab === "inspections" ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <span className={`text-xs font-medium ${activeTab === "inspections" ? "" : "text-gray-600"}`}>Inspections</span>
                </button>

                <button
                    onClick={() => onTabChange("routes")}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={`p-2 rounded-lg ${activeTab === "routes" ? "bg-black" : ""}`}>
                        <CheckSquare className={`h-6 w-6 ${activeTab === "routes" ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <span className={`text-xs font-medium ${activeTab === "routes" ? "" : "text-gray-600"}`}>Routes</span>
                </button>

                <button
                    onClick={() => onTabChange("calendar")}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={`p-2 rounded-lg ${activeTab === "calendar" ? "bg-black" : ""}`}>
                        <Calendar className={`h-6 w-6 ${activeTab === "calendar" ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <span className={`text-xs font-medium ${activeTab === "calendar" ? "" : "text-gray-600"}`}>Calendar</span>
                </button>

                <button
                    onClick={() => onTabChange("settings")}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={`p-2 rounded-lg ${activeTab === "settings" ? "bg-black" : ""}`}>
                        <Settings className={`h-6 w-6 ${activeTab === "settings" ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <span className={`text-xs font-medium ${activeTab === "settings" ? "" : "text-gray-600"}`}>Settings</span>
                </button>
            </div>
            {/* Home indicator bar simulation */}
            <div className="w-full flex justify-center mt-4">
                <div className="w-32 h-1 bg-black rounded-full"></div>
            </div>
        </div>
    );
}
