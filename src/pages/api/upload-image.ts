import type { APIRoute } from "astro";
import { uploadImage } from "../../utils/imagekit";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return new Response(JSON.stringify({ error: "No file provided" }), {
                status: 400,
            });
        }

        const result = await uploadImage(file);

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
