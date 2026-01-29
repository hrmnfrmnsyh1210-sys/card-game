import { NextResponse } from "next/server";
import { selectCard, resolveRound, getPlayerView } from "@/lib/game-logic";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  const { roomId, playerId, cardIndex } = await req.json();
  if (!roomId || !playerId || cardIndex === undefined) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const game = selectCard(roomId, playerId, cardIndex);
  if (!game) {
    return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  }

  const pusher = getPusherServer();

  // Both submitted → resolve round
  if (game.currentRound?.bothSubmitted) {
    const result = resolveRound(roomId);
    if (result) {
      for (const player of result.game.players) {
        if (player) {
          await pusher.trigger(`game-${roomId}`, `state-${player.id}`, {
            game: getPlayerView(result.game, player.id),
            battleResult: result.battleResult,
          });
        }
      }
      return NextResponse.json({
        game: getPlayerView(result.game, playerId),
        battleResult: result.battleResult,
      });
    }
  }

  // Only notify this player that selection is confirmed
  await pusher.trigger(`game-${roomId}`, `selected-${playerId}`, {
    confirmed: true,
  });

  return NextResponse.json({
    game: getPlayerView(game, playerId),
  });
}
