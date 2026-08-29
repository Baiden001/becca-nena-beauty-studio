import { createClient } from "@/lib/supabase/server";
import { requireOwnerAdmin } from "@/lib/supabase/require-staff";
import { InviteStaffForm } from "@/components/admin/invite-staff-form";
import { StaffRow } from "@/components/admin/staff-row";

export default async function TeamPage() {
  const currentStaff = await requireOwnerAdmin();

  const supabase = createClient();
  const { data: staff } = await supabase
    .from("users")
    .select("id, name, email, role")
    .order("created_at");

  return (
    <div>
      <h1 className="font-serif text-2xl text-brown">Team & access</h1>
      <p className="mt-1 text-sm text-taupe">
        Owner/admin has full access. Sales staff can view orders, contact
        customers, and update order statuses.
      </p>

      <div className="mt-6 rounded-md border border-rose/20 bg-white p-5">
        <p className="text-sm font-medium text-brown">Invite staff</p>
        <div className="mt-3">
          <InviteStaffForm />
        </div>
      </div>

      <ul className="mt-6 divide-y divide-rose/10 rounded-md border border-rose/20 bg-white">
        {staff?.map((s) => (
          <StaffRow
            key={s.id}
            staffId={s.id}
            name={s.name}
            email={s.email}
            role={s.role}
            isSelf={s.id === currentStaff.id}
          />
        ))}
      </ul>
    </div>
  );
}
