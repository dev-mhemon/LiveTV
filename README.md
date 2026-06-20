# BDIX Live TV

A modern, fast Live TV dashboard built using Next.js, Tailwind CSS, local UI primitives, and an hls.js streaming player with prioritized stream fallback support. It uses static data compiled directly from an M3U playlist.

## Features

- **Modern UI**: Dark themed, full-viewport responsive layout optimized for desktop, mobile, and TV landscape screens.
- **Embedded Player**: High-performance HLS video player inline with HLS playback settings (custom buffer length, sync duration, worker execution).
- **Static Catalog**: Generated from `data/playlist.m3u` at build-time.
- **Category Filtering & Search**: Instant, client-side category switching and channel search.
- **JSON API Routes**: Open API routes at `/api/channels`, `/api/categories`, and `/api/health`.

## Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Import/Generate Channel Catalog**:
   ```bash
   npm run import:playlist
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
d:\LiveTV\
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   ├── globals.css             # Styles & CSS design tokens
│   └── api/
│       ├── channels/route.ts   # GET /api/channels
│       ├── categories/route.ts # GET /api/categories
│       └── health/route.ts     # GET /api/health
├── components/
│   ├── app-shell.tsx           # Main app shell & category lists
│   ├── stream-player.tsx       # HLS stream player
│   └── ui/                     # UI components (Button, Input)
├── lib/
│   ├── channels.ts             # Channel helper utility
│   ├── static-channels.ts      # Imports channels.json
│   ├── types.ts                # TypeScript interfaces
│   └── utils.ts                # CN helper
├── data/
│   ├── playlist.m3u            # Input source playlist
│   ├── channels.json           # Output JSON channel list (generated)
│   └── catalog-meta.json       # Metadata & categories summary (generated)
└── scripts/
    └── import-playlist/
        └── import-catalog.ts   # Node parsing script for M3U playlist
```

## Channel Catalog

- **Source File**: `data/playlist.m3u`
- **Generated File**: `data/channels.json` (Next.js loads this to render pages and serve the API).

To update the channel list, simply overwrite/update `data/playlist.m3u` and run:
```bash
npm run import:playlist
```

## API Routes

The following open API endpoints are available:

- `GET /api/channels?category=News&q=bd` — Lists channels, optionally filtered by category name and search query.
- `GET /api/categories` — Lists all available categories.
- `GET /api/health` — Basic service status.

## Security

This dashboard has **no authentication**. All API routes and streams are open.

- Do not expose to the public internet without adding an auth layer (reverse proxy basic auth, Cloudflare Access, etc.).
- `next/image` remote patterns are locked to a curated allow-list of known BDIX/Bangladeshi CDN hosts — see `next.config.ts`.
