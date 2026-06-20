import channelsData from "@/data/channels.json";
import type { Channel } from "@/lib/types";

export const staticChannels = channelsData as unknown as Channel[];
