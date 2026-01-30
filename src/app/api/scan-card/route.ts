import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a card reader for a Plants vs Zombies trading card game.
You will receive a photo of a physical trading card. Read ALL information from the card accurately.

You MUST extract:
1. **name**: The character name on the card (e.g., "Future Zombie", "Cabbage-Pult", "Imp", etc.)
2. **type**: Is it a "plant" or "zombie"? Determine from the card design/character.
3. **rarity**: The rarity symbol/text (e.g., "R", "SR", "SSR", "UR", "N", etc.)
4. **atk**: The ATK (attack) number. This is usually a large number like 12000, 18000, 20000, etc.
5. **def**: The DEF (defense) number. This is usually a large number like 12000, 14000, 20000, etc.
6. **card_id**: The card ID printed on the card (usually at the bottom, format like "PZIT01-R-004" or "PZIT01-SR-012")

IMPORTANT:
- Read the EXACT numbers for ATK and DEF. Do NOT guess. If you see "20000" write 20000.
- Read the EXACT name as printed on the card.
- If you truly cannot read a value, use null for that field.
- ATK is usually shown with a sword/attack icon, DEF with a shield/defense icon.

Reply with ONLY this JSON format, nothing else:
{
  "name": "character name",
  "type": "plant" or "zombie",
  "rarity": "R" or "SR" or "SSR" etc,
  "atk": number or null,
  "def": number or null,
  "card_id": "ID string" or null
}`;

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Groq API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { image } = await req.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    let imageUrl = image;
    if (!image.startsWith("data:")) {
      imageUrl = `data:image/jpeg;base64,${image}`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SYSTEM_PROMPT },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Groq API error:", response.status, errBody);
      return NextResponse.json(
        { error: `AI service error (${response.status})`, detail: errBody },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText = (data.choices?.[0]?.message?.content || "").trim();
    console.log("AI raw response:", rawText);

    // Parse JSON from AI response
    let parsed: {
      name?: string;
      type?: string;
      rarity?: string;
      atk?: number | null;
      def?: number | null;
      card_id?: string | null;
    } = {};

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse AI JSON:", rawText);
      return NextResponse.json({
        success: false,
        card: null,
        rawResponse: rawText,
        error: "AI response bukan format yang valid",
      });
    }

    // Validate minimum data
    const name = parsed.name?.trim();
    if (!name) {
      return NextResponse.json({
        success: false,
        card: null,
        rawResponse: rawText,
        error: "AI tidak bisa membaca nama kartu",
      });
    }

    // Determine type
    let cardType: "plant" | "zombie" = "zombie";
    if (parsed.type) {
      const t = parsed.type.toLowerCase();
      if (t.includes("plant")) cardType = "plant";
      else if (t.includes("zombie")) cardType = "zombie";
    }

    // Build card from AI-read data
    const cardId = parsed.card_id || `SCAN-${Date.now()}`;
    const rarity = parsed.rarity || "?";
    const atk = typeof parsed.atk === "number" && parsed.atk > 0 ? parsed.atk : 10000;
    const def = typeof parsed.def === "number" && parsed.def > 0 ? parsed.def : 10000;

    const card = {
      id: cardId,
      name: name,
      type: cardType,
      rarity: rarity,
      atk: atk,
      def: def,
      image: "",
    };

    console.log("Scanned card:", card);

    return NextResponse.json({
      success: true,
      card,
      rawResponse: rawText,
    });
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
