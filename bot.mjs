import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const { Client, LocalAuth } = pkg;

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-llm-67b-chat";

if (!DEEPSEEK_API_KEY) {
  console.error(
    "❌ API Key tidak ditemukan! Pastikan file .env sudah dikonfigurasi."
  );
  process.exit(1);
}

const client = new Client({
  authStrategy: new LocalAuth(),
});

const GROUP_ID = "120363181223049002@g.us";

client.on("qr", (qr) => {
  console.log("Scan QR Code ini untuk login:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Bot siap digunakan!");
  setInterval(checkPrayerTimes, 60000);
});

async function getAIResponse(userMessage) {
  const messages = [
    { role: "system", content: "You are an AI chatbot." },
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
        body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, stream: true }),
      }
    );

    const rawText = await response.text();
    console.log("🔍 Raw API Response:", rawText);

    const lines = rawText
      .split("\n")
      .filter(
        (line) =>
          line.trim() !== "" &&
          line.includes("data:") &&
          !line.includes("[DONE]")
      );

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
    console.error("❌ Error fetching AI response:", error);
    return "Terjadi kesalahan dalam komunikasi dengan AI.";
  }
}

async function checkPrayerTimes() {
  try {
    const response = await fetch(
      "https://bimasislam.kemenag.go.id/ajax/getShalatbln",
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: "x=c20ad4d76fe97759aa27a0c99bff6710&y=9766527f2b5d3e95d4a733fcfb77bd7e&bln=2&thn=2025",
      }
    );

    const data = await response.json();
    if (data.jadwal && data.jadwal.length > 0) {
      const today = new Date().getDate();
      const todaySchedule = data.jadwal.find(
        (j) => parseInt(j.tanggal.split("-")[2]) === today
      );
      if (!todaySchedule) return;

      const { subuh, dzuhur, ashar, maghrib, isya } = todaySchedule;
      const now = new Date();
      const currentTime =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");

      const prayerMessages = {
        Subuh:
          "🌄 Selamat pagi! Waktunya sholat Subuh. Jangan lupa awali harimu dengan doa dan keberkahan! 🌿✨",
        Dzuhur:
          "☀️ Waktunya istirahat! Jangan lupa sholat Dzuhur, yuk! Semoga harimu penuh keberkahan. 🤲",
        Ashar:
          "🌅 Waktunya Ashar! Jangan tunda-tunda, yuk segera sholat dan rehat sejenak dari kesibukan. 🙏",
        Maghrib:
          "🌇 Matahari telah terbenam! Saatnya sholat Maghrib. Yuk, kita perbanyak doa dan syukur hari ini. 🌟",
        Isya: "🌙 Malam yang tenang, hati yang damai! Jangan lupa sholat Isya sebelum beristirahat. Semoga tidurmu penuh berkah. 😇",
      };

      const prayerTimes = {
        Subuh: subuh,
        Dzuhur: dzuhur,
        Ashar: ashar,
        Maghrib: maghrib,
        Isya: isya,
      };
      for (const [prayer, time] of Object.entries(prayerTimes)) {
        if (currentTime === time) {
          client.sendMessage(GROUP_ID, prayerMessages[prayer]);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error fetching prayer times:", error);
  }
}

client.on("message", async (message) => {
  console.log(`📩 Pesan diterima dari ${message.from}: ${message.body}`);

  if (message.body.startsWith("!ai")) {
    const userMessage = message.body.replace("!ai", "").trim();
    if (!userMessage) return;
    const aiReply = await getAIResponse(userMessage);
    client.sendMessage(message.from, aiReply);
  }
});

client.initialize();
