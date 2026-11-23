"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/supabase/require-staff";
import type { PromotionCtaType, PromotionStatus } from "@/types/database";

export interface PromotionFormInput {
  title: string;
  description: string;
  ctaText: string;
  ctaType: PromotionCtaType;
  ctaTarget: string;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
}

function validate(input: PromotionFormInput): string | null {
  if (!input.title.trim()) return "Title is required.";
  if (!input.startDate || !input.endDate) return "Start and end dates are required.";
  if (new Date(input.endDate) <= new Date(input.startDate)) {
    return "End date must be after the start date.";
  }
  return null;
}

export async function createPromotion(
  input: PromotionFormInput
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };
  if (staff.role !== "owner_admin" && staff.role !== "sales_staff") return { ok: false, error: "Not authorized." };

  const error = validate(input);
  if (error) return { ok: false, error };

  const supabase = createClient();
  const { error: dbError } = await supabase.from("promotions").insert({
    title: input.title,
    description: input.description || null,
    cta_text: input.ctaText || null,
    cta_type: input.ctaType,
    cta_target: input.ctaTarget || null,
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status,
  });

  if (dbError) return { ok: false, error: "Could not create promotion." };

  revalidatePath("/admin/promotions");
  return { ok: true };
}

export async function updatePromotion(
  id: string,
  input: PromotionFormInput
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };
  if (staff.role !== "owner_admin" && staff.role !== "sales_staff") return { ok: false, error: "Not authorized." };

  const error = validate(input);
  if (error) return { ok: false, error };

  const supabase = createClient();
  const { error: dbError } = await supabase
    .from("promotions")
    .update({
      title: input.title,
      description: input.description || null,
      cta_text: input.ctaText || null,
      cta_type: input.ctaType,
      cta_target: input.ctaTarget || null,
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status,
    })
    .eq("id", id);

  if (dbError) return { ok: false, error: "Could not save changes." };

  revalidatePath("/admin/promotions");
  return { ok: true };
}

export async function setPromotionStatus(
  id: string,
  status: PromotionStatus
): Promise<{ ok: boolean; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not signed in." };
  if (staff.role !== "owner_admin" && staff.role !== "sales_staff") return { ok: false, error: "Not authorized." };

  const supabase = createClient();
  const { error } = await supabase.from("promotions").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "Could not update promotion." };

  revalidatePath("/admin/promotions");
  return { ok: true };
}
