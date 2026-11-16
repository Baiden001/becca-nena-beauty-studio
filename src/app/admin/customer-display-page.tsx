import type { Metadata } from "next";
import { CustomerDisplay } from "@/components/customer-display";

export const metadata: Metadata = {
  title: "Becca Nena Beauty Studio",
  robots: { index: false, follow: false },
};

// Opened on the second (customer-facing) screen from the Walk-in sale page.
export default function CustomerDisplayPage() {
  return <CustomerDisplay />;
}
