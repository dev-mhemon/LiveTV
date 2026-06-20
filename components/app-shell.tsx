"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  Radio,
  Search,
  Tv,
  Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { StreamPlayer } from "@/components/stream-player";
import type { Channel } from "@/lib/types";
import { cn } from "@/lib/utils";

type AppShellProps = {
  initialChannels: Channel[];
};

export function AppShell({ initialChannels }: AppShellProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  // Default to the first channel in the list so player is active on load
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(
    initialChannels[0] || null
  );

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(initialChannels.map((channel) => channel.category).filter(Boolean))).sort()
    ],
    [initialChannels]
  );

  /** Title-case a raw category string, e.g. "sports" → "Sports" */
  const capitalize = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const filteredChannels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return initialChannels.filter((channel) => {
      const categoryMatches = category === "All" || (channel.category ?? "") === category;
      const queryMatches =
        !normalizedQuery ||
        (channel.name ?? "").toLowerCase().includes(normalizedQuery) ||
        (channel.category ?? "").toLowerCase().includes(normalizedQuery);

      return categoryMatches && queryMatches;
    });
  }, [category, initialChannels, query]);

  return (
    <div className="h-screen bg-black text-[var(--foreground)] flex flex-col overflow-hidden">

      {/* ═══════════════ Header ═══════════════ */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b-2 border-[var(--border-bright)] bg-black px-4 sm:px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center bg-[var(--accent)] text-black">
            <Zap className="h-4.5 w-4.5" strokeWidth={3} />
          </div>
          <div className="leading-none">
            <h1 className="text-base font-extrabold tracking-[-0.02em] uppercase">
              BDIX<span className="text-[var(--accent)]">{"//"}</span>LIVE
            </h1>
            <p className="mono mt-1 text-[9px] text-[var(--foreground-dim)] uppercase tracking-[0.18em]">
              Domestic HLS Routing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 border border-[var(--border-bright)] bg-[var(--surface-1)] px-3 py-1.5">
            <span className="status-dot status-dot--live" aria-hidden />
            <span className="mono text-[9px] uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
              {initialChannels.length} channels online
            </span>
          </div>
        </div>
      </header>

      {/* ═══════════════ Main two-column body ═══════════════ */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">

        {/* ── LEFT: Player column ── */}
        <div className="w-full aspect-video shrink-0 flex flex-col md:aspect-auto md:flex-1 md:min-h-0 md:min-w-0">
          {selectedChannel ? (
            <StreamPlayer channel={selectedChannel} />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-black md:border-r-2 border-[var(--border-bright)]">
              <div className="text-center">
                <Tv
                  className="mx-auto mb-3 h-12 w-12 text-[var(--border-bright)] animate-pulse"
                  strokeWidth={2.5}
                />
                <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--foreground-dim)]">
                  Select a channel to start streaming
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Channel sidebar ── */}
        <aside className="w-full flex-1 md:flex-none md:shrink-0 md:w-[280px] lg:w-[360px] xl:w-[420px] flex flex-col border-t-2 md:border-t-0 md:border-l-2 border-[var(--border-bright)] bg-[var(--surface-1)] overflow-hidden">

          {/* Sidebar header — sticky, non-scrolling */}
          <div className="shrink-0 border-b-2 border-[var(--border-bright)] px-3 pt-4 pb-3 space-y-3">
            {/* Title row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="block h-5 w-1 bg-[var(--accent)]" aria-hidden />
                <h2 className="text-sm font-extrabold uppercase tracking-[-0.01em]">Channels</h2>
              </div>
              <span className="mono text-[9px] text-[var(--foreground-dim)] uppercase tracking-[0.18em]">
                {filteredChannels.length}/{initialChannels.length}
              </span>
            </div>

            {/* Search */}
            <Input
              icon={Search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search channels..."
              className="h-9 w-full text-xs"
            />
          </div>

          {/* Category nav — horizontal scroll, wheel-enabled */}
          <CategoryNav
            categories={categories}
            active={category}
            capitalize={capitalize}
            onSelect={setCategory}
          />

          {/* Scrollable channel list */}
          <div className="flex-1 overflow-y-auto">
            {filteredChannels.length > 0 ? (
              <ul className="divide-y divide-[var(--border)] p-0 m-0 list-none">
                {filteredChannels.map((channel) => {
                  const isPlaying = selectedChannel?.id === channel.id;
                  return (
                    <li key={channel.id}>
                      <ChannelCard
                        channel={channel}
                        isPlaying={isPlaying}
                        onClick={() => setSelectedChannel(channel)}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="grid min-h-[200px] place-items-center text-center text-[var(--foreground-muted)] p-6">
                <div>
                  <Search className="mx-auto mb-3 h-7 w-7 text-[var(--border-bright)]" strokeWidth={2.5} />
                  <p className="mono text-[10px] uppercase tracking-[0.2em]">No channels found</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="shrink-0 border-t-2 border-[var(--border-bright)] px-3 py-2 flex items-center gap-2">
            <Radio className="h-3 w-3 text-[var(--foreground-dim)]" strokeWidth={2.5} />
            <span className="mono text-[9px] uppercase tracking-[0.18em] text-[var(--foreground-dim)]">
              BDIX // LIVE // HLS
            </span>
          </div>
        </aside>

      </main>
    </div>
  );
}

/* ═══════════════ Category Nav ═══════════════ */

function CategoryNav({
  categories,
  active,
  capitalize,
  onSelect
}: {
  categories: string[];
  active: string;
  capitalize: (s: string) => string;
  onSelect: (cat: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const didDrag = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    didDrag.current = false;
    startX.current = e.clientX;
    startScrollLeft.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = "grabbing";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 4) didDrag.current = true;
    scrollRef.current.scrollLeft = startScrollLeft.current - dx;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    isDragging.current = false;
    scrollRef.current.style.cursor = "";
  };

  return (
    <div
      ref={scrollRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="shrink-0 flex overflow-x-auto border-b-2 border-[var(--border-bright)] no-scrollbar select-none"
      style={{ cursor: "grab", scrollBehavior: "smooth" }}
    >
      {categories.map((item) => {
        const isActive = active === item;
        const label = item === "All" ? "All" : capitalize(item);
        return (
          <button
            key={item}
            onClick={(e) => {
              // Suppress click if the user was dragging
              if (didDrag.current) { e.preventDefault(); return; }
              onSelect(item);
            }}
            className={cn(
              "focus-ring relative shrink-0 px-4 py-2.5 text-sm cursor-pointer transition-colors duration-100 whitespace-nowrap",
              isActive
                ? "text-[var(--accent)] font-semibold"
                : "text-[var(--foreground-muted)] font-normal hover:text-[var(--foreground)]"
            )}
          >
            {label}
            {/* Active underline */}
            {isActive && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[var(--accent)]"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}


function ChannelCard({
  channel,
  isPlaying,
  onClick
}: {
  channel: Channel;
  isPlaying: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "focus-ring group relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 cursor-pointer overflow-hidden",
        isPlaying
          ? "bg-[var(--surface-3)] border-l-2 border-[var(--accent)] pl-[10px]"
          : "bg-transparent border-l-2 border-transparent hover:bg-[var(--surface-2)] hover:border-l-[var(--border-bright)]"
      )}
    >
      {/* Channel logo */}
      <div
        className={cn(
          "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden border rounded-full bg-black",
          isPlaying ? "border-[var(--accent)]" : "border-[var(--border-bright)] group-hover:border-[var(--foreground-dim)]"
        )}
      >
        <ChannelLogo logoUrl={channel.logo_url} name={channel.name} />
      </div>

      {/* Name + status */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13px] font-bold leading-tight tracking-[-0.01em] transition-colors duration-150",
            isPlaying ? "text-[var(--accent)]" : "text-[var(--foreground)] group-hover:text-[var(--foreground)]"
          )}
        >
          {channel.name}
        </p>
        {isPlaying && (
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="status-dot status-dot--playing-active"
              title="Now Playing"
              aria-label="Now Playing"
            />
            <span className="mono text-[9px] uppercase tracking-[0.12em] text-[var(--foreground-dim)]">
              Now Playing
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

/* ═══════════════ Sub-components ═══════════════ */

/**
 * Coerce a logo URL from the catalog into a form `next/image` (and the
 * `URL` constructor it uses internally) can parse.
 *
 * Upstream M3U `tvg-logo` values are occasionally malformed:
 *   - protocol-relative: `//cdn.example.com/logo.png`
 *   - missing-one-slash: `://cdn.example.com/logo.png`
 *   - bare host:         `cdn.example.com/logo.png`
 *   - site-relative:     `/logos/foo.png` (no host — can't be loaded)
 *
 * Any value we can't turn into a parseable absolute `http(s)` URL is
 * returned as `null` so the caller can fall back to the placeholder icon.
 */
function normalizeLogoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Already a valid absolute http(s) URL.
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  let candidate: string;
  if (trimmed.startsWith("://")) {
    // Malformed protocol-relative (missing the leading `/`).
    candidate = `https:${trimmed}`;
  } else if (trimmed.startsWith("//")) {
    // Standard protocol-relative.
    candidate = `https:${trimmed}`;
  } else if (trimmed.startsWith("/")) {
    // Site-relative — we have no host to resolve against. Bail out.
    return null;
  } else {
    // Bare host or path.
    candidate = `https://${trimmed.replace(/^\/+/, "")}`;
  }

  // Final guard: `next/image` calls `new URL(src)` internally; if it can't
  // parse, render the placeholder instead of crashing the page.
  try {
    new URL(candidate);
    return candidate;
  } catch {
    return null;
  }
}

function ChannelLogo({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const safeSrc = normalizeLogoUrl(logoUrl);

  if (!safeSrc) {
    return <Tv className="h-5 w-5 text-[var(--foreground-dim)]" strokeWidth={2.5} />;
  }

  return (
    <Image
      src={safeSrc}
      alt={`${name} logo`}
      fill
      className="object-cover"
      sizes="40px"
    />
  );
}
