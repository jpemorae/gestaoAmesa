import { apiFetch, isApiConfigured } from "./api";

export function canUseAppDataApi() {
  return isApiConfigured();
}

export async function loadAppData() {
  if (!canUseAppDataApi()) return null;
  return apiFetch("/app-data");
}

export async function loginAppUser(credentials) {
  if (!canUseAppDataApi()) return null;
  return apiFetch("/app-data/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
}

export async function saveAppClient(payload) {
  if (!canUseAppDataApi()) return null;
  const method = payload.id ? "PUT" : "POST";
  const path = payload.id ? `/app-data/clients/${payload.id}` : "/app-data/clients";
  return apiFetch(path, {
    method,
    body: JSON.stringify(payload)
  });
}

export async function removeAppClient(id) {
  if (!canUseAppDataApi()) return null;
  return apiFetch(`/app-data/clients/${id}`, { method: "DELETE" });
}

export async function saveAppUser(payload) {
  if (!canUseAppDataApi()) return null;
  const method = payload.id ? "PUT" : "POST";
  const path = payload.id ? `/app-data/users/${payload.id}` : "/app-data/users";
  return apiFetch(path, {
    method,
    body: JSON.stringify(payload)
  });
}

export async function removeAppUser(id) {
  if (!canUseAppDataApi()) return null;
  return apiFetch(`/app-data/users/${id}`, { method: "DELETE" });
}
