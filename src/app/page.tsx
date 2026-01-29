"use client";

import { useState } from "react";
import { RoomInfo } from "@/types/game";
import Lobby from "@/components/Lobby";
import GameBoard from "@/components/GameBoard";

export default function Home() {
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);

  if (roomInfo) {
    return <GameBoard roomInfo={roomInfo} />;
  }

  return <Lobby onJoinedRoom={setRoomInfo} />;
}
