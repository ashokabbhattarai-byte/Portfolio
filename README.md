# Ashok Bhattarai — Portfolio

A responsive Next.js App Router portfolio with a shared GSAP motion system, Lenis scrolling, project exploration, and résumé-based content.

## Run locally

Use Bun 1.3 or later.

```sh
bun install
bun dev
```

Production:

```sh
bun run build
bun run start
```

## Quality checks

```sh
bun run lint
bun run lint:fix
bun run typecheck
bun run format
bun run format:check
bun run build
```

## Structure

- `app/`: server-rendered routes, route metadata, social images, sitemap, robots, error states.
- `components/motion/`: curved loader and route controller, Lenis integration, magnetic controls, responsive full-name identity, and entrance effects.
- `components/projects/`: shared project rows, FLIP list/grid animation, media, and one global cursor preview.
- `components/layout/`: accessible native-dialog navigation and contact footer.
- `content/`: typed profile, experience, skills, and projects.
- `styles/globals.css`: responsive layout and design tokens.
- `public/assets/`: optimized web copies and real SuchanaAI screenshots.
- `Data/`: original portrait and CV, preserved without changes. Excluded from version control.

`content/` deliberately avoids the `Data/` versus `data/` collision on case-insensitive filesystems.

## Motion behavior

Every full page load opens with a short multilingual greeting sequence followed by an SVG curved curtain reveal. The curtain is painted by the stylesheet in the first frame rather than by a script, so it is never a flash of dark over an already-visible page, and it is up on every device before hydration begins. Its length is budgeted from navigation start, so a slow phone spends that time loading instead of waiting behind it. If scripting never boots the stylesheet lifts the curtain on its own, and `prefers-reduced-motion` skips it entirely. Internal links use the same curve, destination label, and entrance choreography. Browser history retains native restoration with a short reveal; new routes start at the top. A fallback releases the curtain if navigation stalls.

Lenis uses the GSAP ticker, with ScrollTrigger synchronized to its scroll events. Independent menu/transition locks prevent one interaction from prematurely unlocking another. Timelines, triggers, tickers, observers, and listeners are cleaned up. The hero identity is a seamless GSAP marquee: three copies of `Ashok Bhattarai — Software developer —` wrapped by a transform modifier, so it loops without a jump and only transforms ever change. It is measured again once the webfont lands and on resize. In `calm` it holds still inside the gutter, and the accessible name is a single visually hidden line rather than the repeated copies.

Motion runs in one of two modes, held on `html[data-flow]` and resolved before the first paint by an inline script: a stored choice wins, otherwise `prefers-reduced-motion` decides. A toggle in the header switches modes in either direction and is remembered, so the system preference sets the default rather than the ceiling. CSS and GSAP both read the same attribute, so they cannot disagree.

`full` uses the premium GSAP plugins bundled since 3.13: MorphSVG for the curtain's organic edge, SplitText for masked line reveals, ScrambleText for destination labels, Flip for the work list/grid, CustomEase for the shared `rise`/`curtain`/`glide` curves, and ScrollTrigger for the portrait parallax. `calm` reduces travel rather than removing feedback: cursor following, magnetic controls, smooth scrolling, parallax, the marquee, and the portrait push-in are dropped, translation and scaling become cross-fades, and hover states keep their colour response. The toggle also serves as the pause mechanism the looping identity needs.

The native dialog traps keyboard focus and supports Escape. Desktop project rows show one interpolated global preview; mobile uses visible project media with no hover requirement. Standard pointers remain available.

## Content and imagery

Profile, roles, education, and project contributions come from the provided September 2026 CV. Personal telephone and street-level location are not surfaced as website text. The original downloadable PDF is unchanged and carries `X-Robots-Tag: noindex, noarchive`.

SuchanaAI imagery and public feature descriptions were verified at [suchanaai.tech](https://suchanaai.tech/) and its About/Notices pages on September 12, 2026. Other project visuals are explicitly labeled illustrations, not product screenshots. No employers, dates, project stacks, private implementation details, results, or LinkedIn URL have been invented.

The font is a self-hosted Geist variable font with its license in `public/fonts/`.

## Deployment configuration

Env is per-app (`apps/web/.env` and `apps/api/.env` – see `AGENTS.md`). Set `NEXT_PUBLIC_SITE_URL` in `apps/web/.env` to the final HTTPS origin and rebuild before deploying. This is used by canonical URLs, metadata, structured data, and the sitemap. Without a configured origin, the app deliberately emits `noindex` and an empty sitemap for previews; it does not invent a public domain.

```sh
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
# Fill secrets (openssl rand -base64 48 / openssl rand -hex 32), DATABASE_URL, SUPABASE_*
bun run build
```

Use a host supporting Next.js server/image routes. The site is not configured for static export. There is no contact form backend: email links open the visitor’s mail application.

## Review assets

Local browser screenshots, reference recordings, and audit results are stored in `output/playwright/` and excluded from version control. They are not part of the public site.
# Portfolio
# Portfolio
