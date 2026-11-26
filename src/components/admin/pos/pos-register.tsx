"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronUp,
  Clock3,
  Minus,
  PauseCircle,
  Plus,
  Printer,
  ScanBarcode,
  Search,
  ShoppingBasket,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  lookupProducts,
  recordWalkInSale,
  type RegisterCategory,
  type RegisterProduct,
  type SaleProduct,
} from "@/app/actions/admin/walk-in";
import { beep } from "@/lib/beep";
import { desktop, printReceipt, type ReceiptData } from "@/lib/receipt";
import { publishDisplay } from "@/lib/customer-display";
import { formatCedis } from "@/lib/pricing";
import { holdSale, readHeldSales, removeHeldSale, type HeldSale } from "@/lib/held-sales";
import { PosTopBar, useOnline } from "./pos-top-bar";
import { PaymentPanel, methodLabel as labelOf, type PaymentResult } from "./payment-panel";

interface Line {
  product: SaleProduct;
  quantity: number;
}

interface Completed {
  orderId: string;
  orderNumber: string;
  total: number;
  change: number;
  receipt: ReceiptData;
}

const AUTO_PRINT_KEY = "bn-pos-auto-print";

const productLabel = (p: SaleProduct) => `${p.brand ? `${p.brand} ` : ""}${p.name}`;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function PosRegister({
  staffName,
  role,
  products,
  categories,
  loadError,
}: {
  staffName: string;
  role: string;
  products: RegisterProduct[];
  categories: RegisterCategory[];
  loadError?: string;
}) {
  const router = useRouter();
  const online = useOnline();
  const [refreshing, startRefresh] = useTransition();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [lines, setLines] = useState<Line[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [held, setHeld] = useState<HeldSale[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false); // phones: ticket as a sheet
  const [autoPrint, setAutoPrint] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);

  const linesRef = useRef<Line[]>([]);
  linesRef.current = lines;
  const lastAdded = useRef<string | null>(null);
  const addSeq = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSearch = useCallback(() => {
    // Don't pop up the on-screen keyboard on tablets every time an item is tapped.
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, []);

  useEffect(() => {
    setHeld(readHeldSales());
    try {
      setAutoPrint(window.localStorage.getItem(AUTO_PRINT_KEY) === "1");
    } catch {
      /* default off */
    }
  }, []);

  // Latest stock for each product, so the grid and ticket agree after a refresh.
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && p.categoryId !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand?.toLowerCase().includes(q) ?? false) ||
        p.barcode === q ||
        p.sku?.toLowerCase() === q
      );
    });
  }, [products, query, category]);

  const qtyInCart = useMemo(() => new Map(lines.map((l) => [l.product.id, l.quantity])), [lines]);

  const total = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const regularTotal = lines.reduce((s, l) => s + Math.max(l.product.regularPrice, l.product.price) * l.quantity, 0);
  const savings = regularTotal - total;
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  function addProduct(input: SaleProduct) {
    const product = byId.get(input.id) ?? input;
    const existing = linesRef.current.find((l) => l.product.id === product.id);
    const nextQty = (existing?.quantity ?? 0) + 1;

    if (product.stock < 1) {
      setError(`${productLabel(product)} is out of stock.`);
      beep(false);
      return;
    }
    if (nextQty > product.stock) {
      setError(`Only ${product.stock} of ${productLabel(product)} in stock.`);
      beep(false);
      return;
    }
    setError(null);
    lastAdded.current = product.id;
    addSeq.current += 1;
    setLines((cur) =>
      existing
        ? cur.map((l) => (l.product.id === product.id ? { ...l, quantity: nextQty } : l))
        : [...cur, { product, quantity: 1 }]
    );
    setFlashId(product.id);
    setTimeout(() => setFlashId((f) => (f === product.id ? null : f)), 450);
    beep(true);
  }

  function setQuantity(id: string, qty: number) {
    setLines((cur) =>
      cur.map((l) => {
        if (l.product.id !== id) return l;
        const stock = byId.get(id)?.stock ?? l.product.stock;
        return { ...l, quantity: Math.max(1, Math.min(qty || 1, stock)) };
      })
    );
  }

  function removeLine(id: string) {
    setLines((cur) => cur.filter((l) => l.product.id !== id));
  }

  function clearSale() {
    linesRef.current = []; // so a scan straight after sees an empty sale
    setLines([]);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setShowCustomer(false);
    setError(null);
    setPayError(null);
  }

  // Scans and Enter in the search box: exact barcode/SKU first, then a single
  // name match is added straight away.
  const processCode = useCallback(
    async (code: string) => {
      const q = code.trim();
      if (!q) return;
      setError(null);

      const local = products.find((p) => p.barcode === q || p.sku === q);
      if (local) {
        addProduct(local);
        setQuery("");
        return;
      }
      const res = await lookupProducts(q);
      if (!res.ok) {
        setError(res.error ?? "Search failed.");
        beep(false);
        return;
      }
      if (res.exact) {
        addProduct(res.exact);
        setQuery("");
        return;
      }
      if (/^\d{4,}$/.test(q)) {
        setError(`No product has the barcode "${q}". Check it on the product page.`);
        setQuery("");
        beep(false);
      } else if (visible.length === 1) {
        addProduct(visible[0]);
        setQuery("");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, visible, byId]
  );

  // Customer screen.
  useEffect(() => {
    if (completed) return;
    if (lines.length === 0) {
      publishDisplay({ kind: "idle", at: Date.now() });
      return;
    }
    const focus = lines.some((l) => l.product.id === lastAdded.current)
      ? lastAdded.current
      : lines[lines.length - 1].product.id;
    publishDisplay({
      kind: "sale",
      lines: lines.map((l) => ({
        id: l.product.id,
        name: l.product.name,
        brand: l.product.brand,
        price: l.product.price,
        quantity: l.quantity,
        imageUrl: l.product.imageUrl,
      })),
      total,
      focusId: focus,
      seq: addSeq.current,
      at: Date.now(),
    });
  }, [lines, completed, total]);

  useEffect(() => {
    if (completed) publishDisplay({ kind: "thanks", total: completed.total, at: Date.now() });
  }, [completed]);

  useEffect(() => () => publishDisplay({ kind: "idle", at: Date.now() }), []);

  function openPayment() {
    if (lines.length === 0) return;
    setPayError(null);
    setTicketOpen(false);
    setPaying(true);
  }

  function hold() {
    if (lines.length === 0) return;
    const time = new Date().toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
    setHeld(
      holdSale({
        label: customerName.trim() || `Sale held at ${time}`,
        heldBy: staffName,
        lines,
        customerName,
        customerPhone,
        notes,
      })
    );
    clearSale();
    beep(true);
  }

  function recall(sale: HeldSale) {
    if (lines.length > 0) {
      setError("Finish or hold the current sale before picking up another one.");
      setShowHeld(false);
      return;
    }
    // Use today's stock and price for every item, and drop anything since deleted.
    const restored = sale.lines
      .map((l) => {
        const fresh = byId.get(l.product.id);
        return fresh ? { product: fresh as SaleProduct, quantity: Math.min(l.quantity, fresh.stock) } : null;
      })
      .filter((l): l is Line => Boolean(l && l.quantity > 0));
    setLines(restored);
    setCustomerName(sale.customerName);
    setCustomerPhone(sale.customerPhone);
    setNotes(sale.notes);
    setShowCustomer(Boolean(sale.customerName || sale.customerPhone || sale.notes));
    setHeld(removeHeldSale(sale.id));
    setShowHeld(false);
    if (restored.length < sale.lines.length) {
      setError("Some held items are no longer available and were left out.");
    } else {
      setError(null);
    }
  }

  async function completeSale(p: PaymentResult) {
    setBusy(true);
    setPayError(null);
    // e.g. "Mobile Money + Cash" for a split payment
    const methodLabel = [...new Set(p.payments.map((x) => labelOf(x.method)))].join(" + ");
    const hasCash = p.payments.some((x) => x.method === "cash");

    const result = await recordWalkInSale({
      lines: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      paymentMethod: p.payments[0].method,
      payments: p.payments.map((x) => ({ method: x.method, amount: x.amount, reference: x.reference })),
      customerName,
      customerPhone,
      notes: notes.trim(),
    });
    setBusy(false);

    if (!result.ok || !result.orderId || !result.orderNumber) {
      setPayError(result.error ?? "Could not record the sale.");
      beep(false);
      return;
    }

    const saleTotal = result.total ?? total;
    const receipt: ReceiptData = {
      orderNumber: result.orderNumber,
      paidAt: new Date(),
      cashier: staffName,
      customerName: customerName.trim(),
      items: lines.map((l) => ({
        name: productLabel(l.product),
        quantity: l.quantity,
        unitPrice: l.product.price,
        regularPrice: l.product.regularPrice,
      })),
      paymentMethod: methodLabel,
      payments:
        p.payments.length > 1 ? p.payments.map((x) => ({ label: labelOf(x.method), amount: x.amount })) : undefined,
      amountTendered: p.tendered,
      change: p.change,
    };
    setCompleted({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      total: saleTotal,
      change: p.change,
      receipt,
    });
    setPaying(false);
    beep(true);
    // Desktop app: pop the cash drawer for cash sales (if turned on in its settings).
    const app = desktop();
    if (app && hasCash) {
      void app.drawerOnCash().then((on) => (on ? app.openDrawer() : null)).catch(() => {});
    }
    if (autoPrint) void printReceipt(receipt);
    startRefresh(() => router.refresh()); // fresh stock numbers in the grid
  }

  function newSale() {
    clearSale();
    setCompleted(null);
    setTimeout(focusSearch, 0);
  }

  function toggleAutoPrint() {
    setAutoPrint((v) => {
      try {
        window.localStorage.setItem(AUTO_PRINT_KEY, v ? "0" : "1");
      } catch {
        /* only for this visit */
      }
      return !v;
    });
  }

  // Keyboard shortcuts and scanner capture (when the payment screen is closed).
  const keyState = useRef({ paying, completed, lines, showHeld });
  keyState.current = { paying, completed, lines, showHeld };
  const actions = useRef({ openPayment, hold, newSale, processCode });
  actions.current = { openPayment, hold, newSale, processCode };

  useEffect(() => {
    let buffer = "";
    let lastKey = 0;

    const onKey = (e: KeyboardEvent) => {
      const s = keyState.current;
      if (s.paying) return; // the payment screen handles its own keys

      if (s.completed) {
        // Scanning the next customer's first item starts the new sale with it.
        const now = Date.now();
        if (now - lastKey > 60) buffer = "";
        lastKey = now;
        if (e.key === "Enter" || e.key === "F9") {
          e.preventDefault();
          const code = buffer;
          buffer = "";
          actions.current.newSale();
          if (code.length >= 3) setTimeout(() => void actions.current.processCode(code), 0);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          buffer += e.key;
          // "P" typed by hand (not part of a fast scan) prints the receipt.
          if (e.key.toLowerCase() === "p" && buffer.length === 1) {
            const receipt = s.completed.receipt;
            setTimeout(() => {
              if (buffer === e.key) void printReceipt(receipt);
            }, 80);
          }
        }
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.key === "F9" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        actions.current.openPayment();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        actions.current.hold();
        return;
      }
      if (e.key === "Escape") {
        if (s.showHeld) setShowHeld(false);
        else {
          setQuery("");
          setError(null);
        }
        return;
      }

      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // A scanner types fast and ends with Enter; catch it even with nothing focused.
      const now = Date.now();
      if (now - lastKey > 60) buffer = "";
      lastKey = now;
      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          e.preventDefault();
          void actions.current.processCode(buffer);
        }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    focusSearch();
  }, [focusSearch]);

  // ───────────────────────── Ticket (right-hand panel) ─────────────────────────
  const ticket = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-rose/15 px-4 py-3">
        <div>
          <p className="text-[15px] font-semibold text-brown">Current sale</p>
          <p className="text-xs text-taupe">
            {itemCount} item{itemCount === 1 ? "" : "s"} · {staffName}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowHeld(true)}
            className="relative flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-brown hover:bg-cream"
            title="Held sales"
          >
            <Clock3 size={17} aria-hidden />
            <span className="hidden sm:inline">Held</span>
            {held.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose px-1 text-[11px] font-semibold text-cream">
                {held.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={clearSale}
            disabled={lines.length === 0}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-taupe hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Clear sale"
            aria-label="Clear sale"
          >
            <Trash2 size={17} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setTicketOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-taupe hover:bg-cream lg:hidden"
            aria-label="Close ticket"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-taupe">
              <ScanBarcode size={26} aria-hidden />
            </span>
            <p className="text-sm text-taupe">Scan a barcode or tap a product to start the sale.</p>
          </div>
        ) : (
          <ul className="divide-y divide-rose/10">
            {lines.map(({ product, quantity }) => {
              const discounted = product.regularPrice > product.price;
              return (
                <li
                  key={product.id}
                  className={`px-4 py-3 transition-colors ${flashId === product.id ? "bg-rose-light/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-brown">{productLabel(product)}</p>
                      <p className="mt-0.5 text-xs text-taupe">
                        {formatCedis(product.price)}
                        {discounted && (
                          <span className="ml-1.5 line-through">{formatCedis(product.regularPrice)}</span>
                        )}{" "}
                        each
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-brown">
                      {formatCedis(product.price * quantity)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-rose/25">
                      <button
                        type="button"
                        aria-label={`One less ${product.name}`}
                        onClick={() => (quantity === 1 ? removeLine(product.id) : setQuantity(product.id, quantity - 1))}
                        className="flex h-9 w-9 items-center justify-center text-brown hover:text-rose"
                      >
                        {quantity === 1 ? <Trash2 size={14} aria-hidden /> : <Minus size={15} aria-hidden />}
                      </button>
                      <input
                        aria-label={`Quantity of ${product.name}`}
                        inputMode="numeric"
                        value={quantity}
                        onChange={(e) => setQuantity(product.id, Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="w-9 bg-transparent text-center text-sm font-semibold tabular-nums text-brown outline-none"
                      />
                      <button
                        type="button"
                        aria-label={`One more ${product.name}`}
                        onClick={() => setQuantity(product.id, quantity + 1)}
                        disabled={quantity >= (byId.get(product.id)?.stock ?? product.stock)}
                        className="flex h-9 w-9 items-center justify-center text-brown hover:text-rose disabled:opacity-30"
                      >
                        <Plus size={15} aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(product.id)}
                      className="text-xs text-taupe hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Customer */}
      <div className="border-t border-rose/15 px-4 py-3">
        {showCustomer ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-taupe">Customer (optional)</p>
              <button
                type="button"
                onClick={() => {
                  setShowCustomer(false);
                  setCustomerName("");
                  setCustomerPhone("");
                  setNotes("");
                }}
                className="text-xs text-taupe hover:text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Name"
                className="field-input py-2"
                aria-label="Customer name"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone"
                inputMode="tel"
                className="field-input py-2"
                aria-label="Customer phone"
              />
            </div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note on this sale"
              className="field-input py-2"
              aria-label="Sale note"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomer(true)}
            className="flex w-full items-center gap-2 rounded-lg py-1.5 text-sm text-taupe hover:text-brown"
          >
            <UserRound size={16} aria-hidden />
            Add customer or note
          </button>
        )}
      </div>

      {/* Totals + actions */}
      <div className="border-t border-rose/15 bg-cream/50 px-4 pb-4 pt-3">
        {savings > 0 && (
          <div className="flex justify-between text-sm text-taupe">
            <span>Discounts</span>
            <span className="tabular-nums text-brown">−{formatCedis(savings)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-brown">Total</span>
          <span className="font-serif text-4xl tabular-nums text-brown">{formatCedis(total)}</span>
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={hold}
            disabled={lines.length === 0}
            className="flex h-14 items-center gap-2 rounded-xl border border-brown/25 bg-white px-4 text-sm font-medium text-brown hover:border-brown disabled:opacity-40"
            title="Put this sale aside (F4)"
          >
            <PauseCircle size={18} aria-hidden />
            Hold
          </button>
          <button
            type="button"
            onClick={openPayment}
            disabled={lines.length === 0}
            className="flex h-14 items-center justify-center gap-3 rounded-xl bg-brown text-lg font-semibold text-cream transition hover:bg-[#4a3d3b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Charge {formatCedis(total)}
            <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 text-xs xl:inline">F9</kbd>
          </button>
        </div>
      </div>
    </div>
  );

  // ───────────────────────── Sale complete ─────────────────────────
  if (completed) {
    return (
      <div className="flex h-[100dvh] flex-col bg-cream">
        <PosTopBar
          staffName={staffName}
          role={role}
          online={online}
          onRefresh={() => startRefresh(() => router.refresh())}
          refreshing={refreshing}
        />
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
            <CheckCircle2 className="mx-auto text-sage" size={56} strokeWidth={1.5} aria-hidden />
            <p className="eyebrow mt-4">Sale complete · #{completed.orderNumber}</p>
            {completed.change > 0 ? (
              <>
                <p className="mt-4 text-sm text-taupe">Change due</p>
                <p className="font-serif text-6xl tabular-nums text-brown">{formatCedis(completed.change)}</p>
                <p className="mt-2 text-sm text-taupe">
                  Total {formatCedis(completed.total)} · cash received{" "}
                  {formatCedis(completed.receipt.amountTendered ?? completed.total)}
                </p>
                {completed.receipt.payments && (
                  <p className="mt-1 text-sm text-taupe">
                    {completed.receipt.payments.map((x) => `${x.label} ${formatCedis(x.amount)}`).join(" + ")}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mt-3 font-serif text-5xl tabular-nums text-brown">{formatCedis(completed.total)}</p>
                <p className="mt-2 text-sm text-taupe">
                  {completed.receipt.payments
                    ? completed.receipt.payments.map((x) => `${x.label} ${formatCedis(x.amount)}`).join(" + ")
                    : `Paid by ${completed.receipt.paymentMethod.toLowerCase()}`}
                </p>
              </>
            )}
            <p className="mt-1 text-xs text-taupe">Stock updated · recorded by {staffName}</p>

            <button
              type="button"
              onClick={newSale}
              autoFocus
              className="mt-7 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-brown text-lg font-semibold text-cream hover:bg-rose"
            >
              New sale
              <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 text-xs md:inline">Enter</kbd>
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void printReceipt(completed.receipt)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-brown/25 text-sm font-medium text-brown hover:border-brown"
              >
                <Printer size={17} aria-hidden />
                Print receipt
              </button>
              <Link
                href={`/admin/orders/${completed.orderId}`}
                className="flex h-12 items-center justify-center rounded-xl border border-brown/25 text-sm font-medium text-brown hover:border-brown"
              >
                View sale
              </Link>
            </div>
            <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm text-taupe">
              <input type="checkbox" checked={autoPrint} onChange={toggleAutoPrint} className="h-4 w-4 accent-rose" />
              Print a receipt automatically after every sale
            </label>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────── Register ─────────────────────────
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-cream">
      <PosTopBar
        staffName={staffName}
        role={role}
        online={online}
        onRefresh={() => startRefresh(() => router.refresh())}
        refreshing={refreshing}
      />

      <div className="flex min-h-0 flex-1">
        {/* Products */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="space-y-3 border-b border-rose/15 bg-white px-3 py-3 sm:px-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void processCode(query);
              }}
              className="relative"
            >
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Scan a barcode or search products"
                autoComplete="off"
                aria-label="Scan a barcode or search products"
                className="h-12 w-full rounded-xl border border-taupe/25 bg-cream/60 pl-11 pr-20 text-[15px] text-brown outline-none transition placeholder:text-taupe/60 focus:border-rose focus:bg-white focus:ring-2 focus:ring-rose/15"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-taupe hover:bg-cream"
                  aria-label="Clear search"
                >
                  <X size={16} aria-hidden />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-taupe/20 bg-white px-1.5 py-0.5 text-[11px] text-taupe md:block">
                  F2
                </kbd>
              )}
            </form>

            {categories.length > 0 && (
              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 sm:-mx-4 sm:px-4 [&::-webkit-scrollbar]:hidden">
                {[{ id: "all", name: "All products" }, ...categories].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`h-9 flex-shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                      category === c.id ? "bg-brown text-cream" : "bg-cream text-brown hover:bg-rose-light/40"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(error || loadError) && (
            <div className="mx-3 mt-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 sm:mx-4">
              <span>{error ?? loadError}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="text-red-400 hover:text-red-700">
                <X size={16} aria-hidden />
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-24 sm:p-4 lg:pb-4">
            {visible.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-sm text-taupe">
                <ShoppingBasket size={28} aria-hidden />
                {query ? (
                  <p>
                    Nothing matches &ldquo;{query}&rdquo;. Press Enter to search the full catalogue.
                  </p>
                ) : (
                  <p>No products here yet.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {visible.map((p) => {
                  const inCart = qtyInCart.get(p.id) ?? 0;
                  const out = p.stock < 1;
                  const low = !out && p.stock <= Math.max(1, p.lowStockThreshold);
                  const discounted = p.regularPrice > p.price;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        addProduct(p);
                        focusSearch();
                      }}
                      disabled={out}
                      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white text-left transition active:scale-[0.97] disabled:cursor-not-allowed ${
                        inCart ? "border-rose ring-2 ring-rose/30" : "border-rose/15 hover:border-rose/50 hover:shadow-md"
                      } ${flashId === p.id ? "scale-[0.97]" : ""}`}
                    >
                      <div className="relative aspect-[4/3] w-full bg-cream">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1536px) 14vw, (min-width: 1280px) 16vw, (min-width: 768px) 20vw, 45vw"
                            className={`object-cover ${out ? "opacity-40 grayscale" : ""}`}
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center font-serif text-3xl text-rose/70">
                            {initials(p.name)}
                          </span>
                        )}
                        {inCart > 0 && (
                          <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-rose px-2 text-sm font-semibold text-cream shadow">
                            {inCart}
                          </span>
                        )}
                        {discounted && !out && (
                          <span className="absolute left-2 top-2 rounded-md bg-brown px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream">
                            Sale
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-2.5">
                        {p.brand && <p className="truncate text-[11px] uppercase tracking-wide text-taupe">{p.brand}</p>}
                        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-brown">{p.name}</p>
                        <div className="mt-auto flex items-end justify-between gap-1 pt-1.5">
                          <span className="text-[15px] font-semibold tabular-nums text-brown">{formatCedis(p.price)}</span>
                          <span
                            className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              out
                                ? "bg-red-50 text-red-600"
                                : low
                                  ? "bg-amber-50 text-amber-700"
                                  : "text-taupe"
                            }`}
                          >
                            {out ? "Out of stock" : `${p.stock} left`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Ticket: side panel on tablets/desktops */}
        <aside className="hidden min-h-0 w-[380px] flex-shrink-0 border-l border-rose/15 lg:block xl:w-[420px]">{ticket}</aside>
      </div>

      {/* Phones / small tablets: total bar + ticket sheet */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rose/15 bg-white p-3 shadow-[0_-8px_24px_rgba(48,40,39,0.08)] lg:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTicketOpen(true)}
            className="flex h-14 flex-1 items-center justify-between rounded-xl border border-brown/20 px-4 text-left"
          >
            <span>
              <span className="block text-xs text-taupe">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
              <span className="font-serif text-xl tabular-nums text-brown">{formatCedis(total)}</span>
            </span>
            <ChevronUp size={20} className="text-taupe" aria-hidden />
          </button>
          <button
            type="button"
            onClick={openPayment}
            disabled={lines.length === 0}
            className="h-14 rounded-xl bg-brown px-6 text-base font-semibold text-cream disabled:opacity-40"
          >
            Charge
          </button>
        </div>
      </div>
      {ticketOpen && (
        <div className="fixed inset-0 z-30 flex flex-col bg-brown/50 lg:hidden" onClick={() => setTicketOpen(false)}>
          <div className="mt-auto h-[88dvh] overflow-hidden rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
            {ticket}
          </div>
        </div>
      )}

      {/* Held sales */}
      {showHeld && (
        <div className="fixed inset-0 z-40 flex justify-end bg-brown/50" onClick={() => setShowHeld(false)}>
          <div className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-rose/15 px-5 py-4">
              <div>
                <p className="text-[15px] font-semibold text-brown">Held sales</p>
                <p className="text-xs text-taupe">Saved on this till only</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHeld(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-taupe hover:bg-cream"
                aria-label="Close"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {held.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-taupe">
                  No held sales. Use <strong>Hold</strong> (F4) to put a customer&apos;s items aside while you serve
                  someone else.
                </p>
              ) : (
                <ul className="divide-y divide-rose/10">
                  {held.map((s) => {
                    const count = s.lines.reduce((n, l) => n + l.quantity, 0);
                    const sum = s.lines.reduce((n, l) => n + l.product.price * l.quantity, 0);
                    return (
                      <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                        <button type="button" onClick={() => recall(s)} className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium text-brown">{s.label}</p>
                          <p className="text-xs text-taupe">
                            {count} item{count === 1 ? "" : "s"} · {formatCedis(sum)} ·{" "}
                            {new Date(s.heldAt).toLocaleString("en-GH", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            · {s.heldBy}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => recall(s)}
                          className="rounded-lg bg-brown px-3 py-2 text-xs font-medium text-cream hover:bg-rose"
                        >
                          Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete the held sale "${s.label}"?`)) setHeld(removeHeldSale(s.id));
                          }}
                          className="text-taupe hover:text-red-600"
                          aria-label={`Delete held sale ${s.label}`}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {paying && (
        <PaymentPanel
          total={total}
          itemCount={itemCount}
          busy={busy}
          error={payError}
          online={online}
          onCancel={() => {
            if (!busy) setPaying(false);
          }}
          onConfirm={(p) => void completeSale(p)}
        />
      )}
    </div>
  );
}
