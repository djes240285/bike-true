const DB_NAME = 'biketrue';
const STORE = 'frames';

export type FrameName = 'bottom' | 'top';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveFrame(name: FrameName, blob: Blob) {
  const database = await openDb();
  const tx = database.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(blob, name);
  await done(tx);
  database.close();
}

export async function loadFrame(name: FrameName): Promise<Blob | null> {
  const database = await openDb();
  const tx = database.transaction(STORE, 'readonly');
  const request = tx.objectStore(STORE).get(name);
  const value = await new Promise<unknown>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await done(tx);
  database.close();
  return value instanceof Blob ? value : null;
}

const CLIP = 'ride';

export async function saveClip(blob: Blob) {
  const database = await openDb();
  const tx = database.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(blob, CLIP);
  await done(tx);
  database.close();
}

export async function loadClip(): Promise<Blob | null> {
  const database = await openDb();
  const tx = database.transaction(STORE, 'readonly');
  const request = tx.objectStore(STORE).get(CLIP);
  const value = await new Promise<unknown>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await done(tx);
  database.close();
  return value instanceof Blob ? value : null;
}

export async function clearFrames() {
  const database = await openDb();
  const tx = database.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  await done(tx);
  database.close();
}
