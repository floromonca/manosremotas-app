"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type WOFilter =
  | "all"
  | "mine"
  | "unassigned"
  | "delayed"
  | "ready_to_invoice";

const ALLOWED: WOFilter[] = [
  "all",
  "mine",
  "unassigned",
  "delayed",
  "ready_to_invoice",
];

function normalizeFilter(v: string | null): WOFilter {
  return ALLOWED.includes(v as WOFilter) ? (v as WOFilter) : "all";
}

/**
 * Source of truth: woFilter
 * - URL -> state
 * - state -> URL
 */
export function useUrlWoFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [woFilter, setWoFilter] = useState<WOFilter>("all");

  // URL -> state
  useEffect(() => {
    const f = normalizeFilter(searchParams.get("filter"));
    setWoFilter(f);
  }, [searchParams]);

  // state -> URL
  const setWoFilterAndUrl = useCallback(
    (f: WOFilter) => {
      setWoFilter(f);

      const params = new URLSearchParams(searchParams.toString());
      if (f === "all") params.delete("filter");
      else params.set("filter", f);

      const qs = params.toString();

      // ✅ IMPORTANTE: mantenerte en /work-orders
      router.push(qs ? `/work-orders?${qs}` : `/work-orders`);
    },
    [router, searchParams],
  );

  const urlFilter = useMemo(
    () => normalizeFilter(searchParams.get("filter")),
    [searchParams],
  );

  return { woFilter, setWoFilterAndUrl, urlFilter };
}