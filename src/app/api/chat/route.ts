import { NextResponse } from "next/server";
import { sendChatMessage } from "@/lib/game-logic";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  const { roomId, playerId, message } = await req.json();
  if (!roomId || !playerId || !message) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const result = sendChatMessage(roomId, playerId, message);
  if (!result) {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }

  const pusher = getPusherServer();
  await pusher.trigger(`game-${roomId}`, "chat-message", {
    chatMessage: result.chatMessage,
  });

  return NextResponse.json({ success: true });
}
