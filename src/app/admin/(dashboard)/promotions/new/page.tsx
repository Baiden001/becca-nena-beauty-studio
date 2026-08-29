import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { PromotionForm } from "@/components/admin/promotion-form";

export default async function NewPromotionPage() {
  await requireOwnerAdmin();

  return (
    <div>
      <h1 className="font-serif text-2xl text-brown">New promotion</h1>
      <div className="mt-6">
        <PromotionForm />
      </div>
    </div>
  );
}
