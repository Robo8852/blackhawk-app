"use client";

import { useState } from "react";

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedHour, setSelectedHour] = useState(() => {
        if (!value) return 9;
        const [time, period] = value.split(" ");
        if (period) {
            // 12-hour format like "9:30 AM"
            return parseInt(time.split(":")[0]);
        }
        // 24-hour format like "09:30"
        const hour24 = parseInt(value.split(":")[0]);
        if (hour24 === 0) return 12;
        if (hour24 > 12) return hour24 - 12;
        return hour24;
    });
    const [selectedMinute, setSelectedMinute] = useState(() => {
        if (!value) return 0;
        const timePart = value.split(" ")[0];
        return parseInt(timePart.split(":")[1]) || 0;
    });
    const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(() => {
        if (!value) return "AM";
        if (value.includes("PM")) return "PM";
        if (value.includes("AM")) return "AM";
        // 24-hour format
        const hour = parseInt(value.split(":")[0]);
        return hour >= 12 ? "PM" : "AM";
    });
    const [selectingMinutes, setSelectingMinutes] = useState(false);

    const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    const getPosition = (index: number, total: number, radius: number) => {
        const angle = (index * 360) / total - 90;
        const radian = (angle * Math.PI) / 180;
        return {
            x: Math.cos(radian) * radius,
            y: Math.sin(radian) * radius,
        };
    };

    const handleSet = () => {
        let hour24 = selectedHour;
        if (selectedPeriod === "PM" && selectedHour !== 12) {
            hour24 = selectedHour + 12;
        } else if (selectedPeriod === "AM" && selectedHour === 12) {
            hour24 = 0;
        }
        const timeString = `${hour24.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`;
        onChange(timeString);
        setIsOpen(false);
        setSelectingMinutes(false);
    };

    const handleClear = () => {
        onChange("");
        setIsOpen(false);
        setSelectingMinutes(false);
    };

    const handleCancel = () => {
        setIsOpen(false);
        setSelectingMinutes(false);
    };

    const formatDisplayTime = () => {
        if (!value) return "--:--";
        const [hours, mins] = value.split(":");
        const hour24 = parseInt(hours);
        const minute = parseInt(mins);
        let hour12 = hour24 % 12;
        if (hour12 === 0) hour12 = 12;
        const period = hour24 >= 12 ? "PM" : "AM";
        return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
    };

    const handleHourClick = (hour: number) => {
        setSelectedHour(hour);
        setSelectingMinutes(true);
    };

    const handleMinuteClick = (minute: number) => {
        setSelectedMinute(minute);
    };

    return (
        <div className="relative">
            {label && (
                <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm text-left flex items-center justify-between bg-white"
            >
                <span className={value ? "text-black" : "text-gray-400"}>
                    {formatDisplayTime()}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancel}>
                    <div className="bg-white rounded-2xl shadow-xl w-80 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-[#4a5568] text-white p-4">
                            <div className="flex items-center justify-center gap-1">
                                <button
                                    onClick={() => setSelectingMinutes(false)}
                                    className={`text-5xl font-light ${!selectingMinutes ? "opacity-100" : "opacity-50"}`}
                                >
                                    {selectedHour}
                                </button>
                                <span className="text-5xl font-light">:</span>
                                <button
                                    onClick={() => setSelectingMinutes(true)}
                                    className={`text-5xl font-light ${selectingMinutes ? "opacity-100" : "opacity-50"}`}
                                >
                                    {selectedMinute.toString().padStart(2, "0")}
                                </button>
                                <div className="flex flex-col ml-2 text-sm">
                                    <button
                                        onClick={() => setSelectedPeriod("AM")}
                                        className={`px-1 ${selectedPeriod === "AM" ? "font-bold" : "opacity-50"}`}
                                    >
                                        AM
                                    </button>
                                    <button
                                        onClick={() => setSelectedPeriod("PM")}
                                        className={`px-1 ${selectedPeriod === "PM" ? "font-bold" : "opacity-50"}`}
                                    >
                                        PM
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Clock Face */}
                        <div className="p-4">
                            <div className="relative w-56 h-56 mx-auto">
                                {/* Clock circle */}
                                <div className="absolute inset-0 rounded-full bg-gray-100"></div>

                                {/* Center dot */}
                                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#4a5568] rounded-full -translate-x-1/2 -translate-y-1/2 z-10"></div>

                                {/* Hand */}
                                {!selectingMinutes ? (
                                    <div
                                        className="absolute left-1/2 w-0.5 bg-[#4a5568]"
                                        style={{
                                            height: "85px",
                                            bottom: "50%",
                                            transform: `translateX(-50%) rotate(${hours.indexOf(selectedHour) * 30}deg)`,
                                            transformOrigin: "bottom center",
                                        }}
                                    >
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#4a5568] rounded-full"></div>
                                    </div>
                                ) : (
                                    <div
                                        className="absolute left-1/2 w-0.5 bg-[#4a5568]"
                                        style={{
                                            height: "85px",
                                            bottom: "50%",
                                            transform: `translateX(-50%) rotate(${selectedMinute / 5 * 30}deg)`,
                                            transformOrigin: "bottom center",
                                        }}
                                    >
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#4a5568] rounded-full"></div>
                                    </div>
                                )}

                                {/* Numbers */}
                                {!selectingMinutes
                                    ? hours.map((hour, index) => {
                                          const pos = getPosition(index, 12, 85);
                                          return (
                                              <button
                                                  key={hour}
                                                  onClick={() => handleHourClick(hour)}
                                                  className={`absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                                                      ${selectedHour === hour ? "text-white" : "text-gray-700 hover:bg-gray-200"}`}
                                                  style={{
                                                      left: `calc(50% + ${pos.x}px - 16px)`,
                                                      top: `calc(50% + ${pos.y}px - 16px)`,
                                                  }}
                                              >
                                                  {hour}
                                              </button>
                                          );
                                      })
                                    : minutes.map((minute, index) => {
                                          const pos = getPosition(index, 12, 85);
                                          return (
                                              <button
                                                  key={minute}
                                                  onClick={() => handleMinuteClick(minute)}
                                                  className={`absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                                                      ${selectedMinute === minute ? "text-white" : "text-gray-700 hover:bg-gray-200"}`}
                                                  style={{
                                                      left: `calc(50% + ${pos.x}px - 16px)`,
                                                      top: `calc(50% + ${pos.y}px - 16px)`,
                                                  }}
                                              >
                                                  {minute.toString().padStart(2, "0")}
                                              </button>
                                          );
                                      })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <button className="p-2" onClick={handleCancel}>
                                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <div className="flex gap-4">
                                <button onClick={handleClear} className="text-[#4a5568] font-medium">
                                    Clear
                                </button>
                                <button onClick={handleCancel} className="text-[#4a5568] font-medium">
                                    Cancel
                                </button>
                                <button onClick={handleSet} className="text-[#4a5568] font-medium">
                                    Set
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
