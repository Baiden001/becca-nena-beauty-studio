"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStaffRole, removeStaff } from "@/app/actions/admin/team";
import type { UserRole } from "@/types/database";

export function StaffRow({
  staffId,
  name,
  email,
  role,
  isSelf,
}: {
  staffId: string;
  name: string;
  email: string;
  role: UserRole;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(next: UserRole) {
    setBusy(true);
    setError(null);
    const result = await updateStaffRole(staffId, next);
    setBusy(false);
    if (!result.ok) {
      setError(result.error || "Could not update role.");
      return;
    }
    router.refresh();
  }

  async function handleRemove() {
    if (!confirm(`Remove ${name} from staff?`)) return;
    setBusy(true);
    setError(null);
    const result = await removeStaff(staffId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error || "Could not remove staff member.");
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
      <div>
        <p className="text-sm text-brown">
          {name} {isSelf && <span className="text-xs text-taupe">(you)</span>}
        </p>
        <p className="text-xs text-taupe">{email}</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex items-center gap-3">
        <select
          value={role}
          disabled={busy || isSelf}
          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
          className="rounded-full border border-taupe/30 bg-white px-3 py-1 text-xs text-brown focus:border-rose focus:outline-none disabled:opacity-60"
        >
          <option value="sales_staff">Sales staff</option>
          <option value="owner_admin">Owner / admin</option>
        </select>
        {!isSelf && (
          <button
            onClick={handleRemove}
            disabled={busy}
            className="text-xs text-taupe hover:text-rose disabled:opacity-60"
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}
