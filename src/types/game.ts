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
  ready: boolean;
  isRoomCreator: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

export interface RoundState {
  roundNumber: number;
  player1CardIndex: number | null;
  player2CardIndex: number | null;
  timeoutAt: number; // Unix timestamp (ms) when 10s is up
  bothSubmitted: boolean;
}

export interface BattleResult {
  roundNumber: number;
  player1Card: Card;
  player2Card: Card;
  damageToPlayer1: number;
  damageToPlayer2: number;
  player1HpAfter: number;
  player2HpAfter: number;
}

export type GamePhase =
  | "lobby"       // multiplayer: waiting for players, chat, ready
  | "scanning"    // both players scanning their cards
  | "playing"     // simultaneous card selection rounds
  | "finished";   // game over

export interface Punishment {
  id: number;
  text: string;
  emoji: string;
  category: string;
}

export type GameMode = "solo" | "multiplayer";

export interface GameState {
  roomId: string;
  mode: GameMode;
  phase: GamePhase;
  players: [Player | null, Player | null];
  currentRound: RoundState | null;
  battleLog: BattleResult[];
  chatMessages: ChatMessage[];
  winner: string | null;
  punishment: Punishment | null;
}

export interface RoomInfo {
  roomId: string;
  playerIndex: number;
  playerId: string;
  mode: GameMode;
}
