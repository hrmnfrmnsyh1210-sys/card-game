"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card as CardType } from "@/types/game";
import { ALL_CARDS } from "@/data/cards";
import Card from "./Card";

interface CardScannerProps {
  onComplete: (cardIds: string[]) => void;
  maxCards: number;
}

type ScanMode = "qr" | "manual";

export default function CardScanner({ onComplete, maxCards }: CardScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);
  const [scanMode, setScanMode] = useState<ScanMode>("qr");
  const [scanning, setScanning] = useState(false);
  const [scannedCards, setScannedCards] = useState<CardType[]>([]);
  const [lastScanMsg, setLastScanMsg] = useState("");
  const [cameraError, setCameraError] = useState("");

  const stopScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch {
        // ignore
      }
      html5QrRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleDetected = useCallback(
    (decodedText: string) => {
      const cardId = decodedText.trim();
      const card = ALL_CARDS.find((c) => c.id === cardId);

      if (!card) {
        setLastScanMsg(`QR tidak dikenali: "${cardId}"`);
        return;
      }

      setScannedCards((prev) => {
        if (prev.find((c) => c.id === card.id)) {
          setLastScanMsg(`${card.name} sudah di-scan!`);
          return prev;
        }

        const newCards = [...prev, card];
        setLastScanMsg(`${card.name} terdeteksi!`);

        if (newCards.length >= maxCards) {
          stopScanner();
        }

        return newCards;
      });
    },
    [maxCards, stopScanner]
  );

  async function startScanner() {
    setCameraError("");
    setLastScanMsg("");

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode");

      const scanner = new Html5Qrcode("qr-reader");
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleDetected(decodedText),
        () => {
          // scan error, ignore (continuous scanning)
        }
      );

      setScanning(true);
    } catch {
      setCameraError("Gagal membuka kamera. Coba mode manual.");
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  function handleManualSelect(card: CardType) {
    if (scannedCards.find((c) => c.id === card.id)) return;
    const newCards = [...scannedCards, card];
    setScannedCards(newCards);
  }

  function handleRemoveCard(index: number) {
    setScannedCards((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (scannedCards.length === 0) return;
    stopScanner();
    onComplete(scannedCards.map((c) => c.id));
  }

  const availableCards = ALL_CARDS.filter(
    (c) => !scannedCards.find((sc) => sc.id === c.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col items-center p-4">
      <h2 className="text-2xl font-bold text-white mb-1">Scan Kartu</h2>
      <p className="text-gray-400 text-sm mb-4">
        {scanMode === "qr"
          ? "Arahkan kamera ke QR code kartu"
          : "Pilih kartu dari daftar"}{" "}
        ({scannedCards.length}/{maxCards})
      </p>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setScanMode("qr");
            if (scanMode === "manual") stopScanner();
          }}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
            scanMode === "qr"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400 hover:text-white"
          }`}
        >
          Scan QR
        </button>
        <button
          onClick={() => {
            setScanMode("manual");
            stopScanner();
          }}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
            scanMode === "manual"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-400 hover:text-white"
          }`}
        >
          Pilih Manual
        </button>
      </div>

      {/* QR Scanner */}
      {scanMode === "qr" && (
        <div className="w-full max-w-sm mb-4">
          {cameraError ? (
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-red-400 text-sm mb-3">{cameraError}</p>
              <button
                onClick={startScanner}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Coba Lagi
              </button>
            </div>
          ) : !scanning ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">📷</div>
              <button
                onClick={startScanner}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold
                  rounded-lg hover:from-green-500 hover:to-green-600 transition-all"
              >
                Mulai Scan
              </button>
            </div>
          ) : null}

          {/* QR Reader container */}
          <div
            id="qr-reader"
            ref={scannerRef}
            className="rounded-xl overflow-hidden"
          />

          {/* Scan feedback */}
          {lastScanMsg && (
            <div
              className={`mt-2 text-center text-sm font-bold animate-fade-in ${
                lastScanMsg.includes("terdeteksi")
                  ? "text-green-400"
                  : "text-yellow-400"
              }`}
            >
              {lastScanMsg}
            </div>
          )}
        </div>
      )}

      {/* Manual Selection */}
      {scanMode === "manual" && availableCards.length > 0 && (
        <div className="w-full max-w-md mb-4">
          <div className="flex flex-wrap justify-center gap-2">
            {availableCards.map((card) => (
              <Card
                key={card.id}
                card={card}
                onClick={() => handleManualSelect(card)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scanned Cards */}
      {scannedCards.length > 0 && (
        <div className="w-full max-w-md mt-2">
          <p className="text-gray-400 text-sm mb-2 text-center">Kartu yang dipilih:</p>
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

      {/* Submit */}
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
            : `Submit ${scannedCards.length} Kartu`}
        </button>
      )}
    </div>
  );
}
