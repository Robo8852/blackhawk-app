# Blackhawk Transport Logistics - Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Application Entry Points](#application-entry-points)
5. [Feature Components](#feature-components)
6. [UI Component Library](#ui-component-library)
7. [Server Actions (Backend)](#server-actions-backend)
8. [Styling System](#styling-system)
9. [Data Flow](#data-flow)
10. [DOT HOS Logic Deep Dive](#dot-hos-logic-deep-dive)

---

## Overview

Blackhawk Transport Logistics is a **mobile-first Progressive Web App (PWA)** designed for truck drivers and logistics coordinators. The app provides:

- Pre/post-trip inspection checklists
- Delivery workflow management (Samsara integration)
- DOT-compliant trip planning with AI-powered schedule generation

**Total Codebase:** ~1,820 lines of application code

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.0.7 |
| UI Library | React | 19.2.0 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui + Radix UI | Latest |
| Icons | Lucide React | 0.555.0 |
| Date/Time | Luxon | 3.7.2 |
| AI Integration | OpenRouter API | Meta Llama 3.3 70B |

### Package.json Dependencies

```json
{
  "dependencies": {
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-slot": "^1.2.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.555.0",
    "luxon": "^3.7.2",
    "next": "16.0.7",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "tailwind-merge": "^3.4.0"
  }
}
```

---

## Project Structure

```
blackhawk-app/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main page with tab navigation
│   ├── layout.tsx                # Root layout with fonts/metadata
│   └── globals.css               # Global styles and CSS variables
│
├── components/                   # React components
│   ├── ui/                       # Reusable UI primitives (shadcn/ui)
│   │   ├── button.tsx            # Button with variants
│   │   ├── card.tsx              # Card container components
│   │   ├── checkbox.tsx          # Checkbox with Radix UI
│   │   ├── input.tsx             # Text input field
│   │   └── time-picker.tsx       # Custom analog clock picker
│   │
│   ├── header.tsx                # Logo and title bar
│   ├── search-add.tsx            # Search bar and Add Task button
│   ├── bottom-nav.tsx            # Fixed bottom tab navigation
│   ├── task-list.tsx             # Inspections checklist
│   ├── routes.tsx                # Delivery workflow checklist
│   └── trip-planner.tsx          # HOS trip calculation engine (829 lines)
│
├── actions/                      # Next.js Server Actions
│   └── generate-trip-schedule.ts # OpenRouter AI integration
│
├── lib/                          # Utility functions
│   └── utils.ts                  # Tailwind class merger (cn)
│
├── public/
│   └── images/
│       └── logo.png              # Company logo
│
└── Configuration Files
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── components.json           # shadcn/ui configuration
    └── .env.local                # API keys (not committed)
```

---

## Application Entry Points

### Root Layout (`app/layout.tsx`)

The root layout wraps all pages and provides:
- Google Fonts (Geist Sans and Geist Mono)
- HTML metadata for SEO
- Global body styling

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load custom fonts with CSS variable injection
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SEO metadata
export const metadata: Metadata = {
  title: "Blackhawk Transport Logistics",
  description: "To-Do List App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

**What it does:**
- Imports Geist fonts from Google and assigns them to CSS variables
- Sets page title and description for browser tabs/SEO
- Applies font variables and antialiasing to the body

---

### Main Page (`app/page.tsx`)

The single-page application with tab-based navigation.

```tsx
"use client";

import { Header } from "@/components/header";
import { SearchAdd } from "@/components/search-add";
import { TaskList } from "@/components/task-list";
import { Routes } from "@/components/routes";
import { TripPlanner } from "@/components/trip-planner";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";

export default function Home() {
  // Track which tab is active
  const [activeTab, setActiveTab] = useState("inspections");

  return (
    <main className="min-h-screen bg-white pb-32 flex justify-center">
      {/* Mobile-width container with shadow */}
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl">
        <Header />
        <SearchAdd />

        {/* Conditional rendering based on active tab */}
        {activeTab === "inspections" && <TaskList />}
        {activeTab === "delivery" && <Routes />}
        {activeTab === "calendar" && <TripPlanner />}
        {activeTab === "settings" && (
          <div className="px-6 py-4 text-center text-gray-500">
            Settings coming soon...
          </div>
        )}

        {/* Fixed bottom navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </main>
  );
}
```

**What it does:**
- Uses `"use client"` directive for client-side interactivity
- Manages `activeTab` state to switch between 4 views
- Renders a mobile-sized container (`max-w-md` = 448px max width)
- Conditionally renders the appropriate component based on selected tab

---

## Feature Components

### Header (`components/header.tsx`)

Displays the company logo and title bar.

```tsx
import Image from "next/image";

export function Header() {
    return (
        <div className="flex flex-col items-center w-full">
            {/* Logo container */}
            <div className="py-6">
                <img
                    src="/images/logo.png"
                    alt="Blackhawk Transport Logistics"
                    className="h-auto w-72 object-contain"
                />
            </div>

            {/* Black title bar */}
            <div className="w-full bg-black py-3 text-center">
                <h1 className="text-white text-xl font-bold tracking-wider">
                    TO-DO LIST
                </h1>
            </div>
        </div>
    );
}
```

**What it does:**
- Renders the company logo from `/public/images/logo.png`
- Displays a black banner with "TO-DO LIST" title
- Note: Imports `Image` from Next.js but uses regular `<img>` tag

---

### Search and Add (`components/search-add.tsx`)

Search bar and "Add Task" button (UI only, not functional).

```tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

export function SearchAdd() {
    return (
        <div className="flex w-full gap-3 px-6 py-4 items-center">
            {/* Search input with icon */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                    placeholder="Search"
                    className="pl-10 rounded-full border-gray-400 text-lg h-12"
                />
            </div>

            {/* Add Task button */}
            <Button className="bg-black text-white hover:bg-gray-800 rounded-lg h-12 px-4 text-base font-medium">
                Add Task <Plus className="ml-1 h-5 w-5" />
            </Button>
        </div>
    );
}
```

**What it does:**
- Renders a rounded search input with magnifying glass icon
- Renders an "Add Task" button with plus icon
- Currently non-functional (placeholder for future feature)

---

### Bottom Navigation (`components/bottom-nav.tsx`)

Fixed tab bar at the bottom of the screen.

```tsx
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
                {/* Inspections Tab */}
                <button
                    onClick={() => onTabChange("inspections")}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={`p-2 rounded-lg ${activeTab === "inspections" ? "bg-black" : ""}`}>
                        <ClipboardList className={`h-6 w-6 ${activeTab === "inspections" ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <span className={`text-xs font-medium ${activeTab === "inspections" ? "" : "text-gray-600"}`}>
                        Inspections
                    </span>
                </button>

                {/* Delivery Tab */}
                <button
                    onClick={() => onTabChange("delivery")}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={`p-2 rounded-lg ${activeTab === "delivery" ? "bg-black" : ""}`}>
                        <CheckSquare className={`h-6 w-6 ${activeTab === "delivery" ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <span className={`text-xs font-medium ${activeTab === "delivery" ? "" : "text-gray-600"}`}>
                        Delivery
                    </span>
                </button>

                {/* Trip Planning Tab */}
                <button
                    onClick={() => onTabChange("calendar")}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={`p-2 rounded-lg ${activeTab === "calendar" ? "bg-black" : ""}`}>
                        <Calendar className={`h-6 w-6 ${activeTab === "calendar" ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <span className={`text-xs font-medium ${activeTab === "calendar" ? "" : "text-gray-600"}`}>
                        Trip Planning
                    </span>
                </button>

                {/* Settings Tab */}
                <button
                    onClick={() => onTabChange("settings")}
                    className="flex flex-col items-center gap-1"
                >
                    <div className={`p-2 rounded-lg ${activeTab === "settings" ? "bg-black" : ""}`}>
                        <Settings className={`h-6 w-6 ${activeTab === "settings" ? "text-white" : "text-gray-600"}`} />
                    </div>
                    <span className={`text-xs font-medium ${activeTab === "settings" ? "" : "text-gray-600"}`}>
                        Settings
                    </span>
                </button>
            </div>

            {/* iOS-style home indicator bar */}
            <div className="w-full flex justify-center mt-4">
                <div className="w-32 h-1 bg-black rounded-full"></div>
            </div>
        </div>
    );
}
```

**What it does:**
- Receives `activeTab` and `onTabChange` props from parent
- Renders 4 tab buttons: Inspections, Delivery, Trip Planning, Settings
- Active tab gets black background with white icon
- Includes iOS-style home indicator bar at bottom
- Fixed position at bottom of viewport

---

### Task List - Inspections (`components/task-list.tsx`)

Pre-trip and post-trip inspection checklist.

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useState } from "react";

// Static list of inspection tasks
const initialTasks = [
    { id: 1, label: "Perform Pre-Trip Inspection", checked: false },
    { id: 2, label: "Submit Pre-Trip DVIR", checked: false },
    { id: 3, label: "Perform Post-Trip Inspection", checked: false },
    { id: 4, label: "Submit Post-Trip DVIR", checked: false },
];

export function TaskList() {
    // Local state for task completion status
    const [tasks, setTasks] = useState(initialTasks);

    // Toggle a task's checked state
    const toggleTask = (id: number) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
    };

    return (
        <div className="px-6 w-full">
            {/* Warning banner */}
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                <p className="text-base font-semibold text-yellow-800">
                    ⚠️ Don&apos;t forget to hit the Delivery tab on Blackhawk app
                    when you arrive to a location. ⚠️
                </p>
            </div>

            {/* Task cards */}
            <Card className="overflow-hidden border-gray-400 rounded-xl">
                {tasks.map((task, index) => (
                    <div
                        key={task.id}
                        className={`flex items-center p-4 gap-4 ${
                            index !== tasks.length - 1 ? "border-b border-gray-300" : ""
                        }`}
                    >
                        <Checkbox
                            id={`task-${task.id}`}
                            checked={task.checked}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="h-6 w-6 border-2 border-gray-500
                                       data-[state=checked]:bg-black
                                       data-[state=checked]:border-black rounded-sm"
                        />
                        <label
                            htmlFor={`task-${task.id}`}
                            className={`text-lg font-medium leading-none
                                        peer-disabled:cursor-not-allowed
                                        peer-disabled:opacity-70
                                        ${task.checked ? "line-through decoration-2" : ""}`}
                        >
                            {task.label}
                        </label>
                    </div>
                ))}
            </Card>
        </div>
    );
}
```

**What it does:**
- Displays 4 inspection tasks: Pre-Trip, Pre-Trip DVIR, Post-Trip, Post-Trip DVIR
- Each task has a checkbox that toggles completion state
- Completed tasks show strikethrough text
- Yellow warning banner reminds drivers to use the Delivery tab
- State is local (resets on page refresh)

---

### Routes - Delivery Workflow (`components/routes.tsx`)

Samsara delivery workflow checklist.

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useState } from "react";

// Static delivery workflow steps
const deliverySteps = [
    { id: 1, label: "Hit Routes Tab on Samsara" },
    { id: 2, label: "Hit Manually Arrive" },
    { id: 3, label: "Hit Submit Document" },
    { id: 4, label: "Hit Manually Depart" },
];

export function Routes() {
    // Initialize steps with checked: false
    const [steps, setSteps] = useState(
        deliverySteps.map(step => ({ ...step, checked: false }))
    );

    // Toggle a step's checked state
    const toggleStep = (id: number) => {
        setSteps(steps.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
    };

    return (
        <div className="px-6 w-full">
            <Card className="overflow-hidden border-gray-400 rounded-xl">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={`flex items-center p-4 gap-4 ${
                            index !== steps.length - 1 ? "border-b border-gray-300" : ""
                        }`}
                    >
                        <Checkbox
                            id={`step-${step.id}`}
                            checked={step.checked}
                            onCheckedChange={() => toggleStep(step.id)}
                            className="h-6 w-6 border-2 border-gray-500
                                       data-[state=checked]:bg-black
                                       data-[state=checked]:border-black rounded-sm"
                        />
                        <label
                            htmlFor={`step-${step.id}`}
                            className={`text-lg font-medium leading-none
                                        peer-disabled:cursor-not-allowed
                                        peer-disabled:opacity-70
                                        ${step.checked ? "line-through decoration-2" : ""}`}
                        >
                            {step.label}
                        </label>
                    </div>
                ))}
            </Card>
        </div>
    );
}
```

**What it does:**
- Guides drivers through the Samsara delivery workflow
- 4 sequential steps: Routes Tab → Manually Arrive → Submit Document → Manually Depart
- Same checkbox/strikethrough pattern as TaskList
- State is local (resets on page refresh)

---

### Trip Planner (`components/trip-planner.tsx`)

**The most complex component (829 lines).** This is the DOT HOS-compliant trip calculation engine.

#### State Management

```tsx
"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { generateTripSchedule } from "@/actions/generate-trip-schedule";

export function TripPlanner() {
    // Form inputs
    const [distance, setDistance] = useState("3300");
    const [departureDate, setDepartureDate] = useState("2025-12-28");
    const [departureTime, setDepartureTime] = useState("09:00");
    const [deliveryOpen, setDeliveryOpen] = useState("06:00");
    const [deliveryClose, setDeliveryClose] = useState("15:00");
    const [loadingTime, setLoadingTime] = useState("1");
    const [originTimezone, setOriginTimezone] = useState("America/New_York");
    const [destTimezone, setDestTimezone] = useState("America/New_York");

    // Results
    const [result, setResult] = useState<TripResult | null>(null);
    const [aiResult, setAiResult] = useState<AISchedule | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    // Available timezones
    const timezones = [
        { value: "America/New_York", label: "Eastern (ET)" },
        { value: "America/Chicago", label: "Central (CT)" },
        { value: "America/Denver", label: "Mountain (MT)" },
        { value: "America/Los_Angeles", label: "Pacific (PT)" },
    ];
```

**What it does:**
- Manages all form inputs as React state
- Stores calculation results (`result`) and AI-formatted results (`aiResult`)
- Supports 4 US timezones for origin/destination

---

#### Core Calculation Engine

The `getTripCalculation()` function is the heart of the application:

```tsx
const getTripCalculation = (): TripResult | null => {
    const miles = safeParseFloat(distance);
    const avgSpeed = 52.5; // mph - realistic average including traffic
    const totalDriveHoursRequired = miles / avgSpeed;

    if (miles <= 0) return null;

    // Parse departure in origin timezone using Luxon
    let currentTime = DateTime.fromISO(
        `${departureDate}T${departureTime}`,
        { zone: originTimezone }
    );
    const initialDeparture = currentTime;

    if (!currentTime.isValid) return null;

    // Initialize counters
    let remainingDriveHours = totalDriveHoursRequired;
    let totalDriveTimeAccumulated = 0;
    let cycleDriveAccumulator = 0;      // Tracks 70-hour cycle
    let totalRestTimeAccumulated = 0;
    let totalBreakTimeAccumulated = 0;

    // DOT HOS Trackers
    let driveTimeInShift = 0;           // Max 11 hours
    let onDutyTimeInShift = 0;          // Max 14 hours
    let driveTimeSinceBreak = 0;        // Max 8 hours before 30-min break

    const daySchedule = [];              // Output: day-by-day breakdown
    const debugLogs = [];                // Debug output
```

**What it does:**
- Calculates total drive time needed: `miles / 52.5 mph`
- Parses departure time in the correct timezone using Luxon
- Initializes HOS tracking variables for DOT compliance

---

#### Simulation Loop

```tsx
// Main simulation loop - runs until all miles are driven
while (remainingDriveHours > 0) {
    // Calculate limits
    const distTo8 = 8 - driveTimeSinceBreak;   // Hours until 30-min break required
    const distTo11 = 11 - driveTimeInShift;     // Hours until 11h drive limit
    const distTo14 = 14 - onDutyTimeInShift;    // Hours until 14h on-duty limit

    let limitShift = 10; // HARDCODED: 10h/day cap for "War Room" pacing
    const distToCap = limitShift - driveTimeInShift;

    // Find the smallest limit (whichever comes first)
    const maxDriveBlock = Math.max(0, Math.min(
        distTo8,
        distTo11,
        distTo14,
        remainingDriveHours,
        distToCap
    ));

    // Drive for that block
    if (maxDriveBlock > 0) {
        currentTime = currentTime.plus({ hours: maxDriveBlock });
        remainingDriveHours -= maxDriveBlock;
        driveTimeInShift += maxDriveBlock;
        onDutyTimeInShift += maxDriveBlock;
        driveTimeSinceBreak += maxDriveBlock;
        totalDriveTimeAccumulated += maxDriveBlock;
        cycleDriveAccumulator += maxDriveBlock;
    }

    if (remainingDriveHours <= 0.01) break; // Done!
```

**What it does:**
- Simulates driving in blocks, respecting HOS limits
- Calculates which limit will be hit first (8h break, 11h drive, 14h on-duty, or daily cap)
- Drives for that block, then checks if more driving is needed

---

#### 30-Minute Break Rule

```tsx
// 30-min Break Rule: Required after 8 hours of continuous driving
if (Math.abs(driveTimeSinceBreak - 8) < 0.01) {
    const needs10h = (Math.abs(driveTimeInShift - 11) < 0.01) ||
                     (Math.abs(onDutyTimeInShift - 14) < 0.01);

    // Only take 30-min break if we're not about to do a full rest anyway
    if (!needs10h) {
        currentTime = currentTime.plus({ minutes: 30 });
        breaks.push({ time: currentTime, type: "30-min Break", duration: 30 });
        totalBreakTimeAccumulated += 30;
        driveTimeSinceBreak = 0;  // Reset break timer
        onDutyTimeInShift += 0.5; // 30-min counts toward 14h limit
    }
}
```

**What it does:**
- Enforces DOT rule: 30-minute break required after 8 hours of driving
- Skips the break if driver is about to take a full 10-hour rest anyway
- Resets the break timer after taking the break

---

#### 10-Hour Rest and 34-Hour Cycle Reset

```tsx
// 10-hour Rest Rule (shift limit reached)
if (driveTimeInShift >= 11 || onDutyTimeInShift >= 14 || driveTimeInShift >= (limitShift - 0.01)) {
    let restDuration = 10;
    let restType = "10-hour Rest (EndOfShift)";

    // 70-HOUR / 8-DAY RULE
    // If accumulated driving exceeds ~55 hours, force a 34-hour reset
    if (cycleDriveAccumulator > 55) {
        restDuration = 34;
        restType = "34-hour Cycle Reset (70h Rule)";
    }

    // Reset cycle accumulator after 34-hour reset
    if (restDuration === 34) {
        cycleDriveAccumulator = 0;
    }

    // Apply rest time
    currentTime = currentTime.plus({ hours: restDuration });

    // DRIVER HABIT ENFORCEMENT: Snap to 5 AM start
    if (currentTime.hour < 5 || currentTime.hour > 9) {
        if (currentTime.hour < 5) {
            currentTime = currentTime.set({ hour: 5, minute: 0 });
        } else if (currentTime.hour > 9) {
            // If ready at weird time, wait until 5 AM next day
            currentTime = currentTime.plus({ days: 1 })
                                     .set({ hour: 5, minute: 0 });
        }
    }

    // Record the rest event
    daySchedule.push({
        day: currentDayNum,
        driveStart: shiftStart,
        driveEnd: shiftEnd,
        restEnd: currentTime,
        restType: restType,
        restDuration: restDuration
    });

    // Reset shift counters
    driveTimeInShift = 0;
    onDutyTimeInShift = 0;
    driveTimeSinceBreak = 0;
    shiftStart = currentTime;
}
```

**What it does:**
- Triggers 10-hour rest when shift limits are reached
- Triggers 34-hour cycle reset when 70-hour rule is approaching (55h threshold)
- Enforces 5 AM start times for driver wellness
- Records each day's schedule to the output array

---

#### Ghost Day Insertion

```tsx
// GHOST DAY FILLER: If we skipped a day (e.g. Day 6 -> Day 8), insert Day 7
while (currentDayNum > lastDayNum + 1 && lastDayNum > 0) {
    const ghostDayIndex = lastDayNum + 1;

    // Create a placeholder event for the skipped day
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
```

**What it does:**
- During a 34-hour reset, the driver might skip an entire calendar day
- This inserts "ghost days" so the schedule shows all consecutive days
- Example: Day 6 ends, 34-hour reset, driving resumes Day 8 → insert Day 7 as rest day

---

#### Weekend Staging Logic

```tsx
// WAR ROOM LOGIC: Weekend Staging
const arrivalDay = arrivalInDest.weekday; // 6=Sat, 7=Sun

if ((arrivalDay === 6 || arrivalDay === 7) && remainingDriveHours < 0.5) {
    // Don't park overnight at destination on weekend
    // Stage nearby and wait until Monday

    const daysToMonday = (8 - arrivalDay) % 7 || 1;
    const mondayStart = arrivalInDest.plus({ days: daysToMonday })
                                      .set({ hour: 6, minute: 0 });

    // Add staging wait event
    daySchedule.push({
        day: lastDayNum,
        driveStart: arrivalInDest,
        driveEnd: arrivalInDest,
        restEnd: mondayStart,
        restType: "Weekend Staging / Layover",
        restDuration: mondayStart.diff(arrivalInDest, 'hours').hours
    });

    // Add final 1-hour leg on Monday morning
    const finalLegEnd = mondayStart.plus({ hours: 1 });
    daySchedule.push({
        day: lastDayNum + 1,
        driveStart: mondayStart,
        driveEnd: finalLegEnd,
        restType: "Final Delivery",
        isArrivalDay: true
    });

    currentTime = finalLegEnd;
}
```

**What it does:**
- Prevents overnight parking at receiver's facility on weekends
- Driver stages nearby (truck stop) and waits until Monday 6 AM
- Adds a short final leg (1 hour) on Monday morning to reach the dock

---

## UI Component Library

### Button (`components/ui/button.tsx`)

Reusable button with multiple variants using Class Variance Authority (CVA).

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"

// Define all button variants
const buttonVariants = cva(
  // Base styles applied to all buttons
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border bg-background shadow-xs hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

**What it does:**
- Provides 6 visual variants: default, destructive, outline, secondary, ghost, link
- Provides 4 size variants: default, sm, lg, icon
- `asChild` prop allows rendering as a different element (useful for links)

---

### Time Picker (`components/ui/time-picker.tsx`)

Custom analog clock time picker with 12-hour AM/PM format.

```tsx
export function TimePicker({ value, onChange, label }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedHour, setSelectedHour] = useState(9);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">("AM");
    const [selectingMinutes, setSelectingMinutes] = useState(false);

    const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    // Calculate position on clock face using trigonometry
    const getPosition = (index: number, total: number, radius: number) => {
        const angle = (index * 360) / total - 90; // Start at 12 o'clock
        const radian = (angle * Math.PI) / 180;
        return {
            x: Math.cos(radian) * radius,
            y: Math.sin(radian) * radius,
        };
    };

    // Convert 12-hour selection to 24-hour format for storage
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
    };
```

**What it does:**
- Displays current time value as a clickable button
- Opens a modal with analog clock face when clicked
- User clicks hour → clock switches to minutes → user clicks minute
- AM/PM toggle on the side
- Outputs 24-hour format (HH:mm) for internal calculations
- Displays 12-hour format (h:mm AM/PM) for user-friendliness

---

## Server Actions (Backend)

### Generate Trip Schedule (`actions/generate-trip-schedule.ts`)

Server-side action that calls OpenRouter API to format the calculated schedule.

```tsx
"use server";

export async function generateTripSchedule(data: {
  distance: number;
  departureDate: string;
  departureTime: string;
  originTimezone: string;
  destTimezone: string;
  calculatedArrival: string;
  totalDurationHours: number;
  scheduleSkeleton: any[];  // Pre-calculated day-by-day breakdown
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  // Convert skeleton to human-readable summary
  const skeletonSummary = scheduleSkeleton.map(leg =>
    `Day ${leg.day}: Drive ${to12h(leg.driveStart)} to ${to12h(leg.driveEnd)}. Then ${leg.restType} until ${to12h(leg.restEnd)}`
  ).join('\n');

  const prompt = `
  You are an expert DOT Logistics Planner by Blackhawk AI.

  CRITICAL: CALCULATED SKELETON (FOLLOW THIS EXACTLY):
  ${skeletonSummary}

  STRICT RULES:
  1. ADHERE TO THE SKELETON ABOVE. The calculator has already determined the legal breaks/resets.
  2. If the skeleton says "34-hour Cycle Reset", YOU MUST SCHEDULE IT EXACTLY THERE.
  3. HOS: 11h MAX drive/shift. 30m break REQUIRED after 8h continuous driving.
  4. SPLIT long drives: (e.g., 8h Drive -> 30m Break -> 3h Drive).
  5. MATH MUST BE EXACT: Start Time + Duration = End Time.
  6. Return ONLY valid JSON. No markdown formatting.

  JSON Structure:
  {
    "summary": { "totalDurationHours": number, "estimatedArrival": "string" },
    "schedule": [
      { "day": 1, "date": "YYYY-MM-DD", "activity": "Drive/Rest/Break",
        "start": "h:mm AM/PM", "end": "h:mm AM/PM", "notes": "string" }
    ]
  }
  `;

  // Call OpenRouter API
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "model": "meta-llama/llama-3.3-70b-instruct",
      "response_format": { "type": "json_object" },
      "messages": [
        { "role": "system", "content": "You are a JSON-only API." },
        { "role": "user", "content": prompt }
      ]
    })
  });

  // Parse and return the schedule
  const jsonBody = await response.json();
  const content = jsonBody.choices?.[0]?.message?.content;
  return JSON.parse(content);
}
```

**What it does:**
- Receives the pre-calculated schedule skeleton from the frontend
- Sends it to Meta Llama 3.3 70B via OpenRouter API
- AI formats the skeleton into a detailed, human-readable schedule
- AI cannot change the timeline, only add "color" and proper formatting
- Returns structured JSON with day-by-day activities

---

## Styling System

### Global CSS (`app/globals.css`)

Uses Tailwind CSS v4 with CSS custom properties for theming.

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);           /* White */
  --foreground: oklch(0.145 0 0);       /* Near black */
  --primary: oklch(0.205 0 0);          /* Dark gray */
  --primary-foreground: oklch(0.985 0 0); /* White */
  --destructive: oklch(0.577 0.245 27.325); /* Red */
  /* ... more color variables ... */
}

.dark {
  --background: oklch(0.145 0 0);       /* Dark mode overrides */
  --foreground: oklch(0.985 0 0);
  /* ... */
}
```

**What it does:**
- Defines color palette using OKLCH color space
- Provides light and dark mode variables
- Sets base border and outline colors
- Integrates with shadcn/ui component theming

### Utility Function (`lib/utils.ts`)

```tsx
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**What it does:**
- Combines `clsx` (conditional classes) with `tailwind-merge` (deduplication)
- Allows merging Tailwind classes without conflicts
- Used throughout all components for className composition

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         USER INPUT                          │
│  Distance, Departure Date/Time, Timezones, Delivery Window  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRIP PLANNER (Frontend)                  │
│                                                             │
│  getTripCalculation()                                       │
│  ├─ Parse inputs with Luxon                                 │
│  ├─ Simulation loop (while remainingDriveHours > 0)         │
│  │   ├─ Calculate drive block (min of all limits)           │
│  │   ├─ Apply 30-min break if needed                        │
│  │   ├─ Apply 10h rest if shift limit reached               │
│  │   ├─ Apply 34h reset if 70h rule triggered               │
│  │   └─ Insert ghost days if needed                         │
│  ├─ Apply weekend staging if arriving Sat/Sun               │
│  └─ Return TripResult with daySchedule[]                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐     ┌─────────────────────────────────┐
│  "Calculator Only"  │     │      "Smart Schedule (AI)"      │
│                     │     │                                 │
│  Display TripResult │     │  generateTripSchedule()         │
│  directly in UI     │     │  ├─ Serialize daySchedule       │
│                     │     │  ├─ Send to OpenRouter API      │
│                     │     │  ├─ LLM formats into JSON       │
│                     │     │  └─ Return AISchedule           │
└─────────────────────┘     └─────────────────────────────────┘
                                          │
                                          ▼
                            ┌─────────────────────────────────┐
                            │         RENDERED OUTPUT         │
                            │  • Arrival Status (On Time/Late)│
                            │  • Day-by-day schedule cards    │
                            │  • Trip Summary statistics      │
                            │  • Time Activity projections    │
                            │  • Latest Departure time        │
                            └─────────────────────────────────┘
```

---

## DOT HOS Logic Deep Dive

### Rules Implemented

| Rule | Limit | Implementation |
|------|-------|----------------|
| Drive Limit | 11 hours max per shift | `driveTimeInShift` counter |
| On-Duty Limit | 14 hours max per shift | `onDutyTimeInShift` counter |
| 30-Minute Break | Required after 8h driving | `driveTimeSinceBreak` counter |
| 10-Hour Rest | Required between shifts | `restDuration = 10` |
| 70-Hour Rule | Max 70h in 8 days | `cycleDriveAccumulator` (triggers at 55h) |
| 34-Hour Reset | Resets 70-hour clock | `restDuration = 34`, resets accumulator |

### Hardcoded Constants

| Line | Value | Purpose |
|------|-------|---------|
| 58 | `"3300"` | Default distance input |
| 86 | `52.5 mph` | Average speed for calculations |
| 132 | `10 hours` | Daily drive cap (pacing strategy) |
| 202 | `55 hours` | Threshold to trigger 34-hour reset |
| 225-233 | `5 AM` | Driver start time enforcement |
| 319 | `6 AM Monday` | Start time after weekend staging |

### War Room Scenario

The codebase was tuned for a specific "War Room" scenario:
- **3600 miles** from East Coast to West Coast
- **Sunday departure** (Dec 28)
- **Monday delivery** (Jan 5)
- Driver drives 10h/day (525 miles) for 6 days
- 34-hour reset triggers on Day 6 (after ~55h driving)
- Arrives Saturday, stages until Monday 6 AM
- Final 1-hour leg to dock on Monday morning

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes (for AI) | API key for OpenRouter LLM access |

Create `.env.local` in project root:
```
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

---

## Future Considerations

1. **Persistent State**: Currently all checklist state is local (resets on refresh). Consider localStorage or database.

2. **Search Functionality**: Search bar in SearchAdd component is non-functional.

3. **Settings Tab**: Currently a placeholder.

4. **Dynamic Pacing**: Make the 10h/day cap dynamic based on trip length for shorter trips.

5. **Mobile PWA**: Add manifest.json and service worker for true PWA experience.
