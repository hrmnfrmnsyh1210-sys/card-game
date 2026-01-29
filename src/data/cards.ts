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

// Keywords for OCR matching - all lowercase
// Includes card name, ID, and common OCR misreads
const CARD_KEYWORDS: Record<string, string[]> = {
  "PZIT01-R-004": ["cabbage", "pult", "cabbage-pult", "cabbagepult", "pzit01-r-004", "r-004", "r004"],
  "PZIT01-R-029": ["imp", "pzit01-r-029", "r-029", "r029"],
  "PZIT01-R-002": ["peashooter", "pea", "shooter", "pzit01-r-002", "r-002", "r002"],
  "PZIT01-R-010": ["sunflower", "sun", "flower", "pzit01-r-010", "r-010", "r010"],
  "PZIT01-R-025": ["browncoat", "zombie", "browncoat zombie", "pzit01-r-025", "r-025", "r025"],
  "PZIT01-R-030": ["conehead", "cone", "head", "conehead zombie", "pzit01-r-030", "r-030", "r030"],
};

/**
 * Match OCR text against card database.
 * Returns the best matching card or null.
 */
export function matchCardFromText(ocrText: string): Card | null {
  const text = ocrText.toLowerCase().replace(/[^a-z0-9\-\s]/g, "");

  let bestCard: Card | null = null;
  let bestScore = 0;

  for (const card of ALL_CARDS) {
    const keywords = CARD_KEYWORDS[card.id] || [];
    let score = 0;

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        // Longer keyword match = higher score
        score += keyword.length;
      }
    }

    // Also try matching the card ID directly
    const idClean = card.id.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (text.replace(/[^a-z0-9]/g, "").includes(idClean)) {
      score += 20; // Strong match
    }

    // Match card name directly
    const nameClean = card.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (text.replace(/[^a-z0-9]/g, "").includes(nameClean)) {
      score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  // Require minimum confidence
  return bestScore >= 3 ? bestCard : null;
}

export function getRandomHand(count: number): Card[] {
  const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
