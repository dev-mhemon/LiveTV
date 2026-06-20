# PROJECT_CONTEXT.md

> Reconstructed by Cline in Bootstrap Mode on 2026-06-17.
> Source: `d:\LiveTV`. Anything not directly visible in the code is `unknown`.

---

## 1. What the project is

A self-hosted, browser-based **IPTV dashboard** that aggregates and plays
live TV streams primarily aimed at Bangladesh BDIX users.

Inferred signals:
- `README.md` calls it an "Authenticated BDIX IPTV dashboard with resilient
  HLS playback" (auth is **not** actually implemented — see §5).
- `app/api/health/route.ts` self-identifies as `service: "bdix-live-tv"`.
- Build pipeline fetches an M3U playlist from
  `github.com/abusaeeidx/Mrgify-BDIX-IPTV` and normalises it into a curated
  catalog.
- Catalog has **255 channels / 259 stream sources** across **9 categories**:
  BDIX, Bangla, Entertainment, Kids, Movies, Music, News, Religious, Sports.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (latest, App Router, Turbopack, RSC) |
| Language | TypeScript (strict, target ES2017, `moduleResolution: bundler`) |
| UI | React (latest) |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss` + CSS vars in `globals.css` |
| Components | shadcn/ui scaffold (`new-york` style, `zinc` base) — only `Button`, `Input` |
| Video | `hls.js` (Web Worker) + native HLS fallback (Safari) |
| Icons | `lucide-react` |
| Class merge | `clsx` + `tailwind-merge` via local `cn()` helper |
| Validation | `zod` — declared but **never imported** (dead dep) |
| Build-script runner | `tsx` for `scripts/import-playlist/import-catalog.ts` |

---

## 3. Architecture

```
GitHub: abusaeeidx/Mrgify-BDIX-IPTV (playlist.m3u)
  │
  ▼
scripts/import-playlist/import-catalog.ts
  fetchRemotePlaylist() → parseM3u() → mergeChannel() + normalizeCategory()
  → writes data/playlist.m3u, data/channels.json, data/catalog-meta.json
  (run on `npm run dev` and `npm run build`)
  │
  ▼
Next.js runtime
  app/page.tsx (RSC) ─ getInitialChannels() ─► <AppShell />
  app/api/channels  ─ getApiChannels({category, query})  (60s cache)
  app/api/categories ─ scans channels to list unique categories
  app/api/health
  │
  ▼
components/app-shell.tsx (client)
  ├─ Header + status tiles
  ├─ Search + category pills
  ├─ <StreamPlayer /> (hls.js, priority-sorted source fallback)
  └─ Channel grid (logo / name / category / LIVE-or-PLAYING badge)
```

Directory map (only files that exist):

```
app/
  layout.tsx          Root <html className="dark"> + Inter font.
  page.tsx            RSC; loads initial channels → <AppShell />.
  globals.css         Design tokens + gradient background.
  api/
    channels/route.ts     GET ?category=&q=
    categories/route.ts   GET
    health/route.ts       GET

components/
  app-shell.tsx       Client shell (header, player, search, grid).
  stream-player.tsx   hls.js player with source fallback.
  ui/
    button.tsx        CVA Button (default/secondary/ghost/danger).
    input.tsx         Input w/ optional lucide icon slot.

lib/
  channels.ts         sortChannels, filterChannels, getInitialChannels, getApiChannels.
  static-channels.ts  Loads data/channels.json; tolerates bare array or {channels:[…]}.
  types.ts            Channel, StreamSource interfaces.
  utils.ts            cn() helper.

scripts/import-playlist/
  import-catalog.ts   M3U fetch → parse → normalize → JSON catalog.

data/
  playlist.m3u        Cached M3U (auto-generated).
  channels.json       Generated catalog (auto-generated).
  catalog-meta.json   Generation metadata (auto-generated).
  channels-source.json  Orphan {info, channels:[…]} snapshot — not referenced.

public/logos/         6 SVGs — none referenced by current catalog.
```

---

## 4. Current implemented features

**Pipeline (`scripts/import-playlist/import-catalog.ts`):**
- Two-stage fetch fallback (GitHub Contents API → raw URL → local cache).
- `parseM3u` handles `#EXTINF` with quoted commas, `tvg-name/logo/group-title`.
- `mergeChannel` dedupes by lowercased name, keeps first source as priority 1,
  appends rest as `Playlist fallback`, picks best logo, applies `Entertainment`
  override on duplicates.
- `normalizeCategory` cascade: BDIX → Bangla (~40 keywords + 10 `.bd` domains)
  → Religious → News/Sports/Movies/Kids/Music → default Entertainment.
- Filters out "live event" group/name entries and " vs " (sports broadcasts).
- Slugify, unique-slug, deterministic UUID (SHA-1 → v5-shaped).
- Quality inference (`2160/4K`, `1080p`, `720p`, `480p`, else `auto`).
- Wired into `npm run dev` / `npm run build`.

**Server (App Router):**
- `app/page.tsx` server-renders initial channels.
- `app/api/channels` — `category` + `q` filters; 60s `Cache-Control`.
- `app/api/categories` — sorted, deduplicated category list.
- `app/api/health` — liveness probe.
- Initial sort: category → name; drops `is_active=false` (currently always true).

**Client UI (`components/app-shell.tsx`):**
- Header with brand mark + sticky layout.
- Immediate client-side search (name + category substring).
- Horizontal category pills with `All` option.
- Responsive grid (`min-width: 260px`) with logo / name / category / LIVE|PLAYING
  badge / animated progress bar.
- Status tiles: `Active channels`, `Categories`, `Max buffer`.
- Empty state when filters return zero results.
- Dark theme with violet accent (`#7c3aed`) and radial gradient background.

**Player (`components/stream-player.tsx`):**
- Source fallback sorted by `priority` (asc).
- hls.js config: `maxBufferLength: 10s`, `maxMaxBufferLength: 15s`,
  `backBufferLength: 5s`, `maxSyncAttempts: 3`, `enableWorker: true`.
- Auto-fallback on fatal/network/media error (one retry, then advance source).
- Stall watchdog (~6.5s without `timeupdate`) → advance source.
- Native HLS path for Safari via `canPlayType('application/vnd.apple.mpegurl')`.
- Overlays: "Connecting…", "Optimizing Stream Routing…", error/retry button,
  masked URL display.

**Misc:**
- `lib/static-channels.ts` accepts bare array or `{channels:[…]}` wrapper.
- `lib/utils.ts` exposes the shadcn `cn()` helper.

---

## 5. Missing features

**Documented but not implemented:**
- Authentication. README says "Authenticated"; no middleware / session / login.
- Most of the shadcn component set — only `Button` and `Input` are present.

**Not present (genuinely missing, not assumed):**
- EPG / program guide — no EPG-related files.
- `/channel/[slug]` route — slugs are generated but unused.
- Favorites / recents / watch history — no persistence layer (no `localStorage`,
  cookies, IndexedDB, or server DB wiring).
- PWA manifest / service worker — no `manifest.webmanifest` / SW files.
- Tests — no `__tests__/`, no `*.test.*`, no `vitest` / `jest` config.
- CI config — `vercel.json` referenced in `.gitignore` but absent.

---

## 6. Bugs / issues (observed)

- **Broken CSS tokens in shadcn primitives.** `components/ui/button.tsx` and
  `components/ui/input.tsx` reference `--accent-glow`, `--surface-2`,
  `--surface-3`, `--border-bright`, `--foreground-muted`, which are **not
  defined** in `globals.css` (only `--accent` and `--foreground` exist).
  → shadcn variants will render without intended styling.
- **Two competing design systems.** `globals.css` declares `--accent: #7c3aed`
  but `app-shell.tsx` uses raw Tailwind utilities
  (`bg-zinc-950`, `text-violet-300`, `border-violet-400/80`, …) that don't
  line up with the token palette.
- **Unused dependency.** `zod` declared in `package.json`, never imported.
- **Unused import.** `X` from `lucide-react` imported in `stream-player.tsx`,
  not referenced.
- **Dead branch.** `lib/static-channels.ts` documents a `{info, channels:[…]}`
  wrapper fallback, but `data/channels.json` is a bare array. The actual
  wrapper file `data/channels-source.json` is **never imported**.
- **Wasteful `/api/categories`.** Calls `getApiChannels({})` (returns every
  channel) just to pluck out the `category` strings; sort is unnecessary.
- **`is_active` filter is theoretical.** Generated catalog always sets
  `is_active: true`, so the API filter does nothing today.
- **Overly permissive `next.config.ts`.** `remotePatterns: **` for both `http`
  and `https` — any host can be used by `next/image`.
- **Generated data tracked in git.** `data/playlist.m3u`, `data/channels.json`,
  `data/catalog-meta.json` are auto-generated but **not** in `.gitignore`.
- **Orphan assets.** `public/logos/*.svg` (6 files) are unreferenced by the
  current catalog; `data/channels-source.json` is unreferenced by any code.

---

## 7. Entry points

| Purpose | Path |
|---|---|
| App shell (client root) | `components/app-shell.tsx` |
| Page (RSC root) | `app/page.tsx` |
| Root layout | `app/layout.tsx` |
| Channels API | `app/api/channels/route.ts` |
| Categories API | `app/api/categories/route.ts` |
| Health API | `app/api/health/route.ts` |
| Player | `components/stream-player.tsx` |
| Channel helpers | `lib/channels.ts` |
| Channel data loader | `lib/static-channels.ts` |
| Catalog build script | `scripts/import-playlist/import-catalog.ts` |
| Data seed | `data/channels.json` |
| Pipeline cache | `data/playlist.m3u` |
| Pipeline metadata | `data/catalog-meta.json` |

---

## 8. Unknowns

- Deployment target (`.gitignore` mentions `vercel.json`; no such file exists).
- Authentication mechanism / provider.
- EPG source / format.
- Target audience scale / concurrency.
- License of upstream M3U (header says `© 2026 ABU SAEEiD × Rifaz`).
- CI / hosting provider.
- Formal roadmap / backlog.
