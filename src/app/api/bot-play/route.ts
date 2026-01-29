import { NextResponse } from "next/server";
import { botSelectCard, resolveRound, getGame, getPlayerView } from "@/lib/game-logic";

export async function POST(req: Request) {
  const { roomId, playerId } = await req.json();

  if (!roomId || !playerId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const game = getGame(roomId);
  if (!game || game.mode !== "solo") {
    return NextResponse.json({ error: "Not a solo game" }, { status: 400 });
  }

  // Bot selects a card
  const updated = botSelectCard(roomId);
  if (!updated) {
    return NextResponse.json({ error: "Bot cannot select" }, { status: 400 });
  }

  // If both submitted, resolve round
  if (updated.currentRound?.bothSubmitted) {
    const result = resolveRound(roomId);
    if (result) {
      return NextResponse.json({
        game: getPlayerView(result.game, playerId),
        battleResult: result.battleResult,
      });
    }
  }

  return NextResponse.json({
    game: getPlayerView(updated, playerId),
  });
}
