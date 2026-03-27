import path from "node:path";

import { createPlatformStore } from "./store.js";
import { createSessionStore } from "./session-store.js";
import { createPlatformRouter } from "./router.js";
import { hashPassword } from "./password.js";

async function ensureBootstrapAdmin(store) {
  const username = String(
    process.env.PLATFORM_BOOTSTRAP_ADMIN_USERNAME || "admin"
  )
    .trim()
    .toLowerCase();
  const password = String(
    process.env.PLATFORM_BOOTSTRAP_ADMIN_PASSWORD || "admin12345"
  );
  if (!username || !password) {
    return;
  }
  const exists = await store.getUserByUsername(username);
  if (exists) {
    if (exists.role !== "admin" && store.setUserRole) {
      await store.setUserRole({ userId: exists.id, role: "admin" });
      console.log(`[platform] bootstrap admin role granted: ${username}`);
    }
    return;
  }
  const passwordHash = hashPassword(password);
  await store.createUser({
    username,
    passwordHash,
    role: "admin",
  });
  console.log(`[platform] bootstrap admin created: ${username}`);
}

export async function initializePlatformBackend(app) {
  const store = await createPlatformStore();
  await ensureBootstrapAdmin(store);
  const redisUrl = process.env.PLATFORM_REDIS_URL || process.env.REDIS_URL || "";
  const sessions = await createSessionStore(redisUrl);
  const inputDir = path.resolve("Apps", "myapp", "input");
  const router = createPlatformRouter({
    store,
    sessions,
    inputDir,
  });

  app.use("/api/platform", router);

  return {
    async close() {
      await Promise.allSettled([store.close?.(), sessions.close?.()]);
    },
  };
}
