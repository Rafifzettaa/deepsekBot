import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Ekstrak Client dan LocalAuth dari `pkg`
const { Client, LocalAuth } = pkg;

// Konfigurasi API Deepseek
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-llm-67b-chat";

if (!DEEPSEEK_API_KEY) {
  console.error(
    "❌ API Key tidak ditemukan! Pastikan file .env sudah dikonfigurasi."
  );
  process.exit(1);
}

// Buat instance WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => {
  console.log("Scan QR Code ini untuk login:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Bot siap digunakan!");
});

async function getAIResponse(userMessage, role = "default") {
  const messages = [
    { role: "system", content: `You are an AI chatbot with role: ${role}` },
    { role: "user", content: userMessage },
  ];

  try {
    const response = await fetch(
      "https://www.deepseekapp.io/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, stream: true }), // ✅ Stream diaktifkan
      }
    );

    // Ambil stream respons dalam bentuk teks
    const rawText = await response.text();
    console.log("🔍 Raw API Response:", rawText);

    // Split respons ke dalam array berdasarkan baris, lalu filter "[DONE]"
    const lines = rawText
      .split("\n")
      .filter(
        (line) =>
          line.trim() !== "" &&
          line.includes("data:") &&
          !line.includes("[DONE]")
      ); // ✅ Abaikan "[DONE]"

    // Ambil bagian JSON dari setiap baris
    const jsonResponses = lines
      .map((line) => {
        try {
          return JSON.parse(line.replace("data: ", "").trim());
        } catch (error) {
          console.error("❌ Error parsing JSON line:", line, error);
          return null;
        }
      })
      .filter((item) => item !== null);

    // Gabungkan semua konten dari `choices` yang memiliki `delta.content`
    let aiReply = "";
    jsonResponses.forEach((json) => {
      if (
        json.choices &&
        json.choices.length > 0 &&
        json.choices[0].delta?.content
      ) {
        aiReply += json.choices[0].delta.content;
      }
    });

    return aiReply || "Maaf, saya tidak bisa menjawab saat ini.";
  } catch (error) {
    console.error("❌ Error parsing JSON atau fetching AI response:", error);
    return "Terjadi kesalahan dalam komunikasi dengan AI.";
  }
}

client.on("message", async (message) => {
  console.log(`📩 Pesan diterima dari ${message.from}: ${message.body}`);

  let role = "default";
  if (message.body.startsWith("/role ")) {
    const parts = message.body.split(" ");
    role = parts[1];
    message.reply(`🔄 Peran diubah menjadi: ${role}`);
    return;
  }

  const aiReply = await getAIResponse(message.body, role);
  client.sendMessage(message.from, aiReply);
});

// Jalankan bot
client.initialize();
