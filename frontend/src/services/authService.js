import { apiFetch, setToken, clearToken } from "./api";

export async function login(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  setToken(data.session.access_token);
  localStorage.setItem("gestao_profile", JSON.stringify(data.profile));
  return data;
}

export async function me() {
  return apiFetch("/auth/me");
}

export function logout() {
  clearToken();
  localStorage.removeItem("gestao_profile");
}
