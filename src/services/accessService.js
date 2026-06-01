import { createLocalService } from "./localStore";
import { tenantKey } from "./tenantStorage";

const users = (companyId) => createLocalService(tenantKey("gestao_mesa_company_users", companyId));
const departments = (companyId) => createLocalService(tenantKey("gestao_mesa_departments", companyId));

export function listUsers(companyId) {
  return users(companyId).list();
}

export function createUser(companyId, payload) {
  return users(companyId).create(payload);
}

export function updateUser(companyId, id, payload) {
  return users(companyId).update(id, payload);
}

export function deactivateUser(companyId, id) {
  return users(companyId).update(id, { status: "Inativo" });
}

export function listDepartments(companyId) {
  return departments(companyId).list();
}

export function createDepartment(companyId, payload) {
  return departments(companyId).create(payload);
}
