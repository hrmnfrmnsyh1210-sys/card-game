import { NextResponse } from "next/server";
import { submitHand, getPlayerView } from "@/lib/game-logic";
import { getPusherServer } from "@/lib/pusher-server";

interface ScannedCardInput {
  cardId: string;
  capturedImage?: string;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { roomId, playerId } = body;

  // Support both old format (cardIds: string[]) and new format (cards: ScannedCardInput[])
  let cardEntries: ScannedCardInput[];

  if (body.cards && Array.isArray(body.cards)) {
    cardEntries = body.cards;
  } else if (body.cardIds && Array.isArray(body.cardIds)) {
    cardEntries = body.cardIds.map((id: string) => ({ cardId: id }));
  } else {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!roomId || !playerId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const game = submitHand(roomId, playerId, cardEntries);
  if (!game) {
    return NextResponse.json({ error: "Failed to submit hand" }, { status: 400 });
  }

  // Only use Pusher for multiplayer
  if (game.mode === "multiplayer") {
    const pusher = getPusherServer();
    for (const player of game.players) {
      if (player) {
        await pusher.trigger(`game-${roomId}`, `state-${player.id}`, {
          game: getPlayerView(game, player.id),
        });
      }
    }
  }

  return NextResponse.json({
    game: getPlayerView(game, playerId),
  });
}
