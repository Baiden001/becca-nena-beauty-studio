"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteStaff } from "@/app/actions/admin/team";
import type { UserRole } from "@/types/database";

export function InviteStaffForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("sales_staff");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await inviteStaff(name, email, role);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || "Could not send invite.");
      return;
    }
    setName("");
    setEmail("");
    setRole("sales_staff");
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="invite-name" className="field-label">Name</label>
        <input
          id="invite-name"
          value={name}
          placeholder="Ama Owusu"
          onChange={(e) => setName(e.target.value)}
          className="field-input-sm mt-1.5 w-40"
        />
      </div>
      <div>
        <label htmlFor="invite-email" className="field-label">Email</label>
        <input
          id="invite-email"
          type="email"
          value={email}
          placeholder="ama@beccanena.com"
          onChange={(e) => setEmail(e.target.value)}
          className="field-input-sm mt-1.5 w-52"
        />
      </div>
      <div>
        <label htmlFor="invite-role" className="field-label">Role</label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="field-select-sm mt-1.5"
        >
          <option value="sales_staff">Sales staff</option>
          <option value="owner_admin">Owner / admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-rose px-4 py-2 text-xs font-medium text-cream shadow-sm transition-colors hover:bg-brown disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send invite"}
      </button>
      {sent && <p className="text-xs font-medium text-rose">Invite sent ✓</p>}
      {error && <p className="w-full field-error">{error}</p>}
    </form>
  );
}
