import type { APIRoute } from "astro";
import { uploadImage } from "../../utils/imagekit";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized: Please log in to upload images." }), { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return new Response(JSON.stringify({ error: "No file provided" }), {
                status: 400,
            });
        }

        // Use the username passed directly from the frontend (from localStorage user object)
        // This avoids an extra round-trip to the backend just for the folder name.
        const rawEmail = formData.get("email") as string | null;
        const emailPrefix = rawEmail?.split('@')[0]?.trim() || 'shared';

        // Callers may pin a stable name (note thumbnails re-upload to the same path
        // instead of leaving a trail of orphans). Strip anything that could escape
        // the caller's folder.
        const requestedName = (formData.get("fileName") as string | null)?.trim();
        const safeName = requestedName
            ? requestedName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^[.-]+/, '').slice(0, 120)
            : '';
        const overwrite = formData.get("overwrite") === "true" && Boolean(safeName);
        const folder = formData.get("folder") === "note-thumbnails"
            ? `/users/${emailPrefix}/note-thumbnails/`
            : `/users/${emailPrefix}/`;

        const result = await uploadImage(file, {
            folder,
            ...(safeName && { fileName: safeName }),
            ...(overwrite && { overwrite: true }),
        });

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error: any) {
        console.error("Image upload failed:", error);
        return new Response(JSON.stringify({ error: "Image upload failed" }), {
            status: 500,
        });
    }
};
