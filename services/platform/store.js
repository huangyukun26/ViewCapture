import path from "node:path";

import { JsonStore } from "./json-store.js";
import { PgStore } from "./pg-store.js";

function resolveJsonStorePath() {
  const configured = process.env.PLATFORM_JSON_STORE_PATH;
  if (configured) {
    return path.resolve(configured);
  }
  return path.resolve("data", "platform", "store.json");
}

export async function createPlatformStore() {
  const databaseUrl =
    process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URL || "";
  if (databaseUrl) {
    try {
      const pgStore = new PgStore(databaseUrl);
      await pgStore.ensureSchema();
      console.log("[platform] PostgreSQL store enabled.");
      return pgStore;
    } catch (error) {
      console.error(
        "[platform] PostgreSQL init failed, fallback to JSON store:",
        error.message
      );
    }
  }

  const jsonPath = resolveJsonStorePath();
  const jsonStore = new JsonStore(jsonPath);
  await jsonStore.ensureSchema();
  console.log(`[platform] JSON store enabled at ${jsonPath}`);
  return jsonStore;
}
