import { GameState, Player, BattleResult, Card, Punishment } from "@/types/game";
import { ALL_CARDS } from "@/data/cards";
import { getRandomPunishment } from "@/data/punishments";

const INITIAL_HP = 100000;

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
    hand: [],
    selectedCardIndex: null,
    ready: false,
  };

  const game: GameState = {
    roomId,
    phase: "waiting",
    players: [player, null],
    currentTurn: 0,
    battleLog: [],
    winner: null,
    punishment: null,
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
    hand: [],
    selectedCardIndex: null,
    ready: false,
  };

  game.players[1] = player;
  game.phase = "scanning"; // Go to scanning phase instead of playing
  return game;
}

export function submitHand(
  roomId: string,
  playerId: string,
  cardIds: string[]
): GameState | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "scanning") return null;

  const playerIndex = game.players.findIndex((p) => p?.id === playerId);
  if (playerIndex === -1) return null;

  const player = game.players[playerIndex]!;
  if (player.ready) return null; // Already submitted

  // Resolve card IDs to actual cards
  const hand: Card[] = [];
  for (const cardId of cardIds) {
    const card = ALL_CARDS.find((c) => c.id === cardId);
    if (card) {
      hand.push({ ...card });
    }
  }

  if (hand.length === 0) return null;

  player.hand = hand;
  player.ready = true;

  // Check if both players are ready
  const bothReady = game.players[0]?.ready && game.players[1]?.ready;
  if (bothReady) {
    game.phase = "playing";
  }

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
    game.punishment = getRandomPunishment();
  } else if (currentPlayer.hand.length === 0 && opponent.hand.length === 0) {
    // Both out of cards - higher HP wins
    game.phase = "finished";
    const p0 = game.players[0]!;
    const p1 = game.players[1]!;
    game.winner = p0.hp >= p1.hp ? p0.id : p1.id;
    game.punishment = getRandomPunishment();
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
  const playerIndex = game.players.findIndex((p) => p?.id === playerId);
  const opponentIndex = playerIndex === 0 ? 1 : 0;

  const view = JSON.parse(JSON.stringify(game)) as GameState;

  if (view.players[opponentIndex]) {
    const opponent = view.players[opponentIndex]!;
    // During scanning, hide opponent's readiness details
    if (view.phase === "scanning") {
      opponent.hand = [];
    } else {
      opponent.hand = opponent.hand.map(() => ({
        id: "hidden",
        name: "???",
        type: "zombie" as const,
        rarity: "R" as const,
        atk: 0,
        def: 0,
        image: "",
      }));
    }
    opponent.selectedCardIndex = null;
  }

  return view;
}

export function deleteGame(roomId: string): void {
  games.delete(roomId);
}
