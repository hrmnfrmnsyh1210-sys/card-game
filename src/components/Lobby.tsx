"use client";

import { useState } from "react";
import { RoomInfo, GameMode } from "@/types/game";

interface LobbyProps {
  onJoinedRoom: (info: RoomInfo) => void;
}

type Screen = "menu" | "multiplayer";

export default function Lobby({ onJoinedRoom }: LobbyProps) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(mode: GameMode) {
    if (!playerName.trim()) {
      setError("Masukkan namamu dulu!");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: playerName.trim(), mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onJoinedRoom({
        roomId: data.roomId,
        playerId: data.playerId,
        playerIndex: data.playerIndex,
        mode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat room");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!playerName.trim()) {
      setError("Masukkan namamu dulu!");
      return;
    }
    if (!roomCode.trim()) {
      setError("Masukkan kode room!");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/join-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: playerName.trim(),
          roomId: roomCode.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onJoinedRoom({
        roomId: data.roomId,
        playerId: data.playerId,
        playerIndex: data.playerIndex,
        mode: "multiplayer",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal join room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
            PvZ Card Battle
          </h1>
          <p className="text-gray-400 mt-2">Plants vs Zombies Trading Card Game</p>
        </div>

        {/* Player Name */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Nama Kamu</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Masukkan nama..."
            maxLength={20}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white
              focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {screen === "menu" ? (
          <>
            {/* Solo Mode */}
            <button
              onClick={() => handleCreate("solo")}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold
                rounded-lg hover:from-orange-500 hover:to-red-500 transition-all disabled:opacity-50"
            >
              <div className="text-lg">Main Solo vs Bot</div>
              <div className="text-xs text-orange-200 font-normal mt-0.5">
                Lawan Zombie King (AI)
              </div>
            </button>

            {/* Multiplayer Mode */}
            <button
              onClick={() => setScreen("multiplayer")}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold
                rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50"
            >
              <div className="text-lg">Multiplayer Online</div>
              <div className="text-xs text-blue-200 font-normal mt-0.5">
                Main bareng teman secara online
              </div>
            </button>
          </>
        ) : (
          <>
            {/* Back button */}
            <button
              onClick={() => setScreen("menu")}
              className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              &larr; Kembali
            </button>

            {/* Create Room */}
            <button
              onClick={() => handleCreate("multiplayer")}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold
                rounded-lg hover:from-green-500 hover:to-green-600 transition-all disabled:opacity-50"
            >
              {loading ? "Loading..." : "Buat Room"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-gray-500 text-sm">ATAU</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            {/* Join Room */}
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Kode Room"
                maxLength={6}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white
                  uppercase tracking-widest text-center font-mono
                  focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleJoin}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold
                  rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
