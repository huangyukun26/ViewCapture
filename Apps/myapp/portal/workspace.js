import { api, setStatusLine } from "/Apps/myapp/portal/common.js";

const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

const projectName = document.getElementById("projectName");
const projectDescription = document.getElementById("projectDescription");
const createProjectBtn = document.getElementById("createProjectBtn");
const projectStatus = document.getElementById("projectStatus");
const projectList = document.getElementById("projectList");

const refreshJobsBtn = document.getElementById("refreshJobsBtn");
const createJobBtn = document.getElementById("createJobBtn");
const jobStatus = document.getElementById("jobStatus");
const jobList = document.getElementById("jobList");

const openAnnotationBtn = document.getElementById("openAnnotationBtn");
const openCaptureBtn = document.getElementById("openCaptureBtn");
const openAnalysisBtn = document.getElementById("openAnalysisBtn");
const openAdminBtn = document.getElementById("openAdminBtn");
const openAnnotationTabBtn = document.getElementById("openAnnotationTabBtn");
const openCaptureTabBtn = document.getElementById("openCaptureTabBtn");
const openAnalysisTabBtn = document.getElementById("openAnalysisTabBtn");
const openAdminTabBtn = document.getElementById("openAdminTabBtn");
const workspaceStatus = document.getElementById("workspaceStatus");
const toolFrame = document.getElementById("toolFrame");

let currentUser = null;
let projects = [];
let selectedProjectId = "";
let currentModule = "annotation";

function bindClick(element, handler, elementName) {
  if (!element) {
    console.warn(`[workspace] missing element: ${elementName}`);
    return;
  }
  element.addEventListener("click", handler);
}

function selectProject(projectId) {
  selectedProjectId = projectId;
  renderProjects();
}

function renderProjects() {
  if (!projectList) {
    return;
  }
  if (!projects.length) {
    projectList.innerHTML = `<div class="item">暂无项目，请先创建。</div>`;
    return;
  }
  projectList.innerHTML = projects
    .map((project) => {
      const activeClass = project.id === selectedProjectId ? " active" : "";
      const description = project.description
        ? `<div>${project.description}</div>`
        : `<div style="color:#72859a;">无描述</div>`;
      return `<div class="item${activeClass}" data-project-id="${project.id}">
        <strong>${project.name}</strong>
        ${description}
        <div style="color:#72859a;">${new Date(project.updatedAt).toLocaleString()}</div>
      </div>`;
    })
    .join("");
}

async function loadProjects() {
  const data = await api("/api/platform/projects");
  projects = data.projects || [];
  if (!projects.some((item) => item.id === selectedProjectId)) {
    selectedProjectId = projects[0]?.id || "";
  }
  renderProjects();
}

async function loadJobs() {
  if (!jobList) {
    return;
  }
  const query = selectedProjectId
    ? `?projectId=${encodeURIComponent(selectedProjectId)}`
    : "";
  const data = await api(`/api/platform/jobs${query}`);
  const jobs = data.jobs || [];
  if (!jobs.length) {
    jobList.innerHTML = `<div class="item">暂无任务记录。</div>`;
    return;
  }
  jobList.innerHTML = jobs
    .map((job) => {
      const payloadText = job.payload ? JSON.stringify(job.payload) : "{}";
      return `<div class="item">
        <strong>#${job.id} ${job.type} [${job.status}]</strong>
        <div style="color:#586f86;">${new Date(job.updatedAt).toLocaleString()}</div>
        <div style="color:#72859a; word-break:break-all;">${payloadText}</div>
      </div>`;
    })
    .join("");
}

function setToolModule(moduleName) {
  currentModule = moduleName;
  if (!toolFrame) {
    return;
  }
  if (moduleName === "annotation") {
    toolFrame.src = "/annotation?embed=1";
    setStatusLine(workspaceStatus, "当前模块: Window Annotation");
  } else if (moduleName === "analysis") {
    toolFrame.src = "/analysis?embed=1";
    setStatusLine(workspaceStatus, "当前模块: WindowView Semantic Analysis");
  } else if (moduleName === "admin") {
    toolFrame.src = "/admin?embed=1";
    setStatusLine(workspaceStatus, "当前模块: Admin Dashboard");
  } else {
    toolFrame.src = "/capture?embed=1";
    setStatusLine(workspaceStatus, "当前模块: View Capture");
  }
}

async function bootstrap() {
  try {
    const me = await api("/api/platform/auth/me");
    currentUser = me.user;
    if (userInfo) {
      userInfo.textContent = `当前用户: ${currentUser.username} (${currentUser.role})`;
    }
    const isAdmin = currentUser.role === "admin";
    if (openAdminBtn) {
      openAdminBtn.style.display = isAdmin ? "inline-block" : "none";
    }
    if (openAdminTabBtn) {
      openAdminTabBtn.style.display = isAdmin ? "inline-block" : "none";
    }
  } catch (error) {
    window.location.href = "/portal";
    return;
  }

  await Promise.all([loadProjects(), loadJobs()]);
  setToolModule("annotation");
}

bindClick(
  createProjectBtn,
  async () => {
    setStatusLine(projectStatus, "");
    if (!projectName || !projectDescription) {
      setStatusLine(projectStatus, "Project form is not ready.", "error");
      return;
    }
    const name = projectName.value.trim();
    const description = projectDescription.value.trim();
    if (!name) {
      setStatusLine(projectStatus, "Project name 不能为空。", "error");
      return;
    }
    createProjectBtn.disabled = true;
    try {
      const data = await api("/api/platform/projects", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      projects.unshift(data.project);
      selectedProjectId = data.project.id;
      renderProjects();
      projectName.value = "";
      projectDescription.value = "";
      setStatusLine(projectStatus, "项目创建成功。", "success");
    } catch (error) {
      setStatusLine(projectStatus, error.message, "error");
    } finally {
      createProjectBtn.disabled = false;
    }
  },
  "createProjectBtn"
);

if (projectList) {
  projectList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-project-id]");
    if (!item) {
      return;
    }
    selectProject(item.dataset.projectId);
    loadJobs().catch((error) => {
      setStatusLine(jobStatus, error.message, "error");
    });
  });
}

bindClick(
  refreshJobsBtn,
  () => {
    loadJobs().catch((error) => {
      setStatusLine(jobStatus, error.message, "error");
    });
  },
  "refreshJobsBtn"
);

bindClick(
  createJobBtn,
  async () => {
    setStatusLine(jobStatus, "");
    if (!selectedProjectId) {
      setStatusLine(jobStatus, "请先创建或选择一个项目。", "error");
      return;
    }
    try {
      const payload = {
        module: currentModule,
        recordedAt: new Date().toISOString(),
        note: "Manual record from unified workspace",
      };
      await api("/api/platform/jobs", {
        method: "POST",
        body: JSON.stringify({
          projectId: selectedProjectId,
          type: currentModule,
          payload,
        }),
      });
      setStatusLine(jobStatus, "已记录任务。", "success");
      await loadJobs();
    } catch (error) {
      setStatusLine(jobStatus, error.message, "error");
    }
  },
  "createJobBtn"
);

bindClick(openAnnotationBtn, () => setToolModule("annotation"), "openAnnotationBtn");
bindClick(openCaptureBtn, () => setToolModule("capture"), "openCaptureBtn");
bindClick(openAnalysisBtn, () => setToolModule("analysis"), "openAnalysisBtn");
bindClick(openAdminBtn, () => setToolModule("admin"), "openAdminBtn");
bindClick(
  openAnnotationTabBtn,
  () => window.open("/annotation", "_blank", "noopener,noreferrer"),
  "openAnnotationTabBtn"
);
bindClick(
  openCaptureTabBtn,
  () => window.open("/capture", "_blank", "noopener,noreferrer"),
  "openCaptureTabBtn"
);
bindClick(
  openAnalysisTabBtn,
  () => window.open("/analysis", "_blank", "noopener,noreferrer"),
  "openAnalysisTabBtn"
);
bindClick(
  openAdminTabBtn,
  () => window.open("/admin", "_blank", "noopener,noreferrer"),
  "openAdminTabBtn"
);

bindClick(
  logoutBtn,
  async () => {
    try {
      await api("/api/platform/auth/logout", { method: "POST" });
    } catch {
      // no-op
    } finally {
      window.location.href = "/portal";
    }
  },
  "logoutBtn"
);

bootstrap();
