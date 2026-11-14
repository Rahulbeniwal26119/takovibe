# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: engineers and privacy/compliance-minded builders looking for small, honest, free-to-use web tools they can reach for in a specific moment (redact a PDF for DPDP, read an EPUB, sketch a system, hit an API). They arrive from search or a shared link because they have the exact job in hand; they are not there to "evaluate a platform."

Secondary: the author himself, Rahul Beniwal, as the author-operator who builds these tools in public and writes about how they were built.

Tertiary: readers who find the engineering writing on their own terms — the writing is a build log around the tools, not the front door.

## Product Purpose

TakoVibe is a workshop of small, practical web tools built by Rahul Beniwal, with engineering writing around each tool explaining how and why it was built. The tools are the product; the writing is the build log.

Success is: a visitor arrives for a specific tool, gets the job done without friction, and returns the next time a related need shows up — occasionally following the writing because the person behind the tools is interesting to read.

## Positioning

A single builder's public workshop of honest, free, mostly local-first web tools — each one shipped with the reasoning behind it. The combination is what no neighboring product carries: Replit has the playground, Obsidian has the notes, DocHub has the redactor, Postman has the API client; none ship them together under one author who also publishes why each one was built that way.

Explicitly not: a developer SaaS platform, a general productivity suite, or an AI-assistant demo. The AI framing is deliberately dropped.

## Operating Context

- A visitor lands directly on a tool page from search or a shared link and starts using it.
- Repeat visitors reach for the tool they already know and occasionally browse adjacent tools from the nav.
- A smaller band of readers follows the changelog and the writing around each tool.
- The author uses the dashboard / admin to write, publish, and release.
- A maintenance kill switch at `src/config/maintenance.ts` redirects interactive routes to `/maintenance` during outages; articles, series, changelog, and legal pages stay reachable.

## Capabilities and Constraints

Tools currently shipped (first-class, must be preserved):

- **Vellora**: local-first EPUB/PDF reading workspace (highlights, progress, themes, folders).
- **Sketch Notes**: spatial drawing / PDF import / thumbnails / history / links back to source.
- **Runo**: free self-hosted Postman-style API client (linked from the Tools nav).
- **ResumeVibe**: separate product at `resumevibe.takovibe.com`, cross-linked from the Tools nav.

Tools planned next (confirmed by the author):

- **DPDP-compliant PDF redactor**: a privacy-safe redaction tool for documents under the DPDP Act.
- More small, self-contained privacy/engineering tools in the same vein.

Tools that exist in code but are being reconsidered — expose them honestly, do not lead with them:

- **Tasks** (daily task manager).
- **Playground** (browser code playground for Python/JS/Go/Rust/HTML).
- **Kumi** (in-reader AI assistant) — may be removed, renamed, or quietly demoted.

Writing surfaces that remain:

- Articles, series, author profiles, search, bookmarks, newsletter.
- Public changelog of tool/product releases.
- Authoring dashboard and admin for the author.

Technical constraints:

- Astro 4 hybrid Node output with React 18, TypeScript, Tailwind.
- Backend at `backend.takovibe.com` (overridable via `PUBLIC_API_URL`).
- No open-source license declared; code is copyright of its contributors.

## Brand Commitments

- Name: **TakoVibe**. Author identity: **Rahul Beniwal**, visibly attributed and linked.
- Built in the open: tools stay free, the changelog is public, the repo is public.
- Named sub-products preserved as-is: **Vellora**, **Sketch Notes**, **Runo**, **ResumeVibe**.
- **Kumi**: naming is an open decision; current pages may show it, future ones should not depend on it.
- Honest-only positioning: no fabricated testimonials, user counts, press, or customer logos.

## Evidence on Hand

Real, usable:

- Live tool surfaces on the production site (`/vellora`, `/notes`, `/runo`, `/playground`, `/tasks`, `/tools`) — use these as the real reference for how each tool actually works and looks.
- Public article corpus at `takovibe.com/blog`, fetched live from the backend.
- Public changelog at `takovibe.com/changelog`.
- Rahul Beniwal's LinkedIn (linked from the README) and the repo's ~300+ commits / ~50,000 lines of Astro/TS/React as a credibility signal.

Explicit absences (do not invent):

- No testimonials, press mentions, customer logos, user counts, or benchmark numbers exist.

## Product Principles

1. Tools first. Every surface decision is judged by whether it helps a visitor use a tool, not by whether it promotes a publication.
2. One honest tool at a time. Each tool does one thing clearly and ships with the reasoning behind it.
3. Free and in the open. Tools stay free to use; the writing, changelog, and repo stay public.
4. Local-first where personal data is involved. Reading, notes, tasks keep user data on-device when the tool allows it.
5. One builder's voice. TakoVibe is Rahul Beniwal's workshop, not a committee product; design and copy should read that way.
6. No AI as the pitch. AI may be present inside a tool where it earns its place, but it is never the headline.
