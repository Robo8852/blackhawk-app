"use server";

export async function generateTripSchedule(data: {
  distance: number;
  departureDate: string;
  departureTime: string;
  originTimezone: string;
  destTimezone: string;
  calculatedArrival: string;
  totalDurationHours: number;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const prompt = `
  You are an expert DOT Logistics Planner (AI Agent).
  Calculated Ground Truths (PHYSICS):
  - Total Distance: ${data.distance} miles
  - Avg Speed: 52.5 mph
  - Total Drive Time: ${data.totalDurationHours.toFixed(2)} hours
  - Departure: ${data.departureDate} at ${data.departureTime}
  - Target Arrival: ${data.calculatedArrival}
  
  The user wants a realistic day-by-day trucking schedule that adheres to these physics.
  
  STRICT RULES:
  1. START the schedule EXACTLY at ${data.departureDate} ${data.departureTime}.
  2. HOS: 11h MAX drive/shift. 30m break REQUIRED after 8h continuous driving.
  3. SPLIT long drives: Do not schedule 11h straight. (e.g., 8h Drive -> 30m Break -> 3h Drive).
  4. MATH MUST BE EXACT: Start Time + Duration = End Time.
     - Example: 4:30 PM + 10 hours rest = 2:30 AM (Next Day).
     - Do not shortage the 10h rest.
  5. DRIVER WELLNESS: Only 3am-9am starts.
     - If a 10h rest ends at 2:30 AM, EXTEND the rest to 6:00 AM.
     - Drivers are humans, not robots. Avoid "flipped" sleep schedules.
  6. Events must be SEQUENTIAL. Do not overlap start/end times.
  7. The final arrival MUST match the Target Arrival. Adjust breaks/splits to align.
  5. Return ONLY valid JSON. No markdown formatting. No conversational text.
  
  JSON Structure:
  {
    "summary": { "totalDurationHours": number, "estimatedArrival": "string" },
    "schedule": [
      { "day": 1, "date": "YYYY-MM-DD", "activity": "Drive/Rest/Break", "start": "h:mm AM/PM", "end": "h:mm AM/PM", "notes": "string" }
    ]
  }
  `;

  console.log("Generating Trip Schedule with OpenRouter...");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3001",
        "X-Title": "Blackhawk App",
      },
      body: JSON.stringify({
        "model": "meta-llama/llama-3.3-70b-instruct",
        "response_format": { "type": "json_object" },
        "messages": [
          { "role": "system", "content": "You are a specialized JSON-only API. You must strictly output valid JSON matching the requested schema. Do not output markdown blocks." },
          { "role": "user", "content": prompt }
        ]
      })
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error(`OpenRouter Error (${response.status}):`, rawText);
      throw new Error(`OpenRouter API failed: ${response.status} ${response.statusText}`);
    }

    let jsonBody;
    try {
      jsonBody = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse OpenRouter response body as JSON. Raw text:", rawText);
      throw new Error("Invalid JSON response from OpenRouter API wrapper");
    }

    const content = jsonBody.choices?.[0]?.message?.content;
    if (!content) {
      console.error("Unexpected OpenRouter structure:", jsonBody);
      throw new Error("No content in OpenRouter response");
    }

    // Clean markdown code blocks if present
    let cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();

    // Find valid JSON start/end
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleanContent);

  } catch (error) {
    console.error("Failed to generate schedule:", error);
    throw error;
  }
}
