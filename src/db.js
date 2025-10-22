const DB_NAME = 'aanalyzer';
const DB_VERSION = 1;
const STORE = 'positions';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('active', 'active', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, handler) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const request = handler(store);

    transaction.oncomplete = () => resolve(request?.result ?? null);
    transaction.onerror = () => reject(transaction.error);
  });
}

export function getAllPositions() {
  return withStore('readonly', (store) => store.getAll());
}

export function savePosition(entry) {
  return withStore('readwrite', (store) => store.put(entry));
}

export function deletePosition(id) {
  return withStore('readwrite', (store) => store.delete(id));
}

export function bulkImport(entries) {
  return withStore('readwrite', (store) => {
    entries.forEach((entry) => store.put(entry));
    return { result: entries.length };
  });
}
