import { betterAuth } from "better-auth";
import { sqlite } from "../db";

// Astro/Vite load .env into import.meta.env, not process.env
const baseURL = import.meta.env.BETTER_AUTH_URL || "http://localhost:4321";
const googleClientId = import.meta.env.GOOGLE_CLIENT_ID;
const googleClientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;

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
  secret: import.meta.env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins: [baseURL],
});
