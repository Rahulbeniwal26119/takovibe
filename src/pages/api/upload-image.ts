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

        const result = await uploadImage(file, {
            folder: `/users/${emailPrefix}/`,
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
