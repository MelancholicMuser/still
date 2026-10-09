import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { action, prompt, hobbyName, stepText, currentStreak } = body;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    if (action === "generate_hobby") {
      const systemInstruction = `You are the AI engine for 'Still', a micro-hobby habit app helping people replace doomscrolling with 15-minute daily offline hobbies.
The user wants a custom 15-minute hobby blueprint based on their prompt: "${prompt}".
Respond ONLY with a valid JSON object (no markdown code fences, no extra text) with this exact schema:
{
  "id": "slug-name",
  "name": "Title of Hobby",
  "emoji": "appropriate single emoji",
  "category": "Mind | Art | Movement | Writing | Cooking | Music | Craft",
  "blurb": "One compelling sentence about what you'll achieve in 15 mins",
  "matchReason": "Why this matches your vibe",
  "matchScore": 95,
  "blueprint": {
    "title": "Today's 15-Minute Blueprint",
    "minutes": 15,
    "steps": [
      { "id": "step-1", "text": "Step 1 text (e.g. Set up scrap paper, 3 min)" },
      { "id": "step-2", "text": "Step 2 text (e.g. First pass outline, 4 min)" },
      { "id": "step-3", "text": "Step 3 text (e.g. Details and shading, 5 min)" },
      { "id": "step-4", "text": "Step 4 text (e.g. Sign and wrap up, 3 min)" }
    ],
    "materials": ["Item 1, ₹0", "Item 2, ₹0"]
  }
}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: "Gemini API error", details: err }, { status: res.status });
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return NextResponse.json({ error: "Empty response from Gemini" }, { status: 500 });
      }

      const parsed = JSON.parse(rawText.replace(/^```json/, "").replace(/```$/, "").trim());
      return NextResponse.json({ hobby: parsed });
    }

    if (action === "coach_advice") {
      const coachPrompt = `You are a warm, minimalist hobby coach in 'Still'. 
Hobby: ${hobbyName || "Focus session"}.
Current step: "${stepText || "General"}"
Streak: ${currentStreak || 1} days.
User query: "${prompt || "Give me a quick 2-sentence tip to stay focused and enjoy this step."}"
Give a 2-sentence encouraging, practical tip. Do not use generic corporate filler.`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: coachPrompt }] }],
          generationConfig: {
            temperature: 0.8,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: "Gemini API error", details: err }, { status: res.status });
      }

      const data = await res.json();
      const advice = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "Stay present and take your time.";
      return NextResponse.json({ advice });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
