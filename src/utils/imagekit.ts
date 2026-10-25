import type ImageKit from "imagekit";
import { Buffer } from "node:buffer";

// The SDK pulls in axios/follow-redirects at import time, which can fail while
// Astro loads API routes under Bun. Uploads only need ImageKit's HTTP API.
// Keep the SDK lazy for the file-management operations below.
let imagekitPromise: Promise<ImageKit> | undefined;
const getImageKit = () => imagekitPromise ??= import('imagekit').then(({ default: ImageKit }) => new ImageKit({
    publicKey: import.meta.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: import.meta.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: import.meta.env.IMAGEKIT_URL_ENDPOINT,
}));

type UploadOptions = {
    folder?: string;
    isPrivateFile?: boolean;
    fileName?: string;
    overwrite?: boolean;
};

export const makeImageKitUploadRequest = (file: File, options: UploadOptions, privateKey: string): Request => {
    if (!privateKey) throw new Error('ImageKit private key is not configured.');
    const fileName = options.fileName || file.name;
    const body = new FormData();
    body.append('file', file, fileName);
    body.append('fileName', fileName);
    body.append('useUniqueFileName', String(!options.overwrite));
    if (options.overwrite) body.append('overwriteFile', 'true');
    if (options.folder) body.append('folder', options.folder);
    if (options.isPrivateFile !== undefined) body.append('isPrivateFile', String(options.isPrivateFile));

    return new Request('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}` },
        body,
    });
};

export const uploadImage = async (
    file: File,
    options: UploadOptions = {},
) => {
    const response = await fetch(makeImageKitUploadRequest(file, options, import.meta.env.IMAGEKIT_PRIVATE_KEY));
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.message || `ImageKit upload failed (${response.status}).`);
    if (!result?.url) throw new Error('ImageKit upload did not return a URL.');
    return result;
};

export const imagekitUrlEndpoint = () => import.meta.env.IMAGEKIT_URL_ENDPOINT || '';

const LIST_PAGE_SIZE = 1000;
const MAX_FILES_SCANNED_PER_FOLDER = 5000;

/**
 * Resolves storage paths to ImageKit's own file ids, which deletion requires.
 *
 * Paths are grouped by folder and each folder is listed once: a note holding a
 * 200-page PDF would otherwise mean 200 round trips. We deliberately resolve
 * from the path rather than trusting a client-supplied id — the path is what the
 * caller's ownership is checked against.
 */
export const resolveFileIdsByPath = async (
    storagePaths: string[],
): Promise<Map<string, string>> => {
    const imagekit = await getImageKit();
    const wantedByFolder = new Map<string, Set<string>>();
    for (const path of storagePaths) {
        const index = path.lastIndexOf('/');
        const folder = path.slice(0, index) || '/';
        const name = path.slice(index + 1);
        if (!name) continue;
        if (!wantedByFolder.has(folder)) wantedByFolder.set(folder, new Set());
        wantedByFolder.get(folder)!.add(name);
    }

    const resolved = new Map<string, string>();

    for (const [folder, names] of wantedByFolder) {
        // A single name is cheaper to ask for directly than to page through.
        if (names.size === 1) {
            const [name] = names;
            const results: any = await imagekit.listFiles({ path: folder, name, limit: 1 });
            const match = results?.[0];
            if (match?.fileId) resolved.set(`${folder}/${name}`, match.fileId);
            continue;
        }

        let skip = 0;
        while (skip < MAX_FILES_SCANNED_PER_FOLDER && resolved.size < storagePaths.length) {
            const page: any = await imagekit.listFiles({ path: folder, limit: LIST_PAGE_SIZE, skip });
            const entries: any[] = Array.isArray(page) ? page : [];
            for (const entry of entries) {
                if (entry?.fileId && names.has(entry.name)) {
                    resolved.set(`${folder}/${entry.name}`, entry.fileId);
                }
            }
            if (entries.length < LIST_PAGE_SIZE) break;
            skip += LIST_PAGE_SIZE;
        }
    }

    return resolved;
};

/** Deletes files by ImageKit file id, in the 100-per-call batches the API allows. */
export const deleteFilesByIds = async (fileIds: string[]): Promise<number> => {
    const imagekit = await getImageKit();
    let deleted = 0;
    for (let start = 0; start < fileIds.length; start += 100) {
        const batch = fileIds.slice(start, start + 100);
        try {
            await imagekit.bulkDeleteFiles(batch);
            deleted += batch.length;
        } catch (error: any) {
            // A file that is already gone should not fail the rest of the sweep.
            if (error?.help || error?.message) {
                console.error('ImageKit bulk delete failed:', error.message || error);
            }
            for (const fileId of batch) {
                try {
                    await imagekit.deleteFile(fileId);
                    deleted += 1;
                } catch {
                    // Already deleted, or never existed.
                }
            }
        }
    }
    return deleted;
};
