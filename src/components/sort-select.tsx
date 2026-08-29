"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

export function SortSelect({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2 text-sm text-taupe">
      <label htmlFor="sort">Sort</label>
      <select
        id="sort"
        defaultValue={defaultValue}
        className="rounded-full border border-taupe/25 bg-white px-3 py-1.5 text-brown shadow-sm outline-none transition-all duration-150 hover:border-taupe/45 focus:border-rose focus:ring-2 focus:ring-rose/15"
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", e.target.value);
          router.push(`/shop?${params.toString()}`);
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
