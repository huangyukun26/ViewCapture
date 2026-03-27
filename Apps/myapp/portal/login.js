import { api, setStatusLine } from "/Apps/myapp/portal/common.js";

const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const registerUsername = document.getElementById("registerUsername");
const registerPassword = document.getElementById("registerPassword");
const loginStatus = document.getElementById("loginStatus");
const registerStatus = document.getElementById("registerStatus");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

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

async function handleRegister() {
  const username = registerUsername.value.trim();
  const password = registerPassword.value;
  setStatusLine(registerStatus, "");
  if (!username || !password) {
    setStatusLine(registerStatus, "请输入用户名和密码。", "error");
    return;
  }
  registerBtn.disabled = true;
  try {
    await api("/api/platform/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setStatusLine(registerStatus, "注册成功，已自动登录。", "success");
    window.setTimeout(() => {
      window.location.href = "/workspace";
    }, 400);
  } catch (error) {
    setStatusLine(registerStatus, error.message, "error");
  } finally {
    registerBtn.disabled = false;
  }
}

loginBtn.addEventListener("click", handleLogin);
registerBtn.addEventListener("click", handleRegister);
loginPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleLogin();
  }
});
registerPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleRegister();
  }
});

tryAutoLogin();
