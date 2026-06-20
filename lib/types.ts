export type StreamSource = {
  url: string;
  label?: string;
  quality?: "720p" | "1080p" | "auto" | string;
  priority?: number;
  last_checked_at?: string;
};

export type Channel = {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
  stream_sources: StreamSource[];
  is_active: boolean;
  created_at?: string;
  last_updated_at?: string;
};
