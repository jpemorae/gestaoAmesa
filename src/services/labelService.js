import { createLocalService, writeCollection } from "./localStore";
import { tenantKey } from "./tenantStorage";

const labels = (companyId) => createLocalService(tenantKey("gestao_mesa_labels", companyId));

export function listLabels(companyId) {
  return labels(companyId).list();
}

export function createLabel(companyId, payload) {
  return labels(companyId).create(payload);
}

export function consumeLabel(companyId, code, payload = {}) {
  return updateLabelStatus(companyId, code, "Consumido", payload);
}

export function discardLabel(companyId, code, payload = {}) {
  return updateLabelStatus(companyId, code, "Descartado", payload);
}

function updateLabelStatus(companyId, code, status, payload) {
  const rows = labels(companyId).list();
  const nextRows = rows.map((label) =>
    label.code === code
      ? {
          ...label,
          ...payload,
          status,
          closedAt: new Date().toISOString()
        }
      : label
  );

  writeCollection(tenantKey("gestao_mesa_labels", companyId), nextRows);
  return nextRows.find((label) => label.code === code) || null;
}
