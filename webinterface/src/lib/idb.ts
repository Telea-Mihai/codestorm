const DB_NAME = "codestorm-web";
const DB_VERSION = 2;

const STORES = {
  uploads: "uploads",
  templates: "templates",
  annotations: "annotations",
  markdownDrafts: "markdownDrafts",
} as const;

export type UploadRecord = {
  hash: string;
  displayName: string;
  mimeType: string;
  size: number;
  savedAt: number;
  lastServerPath?: string;
  blob: Blob;
};

export type TemplateRecord = {
  id: string;
  name: string;
  savedAt: number;
  blob: Blob;
};

export type AnnotationRecord = {
  id: string;
  docHash: string;
  snippet: string;
  comment: string;
  color: string;
  startOffset?: number;
  endOffset?: number;
  createdAt: number;
  updatedAt: number;
};

export type MarkdownDraftRecord = {
  docHash: string;
  markdown: string;
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.uploads)) {
        db.createObjectStore(STORES.uploads, { keyPath: "hash" });
      }
      if (!db.objectStoreNames.contains(STORES.templates)) {
        db.createObjectStore(STORES.templates, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.annotations)) {
        const annotationStore = db.createObjectStore(STORES.annotations, { keyPath: "id" });
        annotationStore.createIndex("docHash", "docHash", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.markdownDrafts)) {
        const draftStore = db.createObjectStore(STORES.markdownDrafts, { keyPath: "docHash" });
        draftStore.createIndex("savedAt", "savedAt", { unique: false });
      }
    };
  });
}

function runWrite(storeName: (typeof STORES)[keyof typeof STORES], op: (s: IDBObjectStore) => void) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
        op(tx.objectStore(storeName));
      })
  );
}

export async function putUpload(record: UploadRecord): Promise<void> {
  await runWrite(STORES.uploads, (store) => {
    store.put(record);
  });
}

export async function getUpload(hash: string): Promise<UploadRecord | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.uploads, "readonly");
    const req = tx.objectStore(STORES.uploads).get(hash);
    req.onsuccess = () => resolve(req.result as UploadRecord | undefined);
    req.onerror = () => reject(req.error ?? new Error("getUpload failed"));
  });
}

export async function listUploads(): Promise<UploadRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.uploads, "readonly");
    const req = tx.objectStore(STORES.uploads).getAll();
    req.onsuccess = () => resolve((req.result as UploadRecord[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("listUploads failed"));
  });
}

export async function deleteUpload(hash: string): Promise<void> {
  await runWrite(STORES.uploads, (store) => {
    store.delete(hash);
  });
}

export async function putTemplate(record: TemplateRecord): Promise<void> {
  await runWrite(STORES.templates, (store) => {
    store.put(record);
  });
}

export async function getTemplate(id: string): Promise<TemplateRecord | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, "readonly");
    const req = tx.objectStore(STORES.templates).get(id);
    req.onsuccess = () => resolve(req.result as TemplateRecord | undefined);
    req.onerror = () => reject(req.error ?? new Error("getTemplate failed"));
  });
}

export async function listTemplates(): Promise<TemplateRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, "readonly");
    const req = tx.objectStore(STORES.templates).getAll();
    req.onsuccess = () => resolve((req.result as TemplateRecord[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("listTemplates failed"));
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await runWrite(STORES.templates, (store) => {
    store.delete(id);
  });
}

export async function putAnnotation(record: AnnotationRecord): Promise<void> {
  await runWrite(STORES.annotations, (store) => {
    store.put(record);
  });
}

export async function listAnnotations(docHash: string): Promise<AnnotationRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.annotations, "readonly");
    const index = tx.objectStore(STORES.annotations).index("docHash");
    const req = index.getAll(docHash);
    req.onsuccess = () => {
      const rows = (req.result as AnnotationRecord[]) ?? [];
      rows.sort((a, b) => a.createdAt - b.createdAt);
      resolve(rows);
    };
    req.onerror = () => reject(req.error ?? new Error("listAnnotations failed"));
  });
}

export async function deleteAnnotation(id: string): Promise<void> {
  await runWrite(STORES.annotations, (store) => {
    store.delete(id);
  });
}

export async function putMarkdownDraft(record: MarkdownDraftRecord): Promise<void> {
  await runWrite(STORES.markdownDrafts, (store) => {
    store.put(record);
  });
}

export async function getMarkdownDraft(docHash: string): Promise<MarkdownDraftRecord | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.markdownDrafts, "readonly");
    const req = tx.objectStore(STORES.markdownDrafts).get(docHash);
    req.onsuccess = () => resolve(req.result as MarkdownDraftRecord | undefined);
    req.onerror = () => reject(req.error ?? new Error("getMarkdownDraft failed"));
  });
}

export async function deleteMarkdownDraft(docHash: string): Promise<void> {
  await runWrite(STORES.markdownDrafts, (store) => {
    store.delete(docHash);
  });
}
