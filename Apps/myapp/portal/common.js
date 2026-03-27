export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.success) {
    const message =
      data?.message || `Request failed: ${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data.data;
}

export function setStatusLine(element, message, type = "") {
  if (!element) {
    return;
  }
  element.textContent = message || "";
  element.classList.remove("error", "success");
  if (type) {
    element.classList.add(type);
  }
}
