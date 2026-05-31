const OPERATION_PROFILES = ["Operação", "Operacao", "Operador", "OperaÃ§Ã£o"];
const CLIENT_ADMIN_PROFILES = ["Administrador"];
const CLIENT_MANAGER_PROFILES = ["Gestor", "Gerente", "Supervisor"];

export function getCurrentClientForUser(user, clients) {
  if (user?.userType === "client") {
    return clients.find((client) => client.id === user.companyId) || null;
  }

  return clients[0] || null;
}

export function isOperationalUser(user) {
  return user?.userType === "client" && OPERATION_PROFILES.includes(user?.profile);
}

export function isClientAdminOrManager(user) {
  return (
    user?.userType === "client" &&
    [...CLIENT_ADMIN_PROFILES, ...CLIENT_MANAGER_PROFILES].includes(user?.profile)
  );
}

export function getUserOperationalArea(user) {
  return user?.sector || user?.area || "";
}

export function getVisibleModules(user, company, modules) {
  const contractedModules = company?.enabledModules || modules.map((module) => module.id);

  if (user?.userType === "platform") {
    return modules.filter((module) => contractedModules.includes(module.id));
  }

  if (user?.userType === "client" && !CLIENT_ADMIN_PROFILES.includes(user?.profile)) {
    const userModules = user.allowedModules || ["checklist"];
    return modules.filter((module) => contractedModules.includes(module.id) && userModules.includes(module.id));
  }

  return modules.filter((module) => contractedModules.includes(module.id));
}

export function canViewModule(user, company, moduleId) {
  if (user?.userType === "platform") return true;
  if (!company?.enabledModules?.includes(moduleId)) return false;
  if (CLIENT_ADMIN_PROFILES.includes(user?.profile)) return true;
  return Boolean((user?.allowedModules || ["checklist"]).includes(moduleId));
}

export function canCreate(user) {
  return (
    user?.userType === "platform" ||
    [...CLIENT_ADMIN_PROFILES, ...CLIENT_MANAGER_PROFILES].includes(user?.profile)
  );
}

export function canEdit(user) {
  return canCreate(user);
}

export function canDelete(user) {
  return user?.userType === "platform" || CLIENT_ADMIN_PROFILES.includes(user?.profile);
}

export function getVisibleActivities(user, activities) {
  if (!isOperationalUser(user)) return activities;
  const userArea = getUserOperationalArea(user);
  return activities.filter((activity) => !userArea || activity.area === userArea);
}
