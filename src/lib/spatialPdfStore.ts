const DATABASE_NAME = 'takovibe-spatial-workspace';
const STORE_NAME = 'pdf-files';
const DATABASE_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not open PDF storage'));
    });
}

export async function saveSpatialPdf(id: string, file: File): Promise<void> {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(file, id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('Could not save PDF'));
    });
    database.close();
}

export async function getSpatialPdf(id: string): Promise<Blob | null> {
    const database = await openDatabase();
    const result = await new Promise<Blob | null>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(id);
        request.onsuccess = () => resolve((request.result as Blob | undefined) || null);
        request.onerror = () => reject(request.error || new Error('Could not load PDF'));
    });
    database.close();
    return result;
}
