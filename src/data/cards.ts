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

export function getRandomHand(count: number): Card[] {
  const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
