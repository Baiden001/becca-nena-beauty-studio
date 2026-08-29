"use client";

import { useState } from "react";
import { setCollectionProduct } from "@/app/actions/admin/catalog";

export function CollectionProductPicker({
  collectionId,
  allProducts,
  initiallyIncluded,
}: {
  collectionId: string;
  allProducts: { id: string; name: string }[];
  initiallyIncluded: string[];
}) {
  const [included, setIncluded] = useState<Set<string>>(new Set(initiallyIncluded));
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(productId: string) {
    setPending(productId);
    const willInclude = !included.has(productId);
    const result = await setCollectionProduct(collectionId, productId, willInclude);
    if (result.ok) {
      setIncluded((prev) => {
        const next = new Set(prev);
        willInclude ? next.add(productId) : next.delete(productId);
        return next;
      });
    }
    setPending(null);
  }

  return (
    <ul className="divide-y divide-rose/10 rounded-md border border-rose/20 bg-white">
      {allProducts.map((p) => (
        <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="text-brown">{p.name}</span>
          <label className="flex items-center gap-2 text-xs text-taupe">
            <input
              type="checkbox"
              checked={included.has(p.id)}
              disabled={pending === p.id}
              onChange={() => toggle(p.id)}
              className="accent-rose"
            />
            In collection
          </label>
        </li>
      ))}
    </ul>
  );
}
