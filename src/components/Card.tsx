"use client";

import { Card as CardType } from "@/types/game";

interface CardProps {
  card: CardType;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
}

export default function Card({ card, onClick, selected, disabled, faceDown }: CardProps) {
  if (faceDown || card.id === "hidden") {
    return (
      <div className="w-28 h-40 rounded-xl bg-gradient-to-br from-purple-700 to-purple-900 border-2 border-purple-400 flex items-center justify-center shadow-lg">
        <div className="text-3xl font-bold text-purple-300">?</div>
      </div>
    );
  }

  const isPlant = card.type === "plant";
  const borderColor = selected
    ? "border-yellow-400 shadow-yellow-400/50"
    : isPlant
    ? "border-green-500"
    : "border-blue-500";

  const bgGradient = isPlant
    ? "from-green-800 to-green-950"
    : "from-blue-800 to-blue-950";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-28 h-40 rounded-xl bg-gradient-to-br ${bgGradient} border-2 ${borderColor}
        flex flex-col items-center justify-between p-2 shadow-lg transition-all duration-200
        ${selected ? "scale-110 shadow-xl -translate-y-2" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:-translate-y-1 cursor-pointer"}
      `}
    >
      {/* Rarity Badge */}
      <div className="self-end">
        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-yellow-500 text-yellow-950">
          {card.rarity}
        </span>
      </div>

      {/* Card Image Placeholder / Name */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-2xl">
          {isPlant ? "🌱" : "🧟"}
        </span>
      </div>

      {/* Card Name */}
      <div className="text-[10px] font-bold text-white text-center leading-tight mb-1">
        {card.name}
      </div>

      {/* Stats */}
      <div className="flex gap-2 text-[10px]">
        <span className="text-red-400 font-bold">⚔{card.atk.toLocaleString()}</span>
        <span className="text-blue-400 font-bold">🛡{card.def.toLocaleString()}</span>
      </div>
    </button>
  );
}
