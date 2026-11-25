"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Maximize,
  Minimize,
  Monitor,
  Package,
  RefreshCw,
  ShoppingBag,
  Undo2,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { InstallAppButton } from "@/components/admin/install-app-button";
import { signOutStaff } from "@/app/actions/admin/auth";
import { startCustomerScreen } from "@/lib/customer-display";

const MENU = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/returns", label: "Returns", icon: Undo2 },
  { href: "/admin/products", label: "Products & stock", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
];

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="hidden text-right leading-tight md:block">
      <p className="text-sm font-semibold tabular-nums">
        {now.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="text-[11px] text-cream/60">
        {now.toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short" })}
      </p>
    </div>
  );
}

export function PosTopBar({
  staffName,
  role,
  online,
  onRefresh,
  refreshing,
}: {
  staffName: string;
  role: string;
  online: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-lg text-cream/80 transition-colors hover:bg-white/10 hover:text-cream";

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-3 bg-brown px-3 text-cream sm:px-4">
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-white/10"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cream">
            <Logo size={24} />
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block font-serif text-[15px]">Becca Nena</span>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-cream/60">Point of sale</span>
          </span>
          <ChevronDown size={16} className="text-cream/60" aria-hidden />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-rose/15 bg-white py-1.5 text-brown shadow-2xl"
          >
            {MENU.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream"
              >
                <Icon size={17} className="text-taupe" aria-hidden />
                {label}
              </Link>
            ))}
            <div className="my-1.5 border-t border-rose/10" />
            <InstallAppButton className="w-full px-4 py-2.5 text-brown hover:bg-cream" />
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                await signOutStaff();
                window.location.href = "/admin/login";
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={17} aria-hidden />
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <span
        className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
          online ? "bg-sage/20 text-sage" : "bg-red-500/20 text-red-200"
        }`}
        title={online ? "Connected" : "No internet: sales can't be recorded"}
      >
        {online ? <Wifi size={13} aria-hidden /> : <WifiOff size={13} aria-hidden />}
        {online ? "Online" : "Offline"}
      </span>

      <Clock />

      <div className="hidden h-8 w-px bg-white/15 md:block" />

      <div className="hidden min-w-0 leading-tight lg:block">
        <p className="truncate text-sm">{staffName}</p>
        <p className="text-[11px] capitalize text-cream/60">{role.replace("_", " ")}</p>
      </div>

      <div className="flex items-center">
        <button type="button" onClick={onRefresh} className={iconBtn} title="Reload products and stock" aria-label="Reload products and stock">
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => startCustomerScreen()}
          className={iconBtn}
          title="Open the customer screen"
          aria-label="Open the customer screen"
        >
          <Monitor size={18} aria-hidden />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className={`${iconBtn} hidden sm:flex`}
          title={fullscreen ? "Exit full screen" : "Full screen"}
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
        >
          {fullscreen ? <Minimize size={18} aria-hidden /> : <Maximize size={18} aria-hidden />}
        </button>
      </div>
    </header>
  );
}
