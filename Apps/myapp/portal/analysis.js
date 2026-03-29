import { api, setStatusLine } from "/Apps/myapp/portal/common.js";

const aiBaseUrlText = document.getElementById("aiBaseUrlText");
const refreshHealthBtn = document.getElementById("refreshHealthBtn");
const healthStatus = document.getElementById("healthStatus");

const imageFilesInput = document.getElementById("imageFiles");
const csvFilesInput = document.getElementById("csvFiles");
const submitImagesBtn = document.getElementById("submitImagesBtn");
const submitCsvBtn = document.getElementById("submitCsvBtn");
const imageStatus = document.getElementById("imageStatus");
const csvStatus = document.getElementById("csvStatus");

const refreshQueueBtn = document.getElementById("refreshQueueBtn");
const pollPendingBtn = document.getElementById("pollPendingBtn");
const queueStatus = document.getElementById("queueStatus");
const queueList = document.getElementById("queueList");

const jobIdInput = document.getElementById("jobIdInput");
const queryJobBtn = document.getElementById("queryJobBtn");
const queryResultBtn = document.getElementById("queryResultBtn");
const downloadResultBtn = document.getElementById("downloadResultBtn");
const jobStatus = document.getElementById("jobStatus");
const jobResult = document.getElementById("jobResult");
const resultMetrics = document.getElementById("resultMetrics");
const resultImages = document.getElementById("resultImages");

const POLL_INTERVAL_MS = 5000;
const IMAGE_UPLOAD_CONCURRENCY = 3;
const CSV_UPLOAD_CONCURRENCY = 2;

let currentUser = null;
let defaultProjectId = "";
let aiBaseUrl = "";
let jobQueue = [];
let pollTimer = null;
let polling = false;
let lastResultPayload = null;

function queueStorageKey() {
  return `cvl_analysis_queue_${currentUser?.id || "guest"}`;
}

function saveQueueToLocalStorage() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(queueStorageKey(), JSON.stringify(jobQueue));
}

function loadQueueFromLocalStorage() {
  if (!currentUser) {
    return;
  }
  try {
    const raw = localStorage.getItem(queueStorageKey());
    if (!raw) {
      jobQueue = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      jobQueue = parsed;
    } else {
      jobQueue = [];
    }
  } catch {
    jobQueue = [];
  }
}

function renderQueue() {
  if (!jobQueue.length) {
    queueList.innerHTML = `<div class="item">暂无任务。</div>`;
    return;
  }

  queueList.innerHTML = jobQueue
    .slice()
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .map((item) => {
      return `<div class="item" data-ai-job-id="${item.aiJobId}">
        <strong>${item.aiJobId} [${item.status}]</strong>
        <div style="color:#586f86;">
          source: ${item.sourceType}/${item.sourceName} | progress: ${item.progress ?? "-"}%
        </div>
        <div style="color:#72859a;">updated: ${new Date(item.updatedAt).toLocaleString()}</div>
        <div style="margin-top:6px; display:flex; gap:8px;">
          <button class="btn secondary" data-action="inspect">查看</button>
          <button class="btn secondary" data-action="remove">移除</button>
        </div>
      </div>`;
    })
    .join("");
}

function updateQueueItem(aiJobId, patch) {
  const index = jobQueue.findIndex((item) => item.aiJobId === aiJobId);
  if (index === -1) {
    return;
  }
  jobQueue[index] = {
    ...jobQueue[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

function upsertQueueItem(item) {
  const index = jobQueue.findIndex((x) => x.aiJobId === item.aiJobId);
  if (index >= 0) {
    jobQueue[index] = {
      ...jobQueue[index],
      ...item,
      updatedAt: new Date().toISOString(),
    };
  } else {
    jobQueue.push({
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

function removeQueueItem(aiJobId) {
  jobQueue = jobQueue.filter((item) => item.aiJobId !== aiJobId);
}

function normalizeBackendStatus(rawStatus) {
  const status = String(rawStatus || "").toLowerCase();
  if (status.includes("complete") || status === "done" || status === "success") {
    return "completed";
  }
  if (status.includes("fail") || status.includes("error")) {
    return "failed";
  }
  if (status.includes("cancel")) {
    return "canceled";
  }
  if (status.includes("run") || status.includes("process") || status.includes("queue")) {
    return "running";
  }
  return status || "unknown";
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) {
        return;
      }
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function aiFetch(path, options = {}) {
  const response = await fetch(`/api/platform/ai${path}`, {
    credentials: "include",
    ...options,
  });

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  let body = null;
  if (contentType.includes("application/json")) {
    body = await response.json().catch(() => ({}));
  } else {
    body = await response.text().catch(() => "");
  }

  if (!response.ok) {
    const message =
      (body && typeof body === "object" && body.message) ||
      `HTTP ${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return { response, body, contentType };
}

async function fetchAiHealth() {
  const { body } = await aiFetch("/health", { method: "GET" });
  return body;
}

async function fetchAiJobStatus(aiJobId) {
  const { body } = await aiFetch(`/job/${encodeURIComponent(aiJobId)}/status`, {
    method: "GET",
  });
  return body;
}

async function fetchAiAnalysis(aiJobId) {
  const { body } = await aiFetch(`/job/${encodeURIComponent(aiJobId)}/analysis`, {
    method: "GET",
  });
  return body;
}

async function fetchAiImage(aiJobId) {
  const response = await fetch(`/api/platform/ai/job/${encodeURIComponent(aiJobId)}`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Get image failed: HTTP ${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

async function ensureLoginAndDefaults() {
  const me = await api("/api/platform/auth/me");
  currentUser = me.user;
  const meta = await api("/api/platform/meta");
  aiBaseUrl = meta.aiBaseUrl || "";
  aiBaseUrlText.textContent = aiBaseUrl || "-";

  const projectsData = await api("/api/platform/projects");
  const projects = projectsData.projects || [];
  if (projects.length) {
    defaultProjectId = projects[0].id;
    return;
  }

  const created = await api("/api/platform/projects", {
    method: "POST",
    body: JSON.stringify({
      name: "semantic-analysis-default",
      description: "Auto-created by semantic analysis module",
    }),
  });
  defaultProjectId = created.project.id;
}

async function createPlatformJob(type, payload) {
  const result = await api("/api/platform/jobs", {
    method: "POST",
    body: JSON.stringify({
      projectId: defaultProjectId,
      type,
      payload,
    }),
  });
  return result.job;
}

async function updatePlatformJobStatus(jobId, status, message = "") {
  await api(`/api/platform/jobs/${jobId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      message,
    }),
  });
}

async function uploadImageFile(file) {
  const form = new FormData();
  form.append("image", file);
  const { body } = await aiFetch("/upload", {
    method: "POST",
    body: form,
  });
  return body;
}

async function uploadCsvFile(file) {
  const form = new FormData();
  form.append("csv", file);
  const { body } = await aiFetch("/upload_csv", {
    method: "POST",
    body: form,
  });
  return body;
}

function renderMetricsFromAnalysis(analysisPayload) {
  const data = analysisPayload?.analysis_results || analysisPayload?.data?.analysis_results || analysisPayload;
  const candidates = [
    ["Sky", data?.sky_percentage ?? data?.sky],
    ["Greenery", data?.greenery_percentage ?? data?.greenery],
    ["Building", data?.building_percentage ?? data?.building],
    ["Road", data?.road_percentage ?? data?.road],
    ["Water", data?.water_percentage ?? data?.water],
  ].filter((item) => typeof item[1] !== "undefined" && item[1] !== null);

  if (!candidates.length) {
    resultMetrics.style.display = "none";
    resultMetrics.innerHTML = "";
    return;
  }

  resultMetrics.style.display = "block";
  resultMetrics.innerHTML = candidates
    .map(([name, value]) => {
      const numeric = Number(value);
      let text = String(value);
      if (Number.isFinite(numeric)) {
        text = numeric <= 1 ? `${(numeric * 100).toFixed(2)}%` : `${numeric.toFixed(2)}%`;
      }
      return `<div style="display:flex; justify-content:space-between; border-bottom:1px dashed #d4e0ed; padding:6px 0;">
        <strong>${name}</strong><span>${text}</span>
      </div>`;
    })
    .join("");
}

function renderResultImages(imageUrls) {
  if (!imageUrls.length) {
    resultImages.style.display = "none";
    resultImages.innerHTML = "";
    return;
  }
  resultImages.style.display = "grid";
  resultImages.innerHTML = imageUrls
    .map((item) => {
      return `<div style="border:1px solid #d4e0ed; border-radius:10px; padding:8px;">
        <div style="font-size:12px; color:#627487; margin-bottom:6px;">${item.label}</div>
        <img src="${item.url}" alt="${item.label}" style="width:100%; border-radius:6px;" />
      </div>`;
    })
    .join("");
}

function setLastResultPayload(payload) {
  lastResultPayload = payload;
  downloadResultBtn.disabled = !payload;
}

async function submitBatch(sourceType, files, uploader, statusElement) {
  const validFiles = Array.from(files || []);
  if (!validFiles.length) {
    setStatusLine(statusElement, "请先选择文件。", "error");
    return;
  }

  const platformJob = await createPlatformJob(`analysis_${sourceType}`, {
    sourceType,
    fileCount: validFiles.length,
    files: validFiles.map((file) => file.name),
    aiJobIds: [],
  });

  const concurrency = sourceType === "image" ? IMAGE_UPLOAD_CONCURRENCY : CSV_UPLOAD_CONCURRENCY;
  setStatusLine(statusElement, `提交中: 0/${validFiles.length} ...`);
  let completedUploadCount = 0;

  const results = await mapWithConcurrency(validFiles, concurrency, async (file) => {
    const result = await uploader(file);
    completedUploadCount += 1;
    setStatusLine(statusElement, `提交中: ${completedUploadCount}/${validFiles.length} ...`);
    return {
      fileName: file.name,
      aiJobId: result?.job_id || "",
      raw: result,
    };
  });

  const aiJobIds = results.map((item) => item.aiJobId).filter(Boolean);
  await updatePlatformJobStatus(
    platformJob.id,
    "running",
    `submitted ${aiJobIds.length} AI job(s)`
  );

  for (const item of results) {
    if (!item.aiJobId) {
      continue;
    }
    upsertQueueItem({
      platformJobId: platformJob.id,
      aiJobId: item.aiJobId,
      sourceType,
      sourceName: item.fileName,
      status: "queued",
      progress: 0,
      message: "submitted",
    });
  }
  saveQueueToLocalStorage();
  renderQueue();

  setStatusLine(
    statusElement,
    `提交完成，共 ${aiJobIds.length} 个 AI 任务。`,
    "success"
  );

  if (aiJobIds.length) {
    jobIdInput.value = aiJobIds[0];
    ensurePollingStarted();
  }
}

async function pollPendingJobsOnce() {
  const pending = jobQueue.filter((item) =>
    ["queued", "running", "processing", "unknown"].includes(String(item.status || "").toLowerCase())
  );
  if (!pending.length) {
    return;
  }

  await mapWithConcurrency(pending, 6, async (item) => {
    try {
      const status = await fetchAiJobStatus(item.aiJobId);
      const normalized = normalizeBackendStatus(status.status);
      updateQueueItem(item.aiJobId, {
        status: normalized,
        progress: Number.isFinite(Number(status.progress)) ? Number(status.progress) : item.progress,
        message: status.message || "",
      });
    } catch (error) {
      updateQueueItem(item.aiJobId, {
        status: "failed",
        message: error.message,
      });
    }
  });

  saveQueueToLocalStorage();
  renderQueue();
  await syncPlatformJobStatuses();
}

async function syncPlatformJobStatuses() {
  const grouped = new Map();
  for (const item of jobQueue) {
    if (!item.platformJobId) {
      continue;
    }
    if (!grouped.has(item.platformJobId)) {
      grouped.set(item.platformJobId, []);
    }
    grouped.get(item.platformJobId).push(item);
  }

  for (const [platformJobId, items] of grouped.entries()) {
    const statuses = items.map((x) => String(x.status || "").toLowerCase());
    if (statuses.every((s) => s === "completed")) {
      await updatePlatformJobStatus(platformJobId, "completed", "all AI jobs completed");
    } else if (statuses.every((s) => s === "failed" || s === "canceled")) {
      await updatePlatformJobStatus(platformJobId, "failed", "all AI jobs failed or canceled");
    } else {
      await updatePlatformJobStatus(platformJobId, "running", "partial completion");
    }
  }
}

function ensurePollingStarted() {
  if (pollTimer) {
    return;
  }
  pollTimer = window.setInterval(() => {
    if (polling) {
      return;
    }
    polling = true;
    pollPendingJobsOnce()
      .catch((error) => setStatusLine(queueStatus, error.message, "error"))
      .finally(() => {
        polling = false;
      });
  }, POLL_INTERVAL_MS);
}

async function refreshBackendHealth() {
  setStatusLine(healthStatus, "Checking...");
  try {
    const data = await fetchAiHealth();
    setStatusLine(
      healthStatus,
      `OK: ${JSON.stringify(data).slice(0, 140)}`,
      "success"
    );
  } catch (error) {
    setStatusLine(healthStatus, `Unavailable: ${error.message}`, "error");
  }
}

async function queryJobStatus() {
  const aiJobId = jobIdInput.value.trim();
  if (!aiJobId) {
    setStatusLine(jobStatus, "请输入 AI Job ID。", "error");
    return;
  }
  setStatusLine(jobStatus, "查询中...");
  try {
    const data = await fetchAiJobStatus(aiJobId);
    jobResult.textContent = JSON.stringify(data, null, 2);
    setStatusLine(
      jobStatus,
      `状态: ${normalizeBackendStatus(data.status)} 进度: ${data.progress ?? "-"}`,
      "success"
    );
    upsertQueueItem({
      aiJobId,
      sourceType: "manual",
      sourceName: "-",
      status: normalizeBackendStatus(data.status),
      progress: data.progress ?? 0,
      message: data.message || "",
    });
    saveQueueToLocalStorage();
    renderQueue();
  } catch (error) {
    setStatusLine(jobStatus, error.message, "error");
  }
}

async function queryAnalysisResult() {
  const aiJobId = jobIdInput.value.trim();
  if (!aiJobId) {
    setStatusLine(jobStatus, "请输入 AI Job ID。", "error");
    return;
  }
  setStatusLine(jobStatus, "读取结果中...");

  const resultPayload = {
    aiJobId,
    queriedAt: new Date().toISOString(),
    analysis: null,
    images: [],
  };

  try {
    const analysis = await fetchAiAnalysis(aiJobId);
    resultPayload.analysis = analysis;
  } catch (error) {
    resultPayload.analysisError = error.message;
  }

  try {
    const imageUrl = await fetchAiImage(aiJobId);
    resultPayload.images.push({
      label: "Result Image",
      url: imageUrl,
    });
  } catch (error) {
    resultPayload.imageError = error.message;
  }

  jobResult.textContent = JSON.stringify(resultPayload, null, 2);
  renderMetricsFromAnalysis(resultPayload.analysis);
  renderResultImages(resultPayload.images);
  setLastResultPayload(resultPayload);

  if (resultPayload.analysis || resultPayload.images.length) {
    setStatusLine(jobStatus, "结果读取完成。", "success");
  } else {
    setStatusLine(jobStatus, "未读取到结果，请稍后重试。", "error");
  }
}

function downloadLastResult() {
  if (!lastResultPayload) {
    setStatusLine(jobStatus, "没有可下载的结果。", "error");
    return;
  }
  const content = JSON.stringify(lastResultPayload, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const aiJobId = lastResultPayload.aiJobId || "result";
  a.href = url;
  a.download = `${aiJobId}_analysis_result.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatusLine(jobStatus, "结果 JSON 已下载。", "success");
}

queueList.addEventListener("click", (event) => {
  const action = event.target.getAttribute("data-action");
  if (!action) {
    return;
  }
  const row = event.target.closest("[data-ai-job-id]");
  if (!row) {
    return;
  }
  const aiJobId = row.getAttribute("data-ai-job-id");
  if (!aiJobId) {
    return;
  }
  if (action === "inspect") {
    jobIdInput.value = aiJobId;
    queryJobStatus().catch((error) => setStatusLine(jobStatus, error.message, "error"));
    return;
  }
  if (action === "remove") {
    removeQueueItem(aiJobId);
    saveQueueToLocalStorage();
    renderQueue();
  }
});

submitImagesBtn.addEventListener("click", async () => {
  submitImagesBtn.disabled = true;
  try {
    await submitBatch("image", imageFilesInput.files, uploadImageFile, imageStatus);
  } catch (error) {
    setStatusLine(imageStatus, error.message, "error");
  } finally {
    submitImagesBtn.disabled = false;
  }
});

submitCsvBtn.addEventListener("click", async () => {
  const csvFiles = Array.from(csvFilesInput.files || []).filter((file) =>
    file.name.toLowerCase().endsWith(".csv")
  );
  submitCsvBtn.disabled = true;
  try {
    await submitBatch("csv", csvFiles, uploadCsvFile, csvStatus);
  } catch (error) {
    setStatusLine(csvStatus, error.message, "error");
  } finally {
    submitCsvBtn.disabled = false;
  }
});

refreshHealthBtn.addEventListener("click", () => {
  refreshBackendHealth().catch((error) => setStatusLine(healthStatus, error.message, "error"));
});

refreshQueueBtn.addEventListener("click", () => {
  loadQueueFromLocalStorage();
  renderQueue();
  setStatusLine(queueStatus, `loaded ${jobQueue.length} job(s)`);
});

pollPendingBtn.addEventListener("click", async () => {
  pollPendingBtn.disabled = true;
  try {
    await pollPendingJobsOnce();
    setStatusLine(queueStatus, "polling finished", "success");
  } catch (error) {
    setStatusLine(queueStatus, error.message, "error");
  } finally {
    pollPendingBtn.disabled = false;
  }
});

queryJobBtn.addEventListener("click", () => {
  queryJobStatus().catch((error) => setStatusLine(jobStatus, error.message, "error"));
});

queryResultBtn.addEventListener("click", () => {
  queryAnalysisResult().catch((error) => setStatusLine(jobStatus, error.message, "error"));
});

downloadResultBtn.addEventListener("click", () => {
  downloadLastResult();
});

async function bootstrap() {
  try {
    await ensureLoginAndDefaults();
  } catch {
    window.location.href = "/portal";
    return;
  }

  loadQueueFromLocalStorage();
  renderQueue();
  ensurePollingStarted();
  await refreshBackendHealth();
}

bootstrap();
