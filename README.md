# TakoVibe

TakoVibe is an engineering publication and learning workspace built by
[Rahul Beniwal](https://www.linkedin.com/in/rahulbeniwal26119/). It combines
long-form technical writing with the tools used while learning: runnable code,
diagrams, contextual AI, notes, tasks, and an EPUB/PDF reader.

> **Project status:** Active development.

## What it does

- An Astro-based technical publication with articles, series, profiles, search,
  bookmarks, newsletter flows, and authoring tools.
- Vellora, a local-first EPUB/PDF reading workspace with highlights, progress,
  themes, folders, and the Kumi reading assistant.
- Spatial sketch notes with drawing, PDF import, history, thumbnails, and links
  back to source material.
- A daily task manager with natural-language capture, checklists, tags,
  priorities, and carry-over.
- A browser code playground for Python, JavaScript, Go, Rust, and HTML/CSS/JS.
- Interactive engineering articles with executable examples, diagrams, quizzes,
  and contextual tools.

The repository represents more than 300 commits across roughly 50,000 lines of
Astro, TypeScript, and React source. The public changelog tracks each release.

## Why it is public

TakoVibe is built in the open: the writing stays free to read, and the changelog
keeps a concrete trail of product decisions, technical tradeoffs, redesigns, and
lessons for other builders.

- [Read the articles](https://takovibe.com/blog)
- [Follow the changelog](https://takovibe.com/changelog)
- [Why TakoVibe exists](https://takovibe.com/why-takovibe)
- [Follow Rahul Beniwal](https://www.linkedin.com/in/rahulbeniwal26119/)

## Maintenance kill switch

[`src/config/maintenance.ts`](src/config/maintenance.ts) holds an emergency
switch, `enabled`, which is `false` during normal operation. Setting it to `true`
redirects the homepage and interactive routes to `/maintenance` and returns
`503 Service Unavailable` from API endpoints, while articles, series, profiles,
the changelog, legal pages, and static assets stay reachable.

It is for genuine outages only. While enabled, the homepage is served with
`noindex` and canonicalled to `/maintenance`, which deindexes it, so remove the
paused routes from the sitemap before turning it on and turn it off promptly.

## Local development

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```

The frontend uses Astro's hybrid Node output. Set `PUBLIC_API_URL` to point to a
compatible TakoVibe backend; otherwise it defaults to
`https://backend.takovibe.com`.

## Core stack

- Astro 4 with hybrid Node rendering
- React 18 and TypeScript
- Tailwind CSS
- Tiptap and CodeMirror
- Excalidraw and Mermaid
- epub.js and react-pdf
- Auth.js

## License and reuse

No open-source license is currently declared. The code remains copyright of its
respective contributors unless a license is added later.
