import { Punishment } from "@/types/game";

const PUNISHMENTS: Punishment[] = [
  {
    id: 1,
    text: "Post story IG tulisan 'Aku kalah main kartu, jangan tanya kenapa' tanpa konteks",
    emoji: "📱",
    category: "Social Media",
  },
  {
    id: 2,
    text: "Ganti foto profil WhatsApp jadi foto yang dipilih pemenang selama 1 jam",
    emoji: "🤳",
    category: "Social Media",
  },
  {
    id: 3,
    text: "Kirim voice note nyanyi lagu 'Bintang Kecil' ke grup keluarga",
    emoji: "🎤",
    category: "Chat",
  },
  {
    id: 4,
    text: "Buat TikTok joget 15 detik pakai lagu random yang dipilih pemenang",
    emoji: "💃",
    category: "Social Media",
  },
  {
    id: 5,
    text: "Chat gebetan atau crush 'Hai, lagi apa?' tanpa konteks apapun",
    emoji: "💬",
    category: "Chat",
  },
  {
    id: 6,
    text: "Pasang status WA 'Dicari: teman curhat, syarat sabar' selama 2 jam",
    emoji: "📝",
    category: "Social Media",
  },
  {
    id: 7,
    text: "Kirim foto selfie muka jelek ke grup teman terdekat",
    emoji: "🤪",
    category: "Chat",
  },
  {
    id: 8,
    text: "Reply story orang random yang jarang kamu chat dengan 'Keren banget!'",
    emoji: "🔥",
    category: "Social Media",
  },
  {
    id: 9,
    text: "Record video bilang 'Aku kalah dan aku menerima kekalahan ini dengan lapang dada' lalu kirim ke pemenang",
    emoji: "🎬",
    category: "Video",
  },
  {
    id: 10,
    text: "Traktir pemenang es teh/kopi di waktu yang disepakati",
    emoji: "🧋",
    category: "Real Life",
  },
  {
    id: 11,
    text: "Jadikan pemenang sebagai wallpaper HP selama 30 menit",
    emoji: "📱",
    category: "Real Life",
  },
  {
    id: 12,
    text: "Tulis puisi 4 baris tentang kekalahan ini dan kirim ke pemenang",
    emoji: "✍️",
    category: "Creative",
  },
  {
    id: 13,
    text: "Post tweet/X 'Ternyata main kartu aja aku gabisa, apalagi main hati 💔'",
    emoji: "🐦",
    category: "Social Media",
  },
  {
    id: 14,
    text: "Kirim voice note teriak 'AKU KALAAAH!' ke pemenang",
    emoji: "📢",
    category: "Chat",
  },
  {
    id: 15,
    text: "Ganti bio Instagram jadi 'Kalah main kartu dari [nama pemenang]' selama 1 jam",
    emoji: "✏️",
    category: "Social Media",
  },
  {
    id: 16,
    text: "Follow 3 akun random yang dipilih pemenang di Instagram",
    emoji: "👥",
    category: "Social Media",
  },
  {
    id: 17,
    text: "Buat story WA video bilang 'Selamat pagi/siang/malam semuanya' dengan senyum paksa",
    emoji: "😬",
    category: "Video",
  },
  {
    id: 18,
    text: "Jadi asisten pemenang selama 10 menit (ambilkan minum, dll)",
    emoji: "🫡",
    category: "Real Life",
  },
  {
    id: 19,
    text: "Kirim chat ke 3 orang berbeda: 'Aku kangen kamu' tanpa penjelasan",
    emoji: "💌",
    category: "Chat",
  },
  {
    id: 20,
    text: "Harus bilang 'siap boss' ke pemenang setiap kali dipanggil selama 15 menit",
    emoji: "🫠",
    category: "Real Life",
  },
  {
    id: 21,
    text: "Upload foto terakhir di galeri HP ke story IG (apapun itu)",
    emoji: "🎰",
    category: "Social Media",
  },
  {
    id: 22,
    text: "Telepon orang terakhir di log panggilan dan bilang 'Aku cuma mau bilang, kamu hebat'",
    emoji: "📞",
    category: "Real Life",
  },
  {
    id: 23,
    text: "Pakai foto pemenang sebagai profile picture Discord/WA selama 1 jam",
    emoji: "🖼️",
    category: "Social Media",
  },
  {
    id: 24,
    text: "Buat review bintang 5 di Google Maps untuk tempat terakhir yang kamu kunjungi",
    emoji: "⭐",
    category: "Creative",
  },
  {
    id: 25,
    text: "Kirim meme yang dibuat sendiri (bisa jelek) tentang kekalahanmu ke pemenang",
    emoji: "😂",
    category: "Creative",
  },
];

export function getRandomPunishment(): Punishment {
  const index = Math.floor(Math.random() * PUNISHMENTS.length);
  return PUNISHMENTS[index];
}

export { PUNISHMENTS };
