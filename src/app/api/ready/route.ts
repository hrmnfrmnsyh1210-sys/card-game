import { NextResponse } from "next/server";
import { toggleReady, getPlayerView } from "@/lib/game-logic";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  const { roomId, playerId } = await req.json();
  if (!roomId || !playerId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const game = toggleReady(roomId, playerId);
  if (!game) {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }

  const pusher = getPusherServer();
  for (const player of game.players) {
    if (player) {
      await pusher.trigger(`game-${roomId}`, `state-${player.id}`, {
        game: getPlayerView(game, player.id),
      });
    }
  }

  return NextResponse.json({ game: getPlayerView(game, playerId) });
}
