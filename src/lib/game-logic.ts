import { GameState, Player, BattleResult, Card, GameMode, ChatMessage, RoundState } from "@/types/game";
import { ALL_CARDS, getRandomHand } from "@/data/cards";
import { getRandomPunishment } from "@/data/punishments";

const INITIAL_HP = 100000;
const ROUND_DURATION_MS = 10000; // 10 seconds
const BOT_ID = "bot-zombie-king";
const BOT_NAME = "Zombie King (Bot)";

const games = new Map<string, GameState>();

export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function makePlayer(id: string, name: string, isCreator: boolean): Player {
  return {
    id,
    name,
    hp: INITIAL_HP,
    hand: [],
    selectedCardIndex: null,
    ready: false,
    isRoomCreator: isCreator,
  };
}

// ─── Room Management ──────────────────────────────────────────

export function createGame(roomId: string, playerId: string, playerName: string, mode: GameMode): GameState {
  const player = makePlayer(playerId, playerName, true);

  const game: GameState = {
    roomId,
    mode,
    phase: mode === "solo" ? "scanning" : "lobby",
    players: [player, null],
    currentRound: null,
    battleLog: [],
    chatMessages: [],
    winner: null,
    punishment: null,
  };

  // Solo mode: create bot immediately with random hand
  if (mode === "solo") {
    const bot = makePlayer(BOT_ID, BOT_NAME, false);
    bot.hand = getRandomHand(4);
    bot.ready = true;
    game.players[1] = bot;
  }

  games.set(roomId, game);
  return game;
}

export function joinGame(roomId: string, playerId: string, playerName: string): GameState | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "lobby" || game.players[1] !== null) return null;

  game.players[1] = makePlayer(playerId, playerName, false);
  return game;
}

export function getGame(roomId: string): GameState | null {
  return games.get(roomId) || null;
}

export function deleteGame(roomId: string): void {
  games.delete(roomId);
}

// ─── Lobby (Chat, Ready, Start) ──────────────────────────────

export function toggleReady(roomId: string, playerId: string): GameState | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "lobby") return null;

  const player = game.players.find((p) => p?.id === playerId);
  if (!player) return null;

  player.ready = !player.ready;
  return game;
}

export function sendChatMessage(
  roomId: string,
  playerId: string,
  message: string
): { game: GameState; chatMessage: ChatMessage } | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "lobby") return null;

  const player = game.players.find((p) => p?.id === playerId);
  if (!player) return null;

  const chatMessage: ChatMessage = {
    id: crypto.randomUUID(),
    senderId: playerId,
    senderName: player.name,
    message: message.trim().slice(0, 200),
    timestamp: Date.now(),
  };

  game.chatMessages.push(chatMessage);
  return { game, chatMessage };
}

export function startGame(roomId: string, playerId: string): GameState | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "lobby") return null;

  // Only room creator can start
  const creator = game.players[0];
  if (!creator || creator.id !== playerId || !creator.isRoomCreator) return null;
  // Player 2 must be joined
  if (!game.players[1]) return null;

  game.phase = "scanning";
  // Reset ready for scanning phase
  game.players[0]!.ready = false;
  game.players[1]!.ready = false;
  return game;
}

// ─── Scanning (Submit Hand) ──────────────────────────────────

export function submitHand(
  roomId: string,
  playerId: string,
  cards: Card[]
): GameState | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "scanning") return null;

  const playerIndex = game.players.findIndex((p) => p?.id === playerId);
  if (playerIndex === -1) return null;

  const player = game.players[playerIndex]!;
  if (player.ready) return null;

  if (cards.length === 0) return null;

  player.hand = cards;
  player.ready = true;

  // Both ready → start playing
  if (game.players[0]?.ready && game.players[1]?.ready) {
    game.phase = "playing";
    startRound(game);
  }

  return game;
}

// ─── Battle (Simultaneous Rounds) ────────────────────────────

export function startRound(game: GameState): void {
  const roundNumber = game.battleLog.length + 1;
  game.currentRound = {
    roundNumber,
    player1CardIndex: null,
    player2CardIndex: null,
    timeoutAt: Date.now() + ROUND_DURATION_MS,
    bothSubmitted: false,
  };
  // Reset selections
  if (game.players[0]) game.players[0].selectedCardIndex = null;
  if (game.players[1]) game.players[1].selectedCardIndex = null;
}

export function selectCard(roomId: string, playerId: string, cardIndex: number): GameState | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "playing" || !game.currentRound) return null;

  const playerIndex = game.players.findIndex((p) => p?.id === playerId);
  if (playerIndex === -1) return null;

  const player = game.players[playerIndex]!;
  if (cardIndex < 0 || cardIndex >= player.hand.length) return null;

  // Already selected
  if (playerIndex === 0 && game.currentRound.player1CardIndex !== null) return null;
  if (playerIndex === 1 && game.currentRound.player2CardIndex !== null) return null;

  player.selectedCardIndex = cardIndex;
  if (playerIndex === 0) {
    game.currentRound.player1CardIndex = cardIndex;
  } else {
    game.currentRound.player2CardIndex = cardIndex;
  }

  // Check if both submitted
  if (game.currentRound.player1CardIndex !== null && game.currentRound.player2CardIndex !== null) {
    game.currentRound.bothSubmitted = true;
  }

  return game;
}

export function resolveRound(roomId: string): { game: GameState; battleResult: BattleResult } | null {
  const game = games.get(roomId);
  if (!game || game.phase !== "playing" || !game.currentRound) return null;

  const p1 = game.players[0]!;
  const p2 = game.players[1]!;

  // Auto-select random if not chosen (timeout)
  let idx1 = game.currentRound.player1CardIndex;
  let idx2 = game.currentRound.player2CardIndex;

  if (idx1 === null && p1.hand.length > 0) {
    idx1 = Math.floor(Math.random() * p1.hand.length);
  }
  if (idx2 === null && p2.hand.length > 0) {
    idx2 = Math.floor(Math.random() * p2.hand.length);
  }

  if (idx1 === null || idx2 === null) return null;

  const card1 = p1.hand[idx1];
  const card2 = p2.hand[idx2];

  // Simultaneous damage: my ATK - opponent DEF
  const damageToP2 = Math.max(0, card1.atk - card2.def);
  const damageToP1 = Math.max(0, card2.atk - card1.def);

  p1.hp = Math.max(0, p1.hp - damageToP1);
  p2.hp = Math.max(0, p2.hp - damageToP2);

  // Remove used cards (remove higher index first to avoid shift issues)
  if (idx1 > idx2) {
    p1.hand.splice(idx1, 1);
    p2.hand.splice(idx2, 1);
  } else if (idx2 > idx1) {
    p2.hand.splice(idx2, 1);
    p1.hand.splice(idx1, 1);
  } else {
    // Same index, doesn't matter
    p1.hand.splice(idx1, 1);
    p2.hand.splice(idx2, 1);
  }

  p1.selectedCardIndex = null;
  p2.selectedCardIndex = null;

  const battleResult: BattleResult = {
    roundNumber: game.currentRound.roundNumber,
    player1Card: card1,
    player2Card: card2,
    damageToPlayer1: damageToP1,
    damageToPlayer2: damageToP2,
    player1HpAfter: p1.hp,
    player2HpAfter: p2.hp,
  };

  game.battleLog.push(battleResult);
  game.currentRound = null;

  // Win conditions
  if (p1.hp <= 0 && p2.hp <= 0) {
    game.phase = "finished";
    game.winner = p1.hp >= p2.hp ? p1.id : p2.id;
    game.punishment = getRandomPunishment();
  } else if (p1.hp <= 0) {
    game.phase = "finished";
    game.winner = p2.id;
    game.punishment = getRandomPunishment();
  } else if (p2.hp <= 0) {
    game.phase = "finished";
    game.winner = p1.id;
    game.punishment = getRandomPunishment();
  } else if (p1.hand.length === 0 && p2.hand.length === 0) {
    game.phase = "finished";
    game.winner = p1.hp >= p2.hp ? p1.id : p2.id;
    game.punishment = getRandomPunishment();
  } else {
    // Next round
    startRound(game);
  }

  return { game, battleResult };
}

// ─── Bot Logic ───────────────────────────────────────────────

export function isBotTurn(roomId: string): boolean {
  const game = games.get(roomId);
  if (!game || game.phase !== "playing" || !game.currentRound) return false;
  return game.currentRound.player2CardIndex === null && game.players[1]?.id === BOT_ID;
}

export function botSelectCard(roomId: string): GameState | null {
  const game = games.get(roomId);
  if (!game || !game.currentRound) return null;

  const bot = game.players[1];
  if (!bot || bot.id !== BOT_ID || bot.hand.length === 0) return null;
  if (game.currentRound.player2CardIndex !== null) return null;

  // Strategy: pick highest ATK
  let bestIdx = 0;
  for (let i = 1; i < bot.hand.length; i++) {
    if (bot.hand[i].atk > bot.hand[bestIdx].atk) bestIdx = i;
  }

  return selectCard(roomId, BOT_ID, bestIdx);
}

// ─── Player View (hide opponent info) ────────────────────────

export function getPlayerView(game: GameState, playerId: string): GameState {
  const playerIndex = game.players.findIndex((p) => p?.id === playerId);
  const opponentIndex = playerIndex === 0 ? 1 : 0;

  const view = JSON.parse(JSON.stringify(game)) as GameState;

  if (view.players[opponentIndex]) {
    const opp = view.players[opponentIndex]!;
    if (view.phase === "scanning") {
      opp.hand = [];
    } else if (view.phase === "playing") {
      // Hide opponent cards content, keep count
      opp.hand = opp.hand.map(() => ({
        id: "hidden",
        name: "???",
        type: "zombie" as const,
        rarity: "R" as const,
        atk: 0,
        def: 0,
        image: "",
      }));
    }
    // Hide opponent's selection during round
    opp.selectedCardIndex = null;
  }

  // Hide round selections from both (only show own)
  if (view.currentRound) {
    if (playerIndex === 0) {
      view.currentRound.player2CardIndex = null;
    } else {
      view.currentRound.player1CardIndex = null;
    }
  }

  return view;
}
