import { usePersistentState } from "./usePersistentState";
import { tenantKey } from "../services/tenantStorage";

function getInitialValue(key, companyId, fallback, legacyCompanyId) {
  try {
    const scopedValue = localStorage.getItem(tenantKey(key, companyId));
    if (scopedValue) return JSON.parse(scopedValue);

    const legacyValue = companyId === legacyCompanyId ? localStorage.getItem(key) : null;
    return legacyValue ? JSON.parse(legacyValue) : fallback;
  } catch {
    return fallback;
  }
}

export function useTenantPersistentState(key, companyId, fallback, legacyCompanyId) {
  return usePersistentState(
    tenantKey(key, companyId),
    getInitialValue(key, companyId, fallback, legacyCompanyId)
  );
}
