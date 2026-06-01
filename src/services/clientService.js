import { initialClients } from "../data/mockData";
import { createLocalService } from "./localStore";

const clients = createLocalService("gestao_mesa_clients", initialClients);

export function listClients() {
  return clients.list();
}

export function createClient(payload) {
  return clients.create(payload);
}

export function updateClient(id, payload) {
  return clients.update(id, payload);
}

export function deactivateClient(id) {
  return clients.update(id, { status: "Inativo" });
}

export function deleteClient(id) {
  return clients.remove(id);
}
