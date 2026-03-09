/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL?: string;
  readonly DB_PATH?: string;
  readonly UPLOAD_DIR?: string;
  // PostHog
  readonly PUBLIC_POSTHOG_KEY: string;
  readonly PUBLIC_POSTHOG_HOST: string;
  readonly POSTHOG_API_KEY: string;
  readonly POSTHOG_HOST: string;
}

declare namespace App {
  interface Locals {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    } | null;
  }
}
