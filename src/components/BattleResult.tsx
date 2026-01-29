"use client";

import { BattleResult as BattleResultType } from "@/types/game";

interface BattleResultProps {
  result: BattleResultType;
  player1Name: string;
  player2Name: string;
  myPlayerIndex: number;
}

export default function BattleResult({
  result,
  player1Name,
  player2Name,
  myPlayerIndex,
}: BattleResultProps) {
  const myDamage = myPlayerIndex === 0 ? result.damageToPlayer1 : result.damageToPlayer2;
  const oppDamage = myPlayerIndex === 0 ? result.damageToPlayer2 : result.damageToPlayer1;
  const myCard = myPlayerIndex === 0 ? result.player1Card : result.player2Card;
  const oppCard = myPlayerIndex === 0 ? result.player2Card : result.player1Card;

  return (
    <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-600 animate-fade-in max-w-sm mx-auto">
      <div className="text-center text-xs text-gray-500 mb-2">
        Round {result.roundNumber}
      </div>

      {/* Cards Clash */}
      <div className="flex items-center justify-center gap-3 mb-3">
        {/* My Card */}
        <div className="text-center">
          <div className="text-2xl mb-1">
            {myCard.type === "plant" ? "🌱" : "🧟"}
          </div>
          <p className="text-xs font-bold text-white">{myCard.name}</p>
          <p className="text-[10px] text-gray-400">ATK {myCard.atk.toLocaleString()}</p>
        </div>

        <div className="text-yellow-400 text-xl font-bold">⚔️</div>

        {/* Opponent Card */}
        <div className="text-center">
          <div className="text-2xl mb-1">
            {oppCard.type === "plant" ? "🌱" : "🧟"}
          </div>
          <p className="text-xs font-bold text-white">{oppCard.name}</p>
          <p className="text-[10px] text-gray-400">ATK {oppCard.atk.toLocaleString()}</p>
        </div>
      </div>

      {/* Damage Results */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Kamu kena:</span>
          <span className={myDamage > 0 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
            {myDamage > 0 ? `-${myDamage.toLocaleString()}` : "0 (Blocked!)"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">{player1Name === player2Name ? "Lawan" : myPlayerIndex === 0 ? player2Name : player1Name} kena:</span>
          <span className={oppDamage > 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
            {oppDamage > 0 ? `-${oppDamage.toLocaleString()}` : "0 (Blocked!)"}
          </span>
        </div>
      </div>
    </div>
  );
}
