import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

type ImportedChannel = {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
  stream_sources: Array<{
    url: string;
    label: string;
    quality: string;
    priority: number;
    source: "playlist";
  }>;
  is_active: boolean;
};

async function main() {
  const localPlaylistPath = join(root, "data", "playlist.m3u");

  // Attempt to fetch remote playlist from GitHub
  const remotePlaylistText = await fetchRemotePlaylist();

  let playlistText = "";
  if (remotePlaylistText) {
    playlistText = remotePlaylistText;
    // Overwrite local file to cache it and keep git history clean
    await writeFile(localPlaylistPath, remotePlaylistText, "utf8");
    console.log("Successfully fetched and updated local playlist.m3u.");
  } else {
    console.warn("Could not fetch remote playlist. Falling back to cached local playlist.m3u...");
    try {
      playlistText = await readFile(localPlaylistPath, "utf8");
    } catch (error) {
      console.error("Critical: Failed to read local playlist.m3u backup.", error);
      throw error;
    }
  }

  const channelsByKey = new Map<string, ImportedChannel>();
  const usedSlugs = new Set<string>();

  for (const item of parseM3u(playlistText)) {
    const name = item.name.trim();
    if (!name) {
      continue;
    }

    const normalizedGroup = item.category.toLowerCase().trim();
    const normalizedName = name.toLowerCase();

    // Skip temporary live event entries
    if (
      normalizedGroup.includes("live event") ||
      normalizedName.includes("live event") ||
      normalizedName.includes(" vs ")
    ) {
      continue;
    }

    mergeChannel(channelsByKey, usedSlugs, {
      name: item.name,
      url: item.url,
      category: normalizeCategory(item.category, item.name, item.url),
      logo_url: item.logoUrl,
      source: "playlist"
    });
  }

  const channels = [...channelsByKey.values()]
    .map((channel) => ({
      ...channel,
      stream_sources: channel.stream_sources.map((source, index) => ({
        ...source,
        priority: index + 1
      }))
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  await writeFile(
    join(root, "data", "channels.json"),
    `${JSON.stringify(channels, null, 2)}\n`,
    "utf8"
  );

  await writeFile(
    join(root, "data", "catalog-meta.json"),
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_playlist: "data/playlist.m3u",
        channel_count: channels.length,
        stream_source_count: channels.reduce(
          (total, channel) => total + channel.stream_sources.length,
          0
        ),
        categories: [...new Set(channels.map((channel) => channel.category))].sort()
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`Imported ${channels.length} channels with ${channels.reduce((total, channel) => total + channel.stream_sources.length, 0)} stream sources.`);
}

async function fetchRemotePlaylist(): Promise<string | null> {
  const repoContentsUrl = "https://api.github.com/repos/abusaeeidx/Mrgify-BDIX-IPTV/contents/";
  const defaultRawUrl = "https://raw.githubusercontent.com/abusaeeidx/Mrgify-BDIX-IPTV/main/playlist.m3u";

  const headers = {
    "User-Agent": "bdix-live-tv-sync"
  };

  // 1. Try querying the GitHub Repository Contents API (handles file name change)
  try {
    console.log("Querying GitHub API for playlist file name changes...");
    const response = await fetch(repoContentsUrl, { headers });
    if (response.ok) {
      const files = await response.json();
      if (Array.isArray(files)) {
        // Find any file ending in .m3u
        const m3uFile = files.find(
          (file: any) => file.type === "file" && file.name.toLowerCase().endsWith(".m3u")
        );

        if (m3uFile && m3uFile.download_url) {
          console.log(`Found remote playlist file: "${m3uFile.name}". Fetching contents...`);
          const downloadResponse = await fetch(m3uFile.download_url, { headers });
          if (downloadResponse.ok) {
            return await downloadResponse.text();
          } else {
            console.warn(`Failed to download from dynamic URL: ${m3uFile.download_url}. Status: ${downloadResponse.status}`);
          }
        } else {
          console.warn("No file ending in .m3u found in the repository root contents API.");
        }
      }
    } else {
      console.warn(`GitHub API returned non-OK status: ${response.status}. Falling back to default URL...`);
    }
  } catch (error) {
    console.warn("Error querying GitHub Repository Contents API:", error);
  }

  // 2. Fallback to hardcoded default raw URL
  try {
    console.log(`Attempting fallback direct fetch from: ${defaultRawUrl}`);
    const response = await fetch(defaultRawUrl, { headers });
    if (response.ok) {
      return await response.text();
    } else {
      console.warn(`Direct fetch failed. Status: ${response.status}`);
    }
  } catch (error) {
    console.warn("Error performing direct fetch:", error);
  }

  return null;
}

function parseM3u(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: Array<{
    name: string;
    url: string;
    category: string;
    logoUrl: string | null;
  }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("#EXTINF")) {
      continue;
    }

    const nextUrl = lines[index + 1];
    if (!nextUrl || nextUrl.startsWith("#") || !isHttpUrl(nextUrl)) {
      continue;
    }

    const commaIndex = findCommaOutsideQuotes(line);
    const rawName = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : "Untitled Channel";
    const attrs = parseAttributes(line);

    const name = cleanName(attrs["tvg-name"] || rawName);
    if (!name) {
      continue;
    }

    items.push({
      name,
      url: nextUrl,
      category: attrs["group-title"] || "Imported",
      logoUrl: normalizeLogoUrl(attrs["tvg-logo"] || attrs.tvgo || null)
    });
  }

  return items;
}

function parseAttributes(line: string) {
  const attrs: Record<string, string> = {};
  const attrPattern = /([\w-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(line))) {
    attrs[match[1]] = match[2].trim();
  }

  return attrs;
}

function mergeChannel(
  channelsByKey: Map<string, ImportedChannel>,
  usedSlugs: Set<string>,
  input: {
    name: string;
    url: string;
    category: string;
    logo_url: string | null;
    source: "playlist";
  }
) {
  const name = cleanName(input.name);
  const key = name.toLowerCase();
  const existing = channelsByKey.get(key);
  const quality = inferQuality(name, input.url);

  if (existing) {
    if (!existing.stream_sources.some((source) => source.url === input.url)) {
      existing.stream_sources.push({
        url: input.url,
        label: "Playlist fallback",
        quality,
        priority: existing.stream_sources.length + 1,
        source: input.source
      });
    }

    if (!existing.logo_url && input.logo_url) {
      existing.logo_url = input.logo_url;
    }

    if (existing.category === "Entertainment" && input.category !== "Entertainment") {
      existing.category = input.category;
    }

    return;
  }

  const slug = uniqueSlug(slugify(name), usedSlugs);

  channelsByKey.set(key, {
    id: deterministicUuid(slug),
    name,
    slug,
    category: input.category,
    logo_url: input.logo_url,
    stream_sources: [
      {
        url: input.url,
        label: "Playlist primary",
        quality,
        priority: 1,
        source: input.source
      }
    ],
    is_active: true
  });
}

function cleanName(name: string) {
  return name.replace(/\s+/g, " ").replace(/\s+\((auto|hd)\)$/i, "").trim();
}

function normalizeCategory(groupTitle: string, channelName: string, streamUrl: string): string {
  const normalizedGroup = groupTitle.toLowerCase().trim();
  const normalizedName = channelName.toLowerCase().trim();
  const normalizedUrl = streamUrl.toLowerCase().trim();

  // 1. Check for BDIX routing quality group first
  if (normalizedGroup.includes("bdix")) {
    return "BDIX";
  }

  // 2. Identify Bangla/Bangladeshi channels first
  const BANGLA_KEYWORDS = [
    "bangla",
    "bangladeshi",
    "kolkata",
    "indian-bangla",
    "somoy",
    "jamuna",
    "dbc",
    "ekattor",
    "atn",
    "independent",
    "nagorik",
    "bijoy",
    "channel i",
    "channel-i",
    "channel 16",
    "channel-16",
    "channel 24",
    "my tv",
    "maasranga",
    "massranga",
    "duronto",
    "gtv",
    "gazi",
    "rtv",
    "ntv",
    "g series",
    "surongo",
    "waz tv",
    "deepto",
    "ekushey",
    "boishakhi",
    "green tv",
    "desh",
    "r plus",
    "aakash aath",
    "rongeen",
    "gopal bhar",
    "news 24",
    "news24"
  ];

  const BANGLA_DOMAINS = [
    "gpcdn.net",
    "jagobd.com",
    "toffeelive.com",
    "sonarbanglatv.com",
    "deshitv24.net",
    "mytvbangla.com",
    "spicefmbd.com",
    "matribhumitv.com",
    ".com.bd",
    ".edu.bd",
    ".org.bd"
  ];

  const isBangla =
    normalizedGroup.includes("bangla") ||
    normalizedGroup.includes("bangladeshi") ||
    normalizedGroup.includes("kolkata") ||
    normalizedGroup.includes("indian-bangla") ||
    BANGLA_KEYWORDS.some(keyword => normalizedName.includes(keyword)) ||
    BANGLA_DOMAINS.some(domain => normalizedUrl.includes(domain));

  if (isBangla) {
    return "Bangla";
  }

  // 3. Religious/Islamic channels check
  if (
    normalizedGroup.includes("islam") ||
    normalizedGroup.includes("relig") ||
    normalizedGroup.includes("relag") ||
    normalizedGroup.includes("quran") ||
    normalizedName.includes("islam") ||
    normalizedName.includes("quran") ||
    normalizedName.includes("relig") ||
    normalizedName.includes("waz") ||
    normalizedName.includes("makkah") ||
    normalizedName.includes("madina")
  ) {
    return "Religious";
  }

  // 4. Specific Genre Checks
  if (normalizedGroup.includes("news") || normalizedName.includes("news")) {
    return "News";
  }
  if (
    normalizedGroup.includes("sport") ||
    normalizedGroup.includes("cricket") ||
    normalizedGroup.includes("football") ||
    normalizedGroup.includes("fifa") ||
    normalizedName.includes("sport") ||
    normalizedName.includes("cricket") ||
    normalizedName.includes("football")
  ) {
    return "Sports";
  }
  if (
    normalizedGroup.includes("movie") ||
    normalizedGroup.includes("cinema") ||
    normalizedName.includes("movie") ||
    normalizedName.includes("cinema")
  ) {
    return "Movies";
  }
  if (
    normalizedGroup.includes("kid") ||
    normalizedGroup.includes("cartoon") ||
    normalizedName.includes("kid") ||
    normalizedName.includes("cartoon")
  ) {
    return "Kids";
  }
  if (
    normalizedGroup.includes("music") ||
    normalizedGroup.includes("redio") ||
    normalizedGroup.includes("radio") ||
    normalizedGroup.includes("fm") ||
    normalizedName.includes("music") ||
    normalizedName.includes("song") ||
    normalizedName.includes("radio") ||
    normalizedName.includes("fm")
  ) {
    return "Music";
  }

  // 5. Fallback/Uncategorized general channels
  return "Entertainment";
}

function inferQuality(name: string, url: string) {
  const value = `${name} ${url}`.toLowerCase();
  if (value.includes("2160") || value.includes("4k")) {
    return "4K";
  }
  if (value.includes("1080")) {
    return "1080p";
  }
  if (value.includes("720")) {
    return "720p";
  }
  if (value.includes("480")) {
    return "480p";
  }
  return "auto";
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "channel";
}

function uniqueSlug(baseSlug: string, usedSlugs: Set<string>) {
  let slug = baseSlug;
  let counter = 2;

  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  usedSlugs.add(slug);
  return slug;
}

function deterministicUuid(value: string) {
  const hash = createHash("sha1").update(value).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

/**
 * Normalize a `tvg-logo` value from the upstream M3U into a parseable
 * absolute `https://` URL. Upstream occasionally produces malformed
 * protocol-relative values (e.g. `://tplay.live/foo.png` or
 * `//tplay.live/foo.png`) or bare hosts; `next/image` can't consume any
 * of those, so we coerce them here at parse time.
 *
 * Returns `null` for any value we can't reasonably turn into a valid URL
 * (empty / site-relative paths with no host to resolve against).
 */
function normalizeLogoUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  let candidate: string;
  if (trimmed.startsWith("://") || trimmed.startsWith("//")) {
    candidate = `https:${trimmed}`;
  } else if (trimmed.startsWith("/")) {
    return null;
  } else {
    candidate = `https://${trimmed.replace(/^\/+/, "")}`;
  }

  try {
    new URL(candidate);
    return candidate;
  } catch {
    return null;
  }
}

function findCommaOutsideQuotes(value: string) {
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      return index;
    }
  }

  return -1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
