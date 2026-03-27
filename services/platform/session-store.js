import crypto from "node:crypto";
import { createClient } from "redis";

const SESSION_PREFIX = "cvl:sess:";
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

class MemorySessionStore {
  constructor() {
    this.type = "memory";
    this.sessions = new Map();
    this.cleanupHandle = setInterval(() => this.cleanupExpired(), 60 * 1000);
    if (typeof this.cleanupHandle.unref === "function") {
      this.cleanupHandle.unref();
    }
  }

  cleanupExpired() {
    const ts = nowSeconds();
    for (const [token, record] of this.sessions.entries()) {
      if (!record || record.expiresAt <= ts) {
        this.sessions.delete(token);
      }
    }
  }

  async set(token, payload, ttlSeconds = DEFAULT_TTL_SECONDS) {
    this.sessions.set(token, {
      payload,
      expiresAt: nowSeconds() + ttlSeconds,
    });
  }

  async get(token) {
    const record = this.sessions.get(token);
    if (!record) {
      return null;
    }
    if (record.expiresAt <= nowSeconds()) {
      this.sessions.delete(token);
      return null;
    }
    return record.payload;
  }

  async del(token) {
    this.sessions.delete(token);
  }

  async close() {
    clearInterval(this.cleanupHandle);
    this.sessions.clear();
  }
}

class RedisSessionStore {
  constructor(client) {
    this.type = "redis";
    this.client = client;
  }

  key(token) {
    return `${SESSION_PREFIX}${token}`;
  }

  async set(token, payload, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const data = JSON.stringify(payload);
    await this.client.set(this.key(token), data, { EX: ttlSeconds });
  }

  async get(token) {
    const raw = await this.client.get(this.key(token));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async del(token) {
    await this.client.del(this.key(token));
  }

  async close() {
    await this.client.quit();
  }
}

export async function createSessionStore(redisUrl) {
  if (!redisUrl) {
    return new MemorySessionStore();
  }
  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return false;
          }
          return Math.min(1000 * retries, 5000);
        },
      },
    });
    client.on("error", (error) => {
      console.error("[platform][redis] client error:", error.message);
    });
    await client.connect();
    await client.ping();
    console.log("[platform] Redis session store enabled.");
    return new RedisSessionStore(client);
  } catch (error) {
    console.error(
      "[platform] Redis unavailable, fallback to memory sessions:",
      error.message
    );
    return new MemorySessionStore();
  }
}
