import { NextResponse } from "next/server";
import { submitHand, getPlayerView } from "@/lib/game-logic";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  const { roomId, playerId, cardIds } = await req.json();

  if (!roomId || !playerId || !cardIds || !Array.isArray(cardIds)) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const game = submitHand(roomId, playerId, cardIds);
  if (!game) {
    return NextResponse.json({ error: "Failed to submit hand" }, { status: 400 });
  }

  const pusher = getPusherServer();

  // Notify both players about state change
  for (const player of game.players) {
    if (player) {
      await pusher.trigger(`game-${roomId}`, `state-${player.id}`, {
        game: getPlayerView(game, player.id),
        battleResult: null,
      });
    }
  }

  return NextResponse.json({
    game: getPlayerView(game, playerId),
  });
}
