import {
    EbookProgressConflictError,
    completeUpload,
    deleteRemoteBook,
    downloadRemoteBook,
    hasReaderAccount,
    listRemoteBooks,
    requestUploadUrl,
    syncRemoteProgress,
    uploadToS3,
    READER_CONTENT_TYPES,
    type RemoteEbook,
    type RemoteReadingProgress,
} from './ebookApi';

// IndexedDB remains the local cache. Django owns cloud metadata and reading
// progress; S3 owns EPUB bytes. Cached files avoid repeat downloads.
export interface BookMeta {
    id: string;
    title: string;
    author: string;
    cover: string | null;
    contentType: string;
    addedAt: number;
    updatedAt: number;
    location: string | null;
    chapterHref: string;
    chapterTitle: string;
    progress: number;
    progressUpdatedAt: number | null;
    progressVersion: number;
    storage: 'local' | 'cloud';
    uploadStatus: 'pending' | 'ready' | 'failed';
}

const DB_NAME = 'takovibe-ebooks';
const DB_VERSION = 1;
const META_STORE = 'meta';
const FILE_STORE = 'files';
const PROGRESS_SYNC_DELAY = 1200;

let dbPromise: Promise<IDBDatabase> | null = null;
const progressTimers = new Map<string, number>();
const pendingProgress = new Map<string, Pick<BookMeta, 'location' | 'chapterHref' | 'chapterTitle' | 'progress'>>();
const syncingProgress = new Set<string>();

function normalizeProgress(progress: number): number {
    return Math.min(1, Math.max(0, Math.round(progress * 10000) / 10000));
}

export function isPdfContentType(contentType: string | null | undefined): boolean {
    return contentType === READER_CONTENT_TYPES.pdf;
}

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE, { keyPath: 'id' });
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

function normalizeMeta(meta: Partial<BookMeta> & Pick<BookMeta, 'id' | 'title'>): BookMeta {
    return {
        id: meta.id,
        title: meta.title,
        author: meta.author || 'Unknown author',
        cover: meta.cover || null,
        contentType: meta.contentType || READER_CONTENT_TYPES.epub,
        addedAt: meta.addedAt || Date.now(),
        updatedAt: meta.updatedAt || Date.now(),
        location: meta.location || null,
        chapterHref: meta.chapterHref || '',
        chapterTitle: meta.chapterTitle || '',
        progress: Number(meta.progress) || 0,
        progressUpdatedAt: meta.progressUpdatedAt || null,
        progressVersion: meta.progressVersion || 1,
        storage: meta.storage || 'local',
        uploadStatus: meta.uploadStatus || 'ready',
    };
}

function progressFromRemote(progress: RemoteReadingProgress | null | undefined) {
    return {
        location: progress?.epub_cfi || null,
        chapterHref: progress?.chapter_href || '',
        chapterTitle: progress?.chapter_title || '',
        progress: Number(progress?.percentage) || 0,
        progressUpdatedAt: progress?.updated_at ? Date.parse(progress.updated_at) : null,
        progressVersion: progress?.version || 1,
    };
}

function remoteToMeta(remote: RemoteEbook, cached?: BookMeta): BookMeta {
    const remoteProgress = progressFromRemote(remote.progress);
    return normalizeMeta({
        id: remote.id,
        title: remote.title,
        author: remote.author,
        cover: remote.cover_url || cached?.cover || null,
        contentType: remote.content_type || cached?.contentType || READER_CONTENT_TYPES.epub,
        addedAt: Date.parse(remote.created_at) || cached?.addedAt || Date.now(),
        updatedAt: Date.parse(remote.updated_at) || Date.now(),
        storage: 'cloud',
        uploadStatus: remote.upload_status,
        ...remoteProgress,
    });
}

async function putMeta(meta: BookMeta): Promise<void> {
    await tx(META_STORE, 'readwrite', (s) => s.put(normalizeMeta(meta)));
}

async function putFile(id: string, file: Blob): Promise<void> {
    await tx(FILE_STORE, 'readwrite', (s) => s.put(file, id));
}

async function deleteCachedBook(id: string): Promise<void> {
    await tx(META_STORE, 'readwrite', (s) => s.delete(id));
    await tx(FILE_STORE, 'readwrite', (s) => s.delete(id));
}

export async function listBooks(): Promise<BookMeta[]> {
    const all = await tx<BookMeta[]>(META_STORE, 'readonly', (s) => s.getAll());
    return all.map(normalizeMeta).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function syncLibrary(): Promise<BookMeta[]> {
    const cached = await listBooks();
    if (!hasReaderAccount()) return cached;

    let remoteBooks: RemoteEbook[];
    try {
        remoteBooks = (await listRemoteBooks()).filter((book) => book.upload_status === 'ready');
    } catch (error) {
        console.error('Failed to refresh cloud ebook library; using local cache.', error);
        return cached;
    }
    const cachedById = new Map(cached.map((book) => [book.id, book]));
    const remoteIds = new Set(remoteBooks.map((book) => book.id));

    await Promise.all(
        remoteBooks.map((remote) => putMeta(remoteToMeta(remote, cachedById.get(remote.id)))),
    );
    await Promise.all(
        cached
            .filter((book) => book.storage === 'cloud' && !remoteIds.has(book.id))
            .map((book) => deleteCachedBook(book.id)),
    );

    return listBooks();
}

export async function getBookMeta(id: string): Promise<BookMeta | undefined> {
    const meta = await tx<BookMeta | undefined>(META_STORE, 'readonly', (s) => s.get(id));
    return meta ? normalizeMeta(meta) : undefined;
}

export async function getBookFile(id: string): Promise<ArrayBuffer | undefined> {
    let blob = await tx<Blob | undefined>(FILE_STORE, 'readonly', (s) => s.get(id));
    if (!blob) {
        const meta = await getBookMeta(id);
        if (!meta || meta.storage !== 'cloud') return undefined;
        blob = await downloadRemoteBook(id);
        await putFile(id, blob);
    }
    return blob.arrayBuffer();
}

export async function uploadBook(
    meta: Omit<BookMeta, 'id' | 'storage' | 'uploadStatus' | 'progressVersion'>,
    file: File,
    onProgress?: (percentage: number) => void,
) {
    const upload = await requestUploadUrl(file);
    try {
        await uploadToS3(file, upload, onProgress);
        const remote = await completeUpload(upload.book.id, {
            title: meta.title,
            author: meta.author,
        });
        const saved = remoteToMeta(remote, {
            ...meta,
            id: remote.id,
            storage: 'cloud',
            uploadStatus: 'ready',
            progressVersion: 1,
        });
        await Promise.all([putMeta(saved), putFile(saved.id, file)]);
        return saved;
    } catch (error) {
        try {
            await deleteRemoteBook(upload.book.id);
        } catch (cleanupError) {
            console.error('Failed to remove incomplete ebook upload', cleanupError);
        }
        throw error;
    }
}

export async function deleteBook(id: string): Promise<void> {
    const meta = await getBookMeta(id);
    if (meta?.storage === 'cloud') await deleteRemoteBook(id);
    await deleteCachedBook(id);
}

export async function saveProgress(
    id: string,
    location: string,
    progress: number,
    chapterHref = '',
    chapterTitle = '',
): Promise<void> {
    const meta = await getBookMeta(id);
    if (!meta) return;
    progress = normalizeProgress(progress);
    meta.location = location;
    meta.chapterHref = chapterHref;
    meta.chapterTitle = chapterTitle;
    meta.progress = progress;
    meta.progressUpdatedAt = Date.now();
    meta.updatedAt = Date.now();
    await putMeta(meta);

    if (meta.storage !== 'cloud' || !hasReaderAccount()) return;
    pendingProgress.set(id, { location, chapterHref, chapterTitle, progress });
    const timer = progressTimers.get(id);
    if (timer) window.clearTimeout(timer);
    progressTimers.set(
        id,
        window.setTimeout(() => {
            progressTimers.delete(id);
            flushProgress(id);
        }, PROGRESS_SYNC_DELAY),
    );
}

export function flushBookProgress(id: string): void {
    const timer = progressTimers.get(id);
    if (timer) {
        window.clearTimeout(timer);
        progressTimers.delete(id);
    }
    if (pendingProgress.has(id)) flushProgress(id);
}

async function flushProgress(id: string): Promise<void> {
    if (syncingProgress.has(id)) return;
    syncingProgress.add(id);
    let conflictRetries = 0;

    try {
        while (pendingProgress.has(id)) {
            const update = pendingProgress.get(id)!;
            pendingProgress.delete(id);
            const meta = await getBookMeta(id);
            if (!meta || meta.storage !== 'cloud') return;

            try {
                const remote = await syncRemoteProgress(id, {
                    epub_cfi: update.location || '',
                    chapter_href: update.chapterHref,
                    chapter_title: update.chapterTitle,
                    percentage: update.progress,
                    version: meta.progressVersion,
                });
                await updateProgressVersion(id, remote.version);
                conflictRetries = 0;
            } catch (error) {
                if (error instanceof EbookProgressConflictError && conflictRetries < 2) {
                    await updateProgressVersion(id, error.progress.version);
                    pendingProgress.set(id, pendingProgress.get(id) || update);
                    conflictRetries += 1;
                    continue;
                }
                console.error('Failed to sync ebook progress', error);
            }
        }
    } finally {
        syncingProgress.delete(id);
        if (pendingProgress.has(id)) flushProgress(id);
    }
}

async function updateProgressVersion(id: string, version: number): Promise<void> {
    const meta = await getBookMeta(id);
    if (!meta) return;
    meta.progressVersion = version;
    await putMeta(meta);
}
