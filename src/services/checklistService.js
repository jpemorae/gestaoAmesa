import { createLocalService } from "./localStore";
import { tenantKey } from "./tenantStorage";

const activities = (companyId) => createLocalService(tenantKey("gestao_mesa_checklist_activities", companyId));
const executions = (companyId) => createLocalService(tenantKey("gestao_mesa_checklist_executions", companyId));

export function listActivities(companyId) {
  return activities(companyId).list();
}

export function listChecklistExecutions(companyId) {
  return executions(companyId).list();
}

export function createActivity(companyId, payload) {
  return activities(companyId).create(payload);
}

export function startChecklist(companyId, activityId, payload = {}) {
  return executions(companyId).create({
    activityId,
    status: "Executando",
    startedAt: new Date().toISOString(),
    ...payload
  });
}

export function markPending(companyId, executionId, pendingReason) {
  return executions(companyId).update(executionId, {
    status: "Pendência",
    pendingReason,
    pausedAt: new Date().toISOString()
  });
}

export function finishChecklist(companyId, executionId, payload = {}) {
  return executions(companyId).update(executionId, {
    ...payload,
    status: "Concluído",
    finishedAt: new Date().toISOString()
  });
}
