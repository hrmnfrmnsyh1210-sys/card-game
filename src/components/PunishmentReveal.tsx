"use client";

import { useState, useEffect } from "react";
import { Punishment } from "@/types/game";

interface PunishmentRevealProps {
  punishment: Punishment;
  loserName: string;
}

export default function PunishmentReveal({ punishment, loserName }: PunishmentRevealProps) {
  const [phase, setPhase] = useState<"drumroll" | "reveal">("drumroll");
  const [dots, setDots] = useState("");

  // Drumroll animation
  useEffect(() => {
    if (phase !== "drumroll") return;

    let count = 0;
    const dotInterval = setInterval(() => {
      count++;
      setDots(".".repeat((count % 3) + 1));
    }, 400);

    const revealTimer = setTimeout(() => {
      setPhase("reveal");
      clearInterval(dotInterval);
    }, 2500);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(revealTimer);
    };
  }, [phase]);

  if (phase === "drumroll") {
    return (
      <div className="bg-gray-800/90 rounded-2xl p-6 border border-yellow-500/50 text-center max-w-sm mx-auto">
        <div className="text-4xl mb-3 animate-bounce">🥁</div>
        <p className="text-yellow-400 font-bold text-lg">
          Menentukan hukuman{dots}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Semoga tidak terlalu berat...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 border-2 border-red-500/70 text-center max-w-sm mx-auto animate-fade-in shadow-[0_0_30px_rgba(239,68,68,0.3)]">
      {/* Header */}
      <div className="text-5xl mb-2">{punishment.emoji}</div>
      <div className="inline-block px-3 py-1 bg-red-900/50 rounded-full mb-3">
        <span className="text-red-400 text-xs font-bold uppercase tracking-wider">
          {punishment.category}
        </span>
      </div>

      {/* Punishment text */}
      <h3 className="text-lg font-bold text-white mb-2">
        Hukuman untuk {loserName}:
      </h3>
      <p className="text-yellow-300 text-base leading-relaxed">
        {punishment.text}
      </p>

      {/* Warning */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <p className="text-gray-500 text-xs">
          Tidak ada pilihan lain. Hukuman harus dilaksanakan! 😈
        </p>
      </div>
    </div>
  );
}
