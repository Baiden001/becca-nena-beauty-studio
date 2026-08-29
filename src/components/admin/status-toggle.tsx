"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductStatus } from "@/types/database";

export function StatusToggle({
  currentStatus,
  onToggle,
}: {
  currentStatus: ProductStatus;
  onToggle: (next: ProductStatus) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next: ProductStatus = currentStatus === "published" ? "hidden" : "published";

  return (
    <button
      onClick={async () => {
        setBusy(true);
        await onToggle(next);
        setBusy(false);
        router.refresh();
      }}
      disabled={busy}
      className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
        currentStatus === "published"
          ? "border-rose bg-rose text-cream"
          : "border-taupe/30 text-brown"
      } disabled:opacity-60`}
    >
      {currentStatus}
    </button>
  );
}
