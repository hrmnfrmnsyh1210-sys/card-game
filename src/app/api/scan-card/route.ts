import { NextResponse } from "next/server";
import { ALL_CARDS } from "@/data/cards";

const CARD_LIST = ALL_CARDS.map(
  (c) => `- ID: "${c.id}", Name: "${c.name}", ATK: ${c.atk}, DEF: ${c.def}, Type: ${c.type}`
).join("\n");

const SYSTEM_PROMPT = `You are a card scanner for a Plants vs Zombies card game.
You will receive a photo of a physical trading card. Your job is to identify the card.

Here are ALL valid cards in the database:
${CARD_LIST}

Look at the card image carefully. Identify the card by reading:
1. The card name (e.g., "CABBAGE-PULT", "IMP")
2. The ATK and DEF numbers
3. The card ID at the bottom (e.g., "PZIT01-R-004")
4. The character artwork

Respond with ONLY the card ID (e.g., "PZIT01-R-004") if you can identify the card.
If you cannot identify the card, respond with "UNKNOWN".
Do not include any other text in your response.`;

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

    // image is a base64 data URL: "data:image/jpeg;base64,..."
    // Groq's OpenAI-compatible API accepts image URLs including data URIs
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SYSTEM_PROMPT },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Groq API error:", response.status, errBody);
      return NextResponse.json(
        { error: "AI service error" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const responseText = (data.choices?.[0]?.message?.content || "").trim();

    // Try to match the response to a card
    const matchedCard = ALL_CARDS.find(
      (c) => c.id === responseText || c.id === responseText.replace(/"/g, "")
    );

    if (matchedCard) {
      return NextResponse.json({
        success: true,
        card: matchedCard,
        rawResponse: responseText,
      });
    }

    // If exact ID didn't match, try fuzzy matching from response
    const responseLower = responseText.toLowerCase();
    const fuzzyMatch = ALL_CARDS.find(
      (c) =>
        responseLower.includes(c.id.toLowerCase()) ||
        responseLower.includes(c.name.toLowerCase())
    );

    if (fuzzyMatch) {
      return NextResponse.json({
        success: true,
        card: fuzzyMatch,
        rawResponse: responseText,
      });
    }

    return NextResponse.json({
      success: false,
      card: null,
      rawResponse: responseText,
    });
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
