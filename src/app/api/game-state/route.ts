import { NextResponse } from "next/server";
import { getGame, getPlayerView } from "@/lib/game-logic";

export async function POST(req: Request) {
  const { roomId, playerId } = await req.json();

  if (!roomId || !playerId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const game = getGame(roomId);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({
    game: getPlayerView(game, playerId),
  });
}
