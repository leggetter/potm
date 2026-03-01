import { betterAuth } from "better-auth";
import { sqlite } from "../db";

// Use process.env at runtime (Fly secrets, production); fallback to import.meta.env (Vite dev/build from .env)
const baseURL =
  process.env.BETTER_AUTH_URL ||
  (import.meta as unknown as { env?: { BETTER_AUTH_URL?: string } }).env?.BETTER_AUTH_URL ||
  "http://localhost:4321";
// Normalize for trustedOrigins (no trailing slash); 403 on sign-in often means origin not trusted
const normalizedBase = baseURL.replace(/\/$/, "");
const googleClientId =
  process.env.GOOGLE_CLIENT_ID ||
  (import.meta as unknown as { env?: { GOOGLE_CLIENT_ID?: string } }).env?.GOOGLE_CLIENT_ID;
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET ||
  (import.meta as unknown as { env?: { GOOGLE_CLIENT_SECRET?: string } }).env?.GOOGLE_CLIENT_SECRET;
const secret =
  process.env.BETTER_AUTH_SECRET ||
  (import.meta as unknown as { env?: { BETTER_AUTH_SECRET?: string } }).env?.BETTER_AUTH_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error(
    "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env (see .env.example). For setup, run ./scripts/setup-gcp-oauth.sh"
  );
}

export const auth = betterAuth({
  database: sqlite,
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },
  secret: secret ?? "change-me",
  baseURL: normalizedBase,
  trustedOrigins: [normalizedBase, baseURL],
});
