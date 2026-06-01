export function tenantKey(key, companyId) {
  return `${key}:${companyId || "sem-cliente"}`;
}
