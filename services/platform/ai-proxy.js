import http from "node:http";
import https from "node:https";

function copyResponseHeaders(proxyRes, res) {
  const entries = Object.entries(proxyRes.headers || {});
  for (const [key, value] of entries) {
    if (typeof value === "undefined") {
      continue;
    }
    if (key.toLowerCase() === "transfer-encoding") {
      continue;
    }
    res.setHeader(key, value);
  }
}

function getForwardPath(req) {
  const basePath = "/api/platform/ai";
  if (req.originalUrl.startsWith(basePath)) {
    return req.originalUrl.slice(basePath.length) || "/";
  }
  return req.url || "/";
}

export function createAiProxyMiddleware(targetBaseUrl) {
  const base = new URL(targetBaseUrl);
  const transport = base.protocol === "https:" ? https : http;

  return function aiProxyHandler(req, res) {
    const requestPath = getForwardPath(req);
    const targetUrl = new URL(requestPath, base);
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;

    const proxyReq = transport.request(
      targetUrl,
      {
        method: req.method,
        headers,
      },
      (proxyRes) => {
        res.status(proxyRes.statusCode || 502);
        copyResponseHeaders(proxyRes, res);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (error) => {
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          message: `AI backend unavailable: ${error.message}`,
        });
      } else {
        res.end();
      }
    });

    req.pipe(proxyReq);
  };
}
