import type { APIRoute } from "astro";
import { auth } from "../../../lib/auth";

export const ALL: APIRoute = async ({ request }) => {
  try {
    return await auth.handler(request);
  } catch (err) {
    console.error("[auth]", err);
    const message = err instanceof Error ? err.message : "Auth error";
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
