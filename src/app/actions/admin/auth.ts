"use server";

import { createClient } from "@/lib/supabase/server";

export interface SignInResult {
  ok: boolean;
  error?: string;
}

export async function signInStaff(
  email: string,
  password: string
): Promise<SignInResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase login error:", error);
    return {
      ok: false,
      error: "Incorrect email or password.",
    };
  }

  const user = data.user;

  if (!user) {
    return {
      ok: false,
      error: "Login succeeded but no user session was returned.",
    };
  }

  const { data: staff, error: staffError } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (staffError) {
    console.error("Staff lookup error:", staffError);

    await supabase.auth.signOut();

    return {
      ok: false,
      error: "Your staff account could not be verified.",
    };
  }

  if (!staff) {
    await supabase.auth.signOut();

    return {
      ok: false,
      error: "Your account is not linked to a staff profile.",
    };
  }

  return { ok: true };
}

export async function signOutStaff(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}