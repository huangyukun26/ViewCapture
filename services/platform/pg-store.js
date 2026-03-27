import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

function sanitizeUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    role: row.role,
    createdAt: row.created_at,
  };
}

export class PgStore {
  constructor(databaseUrl) {
    this.type = "postgres";
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      ssl:
        process.env.PLATFORM_DATABASE_SSL === "1"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  async ensureSchema() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id BIGSERIAL PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        message TEXT NOT NULL DEFAULT '',
        output_path TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async createUser({ username, passwordHash, role = "user" }) {
    const result = await this.pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, created_at;`,
      [username, passwordHash, role]
    );
    return sanitizeUser(result.rows[0]);
  }

  async getUserByUsername(username) {
    const result = await this.pool.query(
      `SELECT id, username, password_hash, role, created_at
       FROM users
       WHERE username = $1
       LIMIT 1;`,
      [username]
    );
    if (result.rowCount === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: Number(row.id),
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
      createdAt: row.created_at,
    };
  }

  async getUserById(userId) {
    const result = await this.pool.query(
      `SELECT id, username, role, created_at
       FROM users
       WHERE id = $1
       LIMIT 1;`,
      [userId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return sanitizeUser(result.rows[0]);
  }

  async listUsers() {
    const result = await this.pool.query(
      `SELECT id, username, role, created_at
       FROM users
       ORDER BY id ASC;`
    );
    return result.rows.map(sanitizeUser);
  }

  async setUserRole({ userId, role }) {
    const result = await this.pool.query(
      `UPDATE users
       SET role = $2
       WHERE id = $1
       RETURNING id, username, role, created_at;`,
      [userId, role]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return sanitizeUser(result.rows[0]);
  }

  async listProjectsForUser(userId) {
    const result = await this.pool.query(
      `SELECT id, name, description, owner_user_id, created_at, updated_at
       FROM projects
       WHERE owner_user_id = $1
       ORDER BY updated_at DESC;`,
      [userId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      ownerUserId: Number(row.owner_user_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createProject({ name, description = "", ownerUserId }) {
    const id = crypto.randomUUID();
    const result = await this.pool.query(
      `INSERT INTO projects (id, name, description, owner_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, owner_user_id, created_at, updated_at;`,
      [id, name, description, ownerUserId]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ownerUserId: Number(row.owner_user_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateProject({ projectId, name, description, ownerUserId }) {
    const result = await this.pool.query(
      `UPDATE projects
       SET
         name = COALESCE(NULLIF(TRIM($3), ''), name),
         description = COALESCE($4, description),
         updated_at = NOW()
       WHERE id = $1 AND owner_user_id = $2
       RETURNING id, name, description, owner_user_id, created_at, updated_at;`,
      [projectId, ownerUserId, typeof name === "string" ? name : "", description]
    );
    if (result.rowCount === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ownerUserId: Number(row.owner_user_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async deleteProject({ projectId, ownerUserId }) {
    const result = await this.pool.query(
      `DELETE FROM projects
       WHERE id = $1 AND owner_user_id = $2;`,
      [projectId, ownerUserId]
    );
    return result.rowCount > 0;
  }

  async listJobsForUser(userId, projectId = null) {
    const result = await this.pool.query(
      `SELECT id, project_id, user_id, type, status, payload, message, output_path, created_at, updated_at
       FROM jobs
       WHERE user_id = $1
         AND ($2::text IS NULL OR project_id = $2::text)
       ORDER BY updated_at DESC;`,
      [userId, projectId]
    );
    return result.rows.map((row) => ({
      id: Number(row.id),
      projectId: row.project_id,
      userId: Number(row.user_id),
      type: row.type,
      status: row.status,
      payload: row.payload,
      message: row.message,
      outputPath: row.output_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listAllJobs(limit = 200) {
    const result = await this.pool.query(
      `SELECT id, project_id, user_id, type, status, payload, message, output_path, created_at, updated_at
       FROM jobs
       ORDER BY updated_at DESC
       LIMIT $1;`,
      [limit]
    );
    return result.rows.map((row) => ({
      id: Number(row.id),
      projectId: row.project_id,
      userId: Number(row.user_id),
      type: row.type,
      status: row.status,
      payload: row.payload,
      message: row.message,
      outputPath: row.output_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createJob({ projectId, userId, type, payload }) {
    const result = await this.pool.query(
      `INSERT INTO jobs (project_id, user_id, type, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, project_id, user_id, type, status, payload, message, output_path, created_at, updated_at;`,
      [projectId, userId, type, JSON.stringify(payload || {})]
    );
    const row = result.rows[0];
    return {
      id: Number(row.id),
      projectId: row.project_id,
      userId: Number(row.user_id),
      type: row.type,
      status: row.status,
      payload: row.payload,
      message: row.message,
      outputPath: row.output_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateJobStatus({ jobId, userId, status, message = "", outputPath = "" }) {
    const result = await this.pool.query(
      `UPDATE jobs
       SET
         status = COALESCE(NULLIF(TRIM($3), ''), status),
         message = COALESCE($4, message),
         output_path = COALESCE($5, output_path),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, project_id, user_id, type, status, payload, message, output_path, created_at, updated_at;`,
      [jobId, userId, status, message, outputPath]
    );
    if (result.rowCount === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: Number(row.id),
      projectId: row.project_id,
      userId: Number(row.user_id),
      type: row.type,
      status: row.status,
      payload: row.payload,
      message: row.message,
      outputPath: row.output_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async close() {
    await this.pool.end();
  }
}
