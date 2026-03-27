/**
 * @file studyToolPipeline.ts
 * @description Shared pipeline helpers used by all StudyLab tool generators.
 *
 * Every tool follows the same flow:
 *   fetchFromS3 → extractText → cleanAndChunk → callGroq → safeParseJson
 *
 * PDF Extraction: uses pdf-parse/lib/pdf-parse (Vercel-safe).
 *   Imported via the internal module path to skip the fs.readFileSync on a
 *   test-PDF that lives in pdf-parse/index.js — that call crashes Vercel cold starts.
 *   pdfjs-dist is NOT used — it references DOMMatrix + other browser globals
 *   that do not exist in Node.js serverless runtimes.
 *
 * Model selection: llama-3.3-70b-versatile for all tools.
 *   The fast 8b model hallucinates heavily on structured JSON tasks.
 *   70b consistently follows constraints and stays grounded in the document.
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable }                   from "stream";
import mammoth                        from "mammoth";
import Groq                           from "groq-sdk";
import { extractTextFromBuffer }      from "./pdf-extractor";
import { extractTextWithTextract }    from "./textract-ocr";

// ─── Clients (lazy-initialized to avoid build-time failures) ─────────────────

let _s3: S3Client | null = null;
function getS3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

let _groq: Groq | null = null;
function getGroq() {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  }
  return _groq;
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Use llama-3.3-70b-versatile for all tools.
 * It reads and follows the document much more faithfully than 8b.
 * Groq free tier allows it — no cost difference for the user.
 */
export type GroqModel =
  | "llama-3.3-70b-versatile"     // primary — grounded, accurate, JSON-faithful
  | "llama-3.1-8b-instant";       // fallback only — not recommended for study tools

// ─── Step 1: Fetch file buffer from S3 ───────────────────────────────────────

/**
 * Downloads a file from S3 and returns its raw Buffer.
 */
export async function fetchFromS3(s3Key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key:    s3Key,
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

/** Minimum characters considered "real" extracted text. Below this threshold
 *  the PDF is almost certainly scanned/handwritten with no text layer. */
const MIN_TEXT_LENGTH = 200;

/**
 * Extracts plain text from a PDF or DOCX buffer.
 *
 * PDF strategy (two-pass):
 *  1. pdf-parse — fast, works for digital PDFs with a text layer.
 *  2. AWS Textract OCR — triggered automatically when pdf-parse returns <200 chars,
 *     which indicates a scanned or handwritten PDF (images, no text layer).
 *
 * DOCX: mammoth.
 * Plain text: UTF-8 decode.
 *
 * @param buffer   File buffer downloaded from S3.
 * @param mimeType MIME type of the file.
 * @param s3Key    S3 object key — required for the Textract OCR fallback.
 */
export async function extractText(
  buffer:   Buffer,
  mimeType: string,
  s3Key?:   string
): Promise<string> {
  const type = mimeType.toLowerCase();

  if (type.includes("pdf")) {
    // Pass 1 — fast digital extraction
    const filename  = "document.pdf";
    const digitalText = await extractTextFromBuffer(buffer, filename, mimeType);

    if (digitalText.trim().length >= MIN_TEXT_LENGTH) {
      return digitalText; // Digital PDF — has a text layer, use as-is
    }

    // Pass 2 — OCR fallback for scanned / handwritten PDFs
    if (s3Key) {
      console.log(
        `[StudyLab] pdf-parse returned ${digitalText.trim().length} chars — ` +
        `falling back to AWS Textract OCR for ${s3Key}`
      );
      return extractTextWithTextract(s3Key);
    }

    // No s3Key provided — best effort with whatever pdf-parse extracted
    console.warn("[StudyLab] Low text from pdf-parse and no s3Key for OCR fallback");
    return digitalText;
  }

  if (
    type.includes("word") ||
    type.includes("docx") ||
    type.includes("openxmlformats")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text fallback
  return buffer.toString("utf-8");
}

// ─── Step 3: Clean and chunk text ─────────────────────────────────────────────

/**
 * Cleans extracted text and truncates to maxChars to fit within context limits.
 *
 * Why chars not words: pdfjs outputs variable-length runs. Char limit is safer.
 * 20,000 chars ≈ 5,000–6,000 tokens — comfortably fits llama-3.3-70b context.
 */
export function cleanAndChunk(rawText: string, maxChars = 20_000): string {
  const cleaned = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")               // collapse blank lines
    .replace(/[^\x20-\x7E\n]/g, " ")          // remove non-ASCII
    .replace(/ {2,}/g, " ")                   // collapse multiple spaces
    .trim();

  if (cleaned.length <= maxChars) return cleaned;

  return (
    cleaned.slice(0, maxChars) +
    "\n\n[Document truncated — showing first 20,000 characters]"
  );
}

// ─── Step 4: Call Groq LLM ────────────────────────────────────────────────────

/**
 * Makes a chat completion call to Groq.
 *
 * Temperature 0.2 — much lower than before.
 * Higher temperature causes the model to "drift" from the document into
 * training-data hallucinations. 0.2 keeps it tight to the source material.
 *
 * max_tokens 4096 — sufficient for all StudyLab output formats.
 */
export async function callGroq(
  systemPrompt: string,
  userContent:  string,
  model: GroqModel = "llama-3.3-70b-versatile"
): Promise<string> {
  const completion = await getGroq().chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userContent },
    ],
    temperature: 0.2,    // low = document-faithful, high = hallucination
    max_tokens:  4096,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty response");
  return content;
}

/**
 * Extracts the first complete JSON object or array from an LLM response.
 *
 * Handles:
 * - Trailing prose after JSON (model explains its output)
 * - Markdown code fences (```json ... ```)
 * - Smart quotes (Word-style curly quotes)
 * - Trailing commas before } or ]
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

  // 2. Direct parse (fast path)
  try { return JSON.parse(defenced) as T; } catch { /* fall through */ }

  // 3. Balanced-brace extractor — handles trailing prose after JSON
  const startChar =
    defenced.includes("{") && defenced.includes("[")
      ? defenced.indexOf("{") < defenced.indexOf("[") ? "{" : "["
      : defenced.includes("{") ? "{" : "[";
  const closeChar = startChar === "{" ? "}" : "]";
  const start = defenced.indexOf(startChar);

  if (start === -1) {
    throw new Error(`No JSON in model response. Raw (first 300): ${raw.slice(0, 300)}`);
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
      try {
        return JSON.parse(defenced.slice(start, i + 1)) as T;
      } catch (e) {
        throw new Error(
          `JSON slice parse failed: ${e}\nSlice: ${defenced.slice(start, i + 1).slice(0, 300)}`
        );
      }
    }
  }

  throw new Error(`Unbalanced JSON in model response. Raw (first 300): ${raw.slice(0, 300)}`);
}

// ─── Audio helper: stream to Buffer ──────────────────────────────────────────

/**
 * Collects a Node.js Readable stream into a single Buffer.
 */
export async function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
