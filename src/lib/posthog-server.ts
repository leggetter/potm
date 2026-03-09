import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

/** No-op when POSTHOG_API_KEY is unset (e.g. local dev). */
const noopClient = {
  capture: () => {},
  shutdown: async () => {},
} as unknown as PostHog;

// Use process.env at runtime (Fly secrets); fallback to import.meta.env (Vite dev/build from .env)
function getPostHogConfig(): { key: string | undefined; host: string } {
  const key =
    process.env.POSTHOG_API_KEY ||
    (import.meta as unknown as { env?: { POSTHOG_API_KEY?: string } }).env?.POSTHOG_API_KEY;
  const host =
    process.env.POSTHOG_HOST ||
    (import.meta as unknown as { env?: { POSTHOG_HOST?: string } }).env?.POSTHOG_HOST ||
    "https://eu.i.posthog.com";
  return { key, host };
}

function getClient(): PostHog {
  if (!posthogClient) {
    const { key, host } = getPostHogConfig();
    posthogClient = key
      ? new PostHog(key, { host, flushAt: 1, flushInterval: 0 })
      : noopClient;
  }
  return posthogClient;
}

/**
 * Server-side PostHog tracking object. Use this instead of calling a getter.
 * No-op when POSTHOG_API_KEY is unset (e.g. local dev).
 */
export const posthog = {
  capture: (payload: Parameters<PostHog["capture"]>[0]) => getClient().capture(payload),
  shutdown: async (): Promise<void> => {
    if (posthogClient) {
      await posthogClient.shutdown();
      posthogClient = null;
    }
  },
};

/**
 * Shutdown the PostHog client gracefully.
 * Call this when your server is shutting down.
 */
export async function shutdownPostHog(): Promise<void> {
  await posthog.shutdown();
}
