// src/lib/db.js

const DB_NAME = 'FileFlowDB';
const STORE_NAME = 'projectState';
const DB_VERSION = 1;

// Database initialize aur open karne ke liye
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Jab pehli baar DB banega ya version upgrade hoga
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB Error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Data save karne ke liye (overwrite karega purane data ko)
export async function saveState(data) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // 'currentState' key par saara data ek object banakar save kar denge
      const request = store.put(data, 'currentState');

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Failed to save state:", error);
  }
}

// Data load karne ke liye (refresh karne par yahan se data aayega)
export async function loadState() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('currentState');

      request.onsuccess = (event) => resolve(event.target.result || null);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Failed to load state:", error);
    return null;
  }
}

// Naya project start karne par DB clean karne ke liye
export async function clearState() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('currentState');

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Failed to clear state:", error);
  }
}
