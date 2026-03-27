import { api } from "/Apps/myapp/portal/common.js";

const summaryBox = document.getElementById("summaryBox");
const usersBox = document.getElementById("usersBox");
const jobsBox = document.getElementById("jobsBox");

async function ensureAdmin() {
  const me = await api("/api/platform/auth/me");
  if (!me.user || me.user.role !== "admin") {
    window.location.href = "/workspace";
    return false;
  }
  return true;
}

function renderSummary(data) {
  summaryBox.innerHTML = `
    users: <strong>${data.users}</strong> |
    admins: <strong>${data.admins}</strong> |
    projects: <strong>${data.projects}</strong> |
    jobs: <strong>${data.jobs}</strong>
  `;
}

function renderUsers(users) {
  if (!users.length) {
    usersBox.innerHTML = `<div class="item">暂无用户。</div>`;
    return;
  }
  usersBox.innerHTML = users
    .map((user) => {
      const roleOptions =
        user.role === "admin"
          ? `<option value="admin" selected>admin</option><option value="user">user</option>`
          : `<option value="admin">admin</option><option value="user" selected>user</option>`;
      return `<div class="item" data-user-id="${user.id}">
        <strong>#${user.id} ${user.username}</strong>
        <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
          <select data-role-select>${roleOptions}</select>
          <button class="btn secondary" data-role-save>保存角色</button>
          <span style="color:#72859a;">${new Date(user.createdAt).toLocaleString()}</span>
        </div>
      </div>`;
    })
    .join("");
}

function renderJobs(jobs) {
  if (!jobs.length) {
    jobsBox.innerHTML = `<div class="item">暂无任务。</div>`;
    return;
  }
  jobsBox.innerHTML = jobs
    .map(
      (job) => `<div class="item">
      <strong>#${job.id} ${job.type} [${job.status}]</strong>
      <div style="color:#586f86;">project: ${job.projectId} | user: ${job.userId}</div>
      <div style="color:#72859a;">${new Date(job.updatedAt).toLocaleString()}</div>
    </div>`
    )
    .join("");
}

async function reload() {
  const [summary, users, jobs] = await Promise.all([
    api("/api/platform/admin/summary"),
    api("/api/platform/admin/users"),
    api("/api/platform/admin/jobs?limit=200"),
  ]);
  renderSummary(summary);
  renderUsers(users.users || []);
  renderJobs(jobs.jobs || []);
}

usersBox.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-role-save]");
  if (!btn) {
    return;
  }
  const row = event.target.closest("[data-user-id]");
  if (!row) {
    return;
  }
  const userId = row.getAttribute("data-user-id");
  const select = row.querySelector("[data-role-select]");
  const role = select?.value || "user";
  btn.disabled = true;
  try {
    await api(`/api/platform/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    await reload();
  } catch (error) {
    alert(`更新失败: ${error.message}`);
  } finally {
    btn.disabled = false;
  }
});

(async function init() {
  try {
    const ok = await ensureAdmin();
    if (!ok) {
      return;
    }
    await reload();
  } catch (error) {
    alert(`Admin 页面加载失败: ${error.message}`);
    window.location.href = "/portal";
  }
})();
