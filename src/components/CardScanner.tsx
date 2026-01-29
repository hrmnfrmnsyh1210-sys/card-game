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

/**
 * Preprocess canvas image for better OCR:
 * - Crop bottom 40% (where card name, stats, ID are)
 * - Convert to grayscale
 * - Increase contrast
 * - Threshold to black/white
 */
function preprocessForOCR(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement
): void {
  const srcCtx = sourceCanvas.getContext("2d");
  const tgtCtx = targetCanvas.getContext("2d");
  if (!srcCtx || !tgtCtx) return;

  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  // Crop bottom 45% of the card (name + stats area)
  const cropY = Math.floor(sh * 0.55);
  const cropH = sh - cropY;

  targetCanvas.width = sw;
  targetCanvas.height = cropH;

  // Draw cropped region
  tgtCtx.drawImage(sourceCanvas, 0, cropY, sw, cropH, 0, 0, sw, cropH);

  // Get pixel data
  const imageData = tgtCtx.getImageData(0, 0, sw, cropH);
  const data = imageData.data;

  // Convert to grayscale + increase contrast + threshold
  for (let i = 0; i < data.length; i += 4) {
    // Grayscale
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

    // Increase contrast (stretch histogram)
    const contrast = 1.8;
    const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
    let val = factor * (gray - 128) + 128;
    val = Math.max(0, Math.min(255, val));

    // Threshold to B&W for cleaner OCR
    const bw = val > 140 ? 255 : 0;

    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
  }

  tgtCtx.putImageData(imageData, 0, 0);
}

export default function CardScanner({ onComplete, maxCards }: CardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ocrCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workerRef = useRef<any>(null);

  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scannedCards, setScannedCards] = useState<CardType[]>([]);
  const [detectedCard, setDetectedCard] = useState<CardType | null>(null);
  const [debugText, setDebugText] = useState("");
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

  // Attach stream to video element when both are ready
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
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setScanStatus("camera-on");
    } catch {
      setCameraError("Gagal membuka kamera. Pastikan izin kamera sudah diberikan.");
    }
  }

  async function captureAndAnalyze() {
    if (!videoRef.current || !canvasRef.current || !ocrCanvasRef.current || !workerRef.current) return;

    setScanStatus("capturing");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ocrCanvas = ocrCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture full frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    setScanStatus("analyzing");

    try {
      // ── Pass 1: OCR on preprocessed bottom crop (name, stats, ID) ──
      preprocessForOCR(canvas, ocrCanvas);
      const result1 = await workerRef.current.recognize(ocrCanvas);
      const text1 = result1.data.text;

      let matched = matchCardFromText(text1);

      // ── Pass 2: If no match, OCR on full image (inverted for light text) ──
      if (!matched) {
        // Try full image with inversion (white text on dark bg → dark on white)
        const fullCtx = ocrCanvas.getContext("2d");
        ocrCanvas.width = canvas.width;
        ocrCanvas.height = canvas.height;
        fullCtx!.drawImage(canvas, 0, 0);
        const fullData = fullCtx!.getImageData(0, 0, ocrCanvas.width, ocrCanvas.height);
        const d = fullData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          const inv = 255 - gray;
          const bw = inv > 100 ? 0 : 255;
          d[i] = bw;
          d[i + 1] = bw;
          d[i + 2] = bw;
        }
        fullCtx!.putImageData(fullData, 0, 0);

        const result2 = await workerRef.current.recognize(ocrCanvas);
        const text2 = result2.data.text;
        matched = matchCardFromText(text1 + " " + text2);
        setDebugText(text1 + " | " + text2);
      } else {
        setDebugText(text1);
      }

      if (matched) {
        if (scannedCards.find((c) => c.id === matched!.id)) {
          setScanStatus("not-found");
          setDebugText(`${matched.name} sudah di-scan!`);
          setTimeout(() => setScanStatus("camera-on"), 2000);
          return;
        }
        setDetectedCard(matched);
        setScanStatus("detected");
      } else {
        setScanStatus("not-found");
        setTimeout(() => setScanStatus("camera-on"), 2500);
      }
    } catch {
      setScanStatus("not-found");
      setDebugText("Gagal menganalisis gambar");
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
          : "Arahkan kamera ke kartu, lalu tekan tombol capture"}{" "}
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
                  <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-green-400 rounded-tl" />
                  <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-green-400 rounded-tr" />
                  <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-green-400 rounded-bl" />
                  <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-green-400 rounded-br" />

                  {/* Bottom area highlight (where text is read) */}
                  <div className="absolute bottom-0 left-0 right-0 h-[45%] border-t-2 border-dashed border-yellow-400/40" />

                  {scanStatus === "camera-on" && (
                    <div className="absolute bottom-[47%] left-0 right-0 text-center">
                      <span className="text-yellow-400/70 text-[10px] bg-black/50 px-2 py-0.5 rounded">
                        pastikan nama & angka kartu terlihat di area ini
                      </span>
                    </div>
                  )}
                </div>

                {/* Analyzing overlay */}
                {scanStatus === "analyzing" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl animate-spin mb-2">🔍</div>
                      <p className="text-green-400 text-sm font-bold">Menganalisis kartu...</p>
                      <p className="text-gray-500 text-xs mt-1">Membaca teks & angka</p>
                    </div>
                  </div>
                )}

                {/* Not found overlay */}
                {scanStatus === "not-found" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center px-4">
                      <div className="text-3xl mb-2">❌</div>
                      <p className="text-red-400 text-sm font-bold">Kartu tidak dikenali</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Coba dekatkan kamera ke bagian nama & angka kartu
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
                    disabled={!ocrReady}
                    className="w-16 h-16 rounded-full bg-white border-4 border-green-500
                      hover:border-green-400 transition-colors flex items-center justify-center
                      shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500" />
                  </button>
                </div>
              )}

              {/* Debug OCR Text (kecil, untuk troubleshooting) */}
              {debugText && (scanStatus === "not-found" || scanStatus === "detected") && (
                <details className="mt-2">
                  <summary className="text-gray-600 text-[10px] cursor-pointer">
                    Debug: OCR result
                  </summary>
                  <pre className="text-gray-600 text-[9px] mt-1 bg-gray-800 p-2 rounded max-h-20 overflow-auto whitespace-pre-wrap">
                    {debugText}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Detected Card Confirmation */}
          {scanStatus === "detected" && detectedCard && (
            <div className="mt-4 bg-gray-800 rounded-xl p-4 border-2 border-green-500 animate-fade-in">
              <div className="text-center mb-3">
                <p className="text-green-400 font-bold">Kartu Terdeteksi!</p>
              </div>
              <div className="flex justify-center mb-3">
                <Card card={detectedCard} />
              </div>
              <div className="text-center text-xs text-gray-400 mb-3">
                <p>
                  ATK: {detectedCard.atk.toLocaleString()} | DEF:{" "}
                  {detectedCard.def.toLocaleString()} | {detectedCard.rarity}
                </p>
                <p className="text-gray-600 mt-0.5">ID: {detectedCard.id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmDetectedCard}
                  className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500"
                >
                  Benar! Tambahkan
                </button>
                <button
                  onClick={rejectDetectedCard}
                  className="flex-1 py-2.5 bg-gray-700 text-gray-300 font-bold rounded-lg hover:bg-gray-600"
                >
                  Salah, Ulang
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden canvases */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={ocrCanvasRef} className="hidden" />

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
          {doneScanning ? "Siap Bertarung!" : `Submit ${scannedCards.length} Kartu`}
        </button>
      )}
    </div>
  );
}
