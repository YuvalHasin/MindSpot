const BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:7160";

export async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem("token");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = "/";
  }
  return res;
}
