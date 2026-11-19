(() => {
  const DB_NAME = "pdfexel";
  const STORE = "results";
  const KEY = "last";

  const openDb = () =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("idb_open_fail"));
    });

  const saveResult = async ({ filename, bytes }) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("idb_write_fail"));
      tx.objectStore(STORE).put(
        {
          filename: filename || "result.xlsx",
          bytes,
          savedAt: Date.now(),
        },
        KEY,
      );
    });
  };

  const loadResult = async () => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("idb_read_fail"));
    });
  };

  window.pdfexelResultStore = { saveResult, loadResult };
})();
