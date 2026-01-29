import { GameState, Player, BattleResult, Card } from "@/types/game";
import { getRandomHand } from "@/data/cards";

const INITIAL_HP = 100000;
const HAND_SIZE = 4;

// In-memory game store (reset on server restart)
const games = new Map<string, GameState>();

export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createGame(roomId: string, playerId: string, playerName: string): GameState {
  const player: Player = {
    id: playerId,
    name: playerName,
    hp: INITIAL_HP,
    hand: getRandomHand(HAND_SIZE),
    selectedCardIndex: null,
  };

  const game: GameState = {
    roomId,
    phase: "waiting",
    players: [player, null],
    currentTurn: 0,
    battleLog: [],
    winner: null,
  };

  games.set(roomId, game);
  return game;
}

export function joinGame(roomId: string, playerId: string, playerName: string): GameState | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "waiting" || game.players[1] !== null) {
    return null;
  }

  const player: Player = {
    id: playerId,
    name: playerName,
    hp: INITIAL_HP,
    hand: getRandomHand(HAND_SIZE),
    selectedCardIndex: null,
  };

  game.players[1] = player;
  game.phase = "playing";
  return game;
}

export function getGame(roomId: string): GameState | null {
  return games.get(roomId) || null;
}

export function playCard(
  roomId: string,
  playerId: string,
  cardIndex: number
): { game: GameState; battleResult: BattleResult | null } | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "playing") return null;

  const currentPlayer = game.players[game.currentTurn];
  if (!currentPlayer || currentPlayer.id !== playerId) return null;

  if (cardIndex < 0 || cardIndex >= currentPlayer.hand.length) return null;

  const attackCard = currentPlayer.hand[cardIndex];
  const opponentIndex = game.currentTurn === 0 ? 1 : 0;
  const opponent = game.players[opponentIndex];
  if (!opponent) return null;

  // Calculate damage
  const damage = Math.max(0, attackCard.atk - getAverageDefense(opponent.hand));
  opponent.hp = Math.max(0, opponent.hp - damage);

  // Remove used card from hand
  currentPlayer.hand.splice(cardIndex, 1);

  const battleResult: BattleResult = {
    attackerId: currentPlayer.id,
    defenderId: opponent.id,
    attackerCard: attackCard,
    defenderCard: null,
    damage,
    defenderHpAfter: opponent.hp,
  };

  game.battleLog.push(battleResult);

  // Check win condition
  if (opponent.hp <= 0) {
    game.phase = "finished";
    game.winner = currentPlayer.id;
  } else if (currentPlayer.hand.length === 0 && opponent.hand.length === 0) {
    // Both out of cards - higher HP wins
    game.phase = "finished";
    const p0 = game.players[0]!;
    const p1 = game.players[1]!;
    game.winner = p0.hp >= p1.hp ? p0.id : p1.id;
  } else {
    // Switch turn
    game.currentTurn = opponentIndex;
  }

  return { game, battleResult };
}

function getAverageDefense(hand: Card[]): number {
  if (hand.length === 0) return 0;
  const totalDef = hand.reduce((sum, card) => sum + card.def, 0);
  return Math.floor(totalDef / hand.length);
}

export function getPlayerView(game: GameState, playerId: string): GameState {
  // Return a copy where opponent's hand cards are hidden (no details)
  const playerIndex = game.players.findIndex((p) => p?.id === playerId);
  const opponentIndex = playerIndex === 0 ? 1 : 0;

  const view = JSON.parse(JSON.stringify(game)) as GameState;

  if (view.players[opponentIndex]) {
    const opponent = view.players[opponentIndex]!;
    opponent.hand = opponent.hand.map(() => ({
      id: "hidden",
      name: "???",
      type: "zombie" as const,
      rarity: "R" as const,
      atk: 0,
      def: 0,
      image: "",
    }));
    opponent.selectedCardIndex = null;
  }

  return view;
}

export function deleteGame(roomId: string): void {
  games.delete(roomId);
}
