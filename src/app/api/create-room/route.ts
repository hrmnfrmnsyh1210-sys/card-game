import { NextResponse } from "next/server";
import { createGame, generateRoomId } from "@/lib/game-logic";

export async function POST(req: Request) {
  const { playerName } = await req.json();

  if (!playerName || typeof playerName !== "string") {
    return NextResponse.json({ error: "Player name required" }, { status: 400 });
  }

  const roomId = generateRoomId();
  const playerId = crypto.randomUUID();
  const game = createGame(roomId, playerId, playerName.trim());

  return NextResponse.json({
    roomId: game.roomId,
    playerId,
    playerIndex: 0,
  });
}
