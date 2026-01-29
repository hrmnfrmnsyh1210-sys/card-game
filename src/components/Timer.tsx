"use client";

import { useEffect, useState, useCallback } from "react";

interface TimerProps {
  timeoutAt: number;
  onTimeout: () => void;
}

export default function Timer({ timeoutAt, onTimeout }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(10);

  const handleTimeout = useCallback(onTimeout, [onTimeout]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timeoutAt - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timeoutAt, handleTimeout]);

  const pct = Math.max(0, (secondsLeft / 10) * 100);
  const urgent = secondsLeft <= 3;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-gray-400 text-xs">Pilih kartu!</span>
        <span
          className={`text-xl font-bold font-mono ${
            urgent ? "text-red-400 animate-pulse" : "text-white"
          }`}
        >
          {secondsLeft}s
        </span>
      </div>
      <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            urgent ? "bg-red-500" : secondsLeft <= 5 ? "bg-yellow-500" : "bg-green-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
