export function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function normalizeDecimal(value) {
  if (value === undefined || value === null || value === "") return 0;
  return Number(String(value).replace(",", "."));
}

export function unitLabel(unit) {
  const labels = {
    g: "Grama",
    kg: "Kilo",
    un: "Unidade",
    ml: "Mililitro",
    L: "Litro",
    l: "Litro"
  };

  return labels[unit] || unit;
}

export function baseUnitFor(unit) {
  if (unit === "kg" || unit === "g") return "g";
  if (unit === "L" || unit === "l" || unit === "ml") return "ml";
  return unit || "un";
}

export function compatibleUnitsFor(unit) {
  const base = baseUnitFor(unit);
  if (base === "g") return ["g", "kg"];
  if (base === "ml") return ["ml", "L"];
  return ["un"];
}

export function toBaseUnit(quantity, unit) {
  const value = normalizeDecimal(quantity);

  if (unit === "kg") return { quantity: value * 1000, unit: "g" };
  if (unit === "g") return { quantity: value, unit: "g" };
  if (unit === "L" || unit === "l") return { quantity: value * 1000, unit: "ml" };
  if (unit === "ml") return { quantity: value, unit: "ml" };
  return { quantity: value, unit };
}

export function formatQuantity(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 3
  });
}

export function formatStockDisplay(value, unit) {
  const number = Number(value || 0);

  if (unit === "g" && number >= 1000) return `${formatQuantity(number / 1000)} Kilo`;
  if (unit === "ml" && number >= 1000) return `${formatQuantity(number / 1000)} Litro`;
  return `${formatQuantity(number)} ${unitLabel(unit)}`;
}
