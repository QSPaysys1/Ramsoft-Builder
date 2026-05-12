import type { EinvoiceGenerateRequest } from '@ramsoft-builder/einvoice/models/nic';

const DB_NAME = 'ramsoft-einvoice-enterprise';
const STORE = 'outbox';
const DB_VERSION = 1;

export interface OutboxEntry {
  id: string;
  createdAt: number;
  mode: 'irn' | 'irn-ewb';
  request: EinvoiceGenerateRequest;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function outboxEnqueue(entry: OutboxEntry): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(entry);
  });
  db.close();
}

export async function outboxList(): Promise<OutboxEntry[]> {
  const db = await openDb();
  const rows = await new Promise<OutboxEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const q = tx.objectStore(STORE).getAll();
    q.onerror = () => reject(q.error);
    q.onsuccess = () => resolve((q.result as OutboxEntry[]) ?? []);
  });
  db.close();
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function outboxRemove(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
  db.close();
}

export function outboxDocKey(req: EinvoiceGenerateRequest): string {
  const no = req.DocDtls?.No ?? '';
  const dt = req.DocDtls?.Dt ?? '';
  return `${no}|${dt}`;
}
