---
name: TakoVibe
description: One builder's public workshop of small, honest web tools — each one shipped with the reasoning behind it.
colors:
  spark-orange: "#f97316"
  spark-orange-light: "#fb923c"
  spark-orange-deep: "#ea580c"
  schematic-blue: "#0ea5e9"
  schematic-blue-light: "#38bdf8"
  meadow-green: "#15803d"
  meadow-green-light: "#86efac"
  paper-cream: "#f4f0e8"
  paper-stat: "#f7f4ed"
  paper-white: "#ffffff"
  coal: "#181713"
  coal-deep: "#11100e"
  carbon: "#171923"
  ink: "#1c1917"
  bone: "#fafaf9"
  stone-pale: "#e7e5e4"
  stone-soft: "#d6d3d1"
  haze: "#78716c"
  haze-light: "#a8a29e"
  ash: "#292524"
typography:
  display:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(2.8rem, 12vw, 6.1rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(1.75rem, 3.4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Syne, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  bodyProse:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "0em"
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.12em"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  "3xl": "64px"
components:
  button-primary:
    backgroundColor: "{colors.spark-orange}"
    textColor: "{colors.bone}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.spark-orange-deep}"
    textColor: "{colors.bone}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "#00000000"
    textColor: "{colors.bone}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    typography: "{typography.label}"
  button-ghost:
    backgroundColor: "#00000000"
    textColor: "{colors.haze}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  input-text:
    backgroundColor: "#00000000"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    typography: "{typography.body}"
  card-paper:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "32px"
  card-coal:
    backgroundColor: "{colors.coal}"
    textColor: "{colors.bone}"
    rounded: "{rounded.xl}"
    padding: "32px"
  chip-kicker:
    backgroundColor: "#00000000"
    textColor: "{colors.spark-orange-light}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
    typography: "{typography.label}"
  nav-link:
    backgroundColor: "#00000000"
    textColor: "{colors.haze}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  nav-link-active:
    backgroundColor: "#00000000"
    textColor: "{colors.spark-orange-deep}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: TakoVibe

## Overview

**Creative North Star: "The Workshop Notebook"**

TakoVibe is one builder's open workshop — small, honest web tools laid out on warm paper, with the reasoning behind each one written in the margin. Cream paper sits against coal panels; a single ember-orange carries the workshop's voice; cool-blue schematic lines and green code annotations appear only where the content is literally a diagram, a flow, or a token. The grid shows. The construction is part of the look.

The system reads as a workshop first, a publication second. Each tool surface is a workbench, scaled and lit for the job: generous padding on a redactor's canvas, tighter density inside an editor or dashboard, long-form prose only where the writing is the build log for a shipped tool. Typography does the heavy lifting — Syne for headlines, DM Sans for reading, JetBrains Mono where the mechanism should show. Depth is quiet: flat surfaces at rest, a gentle lift on hover, an orange-tinted shadow bloom under the one thing being touched.

The anti-reference is the generic "developer SaaS" landing page — lifeless gradients, cold neutrals, a stock dashboard mock in the hero, an AI feature made the headline. TakoVibe is not a platform pitching a suite; it is a workshop that ships one honest tool at a time and publishes why each was built that way.

**Key Characteristics:**
- Warm paper (cream) against warm coal, never cold-grey
- Syne display type carries identity; DM Sans carries reading and tool copy
- One accent color — Spark Orange — rare on each screen, ambient as shadow, reserved for the act the visitor came to do
- Cool-blue schematic lines appear only inside diagrams, flows, and data-shape annotations — never as UI accent
- The grid, the hairline border, and the uppercase kicker label are part of the look, not removed
- Tool chrome is minimal and native-feeling; identity lives in the ground, the type, and the orange, not in decoration placed over the work surface

## Colors

A warm neutral ground (cream and coal), one ember-orange accent, and two cool annotation accents (schematic blue, meadow green) for diagrammatic and code moments. Nothing is pure white or pure black — the ground is always tinted.

### Primary
- **Spark Orange** (`#f97316`): The publication's single voice. CTAs, the one active nav link, the kicker label on a surface, the shadow halo on hover, the stroke on a progress bar. On dark surfaces the hover-and-link form is **Spark Orange Light** (`#fb923c`); pressed and emphasized-heading moments resolve to **Spark Orange Deep** (`#ea580c`).

### Secondary
- **Schematic Blue** (`#0ea5e9`) and **Schematic Blue Light** (`#38bdf8`): Used only where the content is a schematic — flow lines in the hero SVG, secondary strokes in a diagram, a workshop annotation. Never a general UI accent; its presence means "this is a diagram."

### Tertiary
- **Meadow Green** (`#15803d` light / `#86efac` dark): Reserved for inline `code` in prose. It is the reader's cue that a word is a token or identifier, not a quote.

### Neutral
- **Paper Cream** (`#f4f0e8`): The publication's warm ground on light surfaces; the homepage shell.
- **Paper Stat** (`#f7f4ed`): The slightly-lighter card ground inside the cream shell.
- **Paper White** (`#ffffff`): Reading surfaces for articles and modal content; never used as a full-page ground.
- **Coal** (`#181713`): The featured-card / coal-panel surface on dark areas; the workshop's benchtop color.
- **Coal Deep** (`#11100e`): The dark-mode shell behind everything; warmer than true black.
- **Carbon** (`#171923`): A second dark-mode shell present on the global layout. Being slightly cooler than Coal Deep, it is the one legacy value the system still carries; prefer Coal Deep on new surfaces and allow refactors to converge.
- **Ink** (`#1c1917`): Primary text on light grounds; also the warm darkest card on the shell.
- **Bone** (`#fafaf9`): Primary text on dark grounds and the pale foreground inside a coal panel.
- **Ash** (`#292524`): Hairline borders and divider lines on dark; text on cream when ink would be too heavy.
- **Haze** (`#78716c`) and **Haze Light** (`#a8a29e`): Muted body text, metadata, inactive nav links, scrollbar hover states.
- **Stone Pale** (`#e7e5e4`) and **Stone Soft** (`#d6d3d1`): Hairline borders and dividers on light grounds.

### Named Rules

**The One-Spark Rule.** Spark Orange appears once at full saturation per visible viewport — the thing the visitor is meant to do or follow. Everything else that uses orange (kicker labels, hover halos, radial glows) is a tint or alpha blend of the accent, not a second CTA pretending to be one.

**The Warm-Only Rule.** The ground is never pure white or pure black. If a surface reads cool-grey next to a warm neighbor, it is wrong, not neutral. The Carbon value survives as the one legacy exception and is called out as such.

**The Schematic-Only Blue Rule.** Schematic Blue is for diagrams, flow lines, and annotations. It is never used for text, buttons, borders, or cards. If a surface needs a "non-orange accent" for UI, it uses a neutral, not blue.

## Typography

**Display Font:** Syne (with `sans-serif` fallback) — weights 400, 500, 600, 700, 800.
**Body Font:** DM Sans (with `sans-serif` fallback) — variable, optical size 9–40, weights 300/400/500/600 plus italic 400.
**Mono Font:** JetBrains Mono (with `monospace` fallback) — weights 400, 500, 600.

**Character:** Syne is geometric, slightly quirky, confident at scale; it carries the publication's identity without shouting. DM Sans is comfortable at reading sizes and holds up at 300 weight for airy intros. JetBrains Mono carries the engineering voice wherever a token, filename, or code sample needs to feel like itself.

### Hierarchy
- **Display** (Syne, 800, `clamp(2.8rem, 12vw, 6.1rem)`, line-height 0.92): Hero headlines only; one per surface. Tight leading, slight negative tracking, often capped at a short line length so it reads as a statement, not a paragraph.
- **Headline** (Syne, 700, `clamp(1.75rem, 3.4vw, 2.5rem)`, line-height 1.1): Section headings on a landing or tool page.
- **Title** (Syne, 600, 1.5rem, line-height 1.25): Card titles, featured-article titles, tool names.
- **Body** (DM Sans, 400, 1rem, line-height 1.75): General body copy on marketing and tool surfaces.
- **Body Prose** (DM Sans, 400, 1.0625rem, line-height 1.75, max-width 65ch): Long-form article body. The 65ch cap is a fixed invariant from `@tailwindcss/typography`.
- **Label / Kicker** (DM Sans, 700, 0.75rem, uppercase, letter-spacing 0.12em–0.14em): The small eyebrow line above a headline, the category badge on a card, a stat label. Always warm orange, haze, or stone — never body color.
- **Mono** (JetBrains Mono, 400, 0.875rem, line-height 1.5): Inline tokens, identifiers, and code samples. Rendered on a slightly-tinted ground, never on pure white.

### Named Rules
**The Kicker-Before-Display Rule.** Every hero or significant section is introduced by a short uppercase kicker label; the display headline follows. A display without a kicker reads as a blog post title, not a tool page.

**The Prose Width Rule.** Long-form reading body is always capped at 65ch. Tool copy (labels, help text, inline prose) is narrower and lives inside the tool's own frame; prose width is a reading rule, not a tool-UI rule.

## Layout

A fluid centered column with clear wide anchors. The site uses these max-widths deliberately:

- **1440px** at the home hero (`max-w-[1440px]`) — the widest allowed on marketing surfaces.
- **1400px** at the sticky header (`max-w-[1400px]`) — slightly tighter so nav aligns under the hero.
- **6xl / 1152px** at the footer and standard content frames — the comfortable reading-system width.
- **65ch** for long-form article body — the reading invariant.

Breakpoints extend Tailwind's defaults with a very small `xs` for tiny phone widths:

- `xs` 300px · `sm` 640px · `md` 768px · `lg` 1024px · `xl` 1280px · `2xl` 1536px

Spacing follows a 4/8/16/24/32/48/64 rhythm. Cards use 24–32px internal padding; marketing sections use 56–80px vertical padding.

Density is airy on marketing and tool landing surfaces; tighter inside the reader, editor, and dashboard, where the Operate mode takes precedence. Hero surfaces often reserve the full viewport height (`min-h-[calc(100vh-5rem)]`) and let the display headline occupy most of it.

**Named Rule — The Centered-Column Rule.** Content is centered, contained, and anchored to one of the three named widths. Bleed-to-edge sections exist only as background decoration (hero map SVG, grid overlay), never as the content frame.

## Elevation & Depth

Flat by default, warm by shadow. Surfaces sit at rest with a hairline border and a tinted ground. Depth arrives only as a response — hover on a card, focus on an input, the one thing being touched. The shadow vocabulary is small and always warm.

### Shadow Vocabulary
- **Ambient Orange Low** (`box-shadow: 0 10px 24px rgba(249, 115, 22, 0.08)`): The subtle warmth under an interactive card at rest on light surfaces.
- **Ambient Orange Hover** (`box-shadow: 0 0 20px rgba(249, 115, 22, 0.15)`): The "hover-glow" bloom under an interactive element on light.
- **Ambient Orange Hover Dark** (`box-shadow: 0 0 20px rgba(251, 146, 60, 0.20)`): The same bloom on dark surfaces.
- **Oxblood Panel** (`box-shadow: 0 25px 50px rgba(67, 20, 7, 0.15)`): The large tinted drop under a featured coal-panel card (`shadow-orange-950/15`).
- **Card Lift** (`box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.15)` light / `rgba(0, 0, 0, 0.40)` dark): The neutral drop that joins a card-lift translate.

Backdrop blur appears on translucent cards (`bg-white/70 backdrop-blur`, `bg-white/[0.045]` on dark) to let the warm ground bleed through.

### Named Rules
**The Flat-At-Rest Rule.** No element is elevated until a state demands it. Static surfaces use a hairline border and a tinted ground, never a resting drop shadow.

**The Warm-Shadow Rule.** Shadows are always warm — orange at low alpha, oxblood at larger scale, or warm-black for neutral lift. Cool/blue shadows are a failure.

## Shapes

Two clear shape languages coexist: **pills** for action and navigation, **soft rectangles** for surfaces and content. Nothing is sharp-cornered.

- `rounded-pill` (**9999px**): Buttons, nav links, chips, kicker labels, stat badges. The "action" shape.
- `rounded-lg` (**8px**): Inline tags, small thumbnails, inputs that live inside a card.
- `rounded-xl` (**12px**): Icon buttons, the mobile menu toggle, small cards.
- `rounded-2xl` (**16px**): Default large cards (`bg-white/70` panels, modals).
- `rounded-[1.75rem]` (**28px**): The signature "big surface" — featured article card, workspace mock, oversized hero container. This is the shape that most carries the warm-notebook character.

Borders are always hairline (1px). On light, `rgba(0,0,0,0.1)` (`border-black/10`); on dark, `rgba(255,255,255,0.1)` (`border-white/10`). A thicker border reads as a form error, not a decision.

**Named Rule — The 28px Signature Rule.** The oversized 28px radius marks a surface that is itself a piece of content (a featured article, a workspace preview, a tool showcase). Normal cards stay at 16px; promoting a 16px card to 28px gives it editorial weight.

## Components

### Buttons

- **Shape:** Pill (`rounded-full`, 9999px). Secondary and tertiary variants share the shape; what changes is color assignment.
- **Primary (Home-Button-Primary):** Solid Spark Orange background, Bone text, label-weight copy (DM Sans 700, uppercase or sentence-case, letter-spacing 0.04em), 12–16px vertical / 24–32px horizontal padding, chevron icon inline.
- **Primary Hover:** Background shifts to Spark Orange Deep; a small translate-Y (-1 to -2px) plus an Ambient Orange Hover bloom.
- **Secondary (Home-Button-Secondary / Ghost):** Hairline border (`border-white/20` on dark, `border-black/10` on light), transparent ground, same pill shape and padding. Hover fills to 10% white (dark) or 5% black (light).
- **Tertiary / Text link:** Underlined link color only, no padding, used inside prose. Orange link on light grounds, Orange Light on dark.
- **Focus:** All buttons share a 2px `ring-orange-500` focus ring, offset 2px from the pill.

### Inputs / Fields

- **Shape:** `rounded-xl` (12px) when embedded in a card frame; the frame carries the hairline border and the input itself is transparent (`bg-transparent`).
- **Focus:** A 2px orange ring (`focus:ring-orange-500`), no bottom-bar or border-shift pattern.
- **Placeholder:** Haze on light, Stone-500 on dark. Never Ink/Bone.
- **Error:** The ring switches to the deep orange at high saturation; error text is in body size with no icon by default.

### Cards / Containers

- **Corner Style:** 16px by default, 28px for signature surfaces.
- **Background:**
  - Light: translucent paper — `bg-white/70 backdrop-blur` with `border-black/10`.
  - Dark: translucent coal — `bg-white/[0.045] backdrop-blur` with `border-white/10`.
  - Coal panel (featured): solid `#181713` with warm orange-tinted shadow.
- **Shadow Strategy:** Flat at rest; Card Lift on hover (translate-Y -4px, Card Lift shadow). Coal-panel featured cards additionally get Oxblood Panel.
- **Internal Padding:** 24px small, 32px standard, 40–48px for signature.
- **Grid overlays:** Some cards carry a faint 34×34 grid as an SVG background; part of the workshop-notebook character.

### Chips / Kicker Labels

- **Style:** Pill or flat uppercase micro-type (DM Sans 700, 10–12px, letter-spacing 0.12em–0.14em).
- **Color:** Haze on light, Stone-500 on dark for meta chips; Spark Orange Light for emphasis kickers; Bone with `white/5` background for coal-panel badges.
- **Border:** Hairline (`border-black/10` or `border-white/10`) when present.

### Navigation

- **Desktop:** Pill links on the center of the sticky header. Default is Haze, hover goes to Ink/Bone with a very subtle hover ground. Active state swaps text to Spark Orange Deep (light) / Spark Orange Light (dark), background tints to `neutral-50 / neutral-800/20`.
- **Mobile:** A full-height drawer, same pill rhythm, grouped under "Main / Tools / Related" headings in label style.
- **Dropdown (Tools):** A paper card with hairline border and backdrop blur; each tool row carries a name in Title size and a one-line description in Body Prose size and Haze color.

### Signature Component — The Hero Flow Lines

Two SVG paths crossing the hero with a four-stop gradient stroke (`#34d399 → #38bdf8 → #fb923c → #f43f5e`). They are the workshop's visual signature: a soft circuit diagram running behind the headline, never busy, never static, always animated with a slow flow. One instance per hero surface; no stroke recoloring. Reserved for the home and tool-landing heroes — never inside the tool workspace itself.

## Do's and Don'ts

### Do:
- **Do** cap long-form reading at 65ch; let display headlines break the cap intentionally.
- **Do** lead every section with a short uppercase kicker label in label typography (DM Sans 700, 0.75rem, letter-spacing 0.12em).
- **Do** use pills for actions and nav, and 16/28px soft rectangles for surfaces.
- **Do** keep orange rare and loud — one instance of full-saturation Spark Orange per visible viewport.
- **Do** treat shadows as state: flat at rest, lift on hover, orange-tinted bloom under the thing being touched.
- **Do** tint backgrounds warm (cream, coal, ink, bone). If a surface looks cool-grey, raise the warmth.
- **Do** use JetBrains Mono for inline tokens and code, and Meadow Green for the code color.
- **Do** keep the hero flow lines (the four-stop gradient SVG) wherever a hero needs the publication's signature.

### Don't:
- **Don't** use Schematic Blue on UI chrome (buttons, nav, text, borders). Blue means "this is a diagram."
- **Don't** redefine the brand ramp in a component; use the `brand`/`orange` Tailwind alias which already points at one source.
- **Don't** add resting drop shadows to static surfaces; depth is reserved for state.
- **Don't** promote a 16px card to 28px unless the surface is itself content (a featured article, a workspace preview, a tool showcase).
- **Don't** use pure white (`#ffffff`) or pure black as a page ground; the publication's grounds are always warm-tinted.
- **Don't** introduce a cool-grey neutral into a section that already has Paper Cream or Coal nearby; the mismatch is visible.
- **Don't** add new display or body fonts; the Syne / DM Sans / JetBrains Mono stack is the system.
- **Don't** replace the hero flow-line signature with a generic gradient blob.
- **Don't** make AI a headline. If a tool uses AI inside, it is a detail, not the pitch.
