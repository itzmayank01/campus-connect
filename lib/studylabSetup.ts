/**
 * @file studylabSetup.ts
 * @description One-time setup: registers all StudyLab transformations in open-notebook.
 *
 * My plan for this file:
 * 1. Lazy initialization — runs on first StudyLab request, not at startup
 * 2. In-memory flag prevents redundant calls across hot reloads
 * 3. Concurrency guard (shared promise) prevents parallel setup races
 * 4. Throws a clear error if open-notebook is unreachable
 */

import { getOrCreateTransformation, checkHealth } from "./openNotebook";
import { TRANSFORMATIONS }                         from "./studylabTransformations";

// In-memory flag — resets on server restart, but setup is idempotent so that's fine
let setupComplete = false;
let setupPromise:  Promise<void> | null = null;

/**
 * Ensure all StudyLab transformations exist in open-notebook.
 * Safe to call on every request — cached after first success.
 */
export async function ensureStudyLabSetup(): Promise<void> {
  if (setupComplete) return;

  // Prevent concurrent setup calls
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    // Fail fast if open-notebook is down
    const healthy = await checkHealth();
    if (!healthy) {
      throw new Error(
        "open-notebook service is not reachable at " +
        (process.env.OPEN_NOTEBOOK_API_URL ?? "http://localhost:5055") +
        ". Is Docker running? Run: docker-compose up -d"
      );
    }

    // Register all 7 transformations in parallel
    await Promise.all(
      Object.values(TRANSFORMATIONS).map(t =>
        getOrCreateTransformation(t.name, t.title, t.prompt)
      )
    );

    setupComplete = true;
    setupPromise  = null;
    console.log("[StudyLab] open-notebook setup complete. All transformations registered.");
  })();

  return setupPromise;
}
