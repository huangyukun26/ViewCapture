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

function sanitizeProject(project, username = "") {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerUserId: project.ownerUserId,
    ownerUsername: username || "",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
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

  async listUsers() {
    await this.ensureSchema();
    return this.data.users
      .slice()
      .sort((a, b) => a.id - b.id)
      .map(sanitizeUser);
  }

  async setUserRole({ userId, role }) {
    await this.ensureSchema();
    const user = this.data.users.find((item) => item.id === userId);
    if (!user) {
      return null;
    }
    user.role = role;
    await this.flush();
    return sanitizeUser(user);
  }

  async updateUser({ userId, username, passwordHash, role }) {
    await this.ensureSchema();
    const user = this.data.users.find((item) => item.id === userId);
    if (!user) {
      return null;
    }
    if (typeof username === "string" && username.trim()) {
      const normalized = username.trim().toLowerCase();
      const duplicated = this.data.users.find(
        (item) => item.username === normalized && item.id !== userId
      );
      if (duplicated) {
        const error = new Error("Username already exists.");
        error.code = "DUPLICATE_USERNAME";
        throw error;
      }
      user.username = normalized;
    }
    if (typeof passwordHash === "string" && passwordHash.trim()) {
      user.passwordHash = passwordHash;
    }
    if (typeof role === "string" && role.trim()) {
      user.role = role.trim();
    }
    await this.flush();
    return sanitizeUser(user);
  }

  async deleteUser(userId) {
    await this.ensureSchema();
    const target = this.data.users.find((item) => item.id === userId);
    if (!target) {
      return false;
    }
    this.data.users = this.data.users.filter((item) => item.id !== userId);
    const projectIds = new Set(
      this.data.projects
        .filter((project) => project.ownerUserId === userId)
        .map((project) => project.id)
    );
    this.data.projects = this.data.projects.filter(
      (project) => project.ownerUserId !== userId
    );
    this.data.jobs = this.data.jobs.filter(
      (job) => job.userId !== userId && !projectIds.has(job.projectId)
    );
    await this.flush();
    return true;
  }

  async listProjectsForUser(userId) {
    await this.ensureSchema();
    return this.data.projects
      .filter((item) => item.ownerUserId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listAllProjects() {
    await this.ensureSchema();
    const userMap = new Map(this.data.users.map((u) => [u.id, u.username]));
    return this.data.projects
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((project) =>
        sanitizeProject(project, userMap.get(project.ownerUserId) || "")
      );
  }

  async getProjectById(projectId) {
    await this.ensureSchema();
    const project = this.data.projects.find((item) => item.id === projectId);
    if (!project) {
      return null;
    }
    const owner = this.data.users.find((u) => u.id === project.ownerUserId);
    return sanitizeProject(project, owner?.username || "");
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

  async adminUpdateProject({ projectId, name, description, ownerUserId }) {
    await this.ensureSchema();
    const project = this.data.projects.find((item) => item.id === projectId);
    if (!project) {
      return null;
    }
    if (typeof name === "string" && name.trim()) {
      project.name = name.trim();
    }
    if (typeof description === "string") {
      project.description = description.trim();
    }
    if (Number.isFinite(ownerUserId)) {
      project.ownerUserId = ownerUserId;
    }
    project.updatedAt = new Date().toISOString();
    await this.flush();
    const owner = this.data.users.find((u) => u.id === project.ownerUserId);
    return sanitizeProject(project, owner?.username || "");
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

  async adminDeleteProject(projectId) {
    await this.ensureSchema();
    const before = this.data.projects.length;
    this.data.projects = this.data.projects.filter((item) => item.id !== projectId);
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

  async listAllJobs(limit = 200) {
    await this.ensureSchema();
    return this.data.jobs
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  async adminUpdateJob({ jobId, status, message, outputPath, type }) {
    await this.ensureSchema();
    const job = this.data.jobs.find((item) => item.id === jobId);
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
    if (typeof type === "string" && type.trim()) {
      job.type = type.trim();
    }
    job.updatedAt = new Date().toISOString();
    await this.flush();
    return job;
  }

  async adminDeleteJob(jobId) {
    await this.ensureSchema();
    const before = this.data.jobs.length;
    this.data.jobs = this.data.jobs.filter((item) => item.id !== jobId);
    const changed = this.data.jobs.length !== before;
    if (changed) {
      await this.flush();
    }
    return changed;
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
