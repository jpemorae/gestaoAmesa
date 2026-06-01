import { initialUsers, STORAGE_KEYS } from "../data/mockData";

export function getInitialPageForUser(user) {
  if (!user) return "dashboard";
  return user.userType === "client" ? "hub" : "dashboard";
}

export function authenticateUser({ email, password }, users = initialUsers, clients = []) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = users.find(
      (user) =>
        user.email.toLowerCase() === normalizedEmail &&
        user.password === password &&
        user.status === "Ativo"
    ) || null;

  if (!user || user.userType !== "client") return user;
  return clients.some((client) => client.id === user.companyId && client.status === "Ativo") ? user : null;
}

export function restoreSession() {
  const savedLoggedUser = localStorage.getItem(STORAGE_KEYS.loggedUser);
  const savedIsLogged = localStorage.getItem(STORAGE_KEYS.isLogged);
  const savedPage = localStorage.getItem(STORAGE_KEYS.page);

  if (!savedLoggedUser || savedIsLogged !== "true") {
    return { user: null, isLogged: false, page: "dashboard" };
  }

  try {
    const user = JSON.parse(savedLoggedUser);
    return {
      user,
      isLogged: true,
      page: savedPage || getInitialPageForUser(user)
    };
  } catch {
    clearStoredSession();
    return { user: null, isLogged: false, page: "dashboard" };
  }
}

export function persistSession(user, page) {
  localStorage.setItem(STORAGE_KEYS.loggedUser, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.isLogged, "true");
  localStorage.setItem(STORAGE_KEYS.page, page);
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.loggedUser);
  localStorage.removeItem(STORAGE_KEYS.isLogged);
  localStorage.removeItem(STORAGE_KEYS.page);
}
