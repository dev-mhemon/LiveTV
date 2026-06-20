"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import Hls from "hls.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, RadioTower, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Channel } from "@/lib/types";

const engineOverrides = {
  maxBufferLength: 10,
  maxMaxBufferLength: 15,
  liveSyncDurationCount: 3,
  enableWorker: true,
  backBufferLength: 5
};

/** Stall watchdog — how long to wait before advancing to the next source.
 *  BDIX mirrors often take 8-12s on first manifest fetch. */
const STALL_WATCHDOG_MS = 12_000;

type StreamPlayerProps = {
  channel: Channel;
};

export function StreamPlayer({ channel }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const recoveryAttempts = useRef(0);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the video has produced at least one `playing` event for the
  // current source. Used to gate fatalError visibility — we don't surface an
  // error panel until the engine has had a full attempt cycle.
  const hasPlayedRef = useRef(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const [fatalError, setFatalError] = useState("");
  // Drives the two-phase UI: false = Phase 1 (connecting), true = Phase 2 (playback started).
  const [hasPlayed, setHasPlayed] = useState(false);

  const sources = useMemo(
    () =>
      [...channel.stream_sources].sort(
        (a, b) => (a.priority ?? 999) - (b.priority ?? 999)
      ),
    [channel.stream_sources]
  );

  const activeSource = sources[sourceIndex];

  const clearStallTimer = useCallback(() => {
    if (stallTimer.current) {
      clearTimeout(stallTimer.current);
      stallTimer.current = null;
    }
  }, []);

  const advanceSource = useCallback(() => {
    clearStallTimer();
    recoveryAttempts.current = 0;
    // No overlay — source cycling happens silently in the background.
    setFatalError("");

    setSourceIndex((current) => {
      if (current + 1 < sources.length) {
        return current + 1;
      }
      return current;
    });

    if (sourceIndex + 1 >= sources.length) {
      setFatalError("All stream routes failed. Try again after the scraper refreshes sources.");
    }
  }, [clearStallTimer, sourceIndex, sources.length]);

  const retrySources = useCallback(() => {
    clearStallTimer();
    recoveryAttempts.current = 0;
    hasPlayedRef.current = false;
    setHasPlayed(false);          // return to Phase 1 on explicit retry
    setSourceIndex(0);
    setRetryNonce((n) => n + 1);
    setFatalError("");
  }, [clearStallTimer]);

  // Reset all state when the channel changes — always start in Phase 1.
  useEffect(() => {
    setSourceIndex(0);
    setRetryNonce(0);
    setFatalError("");
    setHasPlayed(false);
    recoveryAttempts.current = 0;
    hasPlayedRef.current = false;
  }, [channel.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource?.url) {
      return;
    }

    // New source attempt — return to Phase 1 so the loading UI re-appears.
    hasPlayedRef.current = false;
    setHasPlayed(false);
    setFatalError("");
    recoveryAttempts.current = 0;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // canplay: data is ready — attempt autoplay. No overlay needed; the native
    // player control shows its own buffering indicator.
    const handleReady = () => {
      clearStallTimer();
      void video.play().catch(() => {
        // Autoplay was blocked by the browser. The user can press play manually.
        // No overlay is shown — the paused video frame is visible.
      });
    };

    // waiting / stalled: browser is rebuffering. The native player handles the
    // visual indication. We only arm the watchdog timer to advance the source
    // if the stall lasts too long.
    const handleWaiting = () => {
      clearStallTimer();
      stallTimer.current = setTimeout(() => {
        advanceSource();
      }, STALL_WATCHDOG_MS);
    };

    // playing: first decoded frame is on screen — transition to Phase 2.
    // After this point the loading overlay is gone and never returns.
    const handlePlaying = () => {
      hasPlayedRef.current = true;
      setHasPlayed(true);          // ← Phase 1 → Phase 2
      setFatalError("");
      clearStallTimer();
    };

    // MANIFEST_PARSED: HLS manifest was fetched and decoded successfully.
    // Clear any previous error state silently.
    const handleManifestParsed = () => {
      setFatalError("");
    };

    video.addEventListener("canplay", handleReady);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("stalled", handleWaiting);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari / iOS) — the browser handles everything internally.
      video.src = activeSource.url;
      video.load();
    } else if (Hls.isSupported()) {
      const hls = new Hls(engineOverrides);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, handleManifestParsed);

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
          // Non-fatal errors are handled internally by hls.js — ignore them.
          return;
        }

        // First recovery attempt for network errors.
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recoveryAttempts.current < 1) {
          recoveryAttempts.current += 1;
          hls.startLoad();
          return;
        }

        // First recovery attempt for media decode errors.
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveryAttempts.current < 1) {
          recoveryAttempts.current += 1;
          hls.recoverMediaError();
          return;
        }

        // Recovery exhausted — advance to next source silently.
        advanceSource();
      });

      hls.loadSource(activeSource.url);
      hls.attachMedia(video);
    } else {
      // Browser cannot play HLS at all — show the error panel immediately.
      setFatalError("This browser cannot decode HLS streams.");
    }

    return () => {
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("stalled", handleWaiting);
      clearStallTimer();
      if (hlsRef.current) {
        hlsRef.current.off(Hls.Events.MANIFEST_PARSED, handleManifestParsed);
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeSource?.url, retryNonce, advanceSource, clearStallTimer]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-black border-r-2 border-[var(--border-bright)]">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            controls={hasPlayed}  // suppress controls during Phase 1 (connecting)
            playsInline
            preload="auto"
          />

          {/* Phase 1 — initial connection: cover the video with a loading UI.
              Dismissed permanently once the first playing event fires. */}
          {!hasPlayed && !fatalError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
              <span className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--foreground-dim)]">
                Connecting to stream...
              </span>
            </div>
          ) : null}

          {/* Fatal error panel — shown only when all sources have been exhausted. */}
          {fatalError ? (
            <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center">
              <div className="max-w-md border-2 border-[var(--status-live)] bg-black p-6">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-[var(--status-live)]" strokeWidth={2.5} />
                <p className="mono text-xs font-bold uppercase tracking-[0.18em] text-[var(--status-live)]">
                  {fatalError}
                </p>
                <Button
                  variant="danger"
                  className="mt-5"
                  onClick={retrySources}
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry sources
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-[var(--border-bright)] bg-[var(--surface-1)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="status-dot status-dot--live" aria-hidden />
              <h2 className="truncate text-sm font-extrabold uppercase tracking-[-0.01em] text-[var(--foreground)] sm:text-base">
                {channel.name}
              </h2>
            </div>
            <p className="mono mt-2 truncate text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-dim)]">
              {activeSource?.label ?? "Stream source"} · {activeSource?.quality ?? "auto"} · route {sourceIndex + 1}/{sources.length}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2 border border-[var(--border-bright)] bg-black px-3 py-1.5">
              <RadioTower className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={2.5} />
              <span className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                Worker HLS · 10s Buffer
              </span>
            </div>
            <div className="hidden truncate max-w-xs md:block mono text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-dim)]">
              {activeSource?.url ? maskUrl(activeSource.url) : "No source available"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.slice(0, 24)}...`;
  } catch {
    return "Private stream route";
  }
}
