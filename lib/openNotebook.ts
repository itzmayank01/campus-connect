/**
 * @file openNotebook.ts
 * @description Adapter layer between Campus Connect and the open-notebook REST API.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * Only this file should know that open-notebook exists.
 * All StudyLab generation code imports from here.
 * If open-notebook changes its API, only this file needs updating.
 *
 * API base: process.env.OPEN_NOTEBOOK_API_URL (default: http://localhost:5055)
 * API docs: github.com/lfnovo/open-notebook/blob/main/docs/7-DEVELOPMENT/api-reference.md
 *
 * My plan for this file:
 * 1. Base fetch helper with auth header + timeout + error handling
 * 2. Notebook CRUD (create / find / get-or-create)
 * 3. Source operations (upload PDF, upload text, list)
 * 4. Transformation operations (list, create, get-or-create, apply)
 * 5. Command polling, podcast generation, health check
 */

const BASE_URL = process.env.OPEN_NOTEBOOK_API_URL ?? "http://localhost:5055";
const PASSWORD  = process.env.OPEN_NOTEBOOK_PASSWORD ?? "";

// ─── Base fetch with auth + error handling ────────────────────────────────────

async function onFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(PASSWORD ? { "X-Password": PASSWORD } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    // 60 second timeout for AI generation calls
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `open-notebook API error ${response.status} on ${path}: ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

// ─── Types matching open-notebook API responses ───────────────────────────────

export interface ONNotebook {
  id:          string;
  name:        string;
  description: string;
  created:     string;
}

export interface ONSource {
  id:              string;
  title:           string;
  full_text?:      string;
  embedded_chunks: number;
  created:         string;
}

export interface ONTransformation {
  id:          string;
  name:        string;
  title:       string;
  description: string;
  prompt:      string;
}

export interface ONTransformResult {
  output:            string;
  transformation_id: string;
}

export interface ONCommand {
  id:      string;
  status:  "pending" | "running" | "completed" | "failed";
  result?: unknown;
  error?:  string;
}

// ─── Notebook operations ──────────────────────────────────────────────────────

/**
 * Create a dedicated notebook for a Campus Connect resource.
 * Each resource gets exactly ONE notebook in open-notebook.
 * Name pattern: cc_resource_<resourceId> — lets us find it later.
 */
export async function createNotebook(
  resourceId: string,
  title:      string
): Promise<ONNotebook> {
  return onFetch<ONNotebook>("/api/notebooks", {
    method: "POST",
    body:   JSON.stringify({
      name:        `cc_resource_${resourceId}`,
      description: `Campus Connect resource: ${title}`,
    }),
  });
}

/**
 * Find existing notebook for a resource by its name pattern.
 * Returns null if not found.
 */
export async function findNotebookByResourceId(
  resourceId: string
): Promise<ONNotebook | null> {
  const notebooks = await onFetch<ONNotebook[]>("/api/notebooks");
  return notebooks.find(n => n.name === `cc_resource_${resourceId}`) ?? null;
}

/**
 * Get or create notebook for a resource — idempotent.
 * Always use this; never call create/find directly.
 */
export async function getOrCreateNotebook(
  resourceId: string,
  title:      string
): Promise<ONNotebook> {
  const existing = await findNotebookByResourceId(resourceId);
  if (existing) return existing;
  return createNotebook(resourceId, title);
}

// ─── Source operations ────────────────────────────────────────────────────────

/**
 * Upload a PDF buffer to open-notebook as a source within a notebook.
 * open-notebook processes sources asynchronously — we poll until complete.
 */
export async function uploadPDFAsSource(
  notebookId: string,
  pdfBuffer:  Buffer,
  filename:   string
): Promise<ONSource> {
  const formData = new FormData();
  formData.append("notebook_id", notebookId);
  formData.append("type", "upload");
  formData.append("async_processing", "true");
  formData.append(
    "file",
    new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }),
    filename
  );

  // Don't include Content-Type — let fetch set the multipart boundary
  const headers: Record<string, string> = PASSWORD
    ? { "X-Password": PASSWORD }
    : {};

  const response = await fetch(`${BASE_URL}/api/sources`, {
    method:  "POST",
    headers,
    body:    formData,
    signal:  AbortSignal.timeout(120_000), // 2 min for large PDFs
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "upload failed");
    throw new Error(`Source upload failed (${response.status}): ${err}`);
  }

  const result = await response.json() as { id: string; command_id?: string };

  // Poll until source is fully processed before returning
  if (result.command_id) {
    await pollCommandUntilDone(result.command_id, 60, 2000);
  }

  return onFetch<ONSource>(`/api/sources/${result.id}`);
}

/**
 * Upload plain text as a source (fallback when PDF is unavailable).
 */
export async function uploadTextAsSource(
  notebookId: string,
  text:        string,
  title:       string
): Promise<ONSource> {
  const result = await onFetch<{ id: string; command_id?: string }>("/api/sources", {
    method: "POST",
    body:   JSON.stringify({
      notebook_id:      notebookId,
      type:             "text",
      content:          text,
      title,
      async_processing: true,
    }),
  });

  if (result.command_id) {
    await pollCommandUntilDone(result.command_id, 30, 2000);
  }

  return onFetch<ONSource>(`/api/sources/${result.id}`);
}

/**
 * Get all sources attached to a notebook.
 */
export async function getSourcesForNotebook(
  notebookId: string
): Promise<ONSource[]> {
  return onFetch<ONSource[]>(`/api/sources?notebook_id=${notebookId}`);
}

// ─── Transformation operations ────────────────────────────────────────────────

/** List all transformations configured in open-notebook. */
export async function listTransformations(): Promise<ONTransformation[]> {
  return onFetch<ONTransformation[]>("/api/transformations");
}

/**
 * Create a named transformation (AI prompt).
 * We create one per StudyLab tool. Reused across all sources.
 */
export async function createTransformation(
  name:   string,
  title:  string,
  prompt: string
): Promise<ONTransformation> {
  return onFetch<ONTransformation>("/api/transformations", {
    method: "POST",
    body:   JSON.stringify({
      name,
      title,
      description:   `Campus Connect StudyLab: ${title}`,
      prompt,
      apply_default: false,
    }),
  });
}

/**
 * Find a transformation by name or create it if it doesn't exist.
 * Idempotent — safe to call on every request.
 */
export async function getOrCreateTransformation(
  name:   string,
  title:  string,
  prompt: string
): Promise<ONTransformation> {
  const all = await listTransformations();
  const existing = all.find(t => t.name === name);
  if (existing) return existing;
  return createTransformation(name, title, prompt);
}

/**
 * Apply a transformation to a source.
 * This is the core of all StudyLab generation — produces any tool output.
 *
 * @param sourceId         The open-notebook source ID
 * @param transformationId The transformation to apply
 * @returns The transformed content as a string (JSON or markdown)
 */
export async function applyTransformation(
  sourceId:         string,
  transformationId: string
): Promise<string> {
  const result = await onFetch<ONTransformResult>(
    `/api/sources/${sourceId}/transform`,
    {
      method: "POST",
      body:   JSON.stringify({ transformation_id: transformationId }),
    }
  );
  return result.output;
}

// ─── Command polling ──────────────────────────────────────────────────────────

/**
 * Poll a command until it completes or the maximum retries are reached.
 * Used after async source uploads and podcast generation.
 */
export async function pollCommandUntilDone(
  commandId:   string,
  maxRetries:  number = 30,
  intervalMs:  number = 2000
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    const command = await onFetch<ONCommand>(`/api/commands/${commandId}`);

    if (command.status === "completed") return;

    if (command.status === "failed") {
      throw new Error(
        `open-notebook command ${commandId} failed: ${command.error ?? "unknown reason"}`
      );
    }
    // pending | running → keep polling
  }

  throw new Error(
    `open-notebook command ${commandId} timed out after ${(maxRetries * intervalMs) / 1000}s`
  );
}

// ─── Podcast generation ───────────────────────────────────────────────────────

export interface ONPodcastEpisode {
  id:         string;
  status:     "pending" | "processing" | "completed" | "failed";
  audio_url?: string;
  error?:     string;
}

/**
 * Create a multi-speaker podcast episode from a notebook's sources.
 * Returns the episode ID for polling.
 */
export async function createPodcastEpisode(
  notebookId: string,
  title:      string
): Promise<string> {
  const episode = await onFetch<{ id: string }>("/api/podcasts/episodes", {
    method: "POST",
    body:   JSON.stringify({ notebook_id: notebookId, title }),
  });
  return episode.id;
}

/**
 * Poll until podcast episode is ready or failed.
 */
export async function waitForPodcastEpisode(
  episodeId:  string,
  maxMinutes: number = 5
): Promise<ONPodcastEpisode> {
  const maxAttempts = (maxMinutes * 60) / 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 5_000));

    const episode = await onFetch<ONPodcastEpisode>(
      `/api/podcasts/episodes/${episodeId}`
    );

    if (episode.status === "completed") return episode;
    if (episode.status === "failed") {
      throw new Error(`Podcast generation failed: ${episode.error ?? "unknown"}`);
    }
  }

  throw new Error(`Podcast generation timed out after ${maxMinutes} minutes`);
}

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * Check if open-notebook service is reachable.
 * Returns true if healthy, false otherwise — never throws.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const result = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(3_000),
    });
    return result.ok;
  } catch {
    return false;
  }
}
