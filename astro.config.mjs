import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  security: {
    // Allow form POSTs when Origin may not match (e.g. behind Fly.io proxy). Auth and state-changing actions are same-origin and require the session.
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
