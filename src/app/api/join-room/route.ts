import { NextResponse } from "next/server";
import { joinGame, getPlayerView } from "@/lib/game-logic";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  const { roomId, playerName } = await req.json();

  if (!roomId || !playerName) {
    return NextResponse.json({ error: "Room ID and player name required" }, { status: 400 });
  }

  const playerId = crypto.randomUUID();
  const game = joinGame(roomId.toUpperCase(), playerId, playerName.trim());

  if (!game) {
    return NextResponse.json({ error: "Room not found or already full" }, { status: 404 });
  }

  // Notify player 1 that someone joined
  const pusher = getPusherServer();
  await pusher.trigger(`game-${roomId}`, "player-joined", {
    game: getPlayerView(game, game.players[0]!.id),
  });

  return NextResponse.json({
    roomId: game.roomId,
    playerId,
    playerIndex: 1,
    game: getPlayerView(game, playerId),
  });
}
