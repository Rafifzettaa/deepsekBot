// Install dulu OpenAI SDK: `npm install openai`
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables dari .env
dotenv.config();

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function testDeepSeek() {
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "system", content: "You are a helpful assistant." }],
    });

    console.log("✅ AI Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("❌ Error fetching DeepSeek response:", error);
  }
}

testDeepSeek();
