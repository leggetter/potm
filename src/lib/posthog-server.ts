import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

/** No-op when POSTHOG_API_KEY is unset (e.g. local dev). */
const noopClient = {
  capture: () => {},
  shutdown: async () => {},
} as unknown as PostHog;

function getClient(): PostHog {
  if (!posthogClient) {
    const key = import.meta.env.POSTHOG_API_KEY;
    posthogClient = key
      ? new PostHog(key, {
          host: import.meta.env.POSTHOG_HOST || "https://eu.i.posthog.com",
          flushAt: 1,
          flushInterval: 0,
        })
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
