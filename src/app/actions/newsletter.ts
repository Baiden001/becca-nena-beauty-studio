"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNewsletter(input: {
  email: string;
  /** Honeypot: real visitors never see or fill this field. */
  company?: string;
}): Promise<{ ok: boolean; error?: string }> {
  // Bots tend to fill every field. Pretend it worked and drop it.
  if (input.company) return { ok: true };

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email, source: "footer" });

    // 23505 = already subscribed. Treat as success; no need to tell anyone.
    if (error && error.code !== "23505") {
      console.error("[newsletter] insert failed:", error);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
    return { ok: true };
  } catch (error) {
    console.error("[newsletter] unexpected error:", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
