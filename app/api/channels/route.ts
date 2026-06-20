import { NextResponse, type NextRequest } from "next/server";
import { getApiChannels } from "@/lib/channels";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const result = getApiChannels({ category, query });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "Cache-Control": "public, max-age=60",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
