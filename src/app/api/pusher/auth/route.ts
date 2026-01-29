import { NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req: Request) {
  const data = await req.text();
  const params = new URLSearchParams(data);
  const socketId = params.get("socket_id");
  const channel = params.get("channel_name");

  if (!socketId || !channel) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const pusher = getPusherServer();
  const auth = pusher.authorizeChannel(socketId, channel);

  return NextResponse.json(auth);
}
