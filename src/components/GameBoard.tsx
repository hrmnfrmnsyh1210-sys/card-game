"use client";

import { useEffect, useState, useCallback } from "react";
import { GameState, BattleResult as BattleResultType, RoomInfo } from "@/types/game";
import { getPusherClient } from "@/lib/pusher-client";
import Card from "./Card";
import HealthBar from "./HealthBar";
import BattleResult from "./BattleResult";
import CardScanner from "./CardScanner";
import PunishmentReveal from "./PunishmentReveal";

interface GameBoardProps {
  roomInfo: RoomInfo;
}

const MAX_HP = 100000;

export default function GameBoard({ roomInfo }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [lastBattle, setLastBattle] = useState<BattleResultType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBattle, setShowBattle] = useState(false);

  const fetchGameState = useCallback(async () => {
    const res = await fetch("/api/game-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: roomInfo.roomId,
        playerId: roomInfo.playerId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setGameState(data.game);
    }
  }, [roomInfo]);

  useEffect(() => {
    fetchGameState();

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${roomInfo.roomId}`);

    channel.bind("player-joined", (data: { game: GameState }) => {
      setGameState(data.game);
    });

    channel.bind(`state-${roomInfo.playerId}`, (data: { game: GameState; battleResult: BattleResultType | null }) => {
      setGameState(data.game);
      if (data.battleResult) {
        setLastBattle(data.battleResult);
        setShowBattle(true);
        setTimeout(() => setShowBattle(false), 3000);
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${roomInfo.roomId}`);
    };
  }, [roomInfo, fetchGameState]);

  async function handleScanComplete(cardIds: string[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/submit-hand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomInfo.roomId,
          playerId: roomInfo.playerId,
          cardIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGameState(data.game);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAttack() {
    if (selectedCard === null || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/play-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomInfo.roomId,
          playerId: roomInfo.playerId,
          cardIndex: selectedCard,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGameState(data.game);
        if (data.battleResult) {
          setLastBattle(data.battleResult);
          setShowBattle(true);
          setTimeout(() => setShowBattle(false), 3000);
        }
      }
    } finally {
      setSelectedCard(null);
      setLoading(false);
    }
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  const me = gameState.players[roomInfo.playerIndex];
  const opponent = gameState.players[roomInfo.playerIndex === 0 ? 1 : 0];
  const isMyTurn = gameState.currentTurn === roomInfo.playerIndex;

  // Waiting for opponent
  if (gameState.phase === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-pulse">⏳</div>
          <h2 className="text-2xl font-bold text-white">Menunggu lawan...</h2>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Bagikan kode room ini:</p>
            <p className="text-4xl font-mono font-bold text-yellow-400 tracking-widest">
              {roomInfo.roomId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Scanning phase
  if (gameState.phase === "scanning") {
    if (me && me.ready) {
      // Already submitted, waiting for opponent
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="text-6xl animate-pulse">✅</div>
            <h2 className="text-2xl font-bold text-white">Kartu siap!</h2>
            <p className="text-gray-400">Menunggu lawan selesai scan kartunya...</p>
            <div className="flex justify-center gap-2">
              {me.hand.map((card) => (
                <Card key={card.id} card={card} disabled />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Show scanner
    return <CardScanner onComplete={handleScanComplete} maxCards={4} />;
  }

  // Game finished
  if (gameState.phase === "finished") {
    const isWinner = gameState.winner === roomInfo.playerId;
    const loserName = isWinner ? (opponent?.name || "Lawan") : (me?.name || "Kamu");

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Result */}
          <div className="text-center space-y-2">
            <div className="text-6xl">{isWinner ? "🏆" : "💀"}</div>
            <h2 className={`text-4xl font-bold ${isWinner ? "text-yellow-400" : "text-red-400"}`}>
              {isWinner ? "VICTORY!" : "DEFEAT!"}
            </h2>
            <p className="text-gray-400">
              {me?.name}: {me?.hp.toLocaleString()} HP | {opponent?.name}: {opponent?.hp.toLocaleString()} HP
            </p>
          </div>

          {/* Punishment */}
          {gameState.punishment && (
            <PunishmentReveal
              punishment={gameState.punishment}
              loserName={loserName}
            />
          )}

          {/* Play Again */}
          <div className="text-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors"
            >
              Main Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-850 to-gray-950 flex flex-col p-4">
      {/* Room ID */}
      <div className="text-center mb-2">
        <span className="text-xs text-gray-500 font-mono">Room: {roomInfo.roomId}</span>
      </div>

      {/* Opponent Area */}
      <div className="space-y-3">
        {opponent && (
          <HealthBar current={opponent.hp} max={MAX_HP} name={opponent.name || "Opponent"} />
        )}
        <div className="flex justify-center gap-2">
          {opponent?.hand.map((card, i) => (
            <Card key={i} card={card} faceDown disabled />
          ))}
          {(!opponent || opponent.hand.length === 0) && (
            <div className="text-gray-600 text-sm py-4">Tidak ada kartu</div>
          )}
        </div>
      </div>

      {/* Battle Zone */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="text-center space-y-2">
          {showBattle && lastBattle ? (
            <BattleResult result={lastBattle} currentPlayerId={roomInfo.playerId} />
          ) : (
            <div
              className={`text-lg font-bold px-6 py-2 rounded-full ${
                isMyTurn
                  ? "bg-green-900/50 text-green-400 border border-green-600"
                  : "bg-red-900/50 text-red-400 border border-red-600"
              }`}
            >
              {isMyTurn ? "Giliranmu! Pilih kartu & serang!" : "Giliran lawan..."}
            </div>
          )}
        </div>
      </div>

      {/* My Area */}
      <div className="space-y-3">
        <div className="flex justify-center gap-2 flex-wrap">
          {me?.hand.map((card, i) => (
            <Card
              key={`${card.id}-${i}`}
              card={card}
              onClick={() => isMyTurn && setSelectedCard(i)}
              selected={selectedCard === i}
              disabled={!isMyTurn || loading}
            />
          ))}
          {(!me || me.hand.length === 0) && (
            <div className="text-gray-600 text-sm py-4">Tidak ada kartu</div>
          )}
        </div>

        {isMyTurn && selectedCard !== null && (
          <div className="flex justify-center">
            <button
              onClick={handleAttack}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-lg
                rounded-lg hover:from-red-500 hover:to-orange-500 transition-all
                disabled:opacity-50 animate-pulse"
            >
              {loading ? "Menyerang..." : "SERANG!"}
            </button>
          </div>
        )}

        {me && (
          <HealthBar current={me.hp} max={MAX_HP} name={me.name} isCurrentPlayer />
        )}
      </div>
    </div>
  );
}
