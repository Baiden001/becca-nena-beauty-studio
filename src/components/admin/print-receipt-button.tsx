"use client";

import { Printer } from "lucide-react";
import { printReceipt, type ReceiptData } from "@/lib/receipt";

type SerializableReceipt = Omit<ReceiptData, "paidAt"> & { paidAt: string };

/** Reprints the receipt for a past sale (for example if the customer lost theirs). */
export function PrintReceiptButton({ receipt }: { receipt: SerializableReceipt }) {
  return (
    <button
      type="button"
      onClick={() => printReceipt({ ...receipt, paidAt: new Date(receipt.paidAt) })}
      className="inline-flex items-center gap-2 rounded-full border border-brown/40 px-4 py-2 text-sm font-medium text-brown hover:border-rose hover:text-rose"
    >
      <Printer size={16} aria-hidden />
      Print receipt
    </button>
  );
}
