import { apiFetch } from "./api";

export const checklistService = {
  listActivities: () => apiFetch("/checklist/activities"),
  createActivity: (payload) => apiFetch("/checklist/activities", { method: "POST", body: JSON.stringify(payload) }),
  listExecutions: () => apiFetch("/checklist/executions"),
  start: (activityId) => apiFetch(`/checklist/executions/${activityId}/start`, { method: "POST" }),
  pending: (executionId, pending_reason) => apiFetch(`/checklist/executions/${executionId}/pending`, { method: "POST", body: JSON.stringify({ pending_reason }) }),
  finish: (executionId, evidence_photo_url) => apiFetch(`/checklist/executions/${executionId}/finish`, { method: "POST", body: JSON.stringify({ evidence_photo_url }) })
};
