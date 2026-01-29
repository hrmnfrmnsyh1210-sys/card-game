import { NextResponse } from "next/server";
import { createGame, generateRoomId } from "@/lib/game-logic";

export async function POST(req: Request) {
  const { playerName, mode } = await req.json();

  if (!playerName || typeof playerName !== "string") {
    return NextResponse.json({ error: "Player name required" }, { status: 400 });
  }

  const gameMode = mode === "solo" ? "solo" : "multiplayer";
  const roomId = generateRoomId();
  const playerId = crypto.randomUUID();
  createGame(roomId, playerId, playerName.trim(), gameMode);

  return NextResponse.json({
    roomId,
    playerId,
    playerIndex: 0,
    mode: gameMode,
  });
}
