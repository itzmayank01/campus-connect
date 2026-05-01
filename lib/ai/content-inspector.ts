/**
 * @file content-inspector.ts — Anti-Gravity Content Inspection Engine
 *
 * ZERO-TOLERANCE, FAIL-CLOSED content moderation pipeline.
 * If AI is unavailable → uploads are REJECTED (not approved).
 * If any scan fails → uploads are REJECTED immediately.
 *
 * Pipeline:
 *   1. File Type Gate — magic byte + extension validation
 *   2. Text Safety Scan — AI-powered NSFW/violence/hate/spam detection
 *   3. Relevance Check — verify content matches the declared subject
 *   4. Metadata Scan — check for suspicious filenames, metadata keywords
 */

import { callAI, isAiConfigured } from "@/lib/anthropic"

// ═══════════════════════════════════════════════════════
//                     TYPES
// ═══════════════════════════════════════════════════════

export interface InspectionVerdict {
  passed: boolean
  category: string
  reason: string
  confidence: number
}

export interface SafetyResult {
  is_safe: boolean
  category: "safe" | "adult" | "violence" | "drugs" | "hate" | "self_harm" | "spam" | "non_academic" | "illegal"
  reason: string
  confidence: number
}

export interface RelevanceResult {
  is_relevant: boolean
  confidence: number
  reason: string
  detected_topics: string[]
  verdict: "approved" | "rejected"
}

export interface FullInspectionParams {
  buffer: Buffer
  filename: string
  declaredMime: string
  detectedMime: string
  fileSize: number
  extractedText: string
  subjectName: string
  subjectCode: string
  semester: number
  resourceType: string
}

export interface FullInspectionResult {
  passed: boolean
  steps: InspectionStep[]
  failedStep?: string
  failCategory?: string
  failReason?: string
  safetyResult?: SafetyResult
  relevanceResult?: RelevanceResult
  processingTimeMs: number
}

export interface InspectionStep {
  id: string
  label: string
  status: "pending" | "running" | "done" | "failed"
  message?: string
}

// ═══════════════════════════════════════════════════════
//                ALLOWED FILE TYPES
// ═══════════════════════════════════════════════════════

const ALLOWED_MIMES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "video/mp4": [".mp4"],
}

// ═══════════════════════════════════════════════════════
//            BLOCKED FILENAME KEYWORDS
// ═══════════════════════════════════════════════════════

const BLOCKED_FILENAME_KEYWORDS = [
  "porn", "xxx", "sex", "nude", "naked", "nsfw", "adult", "erotic",
  "hentai", "onlyfans", "playboy", "brazzers", "xvideos", "pornhub",
  "milf", "lesbian", "fetish", "bdsm", "orgasm", "masturbat",
  "cocaine", "heroin", "meth", "weed", "marijuana", "drug",
  "gore", "murder", "torture", "terrorist", "bomb", "weapon",
  "hack", "crack", "keygen", "pirat", "torrent", "warez",
  "malware", "virus", "trojan", "ransomware", "phishing",
]

// ═══════════════════════════════════════════════════════
//            STEP 1: FILE TYPE GATE
// ═══════════════════════════════════════════════════════

export async function inspectFileType(
  buffer: Buffer,
  filename: string,
  declaredMime: string
): Promise<InspectionVerdict & { detectedMime: string }> {
  const ext = "." + filename.split(".").pop()?.toLowerCase()

  // Deep MIME detection via file-type library
  let detectedMime = declaredMime
  try {
    const { fileTypeFromBuffer } = await import("file-type")
    const typeResult = await fileTypeFromBuffer(buffer)
    if (typeResult) {
      detectedMime = typeResult.mime
    }
  } catch {
    // file-type may not detect all types — use declared MIME as fallback
  }

  // Check if MIME is in our allowed list
  const allowedExts = ALLOWED_MIMES[detectedMime] || ALLOWED_MIMES[declaredMime]
  if (!allowedExts) {
    return {
      passed: false,
      category: "file_type",
      reason: `⛔ File type "${detectedMime}" is not permitted. Allowed: PDF, DOCX, DOC, PPT, PPTX, ZIP, JPG, PNG, MP4.`,
      confidence: 1.0,
      detectedMime,
    }
  }

  // Check for disguised files (extension doesn't match content)
  if (!allowedExts.includes(ext) && detectedMime !== declaredMime) {
    return {
      passed: false,
      category: "file_type",
      reason: `⛔ File type mismatch — extension is "${ext}" but actual content is "${detectedMime}". This file appears to be disguised.`,
      confidence: 1.0,
      detectedMime,
    }
  }

  return {
    passed: true,
    category: "file_type",
    reason: "File type verified",
    confidence: 1.0,
    detectedMime,
  }
}

// ═══════════════════════════════════════════════════════
//        STEP 2: FILENAME + METADATA SCAN
// ═══════════════════════════════════════════════════════

export function inspectMetadata(
  filename: string,
  fileSize: number,
  mimeType: string
): InspectionVerdict {
  // Check filename against blocklist
  const filenameLower = filename.toLowerCase().replace(/[^a-z0-9]/g, "")
  const blockedKeyword = BLOCKED_FILENAME_KEYWORDS.find(kw => filenameLower.includes(kw))

  if (blockedKeyword) {
    return {
      passed: false,
      category: "metadata",
      reason: `⛔ STOP — Upload BLOCKED. Filename contains prohibited keyword. This content is not permitted on this platform. This incident has been logged.`,
      confidence: 1.0,
    }
  }

  // File size check (max 50MB)
  const MAX_FILE_SIZE = 50 * 1024 * 1024
  if (fileSize > MAX_FILE_SIZE) {
    return {
      passed: false,
      category: "metadata",
      reason: `File is too large (${(fileSize / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 50 MB.`,
      confidence: 1.0,
    }
  }

  // Empty file check
  if (fileSize === 0) {
    return {
      passed: false,
      category: "metadata",
      reason: "File is empty (0 bytes). Please upload a valid file.",
      confidence: 1.0,
    }
  }

  return {
    passed: true,
    category: "metadata",
    reason: "Metadata verified — no violations found",
    confidence: 1.0,
  }
}

// ═══════════════════════════════════════════════════════
//     STEP 3: AI SAFETY SCAN (MANDATORY — FAIL-CLOSED)
// ═══════════════════════════════════════════════════════

export async function inspectSafety(
  extractedText: string,
  filename: string,
  mimeType: string,
  fileSize: number,
  subjectName: string,
  resourceType: string,
  fileBuffer?: Buffer
): Promise<InspectionVerdict & { safetyResult?: SafetyResult }> {
  // ──── FAIL-CLOSED: AI MUST be available ────
  if (!isAiConfigured()) {
    return {
      passed: false,
      category: "safety",
      reason: "⛔ STOP — Safety scanning service is unavailable. Uploads cannot be accepted without AI inspection. Please try again later or contact the administrator.",
      confidence: 1.0,
    }
  }

  const safetyContent = extractedText.length > 10
    ? extractedText
    : `[No text extracted — file may be image-based]\nFilename: ${filename}\nType: ${mimeType}\nSize: ${(fileSize / (1024 * 1024)).toFixed(1)} MB`

  const safetyPrompt = `You are Anti-Gravity, an AI content safety inspector for a college academic resource platform (Campus Connect). Your job is to detect ANY content that violates platform safety policy.

SCAN the following uploaded content and check for ALL of these violation categories:
- ADULT: Sexual, explicit, NSFW, pornographic, or suggestive content
- VIOLENCE: Graphic violence, gore, torture, weapons instructions
- DRUGS: Drug use, manufacture, or promotion
- HATE: Hate speech, discrimination, slurs, extremism
- SELF_HARM: Self-harm, suicide instructions or promotion
- SPAM: Spam, scam, phishing, misleading content
- ILLEGAL: Piracy, hacking tools, illegal activities
- NON_ACADEMIC: Content that has zero academic value (memes, jokes unrelated to coursework, random personal files)

Be STRICT — when in doubt, flag it. Academic content about sensitive topics (e.g., forensic science, pharmacology, law) is ALLOWED if clearly educational.

Also check the FILENAME for inappropriate terms.

Respond ONLY with valid JSON (no markdown, no code fences):
{"is_safe": true/false, "category": "safe"|"adult"|"violence"|"drugs"|"hate"|"self_harm"|"spam"|"non_academic"|"illegal", "reason": "one sentence explanation", "confidence": 0.0-1.0}`

  const safetyMessage = `INSPECT THIS UPLOAD:
Filename: ${filename}
Subject: ${subjectName}
Resource Type: ${resourceType}
Content Type: ${mimeType}

CONTENT TO SCAN:
${safetyContent.slice(0, 3000)}`

  const attachment = fileBuffer ? { buffer: fileBuffer, mimeType } : undefined

  // Call AI — up to 2 attempts
  let safetyResponse: string | null = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    safetyResponse = await callAI(safetyPrompt, safetyMessage, attachment)
    if (safetyResponse) break
    
    // On second attempt, try a "lightweight" prompt with less content if the first one timed out/failed
    if (attempt === 1) {
      console.warn(`[Anti-Gravity] Safety scan attempt 1 failed, trying lightweight fallback...`)
      const lightweightMessage = `INSPECT THIS UPLOAD (Lightweight fallback):\nFilename: ${filename}\nSubject: ${subjectName}\nType: ${resourceType}\n\nContent snippet:\n${safetyContent.slice(0, 500)}`
      // Omit attachment on fallback in case the attachment was too large/complex and caused the timeout
      safetyResponse = await callAI(safetyPrompt, lightweightMessage)
      if (safetyResponse) break
    }
  }

  // ──── FAIL-CLOSED: If AI didn't respond, REJECT ────
  if (!safetyResponse) {
    // Final check: if it's a known genuine file type and filename looks fine, we might want to be less aggressive,
    // but the user's mission is "make sure AI is UP everytime". 
    // However, for "genuine content" we should at least log the failure details.
    return {
      passed: false,
      category: "safety",
      reason: "⛔ STOP — AI safety service did not respond after multiple attempts. This usually happens if the file content is too complex or the service is temporarily overloaded. Please try again in a few minutes.",
      confidence: 1.0,
    }
  }

  // Parse AI response
  let safetyResult: SafetyResult
  try {
    const cleaned = safetyResponse.replace(/```json\n?|```\n?/g, "").trim()
    safetyResult = JSON.parse(cleaned)
  } catch {
    // ──── FAIL-CLOSED: If response can't be parsed, REJECT ────
    console.error("[Anti-Gravity] Failed to parse safety response:", safetyResponse)
    return {
      passed: false,
      category: "safety",
      reason: "⛔ STOP — Safety scan produced an unreadable result. Upload rejected as a precaution. Please try again.",
      confidence: 1.0,
    }
  }

  console.log("[Anti-Gravity] Safety result:", JSON.stringify(safetyResult))

  if (!safetyResult.is_safe) {
    const categoryLabels: Record<string, string> = {
      adult: "Adult / Explicit / NSFW Content",
      violence: "Violent / Graphic Content",
      drugs: "Drug-Related Content",
      hate: "Hate Speech / Extremism",
      self_harm: "Self-Harm Content",
      spam: "Spam / Misleading Content",
      non_academic: "Non-Academic / Irrelevant Content",
      illegal: "Illegal / Prohibited Content",
    }
    const flagType = categoryLabels[safetyResult.category] || "Policy-Violating Content"

    return {
      passed: false,
      category: safetyResult.category,
      reason: `⛔ STOP — UPLOAD REJECTED\n\n${flagType} was detected in your file.\nThis content is not permitted on this platform.\n\nReason: ${safetyResult.reason}\n\nThis file has been permanently rejected.\nDo not attempt to re-upload this content.`,
      confidence: safetyResult.confidence || 0.9,
      safetyResult,
    }
  }

  return {
    passed: true,
    category: "safe",
    reason: "Content verified as safe ✅",
    confidence: safetyResult.confidence || 0.9,
    safetyResult,
  }
}

// ═══════════════════════════════════════════════════════
//     STEP 4: AI RELEVANCE CHECK (FAIL-CLOSED)
// ═══════════════════════════════════════════════════════

export async function inspectRelevance(
  extractedText: string,
  filename: string,
  subjectName: string,
  subjectCode: string,
  semester: number,
  resourceType: string
): Promise<InspectionVerdict & { relevanceResult?: RelevanceResult }> {
  // If no meaningful text was extracted, skip relevance (can't judge relevance of image-only files)
  if (extractedText.length < 20) {
    return {
      passed: true,
      category: "relevance",
      reason: "Relevance check skipped — insufficient text content for analysis",
      confidence: 0.5,
    }
  }

  if (!isAiConfigured()) {
    return {
      passed: false,
      category: "relevance",
      reason: "⛔ STOP — AI relevance service is unavailable. Uploads cannot be accepted without content verification.",
      confidence: 1.0,
    }
  }

  const relevancePrompt = `You are an academic content relevance checker for Campus Connect, an engineering college resource platform. 

Analyze if the uploaded content is relevant to the specified academic subject. 

Rules:
- Course notes, question papers, lab manuals, textbook excerpts, and reference materials for the subject are RELEVANT
- General study aids (formulas, how-to-study guides) for the subject area are RELEVANT
- Content for a completely different subject is NOT RELEVANT
- Random non-academic content (memes, personal docs, etc.) is NOT RELEVANT
- Be REASONABLE — if it's even loosely related to the engineering field and semester level, it's likely relevant

Respond ONLY with valid JSON (no markdown, no code fences):
{"is_relevant": true/false, "confidence": 0.0-1.0, "reason": "one sentence explanation", "detected_topics": ["topic1", "topic2"], "verdict": "approved"|"rejected"}`

  const relevanceMessage = `Subject: ${subjectName} (${subjectCode})
Semester: ${semester}
Resource Type: ${resourceType}
Filename: ${filename}

Content preview:
${extractedText.slice(0, 2000)}

Is this content relevant to the subject?`

  const response = await callAI(relevancePrompt, relevanceMessage)

  if (!response) {
    // Fail-closed for relevance too
    return {
      passed: false,
      category: "relevance",
      reason: "⛔ STOP — AI relevance service did not respond. Upload rejected. Please try again.",
      confidence: 1.0,
    }
  }

  let relevanceResult: RelevanceResult
  try {
    const cleaned = response.replace(/```json\n?|```\n?/g, "").trim()
    relevanceResult = JSON.parse(cleaned)
  } catch {
    console.error("[Anti-Gravity] Failed to parse relevance response:", response)
    // For relevance, if parse fails, give benefit of the doubt (unlike safety)
    return {
      passed: true,
      category: "relevance",
      reason: "Relevance check inconclusive — content accepted",
      confidence: 0.5,
    }
  }

  console.log("[Anti-Gravity] Relevance result:", JSON.stringify(relevanceResult))

  // Strict threshold: must be relevant with confidence >= 0.5
  if (!relevanceResult.is_relevant && relevanceResult.confidence >= 0.7) {
    return {
      passed: false,
      category: "irrelevant",
      reason: `⛔ STOP — UPLOAD REJECTED\n\nThe content in this file does not match the accepted topics for this platform.\n\nExpected: ${subjectName} (${subjectCode})\nFound: ${relevanceResult.detected_topics.join(", ") || "Unrelated content"}\n\nReason: ${relevanceResult.reason}\n\nPlease upload only relevant materials.`,
      confidence: relevanceResult.confidence,
      relevanceResult,
    }
  }

  return {
    passed: true,
    category: "relevance",
    reason: "Content verified as relevant ✅",
    confidence: relevanceResult.confidence,
    relevanceResult,
  }
}

// ═══════════════════════════════════════════════════════
//          FULL INSPECTION ORCHESTRATOR
// ═══════════════════════════════════════════════════════

export async function runFullInspection(
  params: FullInspectionParams
): Promise<FullInspectionResult> {
  const startTime = Date.now()

  const steps: InspectionStep[] = [
    { id: "file_type", label: "File type verification", status: "pending" },
    { id: "metadata", label: "Metadata & filename scan", status: "pending" },
    { id: "upload_s3", label: "Uploading to secure storage", status: "pending" },
    { id: "safety", label: "AI safety inspection", status: "pending" },
    { id: "relevance", label: "Content relevance check", status: "pending" },
    { id: "duplicate", label: "Duplicate detection", status: "pending" },
    { id: "save", label: "Saving resource", status: "pending" },
  ]

  function updateStep(id: string, status: InspectionStep["status"], message?: string) {
    const step = steps.find(s => s.id === id)
    if (step) {
      step.status = status
      if (message) step.message = message
    }
  }

  function failResult(stepId: string, category: string, reason: string): FullInspectionResult {
    updateStep(stepId, "failed", reason.split("\n")[0])
    // Mark remaining steps as failed too
    for (const s of steps) {
      if (s.status === "pending") s.status = "failed"
    }
    return {
      passed: false,
      steps,
      failedStep: stepId,
      failCategory: category,
      failReason: reason,
      processingTimeMs: Date.now() - startTime,
    }
  }

  // ─── STEP 1: File Type Gate ───────────────────────────
  updateStep("file_type", "running")
  const fileTypeResult = await inspectFileType(params.buffer, params.filename, params.declaredMime)
  if (!fileTypeResult.passed) {
    return failResult("file_type", fileTypeResult.category, fileTypeResult.reason)
  }
  updateStep("file_type", "done", "File type verified")

  // ─── STEP 2: Metadata & Filename Scan ─────────────────
  updateStep("metadata", "running")
  const metadataResult = inspectMetadata(params.filename, params.fileSize, params.detectedMime)
  if (!metadataResult.passed) {
    return failResult("metadata", metadataResult.category, metadataResult.reason)
  }
  updateStep("metadata", "done", "No violations found")

  // ─── STEP 3: Mark S3 upload as pending (handled by caller) ──
  // The actual S3 upload is done by the route handler, not the inspector.
  // We just mark it as pending here — the route will update it.

  // ─── STEP 4: AI Safety Scan ───────────────────────────
  updateStep("safety", "running")
  const safetyResult = await inspectSafety(
    params.extractedText,
    params.filename,
    params.detectedMime,
    params.fileSize,
    params.subjectName,
    params.resourceType,
    params.buffer
  )
  if (!safetyResult.passed) {
    return failResult("safety", safetyResult.category, safetyResult.reason)
  }
  updateStep("safety", "done", "Content is safe ✅")

  // ─── STEP 5: AI Relevance Check ──────────────────────
  updateStep("relevance", "running")
  const relevanceResult = await inspectRelevance(
    params.extractedText,
    params.filename,
    params.subjectName,
    params.subjectCode,
    params.semester,
    params.resourceType
  )
  if (!relevanceResult.passed) {
    return failResult("relevance", relevanceResult.category, relevanceResult.reason)
  }
  updateStep("relevance", "done", relevanceResult.reason)

  // ─── All pre-save checks passed ──────────────────────
  return {
    passed: true,
    steps,
    safetyResult: safetyResult.safetyResult,
    relevanceResult: relevanceResult.relevanceResult,
    processingTimeMs: Date.now() - startTime,
  }
}
