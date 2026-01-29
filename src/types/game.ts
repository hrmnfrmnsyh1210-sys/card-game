export type CardType = "plant" | "zombie";
export type Rarity = "R" | "SR" | "SSR";

export interface Card {
  id: string;
  name: string;
  type: CardType;
  rarity: Rarity;
  atk: number;
  def: number;
  image: string;
}

export interface Player {
  id: string;
  name: string;
  hp: number;
  hand: Card[];
  selectedCardIndex: number | null;
}

export interface BattleResult {
  attackerId: string;
  defenderId: string;
  attackerCard: Card;
  defenderCard: Card | null;
  damage: number;
  defenderHpAfter: number;
}

export type GamePhase =
  | "waiting"      // waiting for player 2
  | "playing"      // game in progress
  | "finished";    // game over

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: [Player | null, Player | null];
  currentTurn: number; // index 0 or 1
  battleLog: BattleResult[];
  winner: string | null;
}

export interface RoomInfo {
  roomId: string;
  playerIndex: number;
  playerId: string;
}
