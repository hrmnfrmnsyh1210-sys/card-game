import { Card } from "@/types/game";

export const ALL_CARDS: Card[] = [
  {
    id: "PZIT01-R-004",
    name: "Cabbage-Pult",
    type: "plant",
    rarity: "R",
    atk: 12000,
    def: 12000,
    image: "/cards/cabbage-pult.png",
  },
  {
    id: "PZIT01-R-029",
    name: "Imp",
    type: "zombie",
    rarity: "R",
    atk: 18000,
    def: 14000,
    image: "/cards/imp.png",
  },
  {
    id: "PZIT01-R-002",
    name: "Peashooter",
    type: "plant",
    rarity: "R",
    atk: 15000,
    def: 10000,
    image: "/cards/peashooter.png",
  },
  {
    id: "PZIT01-R-010",
    name: "Sunflower",
    type: "plant",
    rarity: "R",
    atk: 8000,
    def: 16000,
    image: "/cards/sunflower.png",
  },
  {
    id: "PZIT01-R-025",
    name: "Browncoat Zombie",
    type: "zombie",
    rarity: "R",
    atk: 13000,
    def: 11000,
    image: "/cards/browncoat-zombie.png",
  },
  {
    id: "PZIT01-R-030",
    name: "Conehead Zombie",
    type: "zombie",
    rarity: "R",
    atk: 14000,
    def: 15000,
    image: "/cards/conehead-zombie.png",
  },
];

// ─── OCR Matching ────────────────────────────────────────────

// Name keywords (lowercase, includes partial/common OCR misreads)
const NAME_KEYWORDS: Record<string, string[]> = {
  "PZIT01-R-004": ["cabbage", "pult", "cabbage-pult", "cabbagepult", "gabbage", "cabb"],
  "PZIT01-R-029": ["imp"],
  "PZIT01-R-002": ["peashooter", "pea", "shooter", "peasho"],
  "PZIT01-R-010": ["sunflower", "sun", "flower", "sunf"],
  "PZIT01-R-025": ["browncoat", "zombie", "brown"],
  "PZIT01-R-030": ["conehead", "cone", "head"],
};

// ATK/DEF number pairs for matching (unique per card)
const STAT_PAIRS: Record<string, [number, number]> = {
  "PZIT01-R-004": [12000, 12000],
  "PZIT01-R-029": [18000, 14000],
  "PZIT01-R-002": [15000, 10000],
  "PZIT01-R-010": [8000, 16000],
  "PZIT01-R-025": [13000, 11000],
  "PZIT01-R-030": [14000, 15000],
};

// All unique stat numbers mapped to possible card IDs
const NUMBER_TO_CARDS: Record<number, string[]> = {};
for (const [cardId, [atk, def]] of Object.entries(STAT_PAIRS)) {
  if (!NUMBER_TO_CARDS[atk]) NUMBER_TO_CARDS[atk] = [];
  if (!NUMBER_TO_CARDS[def]) NUMBER_TO_CARDS[def] = [];
  NUMBER_TO_CARDS[atk].push(cardId);
  NUMBER_TO_CARDS[def].push(cardId);
}

/**
 * Extract all numbers from OCR text
 */
function extractNumbers(text: string): number[] {
  const matches = text.match(/\d{4,6}/g);
  if (!matches) return [];
  return matches.map(Number);
}

/**
 * Match OCR text against card database using multiple strategies.
 */
export function matchCardFromText(ocrText: string): Card | null {
  const textLower = ocrText.toLowerCase();
  const textClean = textLower.replace(/[^a-z0-9\s\-]/g, "");
  const textAlphaOnly = textClean.replace(/[^a-z]/g, "");

  const scores: Record<string, number> = {};

  for (const card of ALL_CARDS) {
    scores[card.id] = 0;
  }

  // ── Strategy 1: Card ID match (strongest signal) ──
  for (const card of ALL_CARDS) {
    const idLower = card.id.toLowerCase();
    // Full ID
    if (textClean.includes(idLower) || textClean.replace(/\s/g, "").includes(idLower.replace(/-/g, ""))) {
      scores[card.id] += 50;
    }
    // Partial ID (e.g., "r-004", "r004", "004")
    const idParts = idLower.split("-");
    for (const part of idParts) {
      if (part.length >= 3 && textClean.includes(part)) {
        scores[card.id] += 8;
      }
    }
  }

  // ── Strategy 2: Name keyword match ──
  for (const [cardId, keywords] of Object.entries(NAME_KEYWORDS)) {
    for (const kw of keywords) {
      if (textClean.includes(kw) || textAlphaOnly.includes(kw.replace(/[^a-z]/g, ""))) {
        scores[cardId] += kw.length * 2;
      }
    }
  }

  // ── Strategy 3: Number/stat match (ATK/DEF values) ──
  const numbers = extractNumbers(ocrText);
  for (const num of numbers) {
    // Exact number match
    if (NUMBER_TO_CARDS[num]) {
      for (const cardId of NUMBER_TO_CARDS[num]) {
        scores[cardId] += 10;
      }
    }
    // Check if both ATK and DEF found → very strong match
    for (const [cardId, [atk, def]] of Object.entries(STAT_PAIRS)) {
      if (numbers.includes(atk) && numbers.includes(def)) {
        scores[cardId] += 30;
      }
    }
  }

  // ── Strategy 4: Card name direct match ──
  for (const card of ALL_CARDS) {
    const nameLower = card.name.toLowerCase();
    const nameClean = nameLower.replace(/[^a-z]/g, "");
    if (textAlphaOnly.includes(nameClean)) {
      scores[card.id] += 25;
    }
    // First word of name (e.g., "cabbage", "imp", "peashooter")
    const firstName = nameLower.split(/[\s\-]/)[0];
    if (firstName.length >= 3 && textAlphaOnly.includes(firstName)) {
      scores[card.id] += 12;
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

  // Minimum confidence threshold
  if (bestScore < 6) return null;

  return ALL_CARDS.find((c) => c.id === bestId) || null;
}

export function getRandomHand(count: number): Card[] {
  const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
