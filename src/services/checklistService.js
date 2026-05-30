import { createLocalService } from "./localStore";

const activities = createLocalService("gestao_mesa_checklist_activities");
const executions = createLocalService("gestao_mesa_checklist_executions");

export function listActivities() {
  return activities.list();
}

export function createActivity(payload) {
  return activities.create(payload);
}

export function startChecklist(activityId, payload = {}) {
  return executions.create({
    activityId,
    status: "Executando",
    startedAt: new Date().toISOString(),
    ...payload
  });
}

export function markPending(executionId, pendingReason) {
  return executions.update(executionId, {
    status: "Pendência",
    pendingReason,
    pausedAt: new Date().toISOString()
  });
}

export function finishChecklist(executionId, payload = {}) {
  return executions.update(executionId, {
    ...payload,
    status: "Concluído",
    finishedAt: new Date().toISOString()
  });
}
