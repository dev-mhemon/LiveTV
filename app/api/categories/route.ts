import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/channels";

export function GET() {
  const categories = getAllCategories();

  return NextResponse.json({
    categories,
    count: categories.length
  });
}
