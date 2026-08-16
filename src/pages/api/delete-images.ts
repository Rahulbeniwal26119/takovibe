import type { APIRoute } from "astro";
import { deleteFilesByIds, imagekitUrlEndpoint, resolveFileIdsByPath } from "../../utils/imagekit";
import { extractImageKitPath, isWithinFolder } from "../../lib/imagekitFiles";

export const prerender = false;

const MAX_FILES_PER_REQUEST = 200;

/**
 * Removes canvas images that no note references any more.
 *
 * Deleting is far more dangerous than uploading, so unlike the upload route this
 * one does not settle for "an Authorization header exists": it resolves the token
 * to a real user and refuses to touch anything outside that user's own folder.
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const urls: string[] = Array.isArray(body?.urls) ? body.urls.filter((url: any) => typeof url === 'string') : [];
        if (urls.length === 0) {
            return new Response(JSON.stringify({ deleted: 0, skipped: [] }), { status: 200 });
        }
        if (urls.length > MAX_FILES_PER_REQUEST) {
            return new Response(
                JSON.stringify({ error: `At most ${MAX_FILES_PER_REQUEST} files can be deleted per request.` }),
                { status: 400 },
            );
        }

        // Resolve the caller. This is the authorization boundary — the folder we
        // derive from it is the only place this request may delete from.
        const userResponse = await fetch(
            `${import.meta.env.PUBLIC_API_URL || ''}/api/user/me/`,
            { headers: { Authorization: authHeader } },
        );
        if (!userResponse.ok) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const userBody = await userResponse.json();
        const email: string = userBody?.data?.email || userBody?.email || '';
        const emailPrefix = email.split('@')[0]?.trim();
        if (!emailPrefix) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const ownedFolder = `/users/${emailPrefix}`;
        const endpoint = imagekitUrlEndpoint();

        const skipped: string[] = [];
        const pathsByUrl = new Map<string, string>();

        for (const url of urls) {
            const storagePath = extractImageKitPath(url, endpoint);
            // Anything we cannot attribute to this user's folder is left alone.
            if (!storagePath || !isWithinFolder(storagePath, ownedFolder)) {
                skipped.push(url);
                continue;
            }
            pathsByUrl.set(url, storagePath);
        }

        let deleted = 0;
        if (pathsByUrl.size > 0) {
            const resolved = await resolveFileIdsByPath([...new Set(pathsByUrl.values())]);
            const fileIds: string[] = [];

            for (const [url, storagePath] of pathsByUrl) {
                const fileId = resolved.get(storagePath);
                if (fileId) fileIds.push(fileId);
                else skipped.push(url); // Already gone from storage.
            }

            if (fileIds.length > 0) {
                deleted = await deleteFilesByIds([...new Set(fileIds)]);
            }
        }

        return new Response(JSON.stringify({ deleted, skipped }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Image delete failed:", error);
        return new Response(JSON.stringify({ error: "Image delete failed" }), { status: 500 });
    }
};
