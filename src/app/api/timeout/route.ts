import { NextResponse } from "next/server";
import { resolveRound, getGame, getPlayerView } from "@/lib/game-logic";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  const { roomId } = await req.json();
  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  const game = getGame(roomId);
  if (!game || !game.currentRound) {
    return NextResponse.json({ error: "No active round" }, { status: 400 });
  }

  // Only resolve if timer actually expired
  if (Date.now() < game.currentRound.timeoutAt - 500) {
    return NextResponse.json({ error: "Timer not expired yet" }, { status: 400 });
  }

  const result = resolveRound(roomId);
  if (!result) {
    return NextResponse.json({ error: "Failed to resolve" }, { status: 400 });
  }

  const pusher = getPusherServer();
  for (const player of result.game.players) {
    if (player) {
      await pusher.trigger(`game-${roomId}`, `state-${player.id}`, {
        game: getPlayerView(result.game, player.id),
        battleResult: result.battleResult,
      });
    }
  }

  return NextResponse.json({ success: true });
}
