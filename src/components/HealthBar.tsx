"use client";

interface HealthBarProps {
  current: number;
  max: number;
  name: string;
  isCurrentPlayer?: boolean;
}

export default function HealthBar({ current, max, name, isCurrentPlayer }: HealthBarProps) {
  const percent = Math.max(0, (current / max) * 100);
  const barColor =
    percent > 50 ? "bg-green-500" : percent > 25 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className={`w-full ${isCurrentPlayer ? "text-green-300" : "text-gray-300"}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold">
          {name} {isCurrentPlayer && "(You)"}
        </span>
        <span className="text-sm font-mono">
          {current.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
