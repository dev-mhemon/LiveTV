import { staticChannels } from "@/lib/static-channels";
import type { Channel } from "@/lib/types";

type ApiQuery = {
  category?: string;
  query?: string;
};

export function getInitialChannels(): Channel[] {
  return sortChannels(staticChannels);
}

export function getApiChannels({ category, query }: ApiQuery) {
  const channels = filterChannels(staticChannels, category, query);

  return {
    status: 200,
    body: {
      channels,
      count: channels.length
    }
  };
}

export function getAllCategories(): string[] {
  const categories = new Set<string>();

  for (const channel of staticChannels) {
    if (channel?.is_active && channel.category) {
      categories.add(channel.category);
    }
  }

  return Array.from(categories).sort();
}

function filterChannels(channels: Channel[], category?: string, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();

  return sortChannels(
    channels.filter((channel) => {
      const categoryMatches = !category || category === "All" || (channel.category ?? "") === category;
      const queryMatches =
        !normalizedQuery ||
        (channel.name ?? "").toLowerCase().includes(normalizedQuery) ||
        (channel.category ?? "").toLowerCase().includes(normalizedQuery);

      return Boolean(channel?.is_active) && categoryMatches && queryMatches;
    })
  );
}

function sortChannels(channels?: Channel[]) {
  const list = Array.isArray(channels) ? channels : [];

  return [...list].sort((a, b) => {
    const aCategory = (a?.category ?? "").toString();
    const bCategory = (b?.category ?? "").toString();
    const categorySort = aCategory.localeCompare(bCategory);

    if (categorySort !== 0) return categorySort;

    const aName = (a?.name ?? "").toString();
    const bName = (b?.name ?? "").toString();
    return aName.localeCompare(bName);
  });
}
