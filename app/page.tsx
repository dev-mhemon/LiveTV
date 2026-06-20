import { AppShell } from "@/components/app-shell";
import { getInitialChannels } from "@/lib/channels";

export default function HomePage() {
  const channels = getInitialChannels();

  return <AppShell initialChannels={channels} />;
}
