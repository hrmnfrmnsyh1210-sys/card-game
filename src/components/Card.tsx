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

  const hasCapturedImage = !!card.capturedImage;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-28 h-40 rounded-xl bg-gradient-to-br ${bgGradient} border-2 ${borderColor}
        flex flex-col items-center justify-between overflow-hidden shadow-lg transition-all duration-200 relative
        ${selected ? "scale-110 shadow-xl -translate-y-2" : ""}
        ${disabled ? "opacity-70 cursor-not-allowed" : "hover:scale-105 hover:-translate-y-1 cursor-pointer"}
      `}
    >
      {/* Foto asli kartu sebagai background */}
      {hasCapturedImage && (
        <img
          src={card.capturedImage}
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover opacity-40 rounded-xl"
        />
      )}

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full p-2">
        {/* Rarity Badge */}
        <div className="self-end">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            card.rarity === "SSR" ? "bg-red-500 text-white" :
            card.rarity === "SR" ? "bg-purple-500 text-white" :
            card.rarity === "UR" ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black" :
            "bg-yellow-500 text-yellow-950"
          }`}>
            {card.rarity}
          </span>
        </div>

        {/* Card Image / Emoji */}
        <div className="flex-1 flex items-center justify-center">
          {hasCapturedImage ? (
            <img
              src={card.capturedImage}
              alt={card.name}
              className="w-20 h-20 object-cover rounded-lg border border-white/30 shadow-md"
            />
          ) : (
            <span className="text-2xl">
              {isPlant ? "🌱" : "🧟"}
            </span>
          )}
        </div>

        {/* Card Name */}
        <div className="text-[10px] font-bold text-white text-center leading-tight mb-1 drop-shadow-md">
          {card.name}
        </div>

        {/* Stats */}
        <div className="flex gap-2 text-[10px]">
          <span className="text-red-400 font-bold drop-shadow-md">⚔{card.atk.toLocaleString()}</span>
          <span className="text-blue-400 font-bold drop-shadow-md">🛡{card.def.toLocaleString()}</span>
        </div>
      </div>
    </button>
  );
}
