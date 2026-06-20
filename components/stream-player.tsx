"use client";

import { AlertTriangle, Loader2, RadioTower, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.slice(0, 24)}...`;
  } catch {
    return "Private stream route";
  }
}

export { maskUrl };
