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
    const modelList = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await modelList.json();
    console.log("Models:", JSON.stringify(data).substring(0, 500));
  } catch (e: any) {
    console.error("Failed:", e.message || String(e));
  }
}

test();
