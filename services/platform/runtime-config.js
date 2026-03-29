import fs from "node:fs/promises";
import path from "node:path";

function normalizeAiBaseUrl(value) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error("AI base URL is required.");
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error("AI base URL is invalid.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("AI base URL must use http or https.");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export class RuntimeConfigStore {
  constructor(filePath, defaults = {}) {
    this.filePath = path.resolve(filePath);
    this.defaults = {
      aiBaseUrl: defaults.aiBaseUrl || "http://127.0.0.1:5000",
    };
    this.data = { ...this.defaults };
    this.loaded = false;
  }

  async ensureLoaded() {
    if (this.loaded) {
      return;
    }
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        this.data = {
          ...this.defaults,
          ...parsed,
        };
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      await this.flush();
    }
    this.data.aiBaseUrl = normalizeAiBaseUrl(this.data.aiBaseUrl);
    this.loaded = true;
  }

  async flush() {
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  getAiBaseUrl() {
    return this.data.aiBaseUrl;
  }

  async setAiBaseUrl(value) {
    await this.ensureLoaded();
    this.data.aiBaseUrl = normalizeAiBaseUrl(value);
    await this.flush();
    return this.data.aiBaseUrl;
  }

  snapshot() {
    return { ...this.data };
  }
}

export function parseAndNormalizeAiBaseUrl(value) {
  return normalizeAiBaseUrl(value);
}
