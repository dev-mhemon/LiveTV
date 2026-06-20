import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd()
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "abusaeeidx.github.io" },
      { protocol: "https", hostname: "assets-prod.services.toffeelive.com" },
      { protocol: "https", hostname: "blogger.googleusercontent.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "s3.aynaott.com" },
      { protocol: "https", hostname: "s4.gifyu.com" },
      { protocol: "https", hostname: "seeklogo.com" },
      { protocol: "https", hostname: "static.wikia.nocookie.net" },
      { protocol: "https", hostname: "tstatic.akash-go.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ]
  }
};

export default nextConfig;
