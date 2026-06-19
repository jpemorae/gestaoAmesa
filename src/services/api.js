const API_URL = import.meta.env.VITE_API_URL;
const API_SESSION_KEY = "gestao_mesa_api_session_token";

export function isApiConfigured() {
  return Boolean(API_URL);
}

export function getApiSessionToken() {
  return localStorage.getItem(API_SESSION_KEY);
}

export function persistApiSessionToken(token) {
  if (token) localStorage.setItem(API_SESSION_KEY, token);
}

export function clearApiSessionToken() {
  localStorage.removeItem(API_SESSION_KEY);
}

export async function apiFetch(path, options = {}) {
  if (!API_URL) {
    throw new Error("VITE_API_URL nao configurada. Usando services locais enquanto a API nao estiver ativa.");
  }

  const token = getApiSessionToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Erro na requisicao.");
  return data;
}
