import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { defineConfig } from "drizzle-kit";

const dbPath = process.env.DB_PATH || "./data/potm.db";
if (!existsSync(dirname(dbPath))) {
  mkdirSync(dirname(dbPath), { recursive: true });
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
