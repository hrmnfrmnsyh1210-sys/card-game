"use client";

import { BattleResult as BattleResultType } from "@/types/game";

interface BattleResultProps {
  result: BattleResultType;
  currentPlayerId: string;
}

export default function BattleResult({ result, currentPlayerId }: BattleResultProps) {
  const isAttacker = result.attackerId === currentPlayerId;

  return (
    <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-600 animate-fade-in">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-2xl">
          {result.attackerCard.type === "plant" ? "🌱" : "🧟"}
        </span>
        <div>
          <span className="font-bold text-yellow-400">
            {result.attackerCard.name}
          </span>
          <span className="text-gray-400"> attacks! </span>
          <span className="text-red-400 font-bold">
            -{result.damage.toLocaleString()} DMG
          </span>
        </div>
        {isAttacker ? (
          <span className="ml-auto text-xs text-green-400">(Your attack)</span>
        ) : (
          <span className="ml-auto text-xs text-red-400">(Enemy attack)</span>
        )}
      </div>
    </div>
  );
}
