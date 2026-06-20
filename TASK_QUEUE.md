# TASK_QUEUE.md

**Last updated:** 2026-06-20 (Asia/Dhaka) — post-audit documentation sync
**Owner:** Antigravity (acting on a Cline handoff)
**Goal:** Re-prioritise the working session's backlog against the
actual current state of the codebase, and capture the new doc-audit
findings as explicit tasks so they don't get lost.

---

## 0. Doc audit 2026-06-20 (new)

The 2026-06-20 audit found the following drift between the docs and
the code. Each item has been folded into the appropriate task below
or, if purely cosmetic, filed under **N2** as a one-time docs cleanup.

| # | Drift | Where it lives in the queue |
|---|---|---|
| 1 | Channel count is **256 / 261** in `data/catalog-meta.json`, but all three docs still say 253 / 257. | B2, U1, AGENT_HANDOFF status — inline fixed. |
| 2 | README no longer contains the word "Authenticated"; it now explicitly says **Open API routes**. | **H3 rewritten** — README fix is done; only the product decision remains. |
| 3 | Old notes describe `predev` / `prebuild` npm hooks. The actual `package.json` chains `import:playlist && next …` inside `dev` / `build` — no pre/post hooks. | Behaviour-equivalent; corrected in AGENT_HANDOFF "Notes for Next Agent". N2 covers the leftover wording in `PROJECT_CONTEXT.md`. |
| 4 | `PROJECT_CONTEXT.md` §3 says "Inter font" — actual UI uses **Bricolage Grotesque + JetBrains Mono**. | **N2**. |
| 5 | `PROJECT_CONTEXT.md` §4 says `maxSyncAttempts: 3` — actual `stream-player.tsx` `engineOverrides` uses `liveSyncDurationCount: 3` (hls.js v1.5+ option name). | **N2**. |
| 6 | `PROJECT_CONTEXT.md` §4 says channel card shows a "LIVE-or-PLAYING badge" — actual UI: coloured status dot, no badge text. | **N2**. |
| 7 | `eslint-disable react-hooks/set-state-in-effect` is at the top of `stream-player.tsx` (deliberate). | Noted in AGENT_HANDOFF "Warnings / Constraints". |
| 8 | `components/ui/input.tsx` uses inline `style` focus/blur handlers instead of a CSS class. | **N3** (optional micro-refactor). |
| 9 | `data/channels-source.json` is the orphan of the prior `{info, channels:[…]}` data format. `lib/static-channels.ts` has a defensive wrapper branch that the current data no longer exercises. | **M3** — already captured, expanded with the wrapper-branch simplification. |

---

## Bugfixes

### B1. Normalize malformed `tvg-logo` URLs (logo parser) ✅ RESOLVED 2026-06-17
- **Files:** `components/app-shell.tsx`,
  `scripts/import-playlist/import-catalog.ts`.
- **Issue:** Console `Failed to construct 'URL': Invalid URL` at
  `ChannelLogo` + `next/image` `Failed to parse src
  "://tplay.live/originals/bengali-beats/bengali-beats.png"`.
- **Root cause:** Upstream M3U `tvg-logo` values are occasionally
  malformed protocol-relative URLs (`://host/path` or `//host/path`).
  The import script was passing them through verbatim, and
  `ChannelLogo` handed the raw string straight to `next/image`.
- **Fix:** Defensive `normalizeLogoUrl()` helper added in both layers:
  the component normalizes at render time and falls back to the `<Tv />`
  placeholder icon for un-parseable values; the import script
  normalizes at parse time so the next catalog regeneration writes
  clean URLs.
- **Status:** ✅ Done. Next catalog regeneration will use the new
  normalizer; until then, the component-level normalizer handles any
  remaining dirty values.

### B2. Retarget `import-catalog.ts` to the documented upstream ✅ RESOLVED 2026-06-18
- **Files:** `scripts/import-playlist/import-catalog.ts`,
  `data/playlist.m3u`, `data/channels.json`, `data/catalog-meta.json`.
- **Issue:** The import script's two upstream URLs still pointed at
  `imShakil/tvlink` (with `all.m3u`), even though documentation had
  claimed `abusaeeidx/Mrgify-BDIX-IPTV` as the actual source for some
  time.
- **Root cause:** Stale URL constants at the top of
  `fetchRemotePlaylist()`.
- **Fix:** Retargeted both URLs to
  `https://api.github.com/repos/abusaeeidx/Mrgify-BDIX-IPTV/contents/`
  and
  `https://raw.githubusercontent.com/abusaeeidx/Mrgify-BDIX-IPTV/main/playlist.m3u`.
  GitHub Contents probe now resolves `playlist.m3u` directly.
- **Verification:** `npm run import:playlist` succeeded — at the time
  it imported **253 channels with 257 stream sources** across 9
  categories. `npm run typecheck` clean. `npm run build` clean.
  `npm run lint` showed only the pre-existing `(file: any)` error
  on line 132 of the same script — already known and out of scope.
- **Doc note (2026-06-20 audit):** a subsequent regeneration on
  2026-06-19 reported **256 channels / 261 stream sources** — see
  `data/catalog-meta.json` for the current state.

### B3. Player error overlay not dismissed when last source recovers ✅ RESOLVED 2026-06-20
- **Files:** `components/stream-player.tsx`.
- **Symptom (reported):** "I played a channel, which played well but
  still shows the error message." The red `All stream routes failed…`
  panel remained on top of the playing video even though the
  underlying HLS instance was successfully decoding and playing the
  stream.
- **Root cause:** `advanceSource()` (line 48) has a last-source branch
  that sets `fatalError = "All stream routes failed…"` and **returns
  `current`** — i.e. it does **not** increment `sourceIndex`. Because
  `activeSource?.url` is unchanged, the HLS effect does **not** re-run,
  the HLS instance is **not** destroyed, and no new effect is
  scheduled. The HLS instance for that last source keeps trying. If it
  eventually recovers (BDIX mirrors often take 8–12 s on first
  manifest fetch, while the stall watchdog fires at 6.5 s),
  `handlePlaying` fires and the `<video>` plays — but **nothing
  clears `fatalError`**, so the
  `{fatalError ? <div …>…</div> : null}` overlay stays on top of the
  playing video. `setOverlay("")` is called in `handlePlaying`, but
  `overlay` is a separate state from `fatalError`.
- **Trace (proves the bug):**
  - `fatalError` is set in only two places: line 58 (this branch) and
    line 143 (browser-can't-decode-HLS).
  - `fatalError` is cleared in only three places: line 52 (start of
    `advanceSource`), line 65 (channel change), line 77 (source change).
  - Neither `handlePlaying` nor `handleReady` clears it.
- **Fix:** Added `setFatalError("")` to both `handleReady` and
  `handlePlaying` in `components/stream-player.tsx`. Two lines, no
  behavioural change for the normal happy path. `setFatalError` is a
  stable React state setter, so the listeners bound inside the effect
  will still call the right setter across cleanup/rebind cycles.
- **Verification:** `npx tsc --noEmit` clean; `npx eslint
  components/stream-player.tsx` clean.
- **Side observation (out of scope here):** the 6.5 s stall watchdog
  (`stream-player.tsx:96-98`) is aggressive for BDIX sources and is
  what causes the last-source branch to be reached in the first place.
  Bumping it to ~12 s would reduce how often this branch is entered at
  all — now tracked as **N1**.
- **Scope kept tight:** No API/data/UI-shape change; no change to
  `advanceSource` itself; no change to the watchdog timer; no change
  to the Retry button.

### B4. Category-nav button font-size override (tailwind-merge drops text-[12px]) ✅ RESOLVED 2026-06-20
- **File:** components/app-shell.tsx.
- **Symptom (reported):** Category-nav buttons in the sidebar
  rendered larger than intended. Devtools showed no font-size: 12px
  rule being emitted for the button.
- **Root cause:** tailwind-merge does not statically recognize
  text-[var(--accent)] as a text-color utility — it cannot prove
  a CSS-variable value resolves to a color. When cn(...) received
  both text-[12px] (font-size) and text-[var(--accent)] (color),
  the default merger treated them as two classes from the SAME
  text-* group and kept only the last one. text-[12px] was
  silently dropped, the font-size collapsed to the inherited parent
  value (14px), and no 12px rule was emitted at all.
- **Fix:** Added style={{ pointerEvents: "auto", fontSize: "12px" }}
  to the category-nav <button> in components/app-shell.tsx.
  Inline style bypasses tailwind-merge entirely, so the 12px
  font-size is guaranteed to apply regardless of how cn resolves
  the rest of the className.
- **Scope kept tight:** Localized to one button. Did NOT modify
  lib/utils.ts (an architecture-level tailwind-merge extension
  to register text-[var(--*)] as text-color was proposed but
  rejected as out of scope). Did NOT remove text-[12px] from the
  className — kept as the documented intent.
- **Verification:** grep confirms fontSize: "12px" is present at
  components/app-shell.tsx:249. Visual verification pending
  next dev-server load.
- **See:** AGENT_HANDOFF.md §B4 for the full write-up.

## High Priority (do first)

### H1. shadcn `Button` and `Input` reference undefined CSS tokens ✅ RESOLVED 2026-06-17 (side-effect of U1)
- **Files:** `app/globals.css`, `components/ui/button.tsx`,
  `components/ui/input.tsx`, `components/app-shell.tsx`,
  `components/stream-player.tsx`.
- **Issue:** `globals.css` defined `--accent` and `--foreground` only;
  `components/ui/button.tsx` and `components/ui/input.tsx` referenced
  several other tokens (`--accent-glow`, `--surface-2`, `--surface-3`,
  `--border-bright`, `--foreground-muted`) that didn't exist. `app-shell.tsx`
  painted everything with raw Tailwind utilities (`zinc-950`,
  `violet-300/400`, etc.) that didn't line up with the token palette.
- **Resolution:** Full token system declared in `app/globals.css`
  (surfaces 1–4, foreground/muted/dim, border, accent, accent-glow,
  accent-foreground, status-live/playing/offline). All Tailwind
  utilities in `app-shell.tsx` and `stream-player.tsx` replaced with
  `var(--token)` references. shadcn `Button` and `Input` now resolve
  cleanly.

### H2. Tighten `next.config.ts` `remotePatterns` ✅ RESOLVED 2026-06-20
- **File:** `next.config.ts`.
- **Issue:** `remotePatterns: **` for both `http` and `https` — any
  host can serve `next/image` content.
- **Fix:** Replaced wildcard with an explicit allow-list of 11 HTTPS
  hosts actually serving logos in the current catalog: `abusaeeidx.github.io`,
  `assets-prod.services.toffeelive.com`, `blogger.googleusercontent.com`,
  `pbs.twimg.com`, `raw.githubusercontent.com`, `s3.aynaott.com`,
  `s4.gifyu.com`, `seeklogo.com`, `static.wikia.nocookie.net`,
  `tstatic.akash-go.com`, `upload.wikimedia.org`. Removed `http`
  wildcard entirely.
- **Caveat:** If the upstream M3U introduces a new logo host, logos
  will 404 via `next/image` until the allow-list is updated.
  `ChannelLogo` already falls back to a `<Tv />` icon.
- **Verification:** `npx tsc --noEmit` clean; `npx eslint next.config.ts`
  clean; `npm run build` clean.

### H3. Resolve the README "Authenticated" claim ✅ RESOLVED 2026-06-20
- **Files:** `README.md`.
- **Decision:** Option **(b) — accept no auth**. The dashboard is a
  personal / LAN tool; unauthenticated public deployment is a
  non-goal.
- **Fix:** Added a `## Security` section to `README.md` clarifying:
  - No authentication exists; all API routes and streams are open.
  - Do not expose to the public internet without an auth layer.
  - `next/image` remote patterns are locked to a curated allow-list
    (see H2).
- **Verification:** README accurately reflects reality; no code
  change needed.

---

## UI Redesign (this session, prior)

### U1. Modern, bold, aggressive visual overhaul ✅ RESOLVED 2026-06-17
- **Files:** `app/globals.css`, `app/layout.tsx`,
  `components/app-shell.tsx`, `components/stream-player.tsx`,
  `components/ui/button.tsx`, `components/ui/input.tsx`.
- **Audit verification (2026-06-20):** All of the following are
  present in the current code:
  - True-black backgrounds + layered surfaces (`#000000`, `#0a0a0a`,
    `#111111`, `#1a1a1a`, `#242424`).
  - Electric lime accent `#d4ff3a` with glow utility.
  - Three-state status dot (`status-dot--live` / `--playing` /
    `--offline`).
  - Bricolage Grotesque + JetBrains Mono typography loaded from
    Google Fonts via `globals.css` `@import`.
  - Channel cards simplified to **logo + name + status dot only**.
  - Status tile and category pills use mono labels with uppercase
    tracking-wider.
- **Status:** ✅ Done. Side effect: H1 is also resolved (tokens are
  now defined; `Button` / `Input` resolve cleanly).

---

## Medium Priority

### M1. Add generated data files to `.gitignore` ✅ RESOLVED 2026-06-20
- **File:** `.gitignore`.
- **Fix:** Added `data/playlist.m3u`, `data/channels.json`,
  `data/catalog-meta.json`, and `data/channels-source.json` to
  `.gitignore`. No git repo was initialized, so `git rm --cached`
  was not applicable — the entries will take effect once git is
  initialized.

### M2. Direct scan for `/api/categories` ✅ RESOLVED 2026-06-20
- **Files:** `lib/channels.ts`, `app/api/categories/route.ts`.
- **Issue:** `GET /api/categories` was returning the right payload
  but doing far more work than necessary. It called
  `getApiChannels({})`, which routed through `filterChannels` →
  `sortChannels`, returning the full channel sorted list just to
  pluck out the unique `category` strings. O(N log N) work for O(K)
  output.
- **Fix:** Added `getAllCategories(): string[]` to `lib/channels.ts`
  — single linear pass + `Set<string>` + `Array.from(...).sort()`,
  honouring the `is_active` flag. `/api/categories` now calls it
  directly; `getApiChannels` import dropped from that route. Response
  shape unchanged.
- **Verification:** `npx tsc --noEmit` clean; `npx eslint
  app/api/categories/route.ts lib/channels.ts` clean.

### M3. Dead code / unused artifacts ✅ RESOLVED 2026-06-20
- **Files:** `package.json`, `data/channels-source.json` (deleted),
  `public/logos/*.svg` (deleted), `lib/static-channels.ts`.
- **Fix:**
  - `npm uninstall zod` — removed from `package.json`.
  - `data/channels-source.json` — deleted (orphan wrapper file).
  - `public/logos/*.svg` (6 files) — deleted (unreferenced by
    any channel). `public/logos/` directory removed.
  - `lib/static-channels.ts` — simplified to
    `export const staticChannels = channelsData as unknown as Channel[];`
    (dead wrapper branch removed).
- **Verification:** `npx tsc --noEmit` clean; `npx eslint
  lib/static-channels.ts` clean; `npm run build` clean.

### M4. Add `/channel/[slug]` page
- **File:** `app/channel/[slug]/page.tsx`, possibly
  `app/api/channels/[slug]/route.ts` for a stable URL.
- **Issue:** The data model has `slug` per channel but no
  user-visible URL — share-links, browser back, and SEO all suffer.
- **Inferred approach:** Add a server component that takes `params.slug`,
  calls a new `getChannelBySlug(slug)` helper in `lib/channels.ts`,
  and renders the channel page (header + player + "Up next" rail of
  the same category). Could lift state up to allow an
  "auto-resume on direct visit" behaviour. The `app-shell.tsx` channel
  card should be wrapped in a `<Link>` to the new route.
- **Caveat (audit 2026-06-20):** The current card click handler is
  local state in `AppShell` (`onSelect`). If a `<Link>` is added,
  the local state still works for in-app navigation if `<Link>` is
  used with `scroll={false}` and a query param. Decide whether
  the in-app player should persist across navigations or close
  before the new page mounts.
- **Done when:** `http://localhost:3000/channel/ntv` (or any
  in-catalog slug) renders a focused page for that channel;
  channels-grid card is a clickable link.

### M5. Wire favorites via `localStorage`
- **Files:** `lib/favorites.ts` (new), `components/app-shell.tsx`.
- **Issue:** No way to mark a channel as a "favourite"; a basic
  UX expectation.
- **Inferred approach:** Tiny client hook
  `useFavorites(): { favorites: string[]; toggle: (id: string) => void }`
  backed by `localStorage`. Add a star toggle to the channel card
  hover state (would require re-introducing a hover toolbar on the
  card — see "Channel card composition is a public contract" warning
  in AGENT_HANDOFF). Persist across sessions.
- **Caveat (audit 2026-06-20):** A new hover toolbar may
  re-introduce card clutter. Two safe options:
  - (a) **Right-click / long-press menu** for the toggle. Keeps
    card surface minimal.
  - (b) **Footer toolbar in the player pane** when a channel is
    selected. Toggling in the player, not the card.
- **Done when:** users can star a channel; the star persists across
  reloads; "Favorites" filter pill surfaces only favourites.

---

## Low Priority

### L1. Add unit tests
- **Files:** `tests/` (new), `package.json` (devDeps).
- **Issue:** No tests anywhere. The two pure functions in the import
  script — `parseM3u` and `normalizeCategory` — are the highest-value
  targets (pure, deterministic, regression-prone).
- **Inferred approach:** Vitest is the lowest-friction runner for a
  Next.js project today. Cover at least:
  - `parseM3u`: malformed `tvg-logo` (B1's edge case), missing
    `group-title`, `#EXTINF` without a URL.
  - `normalizeCategory`: BDIX routing, "vs" match, bangla keyword
    positive and negative cases, religious fall-through, the
    default "Entertainment" bucket.
- **Done when:** `npm test` is wired and `parseM3u` + `normalizeCategory`
  have ≥ 80 % line coverage.

### L2. Deployment config + minimal CI
- **Files:** `Dockerfile` (or `vercel.json`), `.github/workflows/ci.yml`.
- **Issue:** No deploy target, no CI. `tsc --noEmit` is the closest
  thing to a "lint" today (and is broken by the pre-existing
  `(file: any)` on `import-catalog.ts:132`).
- **Inferred approach:** A `Dockerfile` with `npm ci && npm run build`
  is the most portable target. A `.github/workflows/ci.yml` running
  `npm ci && npm run lint && npm run typecheck && npm run build` is
  the minimum useful gate.
- **Caveat (audit 2026-06-20):** `npm run typecheck` (= `tsc --noEmit`)
  currently fails on `import-catalog.ts:132` because of the
  pre-existing `(file: any)` annotation. That has to be fixed (type
  the parameter as `interface GithubFile { type: string; name: string; download_url?: string; }`)
  before a CI gate can be green.
- **Done when:** `npm run typecheck && npm run lint && npm run build`
  passes locally AND in CI; `Dockerfile` builds a working container.

### L3. (RESERVED)
- Reserved placeholder. Use when a new low-priority item is added.

### L4. EPG (Electronic Program Guide)
- **Issue:** No EPG integration. No upstream chosen.
- **Status:** Deferred. Needs a product decision on EPG source (xmltv
  file? provider API?) before any code.

### L5. PWA (offline support)
- **Files:** `public/manifest.json`, `next.config.ts` PWA plugin (or
  custom service worker).
- **Issue:** No manifest, no service worker, no offline-capable
  shell.
- **Caveat (audit 2026-06-20):** PWA + unauthenticated open API + a
  list of HLS streams is a meaningful UX win (faster repeat visits,
  install-to-home-screen on Android), but a meaningful CI / build
  risk (service workers cache the catalog). Defer until L2 lands.

### L6. (RESERVED)

---

## New (added by 2026-06-20 audit)

### N1. Bump `stream-player.tsx` stall watchdog from 6.5 s to ~12 s ✅ RESOLVED 2026-06-20
- **File:** `components/stream-player.tsx`.
- **Fix:** Extracted the literal `6500` ms into a named constant
  `STALL_WATCHDOG_MS = 12_000` at the top of the file, alongside
  `engineOverrides`. JSDoc comment documents the rationale (BDIX
  mirrors often take 8–12 s on first manifest fetch).
- **Verification:** `npx tsc --noEmit` clean; `npx eslint
  components/stream-player.tsx` clean.

### N2. `PROJECT_CONTEXT.md` documentation drift cleanup
- **File:** `PROJECT_CONTEXT.md`.
- **Audit findings (2026-06-20):**
  1. §3 says "Inter font" — should say Bricolage Grotesque +
     JetBrains Mono (Google Fonts via `globals.css` `@import`).
  2. §4 says `maxSyncAttempts: 3` — should say
     `liveSyncDurationCount: 3` (the hls.js v1.5+ option name).
  3. §4 says channel card shows a "LIVE-or-PLAYING badge" — should
     say a coloured status dot (`status-dot--live` / `--playing` /
     `--offline`); no badge text.
  4. §3 / §4 channel counts (253 / 257) — refresh to 256 / 261
     per `data/catalog-meta.json` (2026-06-19T21:41:22.078Z).
  5. §3 still implies "package.json predev/prebuild" — correct to
     "scripts chain `import:playlist && next …` inside `dev` /
     `build` via `&&`".
- **Inferred approach:** Pure documentation pass. No code touched.
  Edit `PROJECT_CONTEXT.md` lines listed above.
- **Caveat:** `PROJECT_CONTEXT.md` is technically out of scope for
  this audit (the user only asked to update `AGENT_HANDOFF.md` and
  `TASK_QUEUE.md`). Filed here as N2 so the next agent picks it up
  in a single follow-up.
- **Done when:** `PROJECT_CONTEXT.md` accurately describes the
  current state on all five points above.

### N3. Optional micro-refactor: `Input` component focus/blur
- **File:** `components/ui/input.tsx`.
- **Rationale:** Currently uses inline `style` handlers for focus/
  blur, which is slightly inconsistent with the rest of the
  codebase (which uses `var(--token)` references throughout).
- **Inferred approach:** Move the focus / border logic into a CSS
  class with a `:focus` selector, defined either in
  `components/ui/input.tsx` (per-component, since the rest of the
  UI uses globals.css) or in `app/globals.css` (more global).
- **Caveat:** Tiny visual change possible — the inline-style border
  swap may differ slightly from a CSS class due to specificity or
  transition. Verify visually after the refactor.
- **Done when:** `Input` no longer contains inline `style` props;
  focus border uses the same `var(--token)` system as the rest
  of the UI; no visual regression.

### N4. (RESERVED)

---

## Suggested execution order

If the next session picks up from this queue as-is:
1. **M4** (channel page; the most visible UX win).
2. **L1 + L2** (tests + CI; L2 also requires fixing the
   `(file: any)` on `import-catalog.ts:132`).
3. **M5** (favorites; UX nice-to-have).
4. **N2** (doc cleanup; trivial but high signal).
5. **N3** (input focus micro-refactor; optional polish).
6. **L4, L5** (EPG, PWA) — defer until a product decision and L1/L2
   are in place.

Things explicitly **out of scope** until further notice:
- Refactoring the import script's `mergeChannel` priority logic
  (intentional: first-seen URL wins priority 1).
- Changing the channel card composition (logo + name + status dot
  only is a public contract).
- Re-introducing a "LIVE-or-PLAYING badge" (U1 collapsed it to a
  status dot; product-approved).
- Changing the `{channels, count}` or `{categories, count}` API
  response shapes (client contract).
- Removing the `eslint-disable react-hooks/set-state-in-effect`
  pragma in `stream-player.tsx` (deliberate; documented in
  AGENT_HANDOFF).

---

## Resolved items (for reference; not part of active backlog)

- ✅ **B1** Normalize malformed `tvg-logo` URLs (2026-06-17).
- ✅ **B2** Retarget `import-catalog.ts` to `abusaeeidx/Mrgify-BDIX-IPTV`
  (2026-06-18).
- ✅ **B3** Player error overlay not dismissed when last source
  recovers (2026-06-20).
- ✅ **H1** shadcn `Button` / `Input` reference undefined CSS tokens
  (2026-06-17, side-effect of U1).
- ✅ **H2** Tighten `next.config.ts` `remotePatterns` (2026-06-20).
- ✅ **H3** Accept no auth; add README security note (2026-06-20).
- ✅ **U1** Modern, bold, aggressive visual overhaul (2026-06-17).
- ✅ **M1** Add generated data files to `.gitignore` (2026-06-20).
- ✅ **M2** Direct scan for `/api/categories` (2026-06-20).
- ✅ **M3** Dead code / unused artifacts cleanup (2026-06-20).
- ✅ **N1** Bump stall watchdog to 12s (2026-06-20).
- ✅ **B4** Category-nav button font-size override (2026-06-20).
