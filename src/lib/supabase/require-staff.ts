import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRow } from "@/types/database";

/**
 * Returns the signed-in staff member's `users` row, or null if there is no
 * session or the authenticated account isn't linked to a staff record.
 *
 * This mirrors the `fn_is_staff()` check enforced by RLS in the database —
 * this helper is for UI/redirect purposes only. The database policies are
 * the real enforcement layer and still apply even if this check is bypassed.
 */
export async function getCurrentStaff(): Promise<UserRow | null> {
  const supabase = createClient();

  // getUser() re-validates with the Supabase Auth server — the
  // recommended call server-side, unlike getSession() which just decodes
  // whatever's in the cookie without checking it's still good.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff, error } = await supabase
  .from("users")
  .select("*")
  .eq("auth_user_id", user.id)
  .maybeSingle();

if (error) {
  console.error("Failed to load staff record:", error);
  return null;
}

return staff;
}

/**
 * Page-level guard for owner-only sections (Team, Products, Categories,
 * Collections, Promotions — see PRD section 27's permission table). Sales
 * staff who navigate here directly are bounced back to the dashboard.
 * Server-side redirect, so it can't be bypassed by hiding the nav link.
 */
export async function requireOwnerAdmin(): Promise<UserRow> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");
  if (staff.role !== "owner_admin") redirect("/admin");
  return staff;
}
