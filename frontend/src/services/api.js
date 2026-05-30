const API_URL = import.meta.env.VITE_API_URL;

export function getToken() {
  return localStorage.getItem("gestao_token");
}

export function setToken(token) {
  localStorage.setItem("gestao_token", token);
}

export function clearToken() {
  localStorage.removeItem("gestao_token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) throw new Error(data?.error || "Erro na requisição.");
  return data;
}
