"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { getBaseUrl } from "@/lib/base-url";
import type { UserRole } from "@/types/database";

export async function inviteStaff(
  name: string,
  email: string,
  role: UserRole
): Promise<{ ok: boolean; error?: string }> {
  await requireOwnerAdmin(); // redirects if not permitted

  if (!name.trim() || !email.trim()) {
    return { ok: false, error: "Name and email are required." };
  }

  const admin = createAdminClient();

  // Creates the Supabase Auth account and emails them an invite link to
  // set their password — requires the service role key, so this can't be
  // done with the regular anon/session client. redirectTo points the
  // email link at our own accept-invite page instead of Supabase's
  // default (the Site URL, which is the storefront homepage) so they
  // land on an actual "set your password" screen.
  const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${getBaseUrl()}/admin/accept-invite`,
  });

  if (inviteError || !data.user) {
    return {
      ok: false,
      error: inviteError?.message.includes("already been registered")
        ? "That email is already registered."
        : "Could not send the invite.",
    };
  }

  const { error: dbError } = await admin.from("users").insert({
    auth_user_id: data.user.id,
    name,
    email,
    role,
  });

  if (dbError) {
    return { ok: false, error: "Invite sent, but the staff record couldn't be created — remove the auth user and try again." };
  }

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function updateStaffRole(
  staffId: string,
  role: UserRole
): Promise<{ ok: boolean; error?: string }> {
  const current = await requireOwnerAdmin();

  if (current.id === staffId && role !== "owner_admin") {
    return { ok: false, error: "You can't remove your own owner access." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("users").update({ role }).eq("id", staffId);
  if (error) return { ok: false, error: "Could not update role." };

  revalidatePath("/admin/team");
  return { ok: true };
}

export async function removeStaff(staffId: string): Promise<{ ok: boolean; error?: string }> {
  const current = await requireOwnerAdmin();

  if (current.id === staffId) {
    return { ok: false, error: "You can't remove your own account." };
  }

  const admin = createAdminClient();

  const { data: staff } = await admin
    .from("users")
    .select("auth_user_id")
    .eq("id", staffId)
    .maybeSingle();

  const { error } = await admin.from("users").delete().eq("id", staffId);
  if (error) return { ok: false, error: "Could not remove staff member." };

  if (staff?.auth_user_id) {
    await admin.auth.admin.deleteUser(staff.auth_user_id);
  }

  revalidatePath("/admin/team");
  return { ok: true };
}
