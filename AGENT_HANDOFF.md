# AGENT_HANDOFF.md

## Last Updated By
Antigravity — batch execution session — 2026-06-20 04:30 (Asia/Dhaka)

This session executed **5 tasks** from `TASK_QUEUE.md`:
- **M1** — Added generated data files to `.gitignore`.
- **M3** — Dead code cleanup: removed `zod`, deleted
  `data/channels-source.json`, deleted `public/logos/*.svg` (6 files),
  simplified `lib/static-channels.ts` (removed dead wrapper branch).
- **H2** — Tightened `next.config.ts` `remotePatterns` to 11 explicit
  HTTPS hosts (from wildcard `**`).
- **H3(b)** — Added `## Security` section to `README.md`; accepted
  no-auth as the default for a personal/LAN tool.
- **N1** — Bumped stall watchdog in `stream-player.tsx` from 6.5s to
  12s via named constant `STALL_WATCHDOG_MS`.

All changes verified: `npx tsc --noEmit` clean, `npx eslint` clean,
`npm run build` clean (256 channels / 261 sources, compiled in 7.1s).

The B3 / M2 / B2 / B1 historical fix-up sections below are kept
**verbatim** for traceability — they describe past state, not the
current backlog. Live status is in the "Current Status Summary"
and "Immediate next steps" sections.

---

## Doc audit 2026-06-20

Cline ran a fresh read of the entire codebase against the existing
docs on 2026-06-20. The following are **documentation drift** items
(no behaviour bug); the actionable backlog items are in
`TASK_QUEUE.md` (new **N1 / N2 / N3** entries).

1. **Channel counts stale everywhere.** `data/catalog-meta.json`
   reports **256 channels / 261 stream sources** (generated
   2026-06-19T21:41:22.078Z). All three docs still say 253 / 257.
   Categories unchanged (BDIX, Bangla, Entertainment, Kids, Movies,
   Music, News, Religious, Sports). Fixed in this pass.
2. **README "Authenticated" claim — already gone.** `README.md` no
   longer contains the word anywhere. The current README describes
   the project as "a modern, fast Live TV dashboard" with
   **Open API routes** at `/api/channels`, `/api/categories`,
   `/api/health`. The codebase still has no auth code, no
   middleware, no login route, and no auth-related dependency.
   → H3 reduces to a feature decision, not a doc fix.
3. **`predev` / `prebuild` claim is wrong.** Older notes describe
   `predev` / `prebuild` npm hooks re-running the import. The
   `package.json` actually chains the import inside the `dev` /
   `build` scripts via `&&` — no pre/post hooks. The effect is the
   same; the mechanism is not. Corrected in the live "Notes for
   Next Agent" section below; left untouched in the historical B2
   section (which accurately describes past state).
4. **`PROJECT_CONTEXT.md` §3 still says "Inter font".** Stale. The
   UI redesign (U1) replaced Inter with **Bricolage Grotesque**
   (display/UI, 400–800) + **JetBrains Mono** (technical labels,
   400/500/700), both loaded from Google Fonts via `globals.css`
   `@import`. `PROJECT_CONTEXT.md` not edited in this pass (out
   of scope for the user's request), but flagged.
5. **`PROJECT_CONTEXT.md` §4 says `maxSyncAttempts: 3`.** Actual
   `stream-player.tsx` `engineOverrides` uses
   `liveSyncDurationCount: 3` — that is the hls.js v1.5+ option
   name (the older `maxSyncAttempts` no longer exists in current
   hls.js). Value is the same; the option name was wrong.
6. **`PROJECT_CONTEXT.md` §4 says card shows a `LIVE-or-PLAYING`
   badge.** Actual UI: a coloured status dot (one of
   `status-dot--live` / `--playing` / `--offline`, defined in
   `globals.css`) — no badge text. This was changed in U1
   (channel card simplified to logo + name + status dot only).
7. **`eslint-disable react-hooks/set-state-in-effect`** is at the
   top of `stream-player.tsx`. Deliberate: `advanceSource` /
   `retrySources` schedule state updates from inside an effect,
   and the disable documents that. Not a bug; worth knowing.
8. **`Input` component uses inline `style` handlers for focus/
   blur** instead of a CSS class with `:focus`. Functional and
   intentional, but slightly inconsistent with the rest of the
   codebase which uses `var(--token)` references. Logged as a
   tiny refactor candidate in N3 below.
9. **`data/channels-source.json` is the orphan of the prior
   `{info, channels:[…]}` data format.** The current
   `import-catalog.ts` writes a **bare array** to
   `data/channels.json`. The defensive
   `wrapper.channels ?? channelsData` branch in
   `lib/static-channels.ts` is now dead code — it is correct to
   keep it defensive, but the wrapper-shaped file itself can be
   deleted. Already captured in M3.

---
