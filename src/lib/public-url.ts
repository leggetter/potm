/**
 * Public origin for share links, OG tags, etc. Uses BETTER_AUTH_URL when set
 * (e.g. on Fly.io) so links are correct behind a proxy; otherwise request origin.
 */
const baseURL =
  process.env.BETTER_AUTH_URL ||
  (import.meta as unknown as { env?: { BETTER_AUTH_URL?: string } }).env?.BETTER_AUTH_URL;

export function getPublicOrigin(requestOrigin: string): string {
  if (baseURL) {
    return new URL(baseURL.replace(/\/$/, "")).origin;
  }
  return requestOrigin;
}
