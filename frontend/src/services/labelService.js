import { apiFetch } from "./api";

export const labelService = {
  list: () => apiFetch("/labels"),
  create: (payload) => apiFetch("/labels", { method: "POST", body: JSON.stringify(payload) }),
  consume: (code, payload) => apiFetch(`/labels/${code}/consume`, { method: "POST", body: JSON.stringify(payload) }),
  discard: (code, payload) => apiFetch(`/labels/${code}/discard`, { method: "POST", body: JSON.stringify(payload) })
};
