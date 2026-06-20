import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "bdix-live-tv",
    timestamp: new Date().toISOString()
  });
}
