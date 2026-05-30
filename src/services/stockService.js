import { createLocalService } from "./localStore";

const products = createLocalService("gestao_mesa_stock_products");
const lots = createLocalService("gestao_mesa_stock_lots");

export function listProducts() {
  return products.list();
}

export function createProduct(payload) {
  return products.create(payload);
}

export function createStockEntry(payload) {
  return lots.create({
    ...payload,
    initialQuantity: payload.initialQuantity ?? payload.quantity
  });
}

export function listStockEntries() {
  return lots.list();
}
