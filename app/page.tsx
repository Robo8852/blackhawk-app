"use client";

import { Header } from "@/components/header";
import { SearchAdd } from "@/components/search-add";
import { TaskList } from "@/components/task-list";
import { Routes } from "@/components/routes";
import { TripPlanner } from "@/components/trip-planner";
import { WeatherWizard } from "@/components/weather-wizard";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("inspections");

  return (
    <main className="min-h-screen bg-white pb-32 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl">
        <Header />
        <SearchAdd />
        {activeTab === "inspections" && <TaskList />}
        {activeTab === "delivery" && <Routes />}
        {activeTab === "calendar" && <TripPlanner />}
        {activeTab === "settings" && <WeatherWizard />}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </main>
  );
}
