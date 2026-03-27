/*eslint-env node*/
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import request from "request";
import { URL } from "url";

import chokidar from "chokidar";
import compression from "compression";
import express from "express";
import yargs from "yargs";

import ContextCache from "./scripts/ContextCache.js";
import createRoute from "./scripts/createRoute.js";
import { initializePlatformBackend } from "./services/platform/index.js";

const argv = yargs(process.argv)
  .options({
    port: {
      default: 8080,
      description: "Port to listen on.",
    },
    public: {
      type: "boolean",
      description: "Run a public server that listens on all interfaces.",
    },
    "upstream-proxy": {
      description:
        'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".',
    },
    "bypass-upstream-proxy-hosts": {
      description:
        'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"',
    },
    production: {
      type: "boolean",
      description: "If true, skip build step and serve existing built files.",
    },
  })
  .help().argv;

const sourceFiles = [
  "packages/engine/Source/**/*.js",
  "!packages/engine/Source/*.js",
  "packages/widgets/Source/**/*.js",
  "!packages/widgets/Source/*.js",
  "!packages/engine/Source/Shaders/**",
  "!packages/engine/Source/ThirdParty/Workers/**",
  "!packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js",
  "!packages/engine/Source/ThirdParty/_*",
];
const specFiles = [
  "packages/engine/Specs/**/*Spec.js",
  "!packages/engine/Specs/SpecList.js",
  "packages/widgets/Specs/**/*Spec.js",
  "!packages/widgets/Specs/SpecList.js",
  "Specs/*.js",
  "!Specs/SpecList.js",
  "!Specs/e2e/**",
];
const shaderFiles = ["packages/engine/Source/Shaders/**/*.glsl"];

const outputDirectory = path.join("Build", "CesiumDev");

function formatTimeSinceInSeconds(start) {
  return Math.ceil((performance.now() - start) / 100) / 10;
}

/**
 * Returns CesiumJS bundles configured for development.
 *
 * @returns {Bundles} The bundles.
 */
async function generateDevelopmentBuild(buildTools) {
  const { createIndexJs, buildCesium } = buildTools;
  const startTime = performance.now();

  // Build @cesium/engine index.js
  console.log("[1/3] Building @cesium/engine...");
  await createIndexJs("engine");

  // Build @cesium/widgets index.js
  console.log("[2/3] Building @cesium/widgets...");
  await createIndexJs("widgets");

  // Build CesiumJS and save returned contexts for rebuilding upon request
  console.log("[3/3] Building CesiumJS...");
  const contexts = await buildCesium({
    development: true,
    iife: true,
    incremental: true,
    minify: false,
    node: false,
    outputDirectory: outputDirectory,
    removePragmas: false,
    sourcemap: true,
    write: false,
  });

  console.log(
    `Cesium built in ${formatTimeSinceInSeconds(startTime)} seconds.`
  );

  return contexts;
}

(async function () {
  const gzipHeader = Buffer.from("1F8B08", "hex");
  const production = argv.production;
  const hardenPublicMode = process.env.CITYVISIONLAB_HARDEN_PUBLIC === "1";
  const corsOriginsFromEnv = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    "https://cityvisionlab.cn",
    "https://www.cityvisionlab.cn",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    ...corsOriginsFromEnv,
  ]);

  let contexts;
  let buildTools;
  if (!production) {
    try {
      buildTools = await import("./scripts/build.js");
    } catch (error) {
      console.error(
        "Failed to load build tooling. Did you remove Cesium source folders?"
      );
      console.error(error);
      process.exit(1);
    }
    contexts = await generateDevelopmentBuild(buildTools);
  }

  // eventually this mime type configuration will need to change
  // https://github.com/visionmedia/send/commit/d2cb54658ce65948b0ed6e5fb5de69d022bef941
  // *NOTE* Any changes you make here must be mirrored in web.config.
  const mime = express.static.mime;
  mime.define(
    {
      "application/json": ["czml", "json", "geojson", "topojson"],
      "application/wasm": ["wasm"],
      "image/ktx2": ["ktx2"],
      "model/gltf+json": ["gltf"],
      "model/gltf-binary": ["bgltf", "glb"],
      "application/octet-stream": [
        "b3dm",
        "pnts",
        "i3dm",
        "cmpt",
        "geom",
        "vctr",
      ],
      "text/plain": ["glsl"],
    },
    true
  );

  const app = express();
  app.use(compression());
  let platformBackend = null;
  //eslint-disable-next-line no-unused-vars
  app.use(function (req, res, next) {
    const requestOrigin = req.headers.origin;
    if (hardenPublicMode) {
      if (!requestOrigin || allowedOrigins.has(requestOrigin)) {
        res.header("Access-Control-Allow-Origin", requestOrigin || "https://cityvisionlab.cn");
      }
      res.header("Vary", "Origin");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
      res.header("X-Content-Type-Options", "nosniff");
      res.header("Referrer-Policy", "strict-origin-when-cross-origin");
      res.header("X-Frame-Options", "SAMEORIGIN");
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
    } else {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
    }
    next();
  });
  
  
  function checkGzipAndNext(req, res, next) {
    const baseURL = `${req.protocol}://${req.headers.host}/`;
    const reqUrl = new URL(req.url, baseURL);
    const filePath = reqUrl.pathname.substring(1);

    const readStream = fs.createReadStream(filePath, { start: 0, end: 2 });
    //eslint-disable-next-line no-unused-vars
    readStream.on("error", function (err) {
      next();
    });

    readStream.on("data", function (chunk) {
      if (chunk.equals(gzipHeader)) {
        res.header("Content-Encoding", "gzip");
      }
      next();
    });
  }
  
  // Legacy local mirror path used by older local debugging workflows.
  // Disabled in hardened public mode.
  if (!hardenPublicMode) {
    app.use("/data", express.static("D:/"));
  }

  const knownTilesetFormats = [
    /\.b3dm/,
    /\.pnts/,
    /\.i3dm/,
    /\.cmpt/,
    /\.glb/,
    /\.geom/,
    /\.vctr/,
    /tileset.*\.json$/,
  ];
  app.get(knownTilesetFormats, checkGzipAndNext);

  try {
    platformBackend = await initializePlatformBackend(app);
  } catch (error) {
    console.error("[platform] failed to initialize backend:", error);
    process.exit(1);
  }

  function sendAppFile(relativePath) {
    return function (req, res) {
      res.sendFile(path.resolve(relativePath));
    };
  }

  // Friendly entry routes
  app.get("/", function (req, res) {
    res.sendFile(path.resolve("Apps", "myapp", "portal", "index.html"));
  });
  app.get("/portal", function (req, res) {
    res.sendFile(path.resolve("Apps", "myapp", "portal", "index.html"));
  });
  app.get("/workspace", function (req, res) {
    res.sendFile(path.resolve("Apps", "myapp", "portal", "workspace.html"));
  });
  app.get("/annotation", sendAppFile(path.join("Apps", "myapp", "portal", "annotation.html")));
  app.get("/capture", sendAppFile(path.join("Apps", "myapp", "portal", "capture.html")));
  app.get("/legacy-home", function (req, res) {
    res.redirect(302, "/Apps/myapp/index.html");
  });

  // List CSV files from Apps/myapp/input for client-side dropdowns
  app.get("/api/input-csv", function (req, res) {
    const inputDir = path.resolve("Apps", "myapp", "input");
    fs.readdir(inputDir, { withFileTypes: true }, function (err, entries) {
      if (err) {
        if (err.code === "ENOENT") {
          return res.json({ files: [] });
        }
        console.error(err);
        return res.status(500).json({ error: "Failed to read input folder" });
      }

      const files = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".csv"))
        .map((e) => `Apps/myapp/input/${e.name}`);

      res.json({ files });
    });
  });

  app.get("/healthz", function (req, res) {
    res.status(200).json({
      ok: true,
      service: "windowviewcapture",
      mode: hardenPublicMode ? "public-hardened" : "default",
      production: !!production,
      time: new Date().toISOString(),
    });
  });

  if (!production) {
    const iifeWorkersCache = new ContextCache(contexts.iifeWorkers);
    const iifeCache = createRoute(
      app,
      "Cesium.js",
      "/Build/CesiumUnminified/Cesium.js*",
      contexts.iife,
      [iifeWorkersCache]
    );
    const esmCache = createRoute(
      app,
      "index.js",
      "/Build/CesiumUnminified/index.js*",
      contexts.esm
    );
    const workersCache = createRoute(
      app,
      "Workers/*",
      "/Build/CesiumUnminified/Workers/*.js",
      contexts.workers
    );

    const glslWatcher = chokidar.watch(shaderFiles, { ignoreInitial: true });
    glslWatcher.on("all", async () => {
      await buildTools.glslToJavaScript(
        false,
        "Build/minifyShaders.state",
        "engine"
      );
      esmCache.clear();
      iifeCache.clear();
    });

    let jsHintOptionsCache;
    const sourceCodeWatcher = chokidar.watch(sourceFiles, {
      ignoreInitial: true,
    });
    sourceCodeWatcher.on("all", async () => {
      esmCache.clear();
      iifeCache.clear();
      workersCache.clear();
      iifeWorkersCache.clear();
      jsHintOptionsCache = undefined;
      await buildTools.createCesiumJs();
    });

    const testWorkersCache = createRoute(
      app,
      "TestWorkers/*",
      "/Build/Specs/TestWorkers/*",
      contexts.testWorkers
    );
    chokidar
      .watch(["Specs/TestWorkers/*.js"], { ignoreInitial: true })
      .on("all", testWorkersCache.clear);

    const specsCache = createRoute(
      app,
      "Specs/*",
      "/Build/Specs/*",
      contexts.specs
    );
    const specWatcher = chokidar.watch(specFiles, { ignoreInitial: true });
    specWatcher.on("all", async (event) => {
      if (event === "add" || event === "unlink") {
        await buildTools.createCombinedSpecList();
      }

      specsCache.clear();
    });

    // Rebuild jsHintOptions as needed and serve as-is
    app.get("/Apps/Sandcastle/jsHintOptions.js", async function (
      //eslint-disable-next-line no-unused-vars
      req,
      res,
      //eslint-disable-next-line no-unused-vars
      next
    ) {
      if (!jsHintOptionsCache) {
        jsHintOptionsCache = await buildTools.createJsHintOptions();
      }

      res.append("Cache-Control", "max-age=0");
      res.append("Content-Type", "application/javascript");
      res.send(jsHintOptionsCache);
    });

    // Serve any static files starting with "Build/CesiumUnminified" from the
    // development build instead. That way, previous build output is preserved
    // while the latest is being served
    app.use("/Build/CesiumUnminified", express.static("Build/CesiumDev"));
  }

  // In hardened mode, do not expose data folders directly.
  if (hardenPublicMode) {
    app.use("/Apps/myapp/input", function (req, res) {
      res.status(403).send("Forbidden");
    });
    app.use("/Apps/myapp/output", function (req, res) {
      res.status(403).send("Forbidden");
    });
  }

  app.use(express.static(path.resolve(".")));

  function getRemoteUrlFromParam(req) {
    let remoteUrl = req.params[0];
    if (remoteUrl) {
      // add http:// to the URL if no protocol is present
      if (!/^https?:\/\//.test(remoteUrl)) {
        remoteUrl = `http://${remoteUrl}`;
      }
      remoteUrl = new URL(remoteUrl);
      // copy query string
      const baseURL = `${req.protocol}://${req.headers.host}/`;
      remoteUrl.search = new URL(req.url, baseURL).search;
    }
    return remoteUrl;
  }

  const dontProxyHeaderRegex = /^(?:Host|Proxy-Connection|Connection|Keep-Alive|Transfer-Encoding|TE|Trailer|Proxy-Authorization|Proxy-Authenticate|Upgrade)$/i;

  //eslint-disable-next-line no-unused-vars
  function filterHeaders(req, headers) {
    const result = {};
    // filter out headers that are listed in the regex above
    Object.keys(headers).forEach(function (name) {
      if (!dontProxyHeaderRegex.test(name)) {
        result[name] = headers[name];
      }
    });
    return result;
  }

  const upstreamProxy = argv["upstream-proxy"];
  const bypassUpstreamProxyHosts = {};
  if (argv["bypass-upstream-proxy-hosts"]) {
    argv["bypass-upstream-proxy-hosts"].split(",").forEach(function (host) {
      bypassUpstreamProxyHosts[host.toLowerCase()] = true;
    });
  }

  //eslint-disable-next-line no-unused-vars
  app.get("/proxy/*", function (req, res, next) {
    if (hardenPublicMode) {
      return res
        .status(403)
        .send("Proxy endpoint is disabled in hardened public mode.");
    }

    // look for request like http://localhost:8080/proxy/http://example.com/file?query=1
    let remoteUrl = getRemoteUrlFromParam(req);
    if (!remoteUrl) {
      // look for request like http://localhost:8080/proxy/?http%3A%2F%2Fexample.com%2Ffile%3Fquery%3D1
      remoteUrl = Object.keys(req.query)[0];
      if (remoteUrl) {
        const baseURL = `${req.protocol}://${req.headers.host}/`;
        remoteUrl = new URL(remoteUrl, baseURL);
      }
    }

    if (!remoteUrl) {
      return res.status(400).send("No url specified.");
    }

    if (!remoteUrl.protocol) {
      remoteUrl.protocol = "http:";
    }

    let proxy;
    if (upstreamProxy && !(remoteUrl.host in bypassUpstreamProxyHosts)) {
      proxy = upstreamProxy;
    }

    // encoding : null means "body" passed to the callback will be raw bytes

    request.get(
      {
        url: remoteUrl.toString(),
        headers: filterHeaders(req, req.headers),
        encoding: null,
        proxy: proxy,
      },
      //eslint-disable-next-line no-unused-vars
      function (error, response, body) {
        let code = 500;

        if (response) {
          code = response.statusCode;
          res.header(filterHeaders(req, response.headers));
        }

        res.status(code).send(body);
      }
    );
  });

  const server = app.listen(
    argv.port,
    argv.public ? undefined : "localhost",
    function () {
      if (argv.public) {
        console.log(
          "Cesium development server running publicly.  Connect to http://localhost:%d/",
          server.address().port
        );
      } else {
        console.log(
          "Cesium development server running locally.  Connect to http://localhost:%d/",
          server.address().port
        );
      }
    }
  );

  server.on("error", function (e) {
    if (e.code === "EADDRINUSE") {
      console.log(
        "Error: Port %d is already in use, select a different port.",
        argv.port
      );
      console.log("Example: node server.js --port %d", argv.port + 1);
    } else if (e.code === "EACCES") {
      console.log(
        "Error: This process does not have permission to listen on port %d.",
        argv.port
      );
      if (argv.port < 1024) {
        console.log("Try a port number higher than 1024.");
      }
    }

    throw e;
  });

  server.on("close", function () {
    console.log("Cesium development server stopped.");
    platformBackend?.close?.().catch((error) => {
      console.error("[platform] close error:", error);
    });
    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  });

  let isFirstSig = true;
  process.on("SIGINT", function () {
    if (isFirstSig) {
      console.log("\nCesium development server shutting down.");

      server.close();

      if (!production) {
        contexts.esm.dispose();
        contexts.iife.dispose();
        contexts.workers.dispose();
        contexts.specs.dispose();
        contexts.testWorkers.dispose();
      }

      platformBackend?.close?.().catch((error) => {
        console.error("[platform] close error:", error);
      });

      isFirstSig = false;
    } else {
      throw new Error("Cesium development server force kill.");
    }
  });
})();
