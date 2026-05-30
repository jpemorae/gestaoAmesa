import { createLocalService, writeCollection } from "./localStore";

const labels = createLocalService("gestao_mesa_labels");

export function listLabels() {
  return labels.list();
}

export function createLabel(payload) {
  return labels.create(payload);
}

export function consumeLabel(code, payload = {}) {
  return updateLabelStatus(code, "Consumido", payload);
}

export function discardLabel(code, payload = {}) {
  return updateLabelStatus(code, "Descartado", payload);
}

function updateLabelStatus(code, status, payload) {
  const rows = labels.list();
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

  writeCollection("gestao_mesa_labels", nextRows);
  return nextRows.find((label) => label.code === code) || null;
}
