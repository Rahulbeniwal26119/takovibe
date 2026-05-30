// IndexedDB-backed ebook library.
//
// Two object stores keep large EPUB blobs out of the metadata reads:
//   - "meta":  small per-book record (title, author, cover, progress, location)
//   - "files": the raw EPUB blob, keyed by the same id
//
// The public API is intentionally storage-agnostic so a backend-synced adapter
// can replace this later without touching the reader UI.

export interface BookMeta {
    id: string;
    title: string;
    author: string;
    cover: string | null; // data URL
    addedAt: number;
    updatedAt: number;
    location: string | null; // EPUB CFI of last read position
    progress: number; // 0..1
}

const DB_NAME = "takovibe-ebooks";
const DB_VERSION = 1;
const META_STORE = "meta";
const FILE_STORE = "files";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(FILE_STORE)) {
                db.createObjectStore(FILE_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

function tx<T>(
    store: string,
    mode: IDBTransactionMode,
    run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    return openDB().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const transaction = db.transaction(store, mode);
                const request = run(transaction.objectStore(store));
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }),
    );
}

export async function listBooks(): Promise<BookMeta[]> {
    const all = await tx<BookMeta[]>(META_STORE, "readonly", (s) => s.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getBookMeta(id: string): Promise<BookMeta | undefined> {
    return tx<BookMeta | undefined>(META_STORE, "readonly", (s) => s.get(id));
}

export async function getBookFile(id: string): Promise<ArrayBuffer | undefined> {
    const blob = await tx<Blob | undefined>(FILE_STORE, "readonly", (s) => s.get(id));
    if (!blob) return undefined;
    return blob.arrayBuffer();
}

export async function saveBook(meta: BookMeta, file: Blob): Promise<void> {
    await tx(META_STORE, "readwrite", (s) => s.put(meta));
    await tx(FILE_STORE, "readwrite", (s) => s.put(file, meta.id));
}

export async function saveProgress(
    id: string,
    location: string,
    progress: number,
): Promise<void> {
    const meta = await getBookMeta(id);
    if (!meta) return;
    meta.location = location;
    meta.progress = progress;
    meta.updatedAt = Date.now();
    await tx(META_STORE, "readwrite", (s) => s.put(meta));
}

export async function deleteBook(id: string): Promise<void> {
    await tx(META_STORE, "readwrite", (s) => s.delete(id));
    await tx(FILE_STORE, "readwrite", (s) => s.delete(id));
}
