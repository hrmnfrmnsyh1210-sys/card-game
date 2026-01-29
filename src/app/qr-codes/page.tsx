"use client";

import { useState, useEffect } from "react";
import { ALL_CARDS } from "@/data/cards";
import { Card as CardType } from "@/types/game";

export default function QRCodesPage() {
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (generated) return;
    generateAll();
    setGenerated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateAll() {
    const QRCode = (await import("qrcode")).default;

    const urls: Record<string, string> = {};
    for (const card of ALL_CARDS) {
      urls[card.id] = await QRCode.toDataURL(card.id, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
    setQrUrls(urls);
  }

  function getCardColor(card: CardType): string {
    return card.type === "plant"
      ? "border-green-500 bg-green-950/30"
      : "border-blue-500 bg-blue-950/30";
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            QR Code Kartu
          </h1>
          <p className="text-gray-400">
            Print QR code ini dan tempel di kartu fisikmu. Saat bermain, scan QR code
            menggunakan kamera untuk mendaftarkan kartumu.
          </p>
          <button
            onClick={() => window.print()}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold
              hover:bg-blue-500 transition-colors print:hidden"
          >
            Print Semua
          </button>
          <a
            href="/"
            className="ml-3 mt-3 inline-block px-4 py-2 bg-gray-700 text-white rounded-lg text-sm
              hover:bg-gray-600 transition-colors print:hidden"
          >
            Kembali ke Game
          </a>
        </div>

        {/* QR Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
          {ALL_CARDS.map((card) => (
            <div
              key={card.id}
              className={`rounded-xl p-4 border-2 ${getCardColor(card)} print:border print:p-2`}
            >
              <div className="text-center">
                {/* Card Info */}
                <div className="mb-2">
                  <span className="text-lg">
                    {card.type === "plant" ? "🌱" : "🧟"}
                  </span>
                  <h3 className="text-white font-bold text-sm">{card.name}</h3>
                  <p className="text-gray-400 text-[10px]">
                    ATK: {card.atk.toLocaleString()} | DEF: {card.def.toLocaleString()} |{" "}
                    {card.rarity}
                  </p>
                </div>

                {/* QR Code */}
                {qrUrls[card.id] ? (
                  <img
                    src={qrUrls[card.id]}
                    alt={card.id}
                    className="mx-auto w-32 h-32 print:w-24 print:h-24"
                  />
                ) : (
                  <div className="w-32 h-32 mx-auto bg-gray-800 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-xs">Loading...</span>
                  </div>
                )}

                {/* Card ID */}
                <p className="text-gray-500 text-[10px] font-mono mt-1">
                  {card.id}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
