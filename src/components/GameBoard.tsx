"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { GameState, BattleResult as BattleResultType, RoomInfo } from "@/types/game";
import { getPusherClient } from "@/lib/pusher-client";
import Card from "./Card";
import HealthBar from "./HealthBar";
import BattleResult from "./BattleResult";
import CardScanner, { ScannedCard } from "./CardScanner";
import PunishmentReveal from "./PunishmentReveal";
import RoomLobby from "./RoomLobby";
import Timer from "./Timer";

interface GameBoardProps {
  roomInfo: RoomInfo;
}

const MAX_HP = 100000;

export default function GameBoard({ roomInfo }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastBattle, setLastBattle] = useState<BattleResultType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Simpan foto kartu di client saja (tidak dikirim ke server, terlalu besar)
  const capturedImagesRef = useRef<Record<string, string>>({});

  const isSolo = roomInfo.mode === "solo";

  // Inject client-side captured images into game state
  function injectCapturedImages(gs: GameState): GameState {
    const images = capturedImagesRef.current;
    if (Object.keys(images).length === 0) return gs;
    const me = gs.players[roomInfo.playerIndex];
    if (me) {
      me.hand = me.hand.map((card) => ({
        ...card,
        capturedImage: images[card.id] || card.capturedImage,
      }));
    }
    return gs;
  }

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
      setGameState(injectCapturedImages(data.game));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomInfo]);

  // Initial fetch
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  // Pusher (multiplayer)
  useEffect(() => {
    if (isSolo) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${roomInfo.roomId}`);

    channel.bind(
      `state-${roomInfo.playerId}`,
      (data: { game: GameState; battleResult?: BattleResultType }) => {
        setGameState(injectCapturedImages(data.game));
        if (data.battleResult) {
          setLastBattle(data.battleResult);
          setShowBattle(true);
          setHasSubmitted(false);
          setSelectedCard(null);
          setTimeout(() => setShowBattle(false), 3500);
        }
        // New round started → reset submission
        if (data.game.currentRound && !data.battleResult) {
          setHasSubmitted(false);
          setSelectedCard(null);
        }
      }
    );

    channel.bind(`selected-${roomInfo.playerId}`, () => {
      setHasSubmitted(true);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${roomInfo.roomId}`);
    };
  }, [roomInfo, isSolo]);

  // Bot auto-select (solo mode)
  useEffect(() => {
    if (!isSolo || !gameState || gameState.phase !== "playing") return;
    if (!gameState.currentRound) return;

    // Bot needs to select (player2CardIndex is hidden from view, so trigger via API)
    const delay = 1000 + Math.random() * 2000;
    botTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/bot-play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: roomInfo.roomId,
            playerId: roomInfo.playerId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.game) setGameState(injectCapturedImages(data.game));
          if (data.battleResult) {
            setLastBattle(data.battleResult);
            setShowBattle(true);
            setHasSubmitted(false);
            setSelectedCard(null);
            setTimeout(() => setShowBattle(false), 3500);
          }
        }
      } catch {
        // ignore
      }
    }, delay);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [isSolo, gameState, roomInfo]);

  // ─── Handlers ──────────────────────────────────────────────

  function handleGameStateChange(gs: GameState) {
    setGameState(gs);
  }

  async function handleScanComplete(cards: ScannedCard[]) {
    setLoading(true);

    // Simpan foto di client (jangan kirim ke server, base64 terlalu besar)
    for (const c of cards) {
      if (c.capturedImage) {
        capturedImagesRef.current[c.card.id] = c.capturedImage;
      }
    }

    try {
      // Kirim card data TANPA capturedImage ke server
      const res = await fetch("/api/submit-hand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomInfo.roomId,
          playerId: roomInfo.playerId,
          scannedCards: cards.map((c) => ({
            card: {
              id: c.card.id,
              name: c.card.name,
              type: c.card.type,
              rarity: c.card.rarity,
              atk: c.card.atk,
              def: c.card.def,
              image: c.card.image || "",
            },
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGameState(injectCapturedImages(data.game));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCard() {
    if (selectedCard === null || hasSubmitted || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/select-card", {
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
        setGameState(injectCapturedImages(data.game));
        setHasSubmitted(true);
        if (data.battleResult) {
          setLastBattle(data.battleResult);
          setShowBattle(true);
          setHasSubmitted(false);
          setSelectedCard(null);
          setTimeout(() => setShowBattle(false), 3500);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTimeout() {
    try {
      await fetch("/api/timeout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomInfo.roomId }),
      });
      // State will come via Pusher or we fetch
      if (isSolo) {
        await fetchGameState();
      }
    } catch {
      // ignore
    }
  }

  // ─── Render ────────────────────────────────────────────────

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading game...</div>
      </div>
    );
  }

  const me = gameState.players[roomInfo.playerIndex];
  const opponent = gameState.players[roomInfo.playerIndex === 0 ? 1 : 0];

  // ── LOBBY ──
  if (gameState.phase === "lobby") {
    return (
      <RoomLobby
        roomInfo={roomInfo}
        gameState={gameState}
        onGameStateChange={handleGameStateChange}
      />
    );
  }

  // ── SCANNING ──
  if (gameState.phase === "scanning") {
    if (me && me.ready) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="text-6xl animate-pulse">✅</div>
            <h2 className="text-2xl font-bold text-white">Kartu siap!</h2>
            <p className="text-gray-400">
              {isSolo ? "Memulai pertarungan..." : "Menunggu lawan selesai scan..."}
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              {me.hand.map((card) => (
                <Card key={card.id} card={card} disabled />
              ))}
            </div>
          </div>
        </div>
      );
    }
    return <CardScanner onComplete={handleScanComplete} maxCards={4} />;
  }

  // ── FINISHED ──
  if (gameState.phase === "finished") {
    const isWinner = gameState.winner === roomInfo.playerId;
    const loserName = isWinner
      ? opponent?.name || "Lawan"
      : me?.name || "Kamu";

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="text-6xl">{isWinner ? "🏆" : "💀"}</div>
            <h2
              className={`text-4xl font-bold ${
                isWinner ? "text-yellow-400" : "text-red-400"
              }`}
            >
              {isWinner ? "VICTORY!" : "DEFEAT!"}
            </h2>
            <p className="text-gray-400">
              {me?.name}: {me?.hp.toLocaleString()} HP |{" "}
              {opponent?.name}: {opponent?.hp.toLocaleString()} HP
            </p>
          </div>

          {gameState.punishment && (
            <PunishmentReveal
              punishment={gameState.punishment}
              loserName={loserName}
            />
          )}

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

  // ── PLAYING (Simultaneous Rounds) ──
  const round = gameState.currentRound;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-850 to-gray-950 flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-2">
        <span className="text-xs text-gray-500 font-mono">
          {isSolo ? "Solo vs Bot" : `Room: ${roomInfo.roomId}`}
        </span>
        {round && (
          <span className="text-xs text-gray-600 ml-2">
            Round {round.roundNumber}
          </span>
        )}
      </div>

      {/* Opponent Area */}
      <div className="space-y-2">
        {opponent && (
          <HealthBar
            current={opponent.hp}
            max={MAX_HP}
            name={opponent.name || "Opponent"}
          />
        )}
        <div className="flex justify-center gap-2">
          {opponent?.hand.map((card, i) => (
            <Card key={i} card={card} faceDown disabled />
          ))}
          {(!opponent || opponent.hand.length === 0) && (
            <div className="text-gray-600 text-sm py-2">Tidak ada kartu</div>
          )}
        </div>
      </div>

      {/* Battle Zone */}
      <div className="flex-1 flex flex-col items-center justify-center py-3 gap-3">
        {/* Timer */}
        {round && !hasSubmitted && !showBattle && (
          <Timer timeoutAt={round.timeoutAt} onTimeout={handleTimeout} />
        )}

        {/* Battle Result */}
        {showBattle && lastBattle && (
          <BattleResult
            result={lastBattle}
            player1Name={gameState.players[0]?.name || "Player 1"}
            player2Name={gameState.players[1]?.name || "Player 2"}
            myPlayerIndex={roomInfo.playerIndex}
          />
        )}

        {/* Status */}
        {!showBattle && (
          <div
            className={`text-sm font-bold px-4 py-2 rounded-full ${
              hasSubmitted
                ? "bg-blue-900/50 text-blue-400 border border-blue-600"
                : "bg-green-900/50 text-green-400 border border-green-600"
            }`}
          >
            {hasSubmitted
              ? "Kartu dipilih! Menunggu lawan..."
              : "Pilih kartu dan konfirmasi!"}
          </div>
        )}
      </div>

      {/* My Area */}
      <div className="space-y-3">
        {/* My Cards */}
        <div className="flex justify-center gap-2 flex-wrap">
          {me?.hand.map((card, i) => (
            <Card
              key={`${card.id}-${i}`}
              card={card}
              onClick={() => !hasSubmitted && setSelectedCard(i)}
              selected={selectedCard === i}
              disabled={hasSubmitted || loading}
            />
          ))}
          {(!me || me.hand.length === 0) && (
            <div className="text-gray-600 text-sm py-2">Tidak ada kartu</div>
          )}
        </div>

        {/* Confirm Button */}
        {selectedCard !== null && !hasSubmitted && (
          <div className="flex justify-center">
            <button
              onClick={handleConfirmCard}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-lg
                rounded-lg hover:from-red-500 hover:to-orange-500 transition-all
                disabled:opacity-50 animate-pulse"
            >
              {loading ? "Memilih..." : "Konfirmasi Pilihan!"}
            </button>
          </div>
        )}

        {/* My HP */}
        {me && (
          <HealthBar
            current={me.hp}
            max={MAX_HP}
            name={me.name}
            isCurrentPlayer
          />
        )}
      </div>
    </div>
  );
}
