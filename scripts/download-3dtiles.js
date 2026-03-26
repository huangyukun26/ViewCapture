#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node scripts/download-3dtiles.js --url <tileset.json-url> [--out <dir>] [--concurrency <n>] [--allow-cross-origin]",
      "",
      "Example:",
      "  node scripts/download-3dtiles.js --url https://example.com/Data/tileset.json --out ./downloaded_tiles --concurrency 8",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const args = {
    url: "",
    out: "downloaded_tiles",
    concurrency: 8,
    allowCrossOrigin: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--url") {
      args.url = argv[++i] || "";
    } else if (key === "--out") {
      args.out = argv[++i] || args.out;
    } else if (key === "--concurrency") {
      const parsed = Number.parseInt(argv[++i] || "", 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.concurrency = parsed;
      }
    } else if (key === "--allow-cross-origin") {
      args.allowCrossOrigin = true;
    } else if (key === "--help" || key === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${key}`);
    }
  }

  if (!args.url) {
    throw new Error("Missing required argument: --url");
  }
  return args;
}

function normalizeUrl(input) {
  const url = new URL(input);
  url.hash = "";
  return url.toString();
}

function hashQuery(queryString) {
  return crypto.createHash("sha1").update(queryString).digest("hex").slice(0, 8);
}

function outputPathForUrl(resourceUrl, outDir) {
  const url = new URL(resourceUrl);
  const hostPart = url.host.replace(/[:]/g, "_");
  const pathname = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  const baseName = pathname.length > 0 ? pathname : "index";

  const parsed = path.parse(baseName);
  let fileName = parsed.base || "index";
  if (url.search) {
    const qHash = hashQuery(url.search);
    fileName = `${parsed.name || "index"}__q_${qHash}${parsed.ext}`;
  }

  return path.join(outDir, hostPart, parsed.dir, fileName);
}

function guessIsJson(url, contentType) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".json")) {
    return true;
  }
  return contentType.includes("application/json") || contentType.includes("text/json");
}

function collectReferencedUris(jsonValue, baseUrl, allowCrossOrigin, rootOrigin) {
  const results = [];

  function walk(value, keyHint) {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item, keyHint);
      }
      return;
    }

    if (value && typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        if ((key === "uri" || key === "url") && typeof nested === "string" && !nested.startsWith("data:")) {
          try {
            const resolved = new URL(nested, baseUrl);
            resolved.hash = "";
            if (allowCrossOrigin || resolved.origin === rootOrigin) {
              results.push(resolved.toString());
            }
          } catch {
            // Ignore invalid URL fragments.
          }
        } else {
          walk(nested, key);
        }
      }
    }
  }

  walk(jsonValue, "");
  return results;
}

async function ensureDirForFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeFileBuffer(filePath, buffer) {
  await ensureDirForFile(filePath);
  await fs.writeFile(filePath, buffer);
}

async function fetchResource(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootUrl = normalizeUrl(args.url);
  const rootOrigin = new URL(rootUrl).origin;
  const outDir = path.resolve(process.cwd(), args.out);

  const pending = [rootUrl];
  const seen = new Set();
  const failed = [];
  let processed = 0;

  async function processOne(resourceUrl) {
    const normalized = normalizeUrl(resourceUrl);
    if (seen.has(normalized)) {
      return [];
    }
    seen.add(normalized);

    const localPath = outputPathForUrl(normalized, outDir);
    try {
      const { buffer, contentType } = await fetchResource(normalized);
      await writeFileBuffer(localPath, buffer);
      processed += 1;
      if (processed % 50 === 0) {
        console.log(`Downloaded ${processed} files...`);
      }

      if (guessIsJson(normalized, contentType)) {
        const jsonText = buffer.toString("utf8");
        const json = JSON.parse(jsonText);
        return collectReferencedUris(json, normalized, args.allowCrossOrigin, rootOrigin);
      }
      return [];
    } catch (error) {
      failed.push({ url: normalized, error: String(error) });
      console.error(`[FAILED] ${normalized} -> ${error}`);
      return [];
    }
  }

  while (pending.length > 0) {
    const batch = [];
    while (pending.length > 0 && batch.length < args.concurrency) {
      const next = pending.shift();
      if (next && !seen.has(normalizeUrl(next))) {
        batch.push(next);
      }
    }

    if (batch.length === 0) {
      continue;
    }

    const discoveredLists = await Promise.all(batch.map((url) => processOne(url)));
    for (const list of discoveredLists) {
      for (const refUrl of list) {
        const normalized = normalizeUrl(refUrl);
        if (!seen.has(normalized)) {
          pending.push(normalized);
        }
      }
    }
  }

  console.log(`Done. Downloaded ${processed} files to: ${outDir}`);
  if (failed.length > 0) {
    const failLogPath = path.join(outDir, "download_failures.json");
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(failLogPath, JSON.stringify(failed, null, 2), "utf8");
    console.log(`Failures: ${failed.length}. See: ${failLogPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  printUsage();
  process.exit(1);
});

