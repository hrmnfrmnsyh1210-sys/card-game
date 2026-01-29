"use client";

import { useEffect, useState, useRef } from "react";
import { GameState, RoomInfo, ChatMessage } from "@/types/game";
import { getPusherClient } from "@/lib/pusher-client";

interface RoomLobbyProps {
  roomInfo: RoomInfo;
  gameState: GameState;
  onGameStateChange: (gs: GameState) => void;
}

const QUICK_MESSAGES = [
  "Sudah siap?",
  "Gas mulai!",
  "Tunggu bentar ya",
  "Siapp boss!",
];

export default function RoomLobby({ roomInfo, gameState, onGameStateChange }: RoomLobbyProps) {
  const [localState, setLocalState] = useState(gameState);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isCreator = roomInfo.playerIndex === 0;
  const me = localState.players[roomInfo.playerIndex];
  const opponent = localState.players[roomInfo.playerIndex === 0 ? 1 : 0];

  // Sync parent state changes
  useEffect(() => {
    setLocalState(gameState);
  }, [gameState]);

  // Pusher events
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${roomInfo.roomId}`);

    channel.bind(`state-${roomInfo.playerId}`, (data: { game: GameState }) => {
      setLocalState(data.game);
      onGameStateChange(data.game);
    });

    channel.bind("chat-message", (data: { chatMessage: ChatMessage }) => {
      setLocalState((prev) => ({
        ...prev,
        chatMessages: [...prev.chatMessages, data.chatMessage],
      }));
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${roomInfo.roomId}`);
    };
  }, [roomInfo, onGameStateChange]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localState.chatMessages]);

  async function sendMessage(msg?: string) {
    const text = msg || chatInput;
    if (!text.trim() || sending) return;
    setSending(true);

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomInfo.roomId,
          playerId: roomInfo.playerId,
          message: text.trim(),
        }),
      });
      setChatInput("");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleReady() {
    await fetch("/api/ready", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: roomInfo.roomId,
        playerId: roomInfo.playerId,
      }),
    });
  }

  async function handleStartGame() {
    const res = await fetch("/api/start-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: roomInfo.roomId,
        playerId: roomInfo.playerId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      onGameStateChange(data.game);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-5">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Room Lobby</h2>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 inline-block">
            <p className="text-gray-400 text-xs mb-1">Kode Room</p>
            <p className="text-3xl font-mono font-bold text-yellow-400 tracking-widest">
              {roomInfo.roomId}
            </p>
          </div>
        </div>

        {/* Players */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Pemain</h3>
          <div className="space-y-2">
            {localState.players.map((player, idx) =>
              player ? (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{idx === 0 ? "🌱" : "🧟"}</span>
                    <span className="text-white font-bold">{player.name}</span>
                    {player.isRoomCreator && (
                      <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold">
                        HOST
                      </span>
                    )}
                  </div>
                  {player.ready && (
                    <span className="text-green-400 text-sm font-bold">Siap ✓</span>
                  )}
                </div>
              ) : (
                <div
                  key={idx}
                  className="flex items-center bg-gray-700/30 p-3 rounded-lg border border-dashed border-gray-600"
                >
                  <span className="text-gray-500 text-sm animate-pulse">
                    Menunggu pemain bergabung...
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Chat */}
        {opponent && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Chat</h3>

            {/* Messages */}
            <div className="h-36 overflow-y-auto mb-3 space-y-2 scrollbar-thin">
              {localState.chatMessages.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-4">Belum ada pesan</p>
              )}
              {localState.chatMessages.map((msg) => {
                const isMine = msg.senderId === roomInfo.playerId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        isMine
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-gray-700 text-gray-200 rounded-bl-md"
                      }`}
                    >
                      {!isMine && (
                        <p className="text-[10px] text-gray-400 mb-0.5">{msg.senderName}</p>
                      )}
                      <p>{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Messages */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_MESSAGES.map((msg) => (
                <button
                  key={msg}
                  onClick={() => sendMessage(msg)}
                  disabled={sending}
                  className="px-2.5 py-1 text-xs bg-gray-700 text-gray-300 rounded-full
                    hover:bg-gray-600 hover:text-white transition-colors disabled:opacity-50"
                >
                  {msg}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Tulis pesan..."
                maxLength={200}
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm
                  focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => sendMessage()}
                disabled={sending || !chatInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold
                  hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                Kirim
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Ready toggle (non-creator only) */}
          {!isCreator && opponent && (
            <button
              onClick={handleToggleReady}
              className={`w-full py-3 font-bold rounded-lg transition-all ${
                me?.ready
                  ? "bg-gray-600 text-gray-300 hover:bg-gray-500"
                  : "bg-green-600 text-white hover:bg-green-500"
              }`}
            >
              {me?.ready ? "Siap! ✓ (klik untuk batal)" : "Tandai Siap"}
            </button>
          )}

          {/* Start Game (creator only) */}
          {isCreator && (
            <button
              onClick={handleStartGame}
              disabled={!opponent}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg
                rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {opponent ? "Mulai Permainan" : "Menunggu pemain..."}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
