import { notFound } from "next/navigation";
import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { createClient } from "@/lib/supabase/server";
import { PromotionForm } from "@/components/admin/promotion-form";

export default async function EditPromotionPage({ params }: { params: { id: string } }) {
  await requireOwnerAdmin();
  const supabase = createClient();
  const { data: promotion } = await supabase
    .from("promotions")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!promotion) notFound();

  return (
    <div>
      <h1 className="font-serif text-2xl text-brown">{promotion.title}</h1>
      <div className="mt-6">
        <PromotionForm existing={promotion} />
      </div>
    </div>
  );
}
