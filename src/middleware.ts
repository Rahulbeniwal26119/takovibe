import { defineMiddleware } from "astro:middleware";
import { maintenance } from "./config/maintenance";
import { resolveRetiredPath } from "./config/retired-content";

const isArchivePath = (pathname: string) =>
    [...maintenance.archivePaths, ...maintenance.publicAssetPaths].some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
    );

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
    // Retired and consolidated articles resolve before anything else, so they
    // answer the same way whether or not maintenance mode is on.
    const retired = resolveRetiredPath(url.pathname);
    if (retired) {
        if (retired.kind === "redirect") {
            return Response.redirect(
                new URL(retired.destination, request.url),
                301,
            );
        }

        return new Response(
            "This article has been retired and is no longer available.",
            {
                status: 410,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "public, max-age=86400",
                },
            },
        );
    }

    if (!maintenance.enabled || isArchivePath(url.pathname)) {
        const response = await next();
        if (maintenance.enabled) {
            response.headers.set("X-TakoVibe-Mode", "maintenance");
        }
        return response;
    }

    if (url.pathname.startsWith("/api/")) {
        return Response.json(
            {
                error: "maintenance_mode",
                message:
                    "TakoVibe's interactive services are paused while the public engineering archive remains online.",
            },
            {
                status: 503,
                headers: {
                    "Retry-After": "604800",
                    "Cache-Control": "no-store",
                    "X-TakoVibe-Mode": "maintenance",
                },
            },
        );
    }

    const maintenanceUrl = new URL("/maintenance", request.url);
    maintenanceUrl.searchParams.set("from", url.pathname);

    return Response.redirect(maintenanceUrl, 302);
});
