import { api, setStatusLine } from "/Apps/myapp/portal/common.js";

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginStatus = document.getElementById("loginStatus");
const loginBtn = document.getElementById("loginBtn");

async function tryAutoLogin() {
  try {
    await api("/api/platform/auth/me");
    window.location.href = "/workspace";
  } catch {
    // no-op
  }
}

async function handleLogin() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  setStatusLine(loginStatus, "");
  if (!username || !password) {
    setStatusLine(loginStatus, "请输入用户名和密码。", "error");
    return;
  }
  loginBtn.disabled = true;
  try {
    await api("/api/platform/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setStatusLine(loginStatus, "登录成功，正在进入工作台...", "success");
    window.setTimeout(() => {
      window.location.href = "/workspace";
    }, 300);
  } catch (error) {
    setStatusLine(loginStatus, error.message, "error");
  } finally {
    loginBtn.disabled = false;
  }
}

loginBtn.addEventListener("click", handleLogin);
loginPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleLogin();
  }
});

tryAutoLogin();
