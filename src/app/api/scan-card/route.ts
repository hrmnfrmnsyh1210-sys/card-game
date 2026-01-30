import { NextResponse } from "next/server";
import { ALL_CARDS } from "@/data/cards";

const SYSTEM_PROMPT = `You are analyzing a photo of a Plants vs Zombies trading card.

Describe what you see in the card image. Answer these questions:
1. What character is shown? (e.g., a plant that shoots peas, a small purple zombie, a zombie with a cone on its head, a plant that throws cabbages, a sunflower, a regular zombie)
2. Is it a PLANT or a ZOMBIE character?
3. Can you read any numbers on the card? (like ATK/DEF stats such as 12000, 18000, etc.)
4. Can you read any text? (card name, card ID like PZIT01-R-004)
5. What are the main colors of the character?

Reply in this EXACT JSON format:
{
  "character_description": "brief description of the character",
  "type": "plant" or "zombie",
  "numbers": [list of any numbers you can read],
  "text_found": "any text you can read on the card",
  "colors": "main colors"
}

ONLY reply with the JSON, no other text.`;

interface AIResponse {
  character_description?: string;
  type?: string;
  numbers?: number[];
  text_found?: string;
  colors?: string;
}

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

    // Parse AI response
    let aiResult: AIResponse = {};
    try {
      // Extract JSON from response (AI might wrap it in markdown)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse AI JSON, using raw text matching");
    }

    // ═══ MATCHING STRATEGY ═══
    // Score each card based on AI description
    const scores: Record<string, number> = {};
    for (const card of ALL_CARDS) {
      scores[card.id] = 0;
    }

    const descLower = (
      (aiResult.character_description || "") +
      " " +
      (aiResult.text_found || "") +
      " " +
      (aiResult.colors || "") +
      " " +
      rawText
    ).toLowerCase();

    // ── 1. Type matching (plant vs zombie) ──
    const aiType = (aiResult.type || "").toLowerCase();
    for (const card of ALL_CARDS) {
      if (aiType === card.type) {
        scores[card.id] += 5;
      }
    }

    // ── 2. Character description keyword matching ──
    const characterKeywords: Record<string, string[]> = {
      "PZIT01-R-004": ["cabbage", "pult", "catapult", "throw", "lettuce", "green vegetable", "leafy", "launch"],
      "PZIT01-R-029": ["imp", "small zombie", "tiny zombie", "purple", "little zombie", "mischievous", "gremlin"],
      "PZIT01-R-002": ["pea", "shooter", "peashooter", "shoot", "green plant", "peas", "spit"],
      "PZIT01-R-010": ["sunflower", "sun", "flower", "yellow", "daisy", "happy plant", "smiling"],
      "PZIT01-R-025": ["browncoat", "regular zombie", "basic zombie", "normal zombie", "brown", "plain zombie", "standard zombie", "walking dead"],
      "PZIT01-R-030": ["conehead", "cone", "traffic cone", "orange cone", "cone hat", "cone on head", "road cone"],
    };

    for (const [cardId, keywords] of Object.entries(characterKeywords)) {
      for (const kw of keywords) {
        if (descLower.includes(kw)) {
          // Longer keywords are stronger signals
          scores[cardId] += kw.length >= 6 ? 15 : 8;
        }
      }
    }

    // ── 3. Number/stat matching ──
    const aiNumbers = aiResult.numbers || [];
    // Also extract numbers from raw text
    const rawNumbers = (rawText.match(/\d{4,6}/g) || []).map(Number);
    const allNumbers = [...new Set([...aiNumbers, ...rawNumbers])];

    const statPairs: Record<string, [number, number]> = {
      "PZIT01-R-004": [12000, 12000],
      "PZIT01-R-029": [18000, 14000],
      "PZIT01-R-002": [15000, 10000],
      "PZIT01-R-010": [8000, 16000],
      "PZIT01-R-025": [13000, 11000],
      "PZIT01-R-030": [14000, 15000],
    };

    for (const [cardId, [atk, def]] of Object.entries(statPairs)) {
      if (allNumbers.includes(atk)) scores[cardId] += 12;
      if (allNumbers.includes(def)) scores[cardId] += 12;
      // Both ATK and DEF = very strong
      if (allNumbers.includes(atk) && allNumbers.includes(def)) {
        scores[cardId] += 20;
      }
    }

    // ── 4. Direct text/name matching ──
    for (const card of ALL_CARDS) {
      const nameLower = card.name.toLowerCase();
      if (descLower.includes(nameLower)) {
        scores[card.id] += 30;
      }
      // First word match
      const firstName = nameLower.split(/[\s\-]/)[0];
      if (firstName.length >= 3 && descLower.includes(firstName)) {
        scores[card.id] += 15;
      }
      // ID match
      if (descLower.includes(card.id.toLowerCase())) {
        scores[card.id] += 50;
      }
    }

    // Find best match
    let bestId = "";
    let bestScore = 0;
    for (const [cardId, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestId = cardId;
      }
    }

    console.log("Card scores:", scores, "Best:", bestId, "Score:", bestScore);

    // Minimum threshold
    if (bestScore < 5) {
      return NextResponse.json({
        success: false,
        card: null,
        rawResponse: rawText,
        scores,
      });
    }

    const matchedCard = ALL_CARDS.find((c) => c.id === bestId);
    return NextResponse.json({
      success: true,
      card: matchedCard,
      rawResponse: rawText,
      scores,
      confidence: bestScore,
    });
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
