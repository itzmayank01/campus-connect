/**
 * @file studyToolPipeline.ts
 * @description Shared pipeline helpers used by all StudyLab tool generators.
 * Every tool follows the same flow:
 *   fetchFromS3 → extractText → cleanAndChunk → callGroq → safeParseJson
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import mammoth from "mammoth";
import Groq from "groq-sdk";
import pdfParse from "pdf-parse";

// ─── Clients (lazy-initialized to avoid build-time failures) ─────────────────

let _s3: S3Client | null = null;
function getS3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

let _groq: Groq | null = null;
function getGroq() {
  if (!_groq) {
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });
  }
  return _groq;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GroqModel =
  | "llama-3.1-8b-instant"        // fast, cheap — use for data extraction tasks
  | "llama-3.3-70b-versatile";    // powerful — replaces retired llama-3.1-70b-versatile

// ─── Step 1: Fetch file buffer from S3 ───────────────────────────────────────

/**
 * Downloads a file from S3 and returns its raw Buffer.
 * Uses the s3Key stored on the Resource model.
 */
export async function fetchFromS3(s3Key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: s3Key,
  });

  const response = await getS3().send(command);

  if (!response.Body) {
    throw new Error(`S3 returned empty body for key: ${s3Key}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ─── Step 2: Extract plain text from buffer ───────────────────────────────────

/**
 * Extracts plain text from a PDF or DOCX buffer.
 * Falls back to UTF-8 string decode for plain text files.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const type = mimeType.toLowerCase();

  if (type.includes("pdf")) {
    // pdf-parse v1.1.1 — pure Node.js, NO browser APIs, works on Vercel serverless
    // pdfjs-dist was replaced because it requires DOMMatrix (browser-only API)
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (type.includes("word") || type.includes("docx") || type.includes("openxmlformats")) {
    const result = await mammoth.extractRawText({ buffer });
    if (result.messages.length > 0) {
      console.warn("[extractText] mammoth warnings:", result.messages);
    }
    return result.value;
  }

  // Plain text fallback
  return buffer.toString("utf-8");
}

// ─── Step 3: Clean and chunk text ─────────────────────────────────────────────

/**
 * Cleans extracted text (removes junk characters, collapses whitespace)
 * and truncates to maxWords to fit within Groq context window.
 * Default 4000 words ≈ 5500 tokens — safe for all Groq models.
 */
export function cleanAndChunk(rawText: string, maxWords = 4000): string {
  const cleaned = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const words = cleaned.split(/\s+/);

  if (words.length <= maxWords) return cleaned;

  return words.slice(0, maxWords).join(" ") +
    "\n\n[Document truncated to first 4000 words for processing]";
}

// ─── Step 4: Call Groq LLM ────────────────────────────────────────────────────

/**
 * Makes a chat completion call to Groq.
 * Uses temperature 0.7 for creative but consistent output.
 * Max tokens 4096 — enough for any StudyLab tool output.
 */
export async function callGroq(
  systemPrompt: string,
  userContent: string,
  model: GroqModel = "llama-3.3-70b-versatile"
): Promise<string> {
  const completion = await getGroq().chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty response");
  }
  return content;
}

/**
 * Extracts the first complete JSON object or array from an LLM response.
 * Handles trailing prose after JSON (llama-3.1-8b-instant appends explanations),
 * markdown fences, smart quotes, trailing commas.
 */
export function safeParseJson<T>(raw: string): T {
  // 1. Strip markdown fences + fix smart quotes + trailing commas
  const defenced = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/,(\s*[}\]])/g, "$1")
    .trim();

  // 2. Direct parse (fast path — works when model behaves)
  try { return JSON.parse(defenced) as T; } catch { /* fall through */ }

  // 3. Balanced-brace extractor — stops at the real closing brace,
  //    ignoring any trailing prose the model adds after the JSON.
  const startChar = (defenced.indexOf("{") !== -1 && defenced.indexOf("[") !== -1)
    ? (defenced.indexOf("{") < defenced.indexOf("[") ? "{" : "[")
    : defenced.includes("{") ? "{" : "[";
  const closeChar = startChar === "{" ? "}" : "]";
  const start = defenced.indexOf(startChar);

  if (start === -1) {
    throw new Error(`No JSON in model response. Raw: ${raw.slice(0, 300)}`);
  }

  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < defenced.length; i++) {
    const ch = defenced[i];
    if (escaped)          { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"')       { inString = !inString; continue; }
    if (inString)         continue;
    if (ch === startChar) depth++;
    else if (ch === closeChar && --depth === 0) {
      try { return JSON.parse(defenced.slice(start, i + 1)) as T; }
      catch (e) { throw new Error(`JSON slice parse failed: ${e}\nSlice: ${defenced.slice(start, i + 1).slice(0, 300)}`); }
    }
  }

  throw new Error(`Unbalanced JSON in model response. Raw: ${raw.slice(0, 300)}`);
}


// ─── Audio helper: stream to Buffer ──────────────────────────────────────────

/**
 * Collects a Node.js Readable stream into a single Buffer.
 * Used by Audio Overview and Video Overview generators.
 */
export async function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
