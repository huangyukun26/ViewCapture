import fs from "node:fs/promises";
import path from "node:path";

import express from "express";

import { generateSessionToken } from "./session-store.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createAiProxyMiddleware } from "./ai-proxy.js";

const SESSION_COOKIE_NAME = "cvl_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function parseCookies(headerValue) {
  const output = {};
  if (!headerValue) {
    return output;
  }
  const parts = headerValue.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = decodeURIComponent(part.slice(0, idx).trim());
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    output[key] = value;
  }
  return output;
}

function getSessionToken(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || "";
}

function sendError(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-z0-9_.-]{3,32}$/.test(username);
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function getCookieOptions() {
  const secure =
    process.env.PLATFORM_COOKIE_SECURE === "1" ||
    process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

async function listCsvFiles(inputDir) {
  try {
    const entries = await fs.readdir(inputDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv"))
      .map((entry) => ({
        name: entry.name,
        path: `Apps/myapp/input/${entry.name}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function createPlatformRouter({ store, sessions, inputDir }) {
  const router = express.Router();
  const aiBaseUrl =
    process.env.PLATFORM_AI_BASE_URL || process.env.WINDOWVIEW_AI_URL || "http://127.0.0.1:5000";

  async function requireAuth(req, res, next) {
    const token = getSessionToken(req);
    if (!token) {
      return sendError(res, 401, "Not logged in.");
    }
    const session = await sessions.get(token);
    if (!session || !session.userId) {
      res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
      return sendError(res, 401, "Session expired.");
    }
    const user = await store.getUserById(session.userId);
    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
      return sendError(res, 401, "Session user not found.");
    }
    req.auth = {
      token,
      user,
      session,
    };
    return next();
  }

  async function requireAdmin(req, res, next) {
    if (!req.auth?.user || req.auth.user.role !== "admin") {
      return sendError(res, 403, "Admin access required.");
    }
    return next();
  }

  router.get("/health", (req, res) => {
    res.json({
      success: true,
      data: {
        ok: true,
        store: store.type,
        sessions: sessions.type,
      },
    });
  });

  router.use("/ai", requireAuth, createAiProxyMiddleware(aiBaseUrl));
  router.use(express.json({ limit: "2mb" }));

  router.post("/auth/register", async (req, res) => {
    try {
      const username = normalizeUsername(req.body?.username);
      const password = req.body?.password || "";

      if (!isValidUsername(username)) {
        return sendError(
          res,
          400,
          "Invalid username. Use 3-32 chars: a-z, 0-9, _, -, ."
        );
      }
      if (!isValidPassword(password)) {
        return sendError(res, 400, "Password must be at least 8 characters.");
      }

      const existing = await store.getUserByUsername(username);
      if (existing) {
        return sendError(res, 409, "Username already exists.");
      }

      const passwordHash = hashPassword(password);
      const user = await store.createUser({
        username,
        passwordHash,
        role: "user",
      });

      const token = generateSessionToken();
      await sessions.set(
        token,
        { userId: user.id, username: user.username, role: user.role },
        SESSION_TTL_SECONDS
      );
      res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions());

      return res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error("[platform] register error:", error);
      return sendError(res, 500, "Failed to register.");
    }
  });

  router.post("/auth/login", async (req, res) => {
    try {
      const username = normalizeUsername(req.body?.username);
      const password = req.body?.password || "";
      if (!username || !password) {
        return sendError(res, 400, "Username and password are required.");
      }

      const user = await store.getUserByUsername(username);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return sendError(res, 401, "Invalid username or password.");
      }

      const token = generateSessionToken();
      await sessions.set(
        token,
        { userId: user.id, username: user.username, role: user.role },
        SESSION_TTL_SECONDS
      );
      res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions());

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      console.error("[platform] login error:", error);
      return sendError(res, 500, "Failed to login.");
    }
  });

  router.post("/auth/logout", requireAuth, async (req, res) => {
    try {
      await sessions.del(req.auth.token);
      res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
      return res.json({ success: true });
    } catch (error) {
      console.error("[platform] logout error:", error);
      return sendError(res, 500, "Failed to logout.");
    }
  });

  router.get("/auth/me", requireAuth, async (req, res) => {
    res.json({
      success: true,
      data: {
        user: req.auth.user,
      },
    });
  });

  router.get("/projects", requireAuth, async (req, res) => {
    try {
      const projects = await store.listProjectsForUser(req.auth.user.id);
      return res.json({
        success: true,
        data: { projects },
      });
    } catch (error) {
      console.error("[platform] list projects error:", error);
      return sendError(res, 500, "Failed to list projects.");
    }
  });

  router.post("/projects", requireAuth, async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim();
      const description = String(req.body?.description || "").trim();
      if (name.length < 2 || name.length > 100) {
        return sendError(res, 400, "Project name must be 2-100 characters.");
      }
      const project = await store.createProject({
        name,
        description,
        ownerUserId: req.auth.user.id,
      });
      return res.json({
        success: true,
        data: { project },
      });
    } catch (error) {
      console.error("[platform] create project error:", error);
      return sendError(res, 500, "Failed to create project.");
    }
  });

  router.patch("/projects/:projectId", requireAuth, async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const project = await store.updateProject({
        projectId,
        name: req.body?.name,
        description: req.body?.description,
        ownerUserId: req.auth.user.id,
      });
      if (!project) {
        return sendError(res, 404, "Project not found.");
      }
      return res.json({
        success: true,
        data: { project },
      });
    } catch (error) {
      console.error("[platform] update project error:", error);
      return sendError(res, 500, "Failed to update project.");
    }
  });

  router.delete("/projects/:projectId", requireAuth, async (req, res) => {
    try {
      const deleted = await store.deleteProject({
        projectId: req.params.projectId,
        ownerUserId: req.auth.user.id,
      });
      if (!deleted) {
        return sendError(res, 404, "Project not found.");
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("[platform] delete project error:", error);
      return sendError(res, 500, "Failed to delete project.");
    }
  });

  router.get("/jobs", requireAuth, async (req, res) => {
    try {
      const projectId = req.query.projectId ? String(req.query.projectId) : null;
      const jobs = await store.listJobsForUser(req.auth.user.id, projectId);
      return res.json({
        success: true,
        data: { jobs },
      });
    } catch (error) {
      console.error("[platform] list jobs error:", error);
      return sendError(res, 500, "Failed to list jobs.");
    }
  });

  router.post("/jobs", requireAuth, async (req, res) => {
    try {
      const projectId = String(req.body?.projectId || "").trim();
      const type = String(req.body?.type || "").trim() || "capture";
      const payload = req.body?.payload || {};
      if (!projectId) {
        return sendError(res, 400, "projectId is required.");
      }

      const projects = await store.listProjectsForUser(req.auth.user.id);
      const projectExists = projects.some((item) => item.id === projectId);
      if (!projectExists) {
        return sendError(res, 404, "Project not found.");
      }

      const job = await store.createJob({
        projectId,
        userId: req.auth.user.id,
        type,
        payload,
      });
      return res.json({
        success: true,
        data: { job },
      });
    } catch (error) {
      console.error("[platform] create job error:", error);
      return sendError(res, 500, "Failed to create job.");
    }
  });

  router.patch("/jobs/:jobId/status", requireAuth, async (req, res) => {
    try {
      const jobId = Number.parseInt(req.params.jobId, 10);
      if (!Number.isFinite(jobId) || jobId <= 0) {
        return sendError(res, 400, "Invalid jobId.");
      }
      const job = await store.updateJobStatus({
        jobId,
        userId: req.auth.user.id,
        status: req.body?.status,
        message: req.body?.message || "",
        outputPath: req.body?.outputPath || "",
      });
      if (!job) {
        return sendError(res, 404, "Job not found.");
      }
      return res.json({
        success: true,
        data: { job },
      });
    } catch (error) {
      console.error("[platform] update job error:", error);
      return sendError(res, 500, "Failed to update job.");
    }
  });

  router.get("/meta", requireAuth, async (req, res) => {
    const csvFiles = await listCsvFiles(path.resolve(inputDir));
    res.json({
      success: true,
      data: {
        apiVersion: "v1",
        aiBaseUrl,
        user: req.auth.user,
        csvCount: csvFiles.length,
      },
    });
  });

  router.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await store.listUsers();
      return res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      console.error("[platform] list admin users error:", error);
      return sendError(res, 500, "Failed to list users.");
    }
  });

  router.patch(
    "/admin/users/:userId/role",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const userId = Number.parseInt(req.params.userId, 10);
        if (!Number.isFinite(userId) || userId <= 0) {
          return sendError(res, 400, "Invalid userId.");
        }
        const role = String(req.body?.role || "").trim();
        if (role !== "admin" && role !== "user") {
          return sendError(res, 400, "Role must be admin or user.");
        }
        const user = await store.setUserRole({ userId, role });
        if (!user) {
          return sendError(res, 404, "User not found.");
        }
        return res.json({
          success: true,
          data: { user },
        });
      } catch (error) {
        console.error("[platform] update role error:", error);
        return sendError(res, 500, "Failed to update role.");
      }
    }
  );

  router.get("/admin/jobs", requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = Number.parseInt(String(req.query.limit || "200"), 10);
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1000) : 200;
      const jobs = await store.listAllJobs(safeLimit);
      return res.json({
        success: true,
        data: { jobs },
      });
    } catch (error) {
      console.error("[platform] list admin jobs error:", error);
      return sendError(res, 500, "Failed to list jobs.");
    }
  });

  router.get("/admin/summary", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await store.listUsers();
      const jobs = await store.listAllJobs(1000);
      const projects = await Promise.all(
        users.map((user) => store.listProjectsForUser(user.id))
      );
      const projectCount = projects.reduce((acc, list) => acc + list.length, 0);
      return res.json({
        success: true,
        data: {
          users: users.length,
          admins: users.filter((u) => u.role === "admin").length,
          projects: projectCount,
          jobs: jobs.length,
        },
      });
    } catch (error) {
      console.error("[platform] summary error:", error);
      return sendError(res, 500, "Failed to load summary.");
    }
  });

  return router;
}
