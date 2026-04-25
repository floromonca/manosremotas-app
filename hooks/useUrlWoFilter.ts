"use client";

import { useCallback, useMemo } from "react";
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

export function useUrlWoFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const woFilter = useMemo(
    () => normalizeFilter(searchParams.get("filter")),
    [searchParams]
  );

  const setWoFilterAndUrl = useCallback(
    (f: WOFilter) => {
      const params = new URLSearchParams(searchParams.toString());

      if (f === "all") params.delete("filter");
      else params.set("filter", f);

      const qs = params.toString();
      router.push(qs ? `/work-orders?${qs}` : "/work-orders");
    },
    [router, searchParams]
  );

  return { woFilter, setWoFilterAndUrl, urlFilter: woFilter };
}