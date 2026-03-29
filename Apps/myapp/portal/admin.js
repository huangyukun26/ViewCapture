import { api, setStatusLine } from "/Apps/myapp/portal/common.js";

const summaryBox = document.getElementById("summaryBox");
const globalStatus = document.getElementById("globalStatus");

const aiBaseUrlInput = document.getElementById("aiBaseUrlInput");
const testAiConfigBtn = document.getElementById("testAiConfigBtn");
const saveAiConfigBtn = document.getElementById("saveAiConfigBtn");
const aiConfigStatus = document.getElementById("aiConfigStatus");

const newUsername = document.getElementById("newUsername");
const newPassword = document.getElementById("newPassword");
const newUserRole = document.getElementById("newUserRole");
const createUserBtn = document.getElementById("createUserBtn");
const userStatus = document.getElementById("userStatus");
const usersBox = document.getElementById("usersBox");

const newProjectName = document.getElementById("newProjectName");
const newProjectOwner = document.getElementById("newProjectOwner");
const newProjectDescription = document.getElementById("newProjectDescription");
const createProjectBtn = document.getElementById("createProjectBtn");
const projectStatus = document.getElementById("projectStatus");
const projectsBox = document.getElementById("projectsBox");

const jobFilterUser = document.getElementById("jobFilterUser");
const jobFilterProject = document.getElementById("jobFilterProject");
const refreshJobsBtn = document.getElementById("refreshJobsBtn");
const resetJobFiltersBtn = document.getElementById("resetJobFiltersBtn");
const jobStatus = document.getElementById("jobStatus");
const jobsBox = document.getElementById("jobsBox");

const DEFAULT_JOB_STATUSES = ["queued", "running", "completed", "failed", "canceled"];

let currentUser = null;
let users = [];
let projects = [];
let jobs = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(isoTime) {
  if (!isoTime) {
    return "-";
  }
  const date = new Date(isoTime);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function userOptionsHtml(selectedId, includeAll = false) {
  const options = [];
  if (includeAll) {
    options.push(`<option value="">All Users</option>`);
  }
  for (const user of users) {
    const selected = String(user.id) === String(selectedId) ? " selected" : "";
    options.push(
      `<option value="${user.id}"${selected}>#${user.id} ${escapeHtml(user.username)} (${escapeHtml(user.role)})</option>`
    );
  }
  return options.join("");
}

function projectOptionsHtml(selectedId, includeAll = false) {
  const options = [];
  if (includeAll) {
    options.push(`<option value="">All Projects</option>`);
  }
  for (const project of projects) {
    const selected = String(project.id) === String(selectedId) ? " selected" : "";
    options.push(
      `<option value="${escapeHtml(project.id)}"${selected}>${escapeHtml(project.name)} (${escapeHtml(project.ownerUsername || "-")})</option>`
    );
  }
  return options.join("");
}

function statusOptionsHtml(selectedValue) {
  const values = new Set(DEFAULT_JOB_STATUSES);
  if (selectedValue) {
    values.add(String(selectedValue));
  }
  return Array.from(values)
    .map((value) => {
      const selected = value === selectedValue ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(value)}</option>`;
    })
    .join("");
}

async function ensureAdmin() {
  const me = await api("/api/platform/auth/me");
  if (!me.user || me.user.role !== "admin") {
    window.location.href = "/workspace";
    return false;
  }
  currentUser = me.user;
  return true;
}

function renderSummary(data) {
  summaryBox.innerHTML =
    `users: <strong>${data.users}</strong> | ` +
    `admins: <strong>${data.admins}</strong> | ` +
    `projects: <strong>${data.projects}</strong> | ` +
    `jobs: <strong>${data.jobs}</strong>`;
}

function renderUsers() {
  if (!users.length) {
    usersBox.innerHTML = `<div class="item">No users.</div>`;
    return;
  }
  usersBox.innerHTML = users
    .map((user) => {
      const disableDelete = Number(user.id) === Number(currentUser?.id);
      return `
      <div class="item" data-user-id="${user.id}">
        <strong>#${user.id} ${escapeHtml(user.username)}</strong>
        <div style="color:#72859a; margin-bottom:8px;">created: ${formatTime(user.createdAt)}</div>
        <div style="display:grid; grid-template-columns: 1.2fr 0.7fr 1fr auto auto; gap:8px;">
          <input data-field="username" type="text" value="${escapeHtml(user.username)}" />
          <select data-field="role">
            <option value="user"${user.role === "user" ? " selected" : ""}>user</option>
            <option value="admin"${user.role === "admin" ? " selected" : ""}>admin</option>
          </select>
          <input data-field="password" type="password" placeholder="new password (optional)" />
          <button class="btn secondary" data-action="save-user">Save</button>
          <button class="btn danger" data-action="delete-user"${disableDelete ? " disabled" : ""}>Delete</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderProjects() {
  if (!projects.length) {
    projectsBox.innerHTML = `<div class="item">No projects.</div>`;
    return;
  }
  projectsBox.innerHTML = projects
    .map((project) => {
      return `
      <div class="item" data-project-id="${escapeHtml(project.id)}">
        <strong>${escapeHtml(project.name)}</strong>
        <div style="color:#72859a; margin-bottom:8px;">owner: ${escapeHtml(project.ownerUsername || "-")} | updated: ${formatTime(project.updatedAt)}</div>
        <div style="display:grid; grid-template-columns: 1.1fr 0.8fr 1.4fr auto auto; gap:8px;">
          <input data-field="name" type="text" maxlength="100" value="${escapeHtml(project.name)}" />
          <select data-field="ownerUserId">${userOptionsHtml(project.ownerUserId)}</select>
          <input data-field="description" type="text" value="${escapeHtml(project.description || "")}" />
          <button class="btn secondary" data-action="save-project">Save</button>
          <button class="btn danger" data-action="delete-project">Delete</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderJobs() {
  if (!jobs.length) {
    jobsBox.innerHTML = `<div class="item">No jobs.</div>`;
    return;
  }
  jobsBox.innerHTML = jobs
    .map((job) => {
      let payloadText = "{}";
      try {
        payloadText = JSON.stringify(job.payload || {}, null, 2);
      } catch {
        payloadText = "{}";
      }
      return `
      <div class="item" data-job-id="${job.id}">
        <strong>#${job.id} ${escapeHtml(job.type)} [${escapeHtml(job.status)}]</strong>
        <div style="color:#72859a; margin-bottom:8px;">
          project: ${escapeHtml(job.projectId)} | user: ${job.userId} | updated: ${formatTime(job.updatedAt)}
        </div>
        <div style="display:grid; grid-template-columns: 0.8fr 0.9fr 1fr 1fr auto auto; gap:8px; margin-bottom:8px;">
          <input data-field="type" type="text" value="${escapeHtml(job.type)}" />
          <select data-field="status">${statusOptionsHtml(job.status)}</select>
          <input data-field="message" type="text" value="${escapeHtml(job.message || "")}" placeholder="message" />
          <input data-field="outputPath" type="text" value="${escapeHtml(job.outputPath || "")}" placeholder="outputPath" />
          <button class="btn secondary" data-action="save-job">Save</button>
          <button class="btn danger" data-action="delete-job">Delete</button>
        </div>
        <details>
          <summary style="cursor:pointer; color:#506a84;">Payload</summary>
          <pre style="margin:6px 0 0; padding:8px; background:#f6f9fd; border:1px solid #e2ebf4; border-radius:8px; max-height:180px; overflow:auto;">${escapeHtml(payloadText)}</pre>
        </details>
      </div>
    `;
    })
    .join("");
}

function renderSelectors() {
  newProjectOwner.innerHTML = userOptionsHtml(users[0]?.id || "");
  jobFilterUser.innerHTML = userOptionsHtml(jobFilterUser.value, true);
  jobFilterProject.innerHTML = projectOptionsHtml(jobFilterProject.value, true);
}

async function loadSummary() {
  const data = await api("/api/platform/admin/summary");
  renderSummary(data);
}

async function loadAiConfig() {
  const data = await api("/api/platform/admin/ai-config");
  aiBaseUrlInput.value = data.aiBaseUrl || "";
}

async function loadUsers() {
  const data = await api("/api/platform/admin/users");
  users = data.users || [];
  renderUsers();
}

async function loadProjects() {
  const data = await api("/api/platform/admin/projects");
  projects = data.projects || [];
  renderProjects();
}

async function loadJobs() {
  const params = new URLSearchParams();
  params.set("limit", "300");
  if (jobFilterUser.value) {
    params.set("userId", jobFilterUser.value);
  }
  if (jobFilterProject.value) {
    params.set("projectId", jobFilterProject.value);
  }
  const data = await api(`/api/platform/admin/jobs?${params.toString()}`);
  jobs = data.jobs || [];
  renderJobs();
}

async function reloadAll() {
  await Promise.all([loadUsers(), loadProjects(), loadAiConfig()]);
  renderSelectors();
  await Promise.all([loadSummary(), loadJobs()]);
}

async function testAiConfigConnection() {
  setStatusLine(aiConfigStatus, "Testing...");
  const data = await api("/api/platform/admin/ai-config/test", {
    method: "POST",
  });
  if (data.ok) {
    setStatusLine(
      aiConfigStatus,
      `Connected: ${data.target} (HTTP ${data.status})`,
      "success"
    );
  } else {
    setStatusLine(
      aiConfigStatus,
      `Connection failed: ${data.error || `HTTP ${data.status}`}`,
      "error"
    );
  }
}

createUserBtn.addEventListener("click", async () => {
  setStatusLine(userStatus, "");
  const username = newUsername.value.trim();
  const password = newPassword.value;
  const role = newUserRole.value || "user";
  if (!username) {
    setStatusLine(userStatus, "username is required.", "error");
    return;
  }
  if (!password) {
    setStatusLine(userStatus, "password is required.", "error");
    return;
  }

  createUserBtn.disabled = true;
  try {
    await api("/api/platform/admin/users", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });
    newUsername.value = "";
    newPassword.value = "";
    newUserRole.value = "user";
    await reloadAll();
    setStatusLine(userStatus, "User created.", "success");
  } catch (error) {
    setStatusLine(userStatus, error.message, "error");
  } finally {
    createUserBtn.disabled = false;
  }
});

usersBox.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-user-id]");
  if (!row) {
    return;
  }
  const userId = row.getAttribute("data-user-id");
  if (!userId) {
    return;
  }

  const saveBtn = event.target.closest("[data-action='save-user']");
  const deleteBtn = event.target.closest("[data-action='delete-user']");
  if (saveBtn) {
    const username = row.querySelector("[data-field='username']")?.value?.trim() || "";
    const role = row.querySelector("[data-field='role']")?.value || "user";
    const password = row.querySelector("[data-field='password']")?.value || "";
    saveBtn.disabled = true;
    try {
      const payload = { username, role };
      if (password.trim()) {
        payload.password = password;
      }
      await api(`/api/platform/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await reloadAll();
      setStatusLine(userStatus, `User #${userId} updated.`, "success");
    } catch (error) {
      setStatusLine(userStatus, error.message, "error");
    } finally {
      saveBtn.disabled = false;
    }
    return;
  }

  if (deleteBtn) {
    const confirmed = window.confirm(`Delete user #${userId}? This will delete owned projects and jobs.`);
    if (!confirmed) {
      return;
    }
    deleteBtn.disabled = true;
    try {
      await api(`/api/platform/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      await reloadAll();
      setStatusLine(userStatus, `User #${userId} deleted.`, "success");
    } catch (error) {
      setStatusLine(userStatus, error.message, "error");
    } finally {
      deleteBtn.disabled = false;
    }
  }
});

createProjectBtn.addEventListener("click", async () => {
  setStatusLine(projectStatus, "");
  const name = newProjectName.value.trim();
  const description = newProjectDescription.value.trim();
  const ownerUserId = Number.parseInt(newProjectOwner.value, 10);
  if (!name) {
    setStatusLine(projectStatus, "project name is required.", "error");
    return;
  }
  if (!Number.isFinite(ownerUserId) || ownerUserId <= 0) {
    setStatusLine(projectStatus, "owner is required.", "error");
    return;
  }

  createProjectBtn.disabled = true;
  try {
    await api("/api/platform/admin/projects", {
      method: "POST",
      body: JSON.stringify({ name, description, ownerUserId }),
    });
    newProjectName.value = "";
    newProjectDescription.value = "";
    await reloadAll();
    setStatusLine(projectStatus, "Project created.", "success");
  } catch (error) {
    setStatusLine(projectStatus, error.message, "error");
  } finally {
    createProjectBtn.disabled = false;
  }
});

projectsBox.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-project-id]");
  if (!row) {
    return;
  }
  const projectId = row.getAttribute("data-project-id");
  if (!projectId) {
    return;
  }

  const saveBtn = event.target.closest("[data-action='save-project']");
  const deleteBtn = event.target.closest("[data-action='delete-project']");
  if (saveBtn) {
    const name = row.querySelector("[data-field='name']")?.value?.trim() || "";
    const description = row.querySelector("[data-field='description']")?.value || "";
    const ownerUserId = Number.parseInt(
      row.querySelector("[data-field='ownerUserId']")?.value || "",
      10
    );
    saveBtn.disabled = true;
    try {
      await api(`/api/platform/admin/projects/${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description, ownerUserId }),
      });
      await reloadAll();
      setStatusLine(projectStatus, `Project ${projectId} updated.`, "success");
    } catch (error) {
      setStatusLine(projectStatus, error.message, "error");
    } finally {
      saveBtn.disabled = false;
    }
    return;
  }

  if (deleteBtn) {
    const confirmed = window.confirm(`Delete project ${projectId}?`);
    if (!confirmed) {
      return;
    }
    deleteBtn.disabled = true;
    try {
      await api(`/api/platform/admin/projects/${encodeURIComponent(projectId)}`, {
        method: "DELETE",
      });
      await reloadAll();
      setStatusLine(projectStatus, `Project ${projectId} deleted.`, "success");
    } catch (error) {
      setStatusLine(projectStatus, error.message, "error");
    } finally {
      deleteBtn.disabled = false;
    }
  }
});

jobsBox.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-job-id]");
  if (!row) {
    return;
  }
  const jobId = row.getAttribute("data-job-id");
  if (!jobId) {
    return;
  }

  const saveBtn = event.target.closest("[data-action='save-job']");
  const deleteBtn = event.target.closest("[data-action='delete-job']");

  if (saveBtn) {
    const payload = {
      type: row.querySelector("[data-field='type']")?.value?.trim() || "",
      status: row.querySelector("[data-field='status']")?.value || "",
      message: row.querySelector("[data-field='message']")?.value || "",
      outputPath: row.querySelector("[data-field='outputPath']")?.value || "",
    };
    saveBtn.disabled = true;
    try {
      await api(`/api/platform/admin/jobs/${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await loadSummary();
      await loadJobs();
      setStatusLine(jobStatus, `Job #${jobId} updated.`, "success");
    } catch (error) {
      setStatusLine(jobStatus, error.message, "error");
    } finally {
      saveBtn.disabled = false;
    }
    return;
  }

  if (deleteBtn) {
    const confirmed = window.confirm(`Delete job #${jobId}?`);
    if (!confirmed) {
      return;
    }
    deleteBtn.disabled = true;
    try {
      await api(`/api/platform/admin/jobs/${encodeURIComponent(jobId)}`, {
        method: "DELETE",
      });
      await loadSummary();
      await loadJobs();
      setStatusLine(jobStatus, `Job #${jobId} deleted.`, "success");
    } catch (error) {
      setStatusLine(jobStatus, error.message, "error");
    } finally {
      deleteBtn.disabled = false;
    }
  }
});

refreshJobsBtn.addEventListener("click", async () => {
  try {
    await loadJobs();
    setStatusLine(jobStatus, "Jobs refreshed.", "success");
  } catch (error) {
    setStatusLine(jobStatus, error.message, "error");
  }
});

resetJobFiltersBtn.addEventListener("click", async () => {
  jobFilterUser.value = "";
  jobFilterProject.value = "";
  try {
    await loadJobs();
    setStatusLine(jobStatus, "Filters reset.", "success");
  } catch (error) {
    setStatusLine(jobStatus, error.message, "error");
  }
});

saveAiConfigBtn.addEventListener("click", async () => {
  const aiBaseUrl = aiBaseUrlInput.value.trim();
  if (!aiBaseUrl) {
    setStatusLine(aiConfigStatus, "AI base URL is required.", "error");
    return;
  }
  saveAiConfigBtn.disabled = true;
  try {
    const data = await api("/api/platform/admin/ai-config", {
      method: "PATCH",
      body: JSON.stringify({ aiBaseUrl }),
    });
    aiBaseUrlInput.value = data.aiBaseUrl;
    setStatusLine(aiConfigStatus, "AI config saved.", "success");
  } catch (error) {
    setStatusLine(aiConfigStatus, error.message, "error");
  } finally {
    saveAiConfigBtn.disabled = false;
  }
});

testAiConfigBtn.addEventListener("click", async () => {
  testAiConfigBtn.disabled = true;
  try {
    await testAiConfigConnection();
  } catch (error) {
    setStatusLine(aiConfigStatus, error.message, "error");
  } finally {
    testAiConfigBtn.disabled = false;
  }
});

jobFilterUser.addEventListener("change", () => {
  loadJobs().catch((error) => setStatusLine(jobStatus, error.message, "error"));
});

jobFilterProject.addEventListener("change", () => {
  loadJobs().catch((error) => setStatusLine(jobStatus, error.message, "error"));
});

(async function init() {
  try {
    const ok = await ensureAdmin();
    if (!ok) {
      return;
    }
    await reloadAll();
  } catch (error) {
    setStatusLine(globalStatus, `Admin page load failed: ${error.message}`, "error");
    setTimeout(() => {
      window.location.href = "/portal";
    }, 1200);
  }
})();
