import { NextResponse } from "next/server";
import { submitHand, getPlayerView } from "@/lib/game-logic";
import { getPusherServer } from "@/lib/pusher-server";
import { Card } from "@/types/game";

interface ScannedCardInput {
  card: Card;
  capturedImage?: string;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { roomId, playerId } = body;

  if (!roomId || !playerId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Support new format (scannedCards with full Card objects)
  // and old format (cards with cardId, or cardIds string array)
  let handCards: Card[];

  if (body.scannedCards && Array.isArray(body.scannedCards)) {
    handCards = body.scannedCards.map((entry: ScannedCardInput) => ({
      ...entry.card,
      capturedImage: entry.capturedImage || entry.card.capturedImage || undefined,
    }));
  } else if (body.cards && Array.isArray(body.cards)) {
    // Legacy: { cardId, capturedImage }[]
    const { ALL_CARDS } = await import("@/data/cards");
    handCards = body.cards
      .map((entry: { cardId: string; capturedImage?: string }) => {
        const card = ALL_CARDS.find((c: Card) => c.id === entry.cardId);
        if (!card) return null;
        return { ...card, capturedImage: entry.capturedImage || undefined };
      })
      .filter(Boolean) as Card[];
  } else if (body.cardIds && Array.isArray(body.cardIds)) {
    // Legacy: string[]
    const { ALL_CARDS } = await import("@/data/cards");
    handCards = body.cardIds
      .map((id: string) => ALL_CARDS.find((c: Card) => c.id === id))
      .filter(Boolean) as Card[];
  } else {
    return NextResponse.json({ error: "Missing card data" }, { status: 400 });
  }

  if (handCards.length === 0) {
    return NextResponse.json({ error: "No valid cards" }, { status: 400 });
  }

  const game = submitHand(roomId, playerId, handCards);
  if (!game) {
    return NextResponse.json({ error: "Failed to submit hand" }, { status: 400 });
  }

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
