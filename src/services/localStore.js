export function readCollection(key, fallback = []) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function writeCollection(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
  return rows;
}

export function createLocalService(key, fallback = []) {
  return {
    list() {
      return readCollection(key, fallback);
    },
    create(payload) {
      const rows = readCollection(key, fallback);
      const row = {
        id: crypto.randomUUID(),
        ...payload,
        createdAt: payload.createdAt || new Date().toISOString()
      };

      writeCollection(key, [row, ...rows]);
      return row;
    },
    update(id, payload) {
      const rows = readCollection(key, fallback);
      const nextRows = rows.map((row) => (row.id === id ? { ...row, ...payload } : row));
      writeCollection(key, nextRows);
      return nextRows.find((row) => row.id === id) || null;
    },
    remove(id) {
      const rows = readCollection(key, fallback);
      writeCollection(key, rows.filter((row) => row.id !== id));
      return true;
    }
  };
}
