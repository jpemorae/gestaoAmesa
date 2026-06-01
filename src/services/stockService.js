import { createLocalService } from "./localStore";
import { tenantKey } from "./tenantStorage";

const products = (companyId) => createLocalService(tenantKey("gestao_mesa_stock_products", companyId));
const lots = (companyId) => createLocalService(tenantKey("gestao_mesa_stock_lots", companyId));

export function listProducts(companyId) {
  return products(companyId).list();
}

export function createProduct(companyId, payload) {
  return products(companyId).create(payload);
}

export function createStockEntry(companyId, payload) {
  return lots(companyId).create({
    ...payload,
    initialQuantity: payload.initialQuantity ?? payload.quantity
  });
}

export function listStockEntries(companyId) {
  return lots(companyId).list();
}
