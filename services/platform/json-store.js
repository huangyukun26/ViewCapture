import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const EMPTY_STORE = {
  users: [],
  projects: [],
  jobs: [],
  nextUserId: 1,
  nextJobId: 1,
};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export class JsonStore {
  constructor(filePath) {
    this.type = "json";
    this.filePath = filePath;
    this.data = cloneJson(EMPTY_STORE);
    this.loaded = false;
  }

  async ensureSchema() {
    if (this.loaded) {
      return;
    }
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      this.data = {
        ...cloneJson(EMPTY_STORE),
        ...parsed,
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      await this.flush();
    }
    this.loaded = true;
  }

  async flush() {
    const content = JSON.stringify(this.data, null, 2);
    await fs.writeFile(this.filePath, content, "utf8");
  }

  async createUser({ username, passwordHash, role = "user" }) {
    await this.ensureSchema();
    const user = {
      id: this.data.nextUserId++,
      username,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    await this.flush();
    return sanitizeUser(user);
  }

  async getUserByUsername(username) {
    await this.ensureSchema();
    const user = this.data.users.find((item) => item.username === username);
    return user || null;
  }

  async getUserById(userId) {
    await this.ensureSchema();
    const user = this.data.users.find((item) => item.id === userId);
    return user ? sanitizeUser(user) : null;
  }

  async listProjectsForUser(userId) {
    await this.ensureSchema();
    return this.data.projects
      .filter((item) => item.ownerUserId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createProject({ name, description = "", ownerUserId }) {
    await this.ensureSchema();
    const now = new Date().toISOString();
    const project = {
      id: crypto.randomUUID(),
      name,
      description,
      ownerUserId,
      createdAt: now,
      updatedAt: now,
    };
    this.data.projects.push(project);
    await this.flush();
    return project;
  }

  async updateProject({ projectId, name, description, ownerUserId }) {
    await this.ensureSchema();
    const project = this.data.projects.find(
      (item) => item.id === projectId && item.ownerUserId === ownerUserId
    );
    if (!project) {
      return null;
    }
    if (typeof name === "string" && name.trim()) {
      project.name = name.trim();
    }
    if (typeof description === "string") {
      project.description = description.trim();
    }
    project.updatedAt = new Date().toISOString();
    await this.flush();
    return project;
  }

  async deleteProject({ projectId, ownerUserId }) {
    await this.ensureSchema();
    const before = this.data.projects.length;
    this.data.projects = this.data.projects.filter(
      (item) => !(item.id === projectId && item.ownerUserId === ownerUserId)
    );
    this.data.jobs = this.data.jobs.filter((item) => item.projectId !== projectId);
    const changed = this.data.projects.length !== before;
    if (changed) {
      await this.flush();
    }
    return changed;
  }

  async listJobsForUser(userId, projectId = null) {
    await this.ensureSchema();
    return this.data.jobs
      .filter(
        (item) =>
          item.userId === userId &&
          (projectId === null || item.projectId === projectId)
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createJob({ projectId, userId, type, payload }) {
    await this.ensureSchema();
    const now = new Date().toISOString();
    const job = {
      id: this.data.nextJobId++,
      projectId,
      userId,
      type,
      status: "queued",
      payload,
      message: "",
      outputPath: "",
      createdAt: now,
      updatedAt: now,
    };
    this.data.jobs.push(job);
    await this.flush();
    return job;
  }

  async updateJobStatus({ jobId, userId, status, message = "", outputPath = "" }) {
    await this.ensureSchema();
    const job = this.data.jobs.find(
      (item) => item.id === jobId && item.userId === userId
    );
    if (!job) {
      return null;
    }
    if (typeof status === "string" && status.trim()) {
      job.status = status.trim();
    }
    if (typeof message === "string") {
      job.message = message;
    }
    if (typeof outputPath === "string") {
      job.outputPath = outputPath;
    }
    job.updatedAt = new Date().toISOString();
    await this.flush();
    return job;
  }

  async close() {}
}
