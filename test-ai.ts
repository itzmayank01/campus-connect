import { isAiConfigured } from "./lib/anthropic";
console.log("AI configured:", isAiConfigured());
console.log("Key:", process.env.GEMINI_API_KEY ? "Set" : "Not set");
