import { apiFetch } from "./api";

export const stockService = {
  listProducts: () => apiFetch("/stock/products"),
  createProduct: (payload) => apiFetch("/stock/products", { method: "POST", body: JSON.stringify(payload) }),
  listLots: () => apiFetch("/stock/lots"),
  createEntry: (payload) => apiFetch("/stock/entries", { method: "POST", body: JSON.stringify(payload) })
};
