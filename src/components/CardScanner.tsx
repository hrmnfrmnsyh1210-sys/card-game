"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card as CardType } from "@/types/game";
import { ALL_CARDS } from "@/data/cards";
import Card from "./Card";

interface CardScannerProps {
  onComplete: (cardIds: string[]) => void;
  maxCards: number;
}

type ScanState = "idle" | "scanning" | "detected" | "selecting";

export default function CardScanner({ onComplete, maxCards }: CardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scannedCards, setScannedCards] = useState<CardType[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [cameraError, setCameraError] = useState("");

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setScanState("scanning");
      setCameraError("");
    } catch {
      setCameraError("Tidak bisa akses kamera. Pastikan izin kamera sudah diberikan.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  // Start scanning animation
  useEffect(() => {
    if (scanState !== "scanning") return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setScanState("detected");
        // After "detecting", show card selection
        setTimeout(() => {
          setScanState("selecting");
        }, 800);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [scanState]);

  function handleSelectCard(card: CardType) {
    // Don't add duplicates
    if (scannedCards.find((c) => c.id === card.id)) return;

    const newCards = [...scannedCards, card];
    setScannedCards(newCards);

    if (newCards.length < maxCards) {
      // Reset for next scan
      setScanState("scanning");
      setScanProgress(0);
    } else {
      // All cards scanned
      stopCamera();
    }
  }

  function handleRemoveCard(index: number) {
    setScannedCards((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (scannedCards.length === 0) return;
    stopCamera();
    onComplete(scannedCards.map((c) => c.id));
  }

  // Available cards (not yet scanned)
  const availableCards = ALL_CARDS.filter(
    (c) => !scannedCards.find((sc) => sc.id === c.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col items-center p-4">
      <h2 className="text-2xl font-bold text-white mb-2">Scan Kartu Fisikmu</h2>
      <p className="text-gray-400 text-sm mb-4">
        Arahkan kamera ke kartu, lalu pilih kartu yang sesuai ({scannedCards.length}/{maxCards})
      </p>

      {/* Camera View */}
      <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-gray-800 mb-4">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-3">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        ) : !stream ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg
                hover:from-green-500 hover:to-green-600 transition-all text-lg"
            >
              Buka Kamera
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Scan Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner brackets */}
              <div className="absolute top-6 left-6 w-12 h-12 border-t-3 border-l-3 border-green-400 rounded-tl-lg" />
              <div className="absolute top-6 right-6 w-12 h-12 border-t-3 border-r-3 border-green-400 rounded-tr-lg" />
              <div className="absolute bottom-6 left-6 w-12 h-12 border-b-3 border-l-3 border-green-400 rounded-bl-lg" />
              <div className="absolute bottom-6 right-6 w-12 h-12 border-b-3 border-r-3 border-green-400 rounded-br-lg" />

              {/* Scanning line */}
              {scanState === "scanning" && (
                <div
                  className="absolute left-6 right-6 h-0.5 bg-green-400 shadow-[0_0_10px_#4ade80] transition-all duration-100"
                  style={{ top: `${6 + (scanProgress / 100) * 88}%` }}
                />
              )}

              {/* Status text */}
              <div className="absolute bottom-10 left-0 right-0 text-center">
                {scanState === "scanning" && (
                  <span className="text-green-400 text-sm font-mono bg-black/50 px-3 py-1 rounded">
                    Scanning... {scanProgress}%
                  </span>
                )}
                {scanState === "detected" && (
                  <span className="text-yellow-400 text-sm font-bold bg-black/50 px-3 py-1 rounded animate-pulse">
                    Kartu Terdeteksi!
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Card Selection (shown after scan) */}
      {scanState === "selecting" && availableCards.length > 0 && (
        <div className="w-full max-w-sm">
          <p className="text-yellow-400 text-sm font-bold mb-2 text-center">
            Pilih kartu yang kamu scan:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {availableCards.map((card) => (
              <Card
                key={card.id}
                card={card}
                onClick={() => handleSelectCard(card)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scanned Cards */}
      {scannedCards.length > 0 && (
        <div className="w-full max-w-sm mt-4">
          <p className="text-gray-400 text-sm mb-2">Kartu yang sudah di-scan:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {scannedCards.map((card, i) => (
              <div key={card.id} className="relative">
                <Card card={card} disabled />
                <button
                  onClick={() => handleRemoveCard(i)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-xs
                    flex items-center justify-center hover:bg-red-500"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      {scannedCards.length > 0 && (
        <button
          onClick={handleSubmit}
          className={`mt-4 px-8 py-3 font-bold text-white rounded-lg transition-all ${
            scannedCards.length >= maxCards
              ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 animate-pulse"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          {scannedCards.length >= maxCards
            ? "Siap Bertarung!"
            : `Submit ${scannedCards.length} Kartu (min ${maxCards})`}
        </button>
      )}

      {/* Skip camera - manual mode */}
      {!stream && !cameraError && scannedCards.length === 0 && (
        <button
          onClick={() => {
            setScanState("selecting");
          }}
          className="mt-4 text-gray-500 text-sm underline hover:text-gray-300"
        >
          Pilih kartu tanpa kamera
        </button>
      )}
    </div>
  );
}
