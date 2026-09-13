You are acting as a **senior frontend engineer, creative developer, motion designer, UX engineer, accessibility specialist, SEO engineer, and performance engineer**.

Your task is to build a **production-grade personal software developer portfolio in Next.js**, taking strong interaction inspiration from the Dennis Snellenberg portfolio experience I provided.

The goal is NOT to create a generic portfolio and NOT to merely approximate the reference visually.

I want the portfolio to reproduce the same level of:

- smoothness
- animation quality
- hover behavior
- cursor interactions
- page-transition choreography
- loading sequence
- scrolling feel
- visual hierarchy
- premium spacing
- project exploration
- motion timing
- responsive behavior
- interaction consistency

The final result should feel like a professionally built creative-developer portfolio.

However, do not create a pixel-for-pixel copyrighted copy. Preserve the interaction philosophy and premium motion language while adapting the visual identity, content, imagery, typography decisions, and developer-focused information to my own portfolio.

---

# CRITICAL PROJECT CONTEXT

Inside the repository there is a folder named:

`Data/`

Important personal assets are already placed inside it.

The `Data/` folder contains at minimum:

1. My HERO image / portfolio portrait
2. My RESUME / CV

Before designing or coding the actual portfolio:

- inspect the `Data/` directory
- identify the hero image automatically
- identify the resume automatically
- inspect file names and formats
- use the actual provided assets
- do NOT create a fake placeholder portrait
- do NOT create a dummy resume
- do NOT overwrite these source files
- optimize copies for the website where necessary

If useful, create optimized copies under:

`public/assets/`

but leave the original `Data/` files intact.

The portfolio should contain an obvious but elegantly designed way to:

- view my résumé
- download my résumé
- use my portrait as the main hero visual

Do not ask me for file names if you can infer them from the `Data/` directory.

---

# PHASE 0 — ENVIRONMENT AND PROJECT INITIALIZATION

Before writing actual UI code, properly initialize the application.

Use:

- Bun
- Next.js latest stable production version
- App Router
- TypeScript
- React
- Tailwind CSS if useful
- GSAP
- GSAP ScrollTrigger
- Lenis or an equivalent high-quality smooth scrolling solution
- modern image optimization
- CSS variables/design tokens
- semantic HTML
- accessible components

Initialize using Bun.

Example intention:

`bun create next-app`

Do NOT initialize with npm, yarn, or pnpm.

Use Bun throughout for:

- dependency installation
- scripts
- development
- builds
- formatting
- linting

The project must use a professional structure from the beginning.

---

# PHASE 1 — CODE QUALITY FOUNDATION

Before building components, configure the project properly.

Set up:

- TypeScript strict mode
- ESLint
- Next.js recommended lint rules
- React best practices
- accessibility linting
- import ordering if appropriate
- Prettier
- Prettier Tailwind plugin if Tailwind is used
- consistent line endings
- consistent quote style
- trailing comma rules
- automatic formatting
- `.editorconfig`
- `.gitignore`
- environment example file if necessary

Provide scripts such as:

- `bun dev`
- `bun run build`
- `bun run start`
- `bun run lint`
- `bun run lint:fix`
- `bun run format`
- `bun run format:check`
- `bun run typecheck`

There must be no:

- TypeScript errors
- lint errors
- formatter errors
- obvious accessibility errors
- browser console errors

Do not disable ESLint rules just to make warnings disappear.

Fix the actual problem.

---

# PHASE 2 — PROFESSIONAL ARCHITECTURE

Use a scalable folder architecture.

For example:

`app/`

`components/`

`components/layout/`

`components/navigation/`

`components/motion/`

`components/ui/`

`components/sections/`

`components/projects/`

`hooks/`

`lib/`

`data/`

`types/`

`styles/`

`public/assets/`

Do not put the whole website into one giant `page.tsx`.

Create reusable components.

Example component ideas:

- `SiteHeader`
- `HeroSection`
- `HeroPortrait`
- `HeroMarquee`
- `IntroSection`
- `ProjectList`
- `ProjectRow`
- `ProjectCursorPreview`
- `ProjectGrid`
- `ProjectCard`
- `MagneticButton`
- `MagneticLink`
- `CustomCursor`
- `PageTransition`
- `TransitionOverlay`
- `NavigationDrawer`
- `ContactSection`
- `Footer`
- `SmoothScrollProvider`
- `MotionProvider`
- `ProjectCaseStudy`
- `NextProjectSection`
- `ResumeButton`

Use configuration-driven project data rather than hardcoding repeated markup.

---

# PHASE 3 — DESIGN SYSTEM BEFORE UI BUILD

Define a real design system.

Create reusable tokens for:

## Colors

Use a restrained premium palette inspired by the reference philosophy:

- warm/off white
- deep charcoal/black
- muted gray
- one strong accent color

Accent color should primarily appear for:

- interaction
- hover
- active state
- important CTA
- cursor action
- primary links

Do NOT cover the website in bright accent colors.

Avoid:

- random gradients
- generic purple SaaS gradients
- excessive glassmorphism
- glowing cards everywhere
- unnecessary neon
- AI-generated-looking visual effects

---

# TYPOGRAPHY

Use strong editorial typography.

Create extreme hierarchy between:

- small utility text
- regular body copy
- medium section labels
- oversized display typography

Hero text must feel extremely confident.

Use responsive typography using `clamp()`.

Do not manually create dozens of media-query font sizes.

Typography should scale fluidly.

Example philosophy:

small utility text:
12–15px

body:
16–20px

section statement:
clamp approximately 40–90px

hero display:
very large, potentially 10vw+ depending on viewport

Choose premium fonts with excellent readability and licensing appropriate for web usage.

Use `next/font` where possible.

---

# PHASE 4 — GLOBAL MOTION SYSTEM

Before implementing individual animations, establish a consistent motion language.

Do NOT animate every element differently.

The entire portfolio should be based around several reusable motion rules.

Primary animation categories:

1. loading
2. page transitions
3. text reveals
4. smooth scrolling
5. magnetic interactions
6. cursor previews
7. section entrances
8. image/media reveals

Motion should feel:

- weighted
- fluid
- deliberate
- premium
- slightly cinematic
- controlled

Do NOT use excessive bouncing.

Do NOT make everything spring around.

Use easing closer to:

- Power3
- Power4
- Expo
- custom cubic Bézier curves

Favor:

fast initial acceleration  
→ long smooth deceleration.

---

# PHASE 5 — INITIAL WEBSITE LOADER

The initial load must reproduce the premium multilingual-greeting idea from the reference.

When entering the portfolio for the first time:

show a full-screen dark loader.

At the center or slightly offset position show:

small bullet  
+ greeting

Cycle several greetings quickly.

For example:

Hello

Bonjour

Namaste

Hola

Ciao

Olá

こんにちは

Hallo

Final greeting can transition into the destination.

The loader should NOT include:

- generic spinner
- percentage counter
- skeleton screen
- fake loading bar

The greeting change should feel intentional and rhythmic.

Approximate total loader duration:

1.8–2.8 seconds

depending on actual page readiness.

Do not intentionally delay the website if it has already loaded significantly faster.

Respect repeat visits where appropriate.

Potentially use session storage so the long greeting sequence does not annoy users on every internal navigation.

---

# PHASE 6 — CURVED LOADER REVEAL

This is one of the most important animations.

The loader must NOT simply fade away.

After the final greeting:

the large dark overlay should move vertically upward.

Its lower boundary must have a large smooth curved / concave / organic shape.

The effect should feel like a giant flexible curtain lifting and exposing the homepage underneath.

Sequence:

dark fullscreen state

→ greeting finishes

→ dark layer starts moving upward

→ large curved lower edge becomes visible

→ hero underneath becomes gradually exposed

→ overlay exits beyond top of viewport

→ hero becomes fully interactive.

Potential techniques:

- SVG Bézier path
- SVG mask
- clip-path
- oversized pseudo-element
- curved wrapper
- GSAP animation

Choose the most performant and visually stable approach.

Do NOT use a cheap border-radius rectangle that looks obviously fake.

The curve should be broad and proportional to the viewport.

---

# PHASE 7 — HERO SECTION

The hero should essentially occupy:

`100svh`

or visually equivalent full-screen height.

Use my actual portrait from:

`Data/`

as the centerpiece.

The portrait must:

- be large
- remain sharp
- preserve aspect ratio
- not appear inside a card
- blend naturally with the hero
- anchor to the bottom
- scale responsively
- work across large monitors
- work across laptops
- work on tablets
- adapt appropriately on mobile

On desktop, aim approximately for:

portrait width ≈ 40–48% viewport width

portrait height ≈ 88–95% hero height

depending on my image's proportions.

The image should feel editorial.

Do not crop my face improperly.

Do not stretch my portrait.

If the source image has a background, treat it intelligently.

If appropriate, use:

- object-position
- clipping
- responsive crops

but do not destroy image quality.

---

# PHASE 8 — HERO COMPOSITION

Hero should contain a restrained set of elements:

- personal identity/name
- profession / role
- navigation
- location or status if appropriate
- portrait
- large moving display name / identity statement
- small utility controls

Do not overcrowd it with:

- GitHub cards
- tech-logo walls
- stacks of badges
- skill pills
- résumé statistics
- 8 buttons
- giant social icons

The first viewport should establish identity first.

Technical credibility comes below.

---

# PHASE 9 — GIANT MOVING NAME / MARQUEE

At the lower part of the hero, create a huge horizontally moving name or identity phrase.

Example:

`ASHOK BHATTARAI — SOFTWARE DEVELOPER —`

or an equally strong identity concept based on the actual résumé.

The text should:

- extend beyond the viewport
- feel oversized
- overlap visually with the portrait composition
- move slowly horizontally
- loop seamlessly
- avoid visible jumps
- remain GPU-friendly

Do NOT use a tiny generic marquee.

It should function like a core hero visual.

Use transforms rather than continuously manipulating layout.

Potential implementation:

GSAP modifier loop or performant CSS/JS transform loop.

---

# PHASE 10 — HERO ENTRANCE CHOREOGRAPHY

After loader exit, do not make every element appear simultaneously.

Create staged hero entry.

Suggested choreography:

0ms  
background already present beneath transition

100ms  
portrait settles into position

200ms  
navigation appears

300ms  
small utility text fades/slides

400–550ms  
role heading reveals

550–800ms  
large identity marquee begins

Use slight overlaps.

Avoid excessive delays.

The site should feel immediate.

---

# PHASE 11 — SMOOTH SCROLLING

Implement premium smooth scrolling globally.

Preferred:

Lenis + GSAP ScrollTrigger.

Scrolling should have:

- inertia
- controlled interpolation
- responsive trackpad behavior
- proper wheel handling
- no lag
- no accidental scroll locking
- usable keyboard scrolling
- touch support
- accessibility fallback

Connect Lenis to ScrollTrigger properly.

Avoid multiple requestAnimationFrame loops fighting each other.

Make sure scroll positions are restored appropriately on navigation.

Respect:

`prefers-reduced-motion`.

---

# PHASE 12 — INTRO / ABOUT STATEMENT

After hero, transition into a large clean content region.

Use a strong editorial statement.

For example:

a concise statement explaining:

- what I build
- how I think
- what value I provide

Pair it with:

- smaller supporting paragraph
- large magnetic “About me” button

Layout should be asymmetrical.

Use plenty of whitespace.

Do not put everything inside bordered cards.

---

# PHASE 13 — SCROLL REVEALS

As text enters the viewport:

use subtle reveal animations.

For large lines:

animate by line or grouped text.

Possible animation:

`yPercent: 100 → 0`

combined with clipping / overflow masking.

Do NOT animate every individual letter unless there is a strong reason.

Supporting text can use:

opacity 0 → 1

y 20–40px → 0

Keep duration around:

0.7–1.2 seconds

depending on section.

Use stagger sparingly.

---

# PHASE 14 — MAGNETIC BUTTON SYSTEM

Create one reusable magnetic interaction system.

Apply it to:

- important round buttons
- menu trigger
- CTA buttons
- résumé action
- contact buttons
- selected nav interactions

Behavior:

cursor approaches

→ outer button moves subtly toward cursor

→ inner text/icon moves at slightly different strength

→ cursor moves inside

→ button responds fluidly

→ cursor leaves

→ button gently returns to origin.

Do not move elements excessively.

Example conceptual strengths:

outer button:
8–20%

inner content:
5–12%

Use interpolation.

Do not assign raw mouse coordinates directly.

Must feel smooth.

Disable or simplify on touch devices.

---

# PHASE 15 — CUSTOM CURSOR

Desktop can have a custom cursor system.

Default state should remain subtle.

For actionable project media:

cursor should morph into a large colored circular state containing:

`VIEW`

or equivalent.

Possible cursor states:

default

project preview

view project

open

drag

external

Do not make cursor unnecessarily huge everywhere.

Do not hide the operating-system cursor unless the replacement is fully reliable and accessible.

Disable custom cursor appropriately on:

- touch
- reduced-motion configurations
- low-performance environments if required.

---

# PHASE 16 — FEATURED PROJECT LIST

Create a highly editorial Featured Work section.

Initially show projects as large horizontal rows rather than ordinary cards.

Each row can contain:

- project title
- role/category
- year
- optional short metadata

Use thin horizontal separators.

Large whitespace.

When not hovered:

the list should look clean and typographic.

---

# PHASE 17 — FLOATING PROJECT PREVIEW

This interaction is extremely important.

When hovering over a project row:

a visual preview of that project should appear.

The preview should:

- appear near the cursor
- follow cursor motion
- lag slightly behind cursor
- use interpolation / lerp
- remain within sensible viewport boundaries
- transition between project imagery smoothly
- disappear elegantly when leaving project area

Do not set:

preview.x = mouse.x

preview.y = mouse.y

directly.

Use interpolation.

Example conceptual logic:

currentX += (targetX - currentX) * 0.1

currentY += (targetY - currentY) * 0.1

Adjust actual interpolation for 60fps smoothness.

When moving between project rows:

preview image changes smoothly.

Possible transitions:

- scale
- opacity
- vertical wipe
- clip-path
- small slide

Do not create chaotic flip animations.

---

# PHASE 18 — PROJECT HOVER TYPOGRAPHY

During row hover:

the active project remains visually dominant.

Non-active content can become slightly muted.

Use restrained opacity or color transitions.

Avoid making inactive text unreadable.

Hover transition should be roughly:

200–500ms

depending on effect.

---

# PHASE 19 — “MORE WORK” TRANSITION

After featured projects provide a clear route into the full Work page.

Use a premium CTA.

Then transition visually into the darker contact region.

The boundary between light and dark sections may use a subtle broad curve inspired by the global transition system.

Do not simply draw another rectangular section.

---

# PHASE 20 — CONTACT SECTION

Use a dramatic dark contact section.

Composition should include:

small portrait / visual signature

large statement such as:

`Let's work together`

or custom equivalent.

Primary oversized circular CTA:

`Get in touch`

Additional contact actions:

- email
- LinkedIn
- GitHub
- résumé
- other professional links derived from résumé if available

Primary interaction can become accent-colored on hover.

Keep the section bold but uncluttered.

---

# PHASE 21 — NAVIGATION

Desktop navigation should be minimal.

Possible visible items:

- Work
- About
- Contact

Include logo/name mark.

Add menu trigger if using drawer interaction.

Navigation must remain readable across hero imagery.

---

# PHASE 22 — OFF-CANVAS MENU

Implement a high-quality side drawer.

When menu button is activated:

current page remains partially visible

→ dark panel slides in from right

→ navigation items animate into place

→ active page receives subtle indicator

→ close button morphs appropriately.

Menu items:

Home

Work

About

Contact

Potential résumé link if appropriate.

Use huge typography.

Avoid generic mobile-drawer library styling.

Create your own polished interaction.

---

# PHASE 23 — PAGE TRANSITION SYSTEM

This is one of the most important global systems.

Every major internal route change should feel continuous.

Routes may include:

`/`

`/work`

`/work/[slug]`

`/about`

`/contact`

Navigation sequence:

CURRENT PAGE

→ dark curtain begins entering upward from bottom

→ curved upper/leading edge moves across viewport

→ page becomes fully dark

→ show small bullet + destination page name

→ hold briefly

→ change route/content

→ curtain continues upward

→ broad curved lower edge reveals destination page

→ curtain exits viewport

→ destination page entrance animation completes.

Example labels:

`• Work`

`• About`

`• Contact`

`• Project Name`

Keep transition quick enough that navigation never feels slow.

Suggested full transition:

roughly 1.1–1.8 seconds

depending on device/performance.

Do not intentionally slow routing for decoration.

If page is available immediately, choreography should remain concise.

---

# PHASE 24 — TRANSITION STATE MANAGEMENT

Build transitions centrally.

Do not copy transition code across pages.

Create a global transition controller.

It should:

- know destination label
- disable accidental repeated route clicks
- lock scroll while curtain covers viewport
- restore scroll correctly
- trigger route change at correct time
- run entrance
- re-enable interaction

Handle browser back/forward.

Avoid race conditions.

Avoid memory leaks.

Avoid stale GSAP timelines.

---

# PHASE 25 — WORK PAGE HERO

Work page begins with a bold statement.

Example:

`Building thoughtful digital products.`

or more distinctive wording derived from my personal profile.

Then display:

- filtering
- project categories
- optional year
- list/grid controls

Keep controls minimal.

---

# PHASE 26 — LIST VIEW

Work page should support a clean list/table presentation.

Possible columns:

Project

Role

Technology / Category

Year

Do not make it look like a boring admin table.

It must remain editorial and spacious.

Hovering project rows should reuse floating project-preview behavior.

Do NOT implement a separate unrelated hover style.

Consistency is mandatory.

---

# PHASE 27 — GRID VIEW

Allow the visitor to switch between list and visual grid views.

Grid mode:

- large visual project media
- two-column layout on desktop where appropriate
- strong image ratios
- enormous spacing
- minimalist project metadata

During switch:

animate layout gracefully.

Do not cause:

- giant layout jump
- broken scroll
- CLS
- disappearing content

Grid project hover should use:

- custom View cursor
- subtle media scaling
- magnetic or responsive pointer behavior if appropriate

Keep scale effects restrained:

approximately 1.02–1.05.

---

# PHASE 28 — PROJECT ROUTING

Every project must use a proper SEO-friendly slug.

Example:

`/work/project-name`

Do not use:

`?project=1`

or numeric IDs in user-facing URLs.

Project data should be stored cleanly.

Example fields:

- title
- slug
- year
- role
- description
- technologies
- responsibilities
- hero media
- gallery
- links
- GitHub
- live site
- challenge
- solution
- outcome
- nextProject

---

# PHASE 29 — PROJECT OPEN TRANSITION

When clicking a project:

do NOT immediately jump.

Use global curtain:

project card

→ curved dark surface rises

→ screen becomes dark

→ show:

`• PROJECT NAME`

→ transition destination

→ dark surface exits upward

→ project hero is revealed.

This should feel nearly identical in quality to the Work route transition.

---

# PHASE 30 — PROJECT CASE STUDY HERO

Project page should start with:

huge project title

role

year

stack

responsibility

live-site button if applicable

GitHub button if applicable

short project summary

Then large hero media.

Avoid dumping 1000 words before showing the project.

---

# PHASE 31 — CASE STUDY STORYTELLING

Because I am a software developer, do not make projects visual-only.

Use cinematic visuals AND meaningful engineering information.

Possible sequence:

1. project overview
2. challenge
3. solution
4. architecture
5. key features
6. implementation decisions
7. stack
8. technical challenges
9. screenshots
10. impact/outcome
11. links
12. next project

Use large screenshots.

Avoid putting every screenshot inside tiny laptop mockups.

Let visuals breathe.

---

# PHASE 32 — NEXT PROJECT EXPERIENCE

At bottom of every project:

transition to dark section.

Display:

`Next project`

large next project title

preview image/video

CTA interaction.

Include:

Back to all work

Do not dead-end the visitor.

Project navigation should feel like a continuous loop.

---

# PHASE 33 — ABOUT PAGE

Create a premium About page.

Use information from the résumé inside `Data/`.

Extract relevant content from the real resume.

Possible sections:

- short introduction
- professional focus
- experience
- education
- skills
- tools
- technologies
- selected achievements
- personal working philosophy
- résumé CTA

Do not duplicate the résumé word-for-word.

Rewrite into web-friendly presentation while remaining factually faithful.

---

# PHASE 34 — RESUME EXPERIENCE

Provide:

`View Resume`

and/or

`Download Resume`

Use the real résumé from `Data/`.

If PDF:

serve it appropriately from public assets.

If DOCX:

consider providing downloadable original plus generated/readable presentation if appropriate, without damaging original.

Use:

semantic link

proper file name

download attribute where appropriate.

Ensure search engines do not incorrectly index private/unwanted information if such information exists.

---

# PHASE 35 — RESPONSIVE IMPLEMENTATION

Desktop interactions must NOT simply be squeezed into mobile.

Create deliberate mobile behavior.

## Desktop

- full custom cursor
- magnetic interactions
- floating project previews
- giant portrait hero
- smooth marquee
- side navigation drawer
- list/grid switching

## Tablet

reduce magnetic distance.

simplify project preview behavior where necessary.

## Mobile

disable cursor-follow effects.

use touch-friendly project cards.

avoid hover-dependent content.

preserve:

- loader
- page transitions
- typography hierarchy
- smooth reveals
- marquee
- project storytelling
- curved transition identity

Hero on mobile must remain beautiful.

Do NOT simply use:

`display:none`

for everything interesting.

---

# PHASE 36 — ACCESSIBILITY

Accessibility is mandatory.

Implement:

- semantic landmarks
- keyboard navigation
- visible focus states
- meaningful alt text
- aria labels where necessary
- correct heading hierarchy
- accessible navigation drawer
- focus trapping in menu if appropriate
- Escape to close menu
- sufficient color contrast
- no inaccessible hover-only information
- reduced-motion handling

Honor:

`prefers-reduced-motion: reduce`.

In reduced-motion mode:

- remove unnecessary cursor-follow behavior
- drastically simplify transitions
- remove endless marquee if necessary
- avoid large smooth-scroll interpolation
- preserve navigation usability

---

# PHASE 37 — SEO — MUST BE EXCELLENT

SEO must be treated as a first-class engineering requirement.

Use Next.js Metadata API correctly.

Create strong metadata for every major page.

Implement:

- page title
- title template
- meta description
- keywords only where sensible
- canonical URLs
- Open Graph
- Twitter cards
- favicon set
- site icons
- manifest
- metadataBase
- authorship
- creator
- publisher where applicable

Generate dynamic metadata for project routes.

Each project should have its own:

- SEO title
- description
- canonical route
- OG data
- social preview where possible

---

# PHASE 38 — STRUCTURED DATA

Add schema.org JSON-LD.

Potential types:

- `Person`
- `WebSite`
- `ProfilePage`
- `CreativeWork`
- `SoftwareApplication`
- `BreadcrumbList`

depending on content.

Person schema should include only accurate public data derived from my provided information.

Possible fields:

- name
- jobTitle
- url
- image
- sameAs
- alumniOf
- knowsAbout

Do not fabricate employers, education, awards, or achievements.

---

# PHASE 39 — SITEMAP AND ROBOTS

Create:

`app/sitemap.ts`

and

`app/robots.ts`

Ensure:

- all public project routes appear
- canonical URLs are correct
- unnecessary technical paths are excluded
- no test pages are indexed

---

# PHASE 40 — SEMANTIC URL DESIGN

Use professional slugs.

Examples:

`/work`

`/work/public-notice-management`

`/about`

`/contact`

Avoid:

`/pages/aboutpage`

`/project?id=25`

Use redirects if route structure ever changes.

---

# PHASE 41 — SOCIAL SHARING

Create polished OG imagery.

At minimum:

homepage OG

project-specific OG if practical.

OG image should include:

- name
- profession
- clean identity
- readable typography
- no clutter

Use correct sizes:

1200×630 where appropriate.

---

# PHASE 42 — IMAGE OPTIMIZATION

Use `next/image`.

For hero:

use correct priority strategy.

Avoid loading every below-the-fold project image immediately.

Use:

- responsive `sizes`
- modern image formats
- correct width/height
- lazy loading
- blurred placeholder where useful
- optimized assets

Prevent CLS.

Hero may preload if it is LCP-critical.

Do NOT preload the entire website.

---

# PHASE 43 — PERFORMANCE

Target excellent Core Web Vitals.

Aim for:

LCP < 2.5s

CLS < 0.1

INP < 200ms

under realistic conditions where possible.

Animations must primarily use:

- transform
- opacity

Avoid repeated animation of:

- width
- height
- top
- left
- expensive box-shadow
- filter blur on huge areas

Use `will-change` only where justified.

Remove it after expensive animations where practical.

---

# PHASE 44 — GSAP CLEANUP

Every GSAP context/timeline/ScrollTrigger must be cleaned up when component unmounts.

Use:

`gsap.context()`

or equivalent React-safe patterns.

Kill:

- timelines
- triggers
- listeners
- RAF loops

when appropriate.

There must be no duplicate ScrollTriggers after route navigation.

---

# PHASE 45 — LENIS INTEGRATION QUALITY

Lenis must not:

- fight browser scrolling
- break anchors
- break accessibility
- produce nested RAF loops
- cause incorrect ScrollTrigger positions

Use a proper single animation loop architecture.

Pause Lenis when:

- menu requires locking
- page transition fully covers screen
- modal is open

Resume safely afterward.

---

# PHASE 46 — CUSTOM CURSOR PERFORMANCE

Use one global cursor component.

Do NOT create one cursor instance per project card.

Cursor animation should use:

- requestAnimationFrame
- quickTo
- interpolation
- transforms

Avoid React state updates on every mousemove.

Use refs.

This is very important.

---

# PHASE 47 — ANIMATION RESPONSIBILITY

Do not put giant animation timelines directly inside JSX.

Create reusable motion abstractions.

Possible utilities:

`useMagnetic()`

`useCursorPreview()`

`useTextReveal()`

`usePageTransition()`

`useSmoothScroll()`

`useMediaQuery()`

`useReducedMotion()`

Keep animation code understandable.

---

# PHASE 48 — COMPONENT RESPONSIBILITY

No huge god components.

For example:

Bad:

`HomePage.tsx` = 1500 lines.

Better:

HomePage

→ Hero

→ Intro

→ FeaturedWork

→ Contact

Each subcomponent remains focused.

---

# PHASE 49 — DATA-DRIVEN CONTENT

Project content should come from structured data.

Example:

`data/projects.ts`

or MDX/content files.

Do not repeat identical project markup manually.

This should make adding another project easy.

---

# PHASE 50 — CODE QUALITY EXPECTATIONS

Use:

- clear naming
- descriptive functions
- typed props
- composition
- server components by default
- client components only where interactive
- small client boundaries
- reusable utilities

Do not add `"use client"` at the top of every file.

Do not convert the whole website into a client-side application unnecessarily.

---

# PHASE 51 — NEXT.JS BEST PRACTICES

Use server components for static/SEO-friendly content.

Use client components only for:

- GSAP
- cursor
- navigation interaction
- stateful controls
- Lenis
- motion

Keep large project content server-renderable.

This should improve:

- SEO
- performance
- initial loading

---

# PHASE 52 — NO GENERIC TEMPLATE LOOK

The result must NOT resemble:

- ThemeForest template
- bootstrap developer portfolio
- generic shadcn dashboard
- purple-gradient SaaS
- AI-generated landing page
- three-column feature-card homepage

The visual identity should feel intentional and editorial.

---

# PHASE 53 — NO OVERUSE OF UI LIBRARIES

Do not blindly install many libraries.

Before adding dependency ask:

Can this reasonably be implemented directly?

Main likely dependencies:

- Next
- React
- GSAP
- Lenis
- useful utility packages only where justified

Avoid installing 20 animation libraries simultaneously.

Do not combine:

GSAP + Framer Motion + Motion One + Anime.js

without genuine need.

Prefer a clear primary motion stack.

---

# PHASE 54 — HOVER QUALITY

Every hover should have purpose.

Navigation:

subtle movement / underline / active dot.

Primary buttons:

magnetic + accent fill.

Project row:

floating project preview.

Project card:

View cursor + slight media response.

Text links:

small underline/reveal.

Do not add scale 1.1 to every element.

---

# PHASE 55 — MEDIA INTERACTIONS

Project imagery can have restrained scroll movement.

For example:

slight image translation relative to container

or clip reveal.

Avoid extreme parallax.

Do not make users motion-sick.

---

# PHASE 56 — HERO IMAGE BEHAVIOR

The hero portrait from `Data/` should be handled carefully.

Desktop:

large centered or slightly asymmetric portrait.

bottom anchored.

approximately 90vh visual height.

Large display typography can overlap visually in front/behind depending on composition.

Tablet:

reduce portrait size.

Mobile:

recompose portrait to avoid cutting head/face.

Make focal position responsive.

Do not stretch the image.

---

# PHASE 57 — LAYERING SYSTEM

Use deliberate z-index layers.

Example conceptual hierarchy:

background

portrait

hero text

marquee

navigation

custom cursor

page transition

navigation drawer

Avoid random values like:

`z-index: 99999999`

everywhere.

Create named z-index tokens.

---

# PHASE 58 — PROJECT FILTERING

If projects support categories:

filter using meaningful categories.

Examples:

Full Stack

Frontend

Backend

AI

Cloud

Mobile

Experiments

Use categories based on actual résumé/projects.

Do not fabricate projects merely to fill filters.

Animate filtering smoothly.

---

# PHASE 59 — EXPERIENCE SECTION

Developer portfolio should include professional experience in a premium editorial format.

Possible design:

large role/company

dates aligned separately

minimal supporting description

technology / responsibilities

Use actual resume data.

Do not use generic timeline circles connected by a vertical line unless it genuinely fits the design.

---

# PHASE 60 — SKILLS PRESENTATION

Avoid huge logo clouds.

Present technical expertise elegantly.

Possible categories:

Frontend

Backend

Cloud

AI

DevOps

Databases

Tools

Use strong typography.

Animated but restrained.

Information should remain searchable text, not only icons.

---

# PHASE 61 — CONTACT EXPERIENCE

Contact should include:

email

GitHub

LinkedIn

download/view résumé

any accurate public links from résumé

Use proper external link behavior.

For email:

use `mailto:` appropriately.

For external links:

use safe attributes.

---

# PHASE 62 — ERROR PAGES

Create polished:

404

and appropriate error boundaries.

The 404 should retain the site's visual language.

Could use:

large typography

small playful cursor interaction

home link.

Do not ship default Next.js 404.

---

# PHASE 63 — LOADING STATES

Internal navigation should primarily use custom transition system.

For real async loading:

design graceful fallback.

Never leave a frozen screen.

Do not use fake 5-second loaders.

---

# PHASE 64 — BROWSER SUPPORT

Test at least conceptually for:

Chrome

Safari

Firefox

Edge

Pay particular attention to Safari for:

- svh
- clip-path
- fixed positioning
- smooth scrolling
- blend modes
- SVG mask

Use progressive enhancement.

---

# PHASE 65 — RESPONSIVE BREAKPOINT TESTING

Test representative widths:

375

390

430

768

1024

1280

1440

1920

2560

and ultra-wide where reasonable.

Avoid designing only for 1440px.

The Dennis-inspired oversized composition should remain balanced on large monitors.

---

# PHASE 66 — SEO CONTENT QUALITY

Do not stuff keywords.

Homepage title should be something professional such as:

`Ashok Bhattarai — Software Developer`

or a refined variation based on actual résumé information.

Description should explain:

what I do

specialties

relevant positioning

naturally.

Project descriptions should contain meaningful technical context.

---

# PHASE 67 — SECURITY / PRIVACY

Inspect resume before exposing information.

Do not unnecessarily publish:

- private home address
- private IDs
- sensitive numbers
- references' private information

Use professional public information only where appropriate.

Do not fabricate redactions silently; preserve the downloadable résumé itself unless explicitly changing it, but be careful what gets surfaced as page text or metadata.

---

# PHASE 68 — FINAL POLISH PASS

After implementation:

go through the entire portfolio as if you were a senior design reviewer.

Inspect:

- typography
- alignment
- spacing
- hover consistency
- transitions
- cursor lag
- scroll feel
- responsive behavior
- image quality
- accidental overflow
- scrollbar behavior
- navigation
- focus states
- project consistency
- page-transition timing
- text readability

Fix anything that feels:

cheap

generic

too fast

too slow

overanimated

underanimated

misaligned

inconsistent.

---

# PHASE 69 — PERFORMANCE AUDIT

Run:

build

lint

typecheck

format check

Then inspect for:

- bundle size
- huge client components
- unnecessary libraries
- oversized images
- incorrect preload
- hydration warnings
- duplicate listeners
- GSAP leaks
- Lenis issues

Optimize.

---

# PHASE 70 — SEO AUDIT

Verify:

- metadata
- OG metadata
- canonical links
- structured data
- sitemap
- robots
- heading structure
- project slugs
- alt text
- internal linking
- resume link
- contact links
- social links

No placeholder metadata.

No:

`My Next App`

No lorem ipsum.

No placeholder OG image.

---

# PHASE 71 — FINAL BUILD VALIDATION

Run:

`bun run format`

`bun run lint`

`bun run typecheck`

`bun run build`

Everything must pass.

Do not declare completion while build errors remain.

---

# PHASE 72 — FINAL EXPERIENCE WALKTHROUGH

Before considering the project finished, manually reason through this exact user journey:

OPEN SITE

→ multilingual greeting loader

→ curved curtain reveal

→ portrait hero

→ massive moving identity typography

→ magnetic navigation

→ smooth scroll

→ editorial introduction

→ magnetic About CTA

→ project rows

→ cursor-follow project preview

→ project-to-project hover transitions

→ More Work CTA

→ curved transition into contact

→ large Get In Touch interaction

→ menu opens

→ drawer interaction

→ select Work

→ black curved route transition

→ `• Work`

→ Work hero

→ filters

→ list mode

→ floating row previews

→ switch to grid

→ large project media

→ hover View cursor

→ select project

→ curved dark transition

→ `• Project Name`

→ project hero

→ large media storytelling

→ technical case study

→ next project section

→ Back to Work

→ `• Work`

→ Work page revealed again.

This entire sequence should feel like **one coherent motion system**.

---

# IMPORTANT MOTION PRINCIPLE

Do not imitate the reference by creating dozens of unrelated animations.

The premium effect comes from repeatedly using the same small family of motion principles:

CURTAIN

CURVE

DESTINATION LABEL

REVEAL

MAGNETIC MOVEMENT

CURSOR MEDIA

SMOOTH INERTIA

OVERSIZED TYPOGRAPHY

LARGE MEDIA

LIGHT/DARK RHYTHM

These should define the entire project.

---

# IMPORTANT VISUAL PRINCIPLE

The site should rely primarily on:

typography

spacing

imagery

motion

hierarchy

not decoration.

Avoid:

excessive borders

random cards

floating glass panels

huge icon sets

unnecessary gradients

visual clutter.

---

# IMPORTANT DEVELOPMENT PRINCIPLE

Write the project like a serious professional production codebase.

Not like an AI-generated demo.

This means:

- reusable architecture
- no duplicated logic
- good TypeScript
- strict linting
- consistent formatting
- semantic components
- correct SEO
- accessibility
- performance
- responsive interaction
- proper motion cleanup
- logical naming
- meaningful commits if version control is being used

---

# IMPORTANT: IMPLEMENT IN PHASES, NOT EVERYTHING AT ONCE

Complete the project in this order:

PHASE A  
Repository inspection + Data asset inspection

PHASE B  
Bun + Next.js initialization

PHASE C  
Lint + TypeScript + Prettier + project architecture

PHASE D  
Design tokens + fonts + global styles

PHASE E  
Lenis + GSAP motion foundation

PHASE F  
Loader + curved reveal

PHASE G  
Hero + portrait + marquee

PHASE H  
Homepage intro

PHASE I  
Magnetic interaction system

PHASE J  
Custom cursor

PHASE K  
Featured project rows + cursor preview

PHASE L  
Contact/footer

PHASE M  
Navigation drawer

PHASE N  
Global page transition

PHASE O  
Work page list

PHASE P  
Work page grid

PHASE Q  
Project routes

PHASE R  
Project case-study template

PHASE S  
Next project flow

PHASE T  
About/resume integration

PHASE U  
responsive refinement

PHASE V  
accessibility

PHASE W  
SEO + structured data

PHASE X  
performance optimization

PHASE Y  
lint/type/build audit

PHASE Z  
full interaction QA and final polish

Do not rush from initialization straight into random styling.

Build the foundation properly.

---

# WORKING STYLE

Work autonomously.

Do not continuously ask me obvious questions.

Inspect the repository and make professional decisions yourself where the answer can be inferred.

When uncertain between multiple reasonable implementation options:

choose the solution that best balances:

1. visual quality
2. maintainability
3. performance
4. accessibility
5. Next.js best practice.

Do not stop after building the homepage.

The requested output is a **complete responsive portfolio experience** from initial loading screen all the way through project case studies and contact interaction.

---

# FINAL QUALITY BAR

The finished website must feel like it was created by:

a senior creative developer  
+ senior product designer  
+ motion designer  
+ experienced Next.js engineer.

Not by an AI page generator.

The benchmark is the level of polish seen in world-class Awwwards-style creative developer portfolios, while remaining technically clean, usable, fast, accessible, and suited specifically to a professional software developer.

Use the provided hero image and resume from `Data/`, initialize and manage the project entirely using Bun, maintain excellent linting/formatting/TypeScript standards, and treat SEO, accessibility, responsiveness, animation quality, and performance as mandatory—not optional finishing touches.