# War Room Logic: Long-Haul Trip Strategy
**Scenario:** 3600 Miles | Dec 28 Departure (Sunday) | Jan 5 Delivery (Monday)

## The Core Constraints ("The Rules")
1.  **Mileage Cap:** 525 miles/day (approx. 10 hours driving).
2.  **Start Time:** Strict **5:00 AM** starts.
3.  **70-Hour Rule Trigger:** Force **34-hour Cycle Reset** if accumulated On-Duty > 60 hours.
4.  **Staging Requirement:** "No Overnight Parking at POD". Stop ~50 miles away.
5.  **3:00 PM Deadline:** Arrival must be before 3 PM on delivery day.

---

## The "Clean" Itinerary (Detailed Breakdown)

**Trip Start:** Sunday, Dec 28 @ 5:00 AM

### Day 1 (Sunday, Dec 28)
*   **Activity:** Drive 10 Hours
*   **Hours:** 10.0 Drive + 2.0 Init + 0.15 Checks + 0.5 Duty = 12.65 On-Duty.
*   **Accumulated:** **12.65 Hours**.
*   **Distance:** 525 Miles.
*   **Status:** Good.

### Day 2 (Monday, Dec 29)
*   **Activity:** Drive 10 Hours
*   **Hours:** 10.0 Drive + 0.15 Checks + 0.5 Duty = 10.65 On-Duty.
*   **Accumulated:** **23.30 Hours**.
*   **Distance:** 525 Miles (Total: 1050).
*   **Status:** Good.

### Day 3 (Tuesday, Dec 30)
*   **Activity:** Drive 10 Hours
*   **Hours:** 10.0 Drive + 0.15 Checks + 0.5 Duty = 10.65 On-Duty.
*   **Accumulated:** **33.95 Hours**.
*   **Distance:** 525 Miles (Total: 1575).
*   **Status:** Good.

### Day 4 (Wednesday, Dec 31)
*   **Activity:** Drive 10 Hours
*   **Hours:** 10.0 Drive + 0.15 Checks + 0.5 Duty = 10.65 On-Duty.
*   **Accumulated:** **44.60 Hours**.
*   **Distance:** 525 Miles (Total: 2100).
*   **Status:** Good.

### Day 5 (Thursday, Jan 1)
*   **Activity:** Drive 10 Hours
*   **Hours:** 10.0 Drive + 0.15 Checks + 0.5 Duty = 10.65 On-Duty.
*   **Accumulated:** **55.25 Hours**.
*   **Distance:** 525 Miles (Total: 2625).
*   **Status:** 14.75 Hours remaining on 70h Clock.

### Day 6 (Friday, Jan 2) — The Critical Decision
*   **Available Hours:** 14.75 Hours (70.0 - 55.25).
*   **Execution:** 5:00 AM - 4:30 PM (10.65 Hours On-Duty).
*   **End of Day:** Accum: **65.90 Hours**. (4.1 Hours Remaining).
*   **Total Miles:** 3150.
*   **Reset Start:** **Friday Night**.

### Day 7 (Saturday, Jan 3)
*   **Activity:** **34-Hour Reset** (All Day)
*   **Status:** Parked.

### Day 8 (Sunday, Jan 4) — Staging
*   **Activity:** Drive to Staging Area (50 mi from POD).
*   **Reset Ends:** **Sunday @ 2:30 AM**.
*   **Plan:** Drive ~400 Miles. (Stop short of Dest).
*   **Hours:** 7.6 Drive + 0.15 Checks + 0.5 Duty = 8.25 On-Duty.
*   **Status:** Parked at Truck Stop/Rest Area near Receiver.
*   **Clock Remaining:** **61
*   **Start:** 6:00 AM.
*   **Drive:** 50 Miles (~1 Hour).
*   **Hours:** 1.0 Drive + 0.5 Duty (Pre/Post) = 1.5 On-Duty.
*   **Arrival:** **7:30 AM**.
*   **Deadline:** 3:00 PM (Met ✅).
*   **Clock Remaining:** **60.25 Hours**. (Plenty of time for next load).

## Implementation Status
*   **Logic:** Implemented in `trip-planner.tsx`.
*   **AI:** Instructed to follow this skeleton..75 Hours**. (Fresh 70h - 8.25h).

### Day 9 (Monday, Jan 5) — Delivery
*   **Activity:** Final Leg -> Unload.
