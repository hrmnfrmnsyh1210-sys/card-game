"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card as CardType } from "@/types/game";
import { ALL_CARDS } from "@/data/cards";
import Card from "./Card";

interface CardScannerProps {
  onComplete: (cardIds: string[]) => void;
  maxCards: number;
}

type ScanStatus = "idle" | "camera-on" | "analyzing" | "detected" | "not-found";

export default function CardScanner({ onComplete, maxCards }: CardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scannedCards, setScannedCards] = useState<CardType[]>([]);
  const [detectedCard, setDetectedCard] = useState<CardType | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [manualMode, setManualMode] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Attach stream to video when element mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [scanStatus]);

  async function startCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      streamRef.current = stream;
      setScanStatus("camera-on");
    } catch {
      setCameraError("Gagal membuka kamera. Pastikan izin kamera sudah diberikan.");
    }
  }

  async function captureAndAnalyze() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture frame - scale down to max 640px for faster upload
    const maxDim = 640;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);

    // Convert to base64 JPEG
    const imageData = canvas.toDataURL("image/jpeg", 0.85);

    setScanStatus("analyzing");
    setErrorMsg("");

    try {
      const res = await fetch("/api/scan-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal menganalisis");
        setScanStatus("not-found");
        setTimeout(() => setScanStatus("camera-on"), 2500);
        return;
      }

      if (data.success && data.card) {
        const card = data.card as CardType;

        // Check duplicate
        if (scannedCards.find((c) => c.id === card.id)) {
          setErrorMsg(`${card.name} sudah di-scan!`);
          setScanStatus("not-found");
          setTimeout(() => setScanStatus("camera-on"), 2000);
          return;
        }

        setDetectedCard(card);
        setScanStatus("detected");
      } else {
        setErrorMsg("AI tidak bisa mengenali kartu ini");
        setScanStatus("not-found");
        setTimeout(() => setScanStatus("camera-on"), 2500);
      }
    } catch {
      setErrorMsg("Gagal menghubungi server");
      setScanStatus("not-found");
      setTimeout(() => setScanStatus("camera-on"), 2500);
    }
  }

  function confirmDetectedCard() {
    if (!detectedCard) return;
    const newCards = [...scannedCards, detectedCard];
    setScannedCards(newCards);
    setDetectedCard(null);
    if (newCards.length >= maxCards) {
      stopCamera();
      setScanStatus("idle");
    } else {
      setScanStatus("camera-on");
    }
  }

  function rejectDetectedCard() {
    setDetectedCard(null);
    setScanStatus("camera-on");
  }

  function handleManualSelect(card: CardType) {
    if (scannedCards.find((c) => c.id === card.id)) return;
    setScannedCards((prev) => [...prev, card]);
  }

  function handleRemoveCard(index: number) {
    setScannedCards((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (scannedCards.length === 0) return;
    stopCamera();
    onComplete(scannedCards.map((c) => c.id));
  }

  const availableCards = ALL_CARDS.filter(
    (c) => !scannedCards.find((sc) => sc.id === c.id)
  );
  const doneScanning = scannedCards.length >= maxCards;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col items-center p-4">
      <h2 className="text-2xl font-bold text-white mb-1">Scan Kartu Fisik</h2>
      <p className="text-gray-400 text-sm mb-4">
        {manualMode
          ? "Pilih kartu dari daftar"
          : "Foto kartu fisikmu, AI akan mengenali kartunya"}{" "}
        ({scannedCards.length}/{maxCards})
      </p>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setManualMode(false)}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
            !manualMode ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"
          }`}
        >
          Scan Kamera
        </button>
        <button
          onClick={() => {
            setManualMode(true);
            stopCamera();
            setScanStatus("idle");
          }}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
            manualMode ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400"
          }`}
        >
          Pilih Manual
        </button>
      </div>

      {/* ═══ CAMERA SCAN MODE ═══ */}
      {!manualMode && !doneScanning && (
        <div className="w-full max-w-sm mb-4">
          {/* Camera not started */}
          {scanStatus === "idle" && !cameraError && (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">📷</div>
              <button
                onClick={startCamera}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold
                  rounded-lg hover:from-green-500 hover:to-green-600 transition-all"
              >
                Buka Kamera
              </button>
            </div>
          )}

          {/* Camera Error */}
          {cameraError && (
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-red-400 text-sm mb-3">{cameraError}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  Coba Lagi
                </button>
                <button
                  onClick={() => {
                    setManualMode(true);
                    setCameraError("");
                  }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm"
                >
                  Pilih Manual
                </button>
              </div>
            </div>
          )}

          {/* Camera View */}
          {(scanStatus === "camera-on" ||
            scanStatus === "analyzing" ||
            scanStatus === "detected" ||
            scanStatus === "not-found") && (
            <div className="relative">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[3/4] object-cover"
                />

                {/* Scan Frame Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-12 h-12 border-t-3 border-l-3 border-green-400 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-3 border-r-3 border-green-400 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-b-3 border-l-3 border-green-400 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-b-3 border-r-3 border-green-400 rounded-br-lg" />

                  {scanStatus === "camera-on" && (
                    <div className="absolute bottom-8 left-0 right-0 text-center">
                      <span className="text-white/80 text-xs bg-black/60 px-3 py-1.5 rounded-full">
                        Posisikan kartu di dalam bingkai
                      </span>
                    </div>
                  )}
                </div>

                {/* Analyzing overlay */}
                {scanStatus === "analyzing" && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-3 animate-pulse">🤖</div>
                      <p className="text-green-400 font-bold">AI sedang mengenali kartu...</p>
                      <p className="text-gray-400 text-xs mt-1">Menganalisis gambar dengan AI</p>
                    </div>
                  </div>
                )}

                {/* Not found overlay */}
                {scanStatus === "not-found" && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="text-3xl mb-2">❌</div>
                      <p className="text-red-400 font-bold text-sm">
                        {errorMsg || "Kartu tidak dikenali"}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Pastikan seluruh kartu terlihat jelas
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Capture Button */}
              {scanStatus === "camera-on" && (
                <div className="flex justify-center mt-3">
                  <button
                    onClick={captureAndAnalyze}
                    className="w-16 h-16 rounded-full bg-white border-4 border-green-500
                      hover:border-green-400 transition-all flex items-center justify-center
                      shadow-lg active:scale-90"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xl">📸</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Detected Card Confirmation */}
          {scanStatus === "detected" && detectedCard && (
            <div className="mt-4 bg-gray-800 rounded-xl p-4 border-2 border-green-500 animate-fade-in">
              <div className="text-center mb-3">
                <p className="text-green-400 font-bold text-lg">Kartu Ditemukan!</p>
              </div>
              <div className="flex justify-center mb-3">
                <Card card={detectedCard} />
              </div>
              <div className="text-center text-sm text-gray-300 mb-3">
                <p className="font-bold">{detectedCard.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  ATK: {detectedCard.atk.toLocaleString()} | DEF:{" "}
                  {detectedCard.def.toLocaleString()} | Rarity: {detectedCard.rarity}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">{detectedCard.id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmDetectedCard}
                  className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors"
                >
                  Benar! Tambahkan
                </button>
                <button
                  onClick={rejectDetectedCard}
                  className="flex-1 py-2.5 bg-gray-700 text-gray-300 font-bold rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Bukan, Ulang
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ═══ MANUAL MODE ═══ */}
      {manualMode && !doneScanning && availableCards.length > 0 && (
        <div className="w-full max-w-md mb-4">
          <p className="text-gray-400 text-sm mb-2 text-center">Pilih kartu yang kamu punya:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {availableCards.map((card) => (
              <Card key={card.id} card={card} onClick={() => handleManualSelect(card)} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ SCANNED CARDS ═══ */}
      {scannedCards.length > 0 && (
        <div className="w-full max-w-md mt-3">
          <p className="text-gray-400 text-sm mb-2 text-center">
            Kartu kamu ({scannedCards.length}/{maxCards}):
          </p>
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

      {/* ═══ SUBMIT ═══ */}
      {scannedCards.length > 0 && (
        <button
          onClick={handleSubmit}
          className={`mt-4 px-8 py-3 font-bold text-white rounded-lg transition-all ${
            doneScanning
              ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 animate-pulse text-lg"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          {doneScanning ? "Siap Bertarung!" : `Submit ${scannedCards.length} Kartu`}
        </button>
      )}
    </div>
  );
}
