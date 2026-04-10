/**
 * @file youtube.ts
 * @description YouTube video metadata and transcript fetching.
 *
 * Uses youtube-transcript package (no API key, free, MIT).
 * Falls back gracefully if transcript unavailable.
 *
 * Supports URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID (no www)
 * - https://www.youtube.com/embed/VIDEO_ID
 */

// @ts-expect-error — youtube-transcript has no type declarations
import { YoutubeTranscript } from "youtube-transcript";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface YouTubeMetadata {
  youtubeId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSeconds: number;
  youtubeUrl: string;
}

export interface TranscriptSegment {
  text: string;
  offset: number; // milliseconds from start
  duration: number;
}

export interface VideoData {
  metadata: YouTubeMetadata;
  transcript: string | null; // full joined text
  segments: TranscriptSegment[]; // raw segments with timestamps
  hasTranscript: boolean;
  transcriptError: string | null;
}

// ─── Extract YouTube ID from URL ─────────────────────────────────────────────

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// ─── Fetch video metadata via oEmbed (no API key needed) ─────────────────────

export async function fetchYouTubeMetadata(
  youtubeId: string
): Promise<YouTubeMetadata> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;

  const response = await fetch(oembedUrl, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "This video is private or age-restricted and cannot be added."
      );
    }
    if (response.status === 404) {
      throw new Error(
        "Video not found. Please check the URL and try again."
      );
    }
    throw new Error(
      `Could not fetch video details (status ${response.status}).`
    );
  }

  const data = await response.json();

  return {
    youtubeId,
    title: data.title ?? "Untitled video",
    channelName: data.author_name ?? "Unknown channel",
    thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
    durationSeconds: 0, // oEmbed doesn't return duration
    youtubeUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
  };
}

// ─── Fetch transcript ─────────────────────────────────────────────────────────

export async function fetchYouTubeTranscript(
  youtubeId: string
): Promise<{ segments: TranscriptSegment[]; fullText: string } | null> {
  try {
    const rawSegments = await YoutubeTranscript.fetchTranscript(youtubeId, {
      lang: "en",
    });

    if (!rawSegments || rawSegments.length === 0) {
      return null;
    }

    const segments: TranscriptSegment[] = rawSegments.map((s: { text: string; offset: number; duration: number }) => ({
      text: s.text.replace(/\n/g, " ").trim(),
      offset: s.offset,
      duration: s.duration,
    }));

    const fullText = segments
      .map((s) => s.text)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();

    return { segments, fullText };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Known error patterns from youtube-transcript
    if (
      message.includes("Could not find") ||
      message.includes("No transcript") ||
      message.includes("disabled")
    ) {
      return null; // Transcript not available — not an error, just missing
    }

    throw new Error(`Transcript fetch failed: ${message}`);
  }
}

// ─── Full video processing ────────────────────────────────────────────────────

/**
 * Process a YouTube URL: extract ID, fetch metadata, fetch transcript.
 * Returns complete VideoData object.
 */
export async function processYouTubeUrl(rawUrl: string): Promise<VideoData> {
  const youtubeId = extractYouTubeId(rawUrl.trim());
  if (!youtubeId) {
    throw new Error(
      "Invalid YouTube URL. Please paste a full YouTube link like: " +
        "https://www.youtube.com/watch?v=..."
    );
  }

  // Fetch metadata (throws on private/missing videos)
  const metadata = await fetchYouTubeMetadata(youtubeId);

  // Fetch transcript (failure is soft — we continue without it)
  let transcriptData: {
    segments: TranscriptSegment[];
    fullText: string;
  } | null = null;
  let transcriptError: string | null = null;

  try {
    transcriptData = await fetchYouTubeTranscript(youtubeId);
    if (!transcriptData) {
      transcriptError =
        "This video doesn't have English captions/subtitles. " +
        "AI tools require a transcript to work. Try a video with captions enabled.";
    }
  } catch (err) {
    transcriptError =
      err instanceof Error ? err.message : "Transcript unavailable";
  }

  return {
    metadata,
    transcript: transcriptData?.fullText ?? null,
    segments: transcriptData?.segments ?? [],
    hasTranscript: transcriptData !== null,
    transcriptError,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Format seconds as mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Truncate transcript to maxWords for LLM context window safety.
 * 4000 words ≈ 5500 tokens — safe for Groq.
 */
export function truncateTranscript(text: string, maxWords = 4000): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return (
    words.slice(0, maxWords).join(" ") +
    "\n\n[Transcript truncated to first 4000 words — video is longer]"
  );
}
