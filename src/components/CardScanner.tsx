"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Card as CardType } from "@/types/game";
import { ALL_CARDS, matchCardFromText } from "@/data/cards";
import Card from "./Card";

interface CardScannerProps {
  onComplete: (cardIds: string[]) => void;
  maxCards: number;
}

type ScanStatus = "idle" | "camera-on" | "capturing" | "analyzing" | "detected" | "not-found";

export default function CardScanner({ onComplete, maxCards }: CardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workerRef = useRef<any>(null);

  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scannedCards, setScannedCards] = useState<CardType[]>([]);
  const [detectedCard, setDetectedCard] = useState<CardType | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [ocrReady, setOcrReady] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Initialize Tesseract worker
  useEffect(() => {
    let cancelled = false;

    async function initWorker() {
      const Tesseract = await import("tesseract.js");
      const worker = await Tesseract.createWorker("eng", 1, {
        logger: () => {},
      });
      if (!cancelled) {
        workerRef.current = worker;
        setOcrReady(true);
      }
    }

    initWorker();

    return () => {
      cancelled = true;
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  async function startCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanStatus("camera-on");
    } catch {
      setCameraError("Gagal membuka kamera. Pastikan izin kamera sudah diberikan.");
    }
  }

  async function captureAndAnalyze() {
    if (!videoRef.current || !canvasRef.current || !workerRef.current) return;

    setScanStatus("capturing");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture frame from video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    setScanStatus("analyzing");

    try {
      // Run OCR on captured frame
      const result = await workerRef.current.recognize(canvas);
      const text = result.data.text;
      setOcrText(text);

      // Try to match card
      const matched = matchCardFromText(text);

      if (matched) {
        // Check if already scanned
        if (scannedCards.find((c) => c.id === matched.id)) {
          setScanStatus("not-found");
          setOcrText(`${matched.name} sudah di-scan sebelumnya!`);
          setTimeout(() => setScanStatus("camera-on"), 2000);
          return;
        }

        setDetectedCard(matched);
        setScanStatus("detected");
      } else {
        setScanStatus("not-found");
        setTimeout(() => setScanStatus("camera-on"), 2000);
      }
    } catch {
      setScanStatus("not-found");
      setOcrText("Gagal menganalisis gambar");
      setTimeout(() => setScanStatus("camera-on"), 2000);
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
    const newCards = [...scannedCards, card];
    setScannedCards(newCards);
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
        Arahkan kamera ke kartu, foto, dan sistem akan mengenali kartumu
        ({scannedCards.length}/{maxCards})
      </p>

      {/* Manual/Scan Toggle */}
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
          {scanStatus === "idle" && (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">📷</div>
              {!ocrReady ? (
                <div>
                  <div className="text-gray-400 text-sm mb-2">Mempersiapkan scanner...</div>
                  <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full animate-pulse w-2/3" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold
                    rounded-lg hover:from-green-500 hover:to-green-600 transition-all"
                >
                  Buka Kamera
                </button>
              )}
            </div>
          )}

          {/* Camera Error */}
          {cameraError && (
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-red-400 text-sm mb-3">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Camera View */}
          {(scanStatus === "camera-on" ||
            scanStatus === "capturing" ||
            scanStatus === "analyzing" ||
            scanStatus === "detected" ||
            scanStatus === "not-found") && (
            <div className="relative">
              {/* Video */}
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover"
                />

                {/* Scan Frame Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-green-400 rounded-tl" />
                  <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-green-400 rounded-tr" />
                  <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-green-400 rounded-bl" />
                  <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-green-400 rounded-br" />

                  {/* Center guide text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {scanStatus === "camera-on" && (
                      <span className="text-white/60 text-xs bg-black/50 px-3 py-1 rounded">
                        Posisikan kartu di dalam bingkai
                      </span>
                    )}
                  </div>
                </div>

                {/* Analyzing overlay */}
                {scanStatus === "analyzing" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl animate-spin mb-2">🔍</div>
                      <p className="text-green-400 text-sm font-bold">Menganalisis kartu...</p>
                    </div>
                  </div>
                )}

                {/* Not found overlay */}
                {scanStatus === "not-found" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-2">❌</div>
                      <p className="text-red-400 text-sm font-bold">
                        {ocrText || "Kartu tidak dikenali"}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">Coba posisikan ulang...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Capture Button */}
              {scanStatus === "camera-on" && (
                <div className="flex justify-center mt-3">
                  <button
                    onClick={captureAndAnalyze}
                    disabled={!ocrReady}
                    className="w-16 h-16 rounded-full bg-white border-4 border-green-500
                      hover:border-green-400 transition-colors flex items-center justify-center
                      shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Detected Card Confirmation */}
          {scanStatus === "detected" && detectedCard && (
            <div className="mt-4 bg-gray-800 rounded-xl p-4 border-2 border-green-500 animate-fade-in">
              <div className="text-center mb-3">
                <p className="text-green-400 font-bold text-sm">Kartu Terdeteksi!</p>
              </div>
              <div className="flex justify-center mb-3">
                <Card card={detectedCard} />
              </div>
              <div className="text-center text-xs text-gray-400 mb-3">
                <p>ATK: {detectedCard.atk.toLocaleString()} | DEF: {detectedCard.def.toLocaleString()}</p>
                <p className="text-gray-600 mt-1">ID: {detectedCard.id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmDetectedCard}
                  className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg
                    hover:bg-green-500 transition-colors"
                >
                  Benar! Tambahkan
                </button>
                <button
                  onClick={rejectDetectedCard}
                  className="flex-1 py-2 bg-gray-700 text-gray-300 font-bold rounded-lg
                    hover:bg-gray-600 transition-colors"
                >
                  Salah, Ulang
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ═══ MANUAL MODE ═══ */}
      {manualMode && !doneScanning && availableCards.length > 0 && (
        <div className="w-full max-w-md mb-4">
          <p className="text-gray-400 text-sm mb-2 text-center">Pilih kartu yang kamu punya:</p>
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

      {/* ═══ SCANNED CARDS ═══ */}
      {scannedCards.length > 0 && (
        <div className="w-full max-w-md mt-3">
          <p className="text-gray-400 text-sm mb-2 text-center">
            Kartu yang sudah di-scan ({scannedCards.length}/{maxCards}):
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
          {doneScanning
            ? "Siap Bertarung!"
            : `Submit ${scannedCards.length} Kartu`}
        </button>
      )}
    </div>
  );
}
