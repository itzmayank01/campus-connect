import { config } from "dotenv";
config();
import { GoogleGenerativeAI } from "@google/generative-ai";

const key = process.env.GEMINI_API_KEY;
console.log("Key set:", !!key, "Starts with:", key ? key.substring(0, 5) : "none");

async function test() {
  if (!key) {
    console.error("No key");
    return;
  }
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Calling AI...");
    const result = await model.generateContent("Hello! Are you working?");
    console.log("Success! Response:", result.response.text());
  } catch (e: any) {
    console.error("Failed:", e.message || String(e));
  }
}

test();
