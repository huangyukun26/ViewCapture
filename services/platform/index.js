import path from "node:path";

import { createPlatformStore } from "./store.js";
import { createSessionStore } from "./session-store.js";
import { createPlatformRouter } from "./router.js";

export async function initializePlatformBackend(app) {
  const store = await createPlatformStore();
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
