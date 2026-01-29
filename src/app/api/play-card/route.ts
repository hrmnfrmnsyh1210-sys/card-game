import { NextResponse } from "next/server";
import { playCard, getGame, getPlayerView } from "@/lib/game-logic";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  const { roomId, playerId, cardIndex } = await req.json();

  if (!roomId || !playerId || cardIndex === undefined) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const result = playCard(roomId, playerId, cardIndex);
  if (!result) {
    return NextResponse.json({ error: "Invalid move" }, { status: 400 });
  }

  const { game, battleResult } = result;
  const pusher = getPusherServer();

  // Send updated game state to both players
  for (const player of game.players) {
    if (player) {
      await pusher.trigger(`game-${roomId}`, `state-${player.id}`, {
        game: getPlayerView(game, player.id),
        battleResult,
      });
    }
  }

  return NextResponse.json({
    game: getPlayerView(game, playerId),
    battleResult,
  });
}
