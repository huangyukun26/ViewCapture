import { api, setStatusLine } from "/Apps/myapp/portal/common.js";

const imageFilesInput = document.getElementById("imageFiles");
const csvFilesInput = document.getElementById("csvFiles");
const submitImagesBtn = document.getElementById("submitImagesBtn");
const submitCsvBtn = document.getElementById("submitCsvBtn");
const imageStatus = document.getElementById("imageStatus");
const csvStatus = document.getElementById("csvStatus");
const jobIdInput = document.getElementById("jobIdInput");
const queryJobBtn = document.getElementById("queryJobBtn");
const jobStatus = document.getElementById("jobStatus");
const jobResult = document.getElementById("jobResult");

async function ensureLogin() {
  try {
    await api("/api/platform/auth/me");
  } catch {
    window.location.href = "/portal";
  }
}

function buildCsvList(files) {
  return Array.from(files || []).filter((file) =>
    file.name.toLowerCase().endsWith(".csv")
  );
}

async function uploadSingleImage(file) {
  const form = new FormData();
  form.append("image", file);
  const response = await fetch("/api/platform/ai/upload", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `Upload failed: HTTP ${response.status}`);
  }
  return payload;
}

async function uploadSingleCsv(file) {
  const form = new FormData();
  form.append("csv", file);
  const response = await fetch("/api/platform/ai/upload_csv", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `Upload failed: HTTP ${response.status}`);
  }
  return payload;
}

submitImagesBtn.addEventListener("click", async () => {
  const files = Array.from(imageFilesInput.files || []);
  if (!files.length) {
    setStatusLine(imageStatus, "请先选择图片文件。", "error");
    return;
  }
  submitImagesBtn.disabled = true;
  try {
    const jobIds = [];
    for (const file of files) {
      const result = await uploadSingleImage(file);
      if (result.job_id) {
        jobIds.push(result.job_id);
      }
    }
    setStatusLine(
      imageStatus,
      `提交成功，共 ${files.length} 张图。Job IDs: ${jobIds.join(", ") || "N/A"}`,
      "success"
    );
    if (jobIds.length) {
      jobIdInput.value = jobIds[0];
    }
  } catch (error) {
    setStatusLine(imageStatus, `提交失败: ${error.message}`, "error");
  } finally {
    submitImagesBtn.disabled = false;
  }
});

submitCsvBtn.addEventListener("click", async () => {
  const csvFiles = buildCsvList(csvFilesInput.files);
  if (!csvFiles.length) {
    setStatusLine(csvStatus, "请先选择 CSV 文件或文件夹。", "error");
    return;
  }
  submitCsvBtn.disabled = true;
  try {
    const jobIds = [];
    for (const file of csvFiles) {
      const result = await uploadSingleCsv(file);
      if (result.job_id) {
        jobIds.push(result.job_id);
      }
    }
    setStatusLine(
      csvStatus,
      `CSV 提交成功，共 ${csvFiles.length} 个。Job IDs: ${jobIds.join(", ") || "N/A"}`,
      "success"
    );
    if (jobIds.length) {
      jobIdInput.value = jobIds[0];
    }
  } catch (error) {
    setStatusLine(csvStatus, `CSV 提交失败: ${error.message}`, "error");
  } finally {
    submitCsvBtn.disabled = false;
  }
});

queryJobBtn.addEventListener("click", async () => {
  const jobId = jobIdInput.value.trim();
  if (!jobId) {
    setStatusLine(jobStatus, "请输入 job id。", "error");
    return;
  }
  setStatusLine(jobStatus, "查询中...");
  try {
    const statusResp = await fetch(`/api/platform/ai/job/${encodeURIComponent(jobId)}/status`, {
      credentials: "include",
    });
    const statusData = await statusResp.json().catch(() => ({}));
    if (!statusResp.ok) {
      throw new Error(statusData?.message || `HTTP ${statusResp.status}`);
    }

    setStatusLine(
      jobStatus,
      `状态: ${statusData.status || "unknown"}，进度: ${statusData.progress ?? "-"}`,
      "success"
    );

    jobResult.textContent = JSON.stringify(statusData, null, 2);
  } catch (error) {
    setStatusLine(jobStatus, `查询失败: ${error.message}`, "error");
    jobResult.textContent = "";
  }
});

ensureLogin();
