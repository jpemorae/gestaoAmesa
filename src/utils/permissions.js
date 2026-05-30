export function getCurrentClientForUser(user, clients) {
  if (user?.userType === "client") {
    return clients.find((client) => client.id === user.companyId) || null;
  }

  return clients[0] || null;
}

export function isOperationalUser(user) {
  return user?.userType === "client" && isProfile(user, ["Operação", "OperaÃ§Ã£o"]);
}

export function isClientAdminOrManager(user) {
  return user?.userType === "client" && ["Administrador", "Gestor"].includes(user?.profile);
}

export function getUserOperationalArea(user) {
  return user?.sector || user?.area || "";
}

export function getVisibleModules(user, company, modules) {
  const contractedModules = company?.enabledModules || modules.map((module) => module.id);

  if (user?.userType === "platform") {
    return modules.filter((module) => contractedModules.includes(module.id));
  }

  if (user?.userType === "client" && user?.profile !== "Administrador") {
    const userModules = user.allowedModules || ["checklist"];
    return modules.filter((module) => contractedModules.includes(module.id) && userModules.includes(module.id));
  }

  return modules.filter((module) => contractedModules.includes(module.id));
}

function isProfile(user, profiles) {
  return profiles.includes(user?.profile);
}

export function canViewModule(user, company, moduleId) {
  if (user?.userType === "platform") return true;
  if (!company?.enabledModules?.includes(moduleId)) return false;
  if (user?.profile === "Administrador") return true;
  return Boolean((user?.allowedModules || ["checklist"]).includes(moduleId));
}

export function canCreate(user) {
  return user?.userType === "platform" || ["Administrador", "Gestor"].includes(user?.profile);
}

export function canEdit(user) {
  return canCreate(user);
}

export function canDelete(user) {
  return user?.userType === "platform" || user?.profile === "Administrador";
}

export function getVisibleActivities(user, activities) {
  if (!isOperationalUser(user)) return activities;
  const userArea = getUserOperationalArea(user);
  return activities.filter((activity) => !userArea || activity.area === userArea);
}
