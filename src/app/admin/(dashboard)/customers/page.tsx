import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCustomersPage() {
  const supabase = createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, whatsapp, email, location, created_at, orders(id)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-serif text-2xl text-brown">Customers</h1>

      <div className="mt-6 overflow-x-auto rounded-md border border-rose/20 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-rose/10 text-xs uppercase text-taupe">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose/10">
            {customers?.length ? (
              customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-brown">{c.name}</td>
                  <td className="px-4 py-3 text-taupe">{c.phone}</td>
                  <td className="px-4 py-3 text-taupe">{c.location}</td>
                  <td className="px-4 py-3">
                    <span className="text-brown">
                      {Array.isArray(c.orders) ? c.orders.length : 0}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-taupe">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
