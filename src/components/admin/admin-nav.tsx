"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Undo2,
  Calculator,
  BarChart3,
  Package,
  Tag,
  Layers,
  Megaphone,
  Users,
  UserCog,
  LogOut,
  Bell,
  BellOff,
  Menu,
  X,
  type LucideProps,
} from "lucide-react";
import { signOutStaff } from "@/app/actions/admin/auth";
import { Logo } from "@/components/logo";
import { useOrderSound } from "@/components/admin/new-order-alerts";
import { InstallAppButton } from "@/components/admin/install-app-button";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
  exact?: boolean;
  ownerOnly?: boolean;
  catalogStaff?: boolean;
}

interface NavGroup {
  label: string;
  links: NavLink[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/walk-in", label: "Point of sale", icon: Store },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/returns", label: "Returns", icon: Undo2 },
      { href: "/admin/reports", label: "Sales report", icon: BarChart3, ownerOnly: true },
      { href: "/admin/end-of-day", label: "End of day", icon: Calculator },
    ],
  },
  {
    label: "Catalog",
    links: [
      { href: "/admin/products", label: "Products", icon: Package, catalogStaff: true },
      { href: "/admin/categories", label: "Categories", icon: Tag, ownerOnly: true },
      { href: "/admin/collections", label: "Collections", icon: Layers, ownerOnly: true },
      { href: "/admin/promotions", label: "Promotions", icon: Megaphone, catalogStaff: true },
    ],
  },
  {
    label: "People",
    links: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/team", label: "Team & Access", icon: UserCog, ownerOnly: true },
    ],
  },
];

export function AdminNav({ staffName, role }: { staffName: string; role: string }) {
  const pathname = usePathname();
  const isOwner = role === "owner_admin";
  const [open, setOpen] = useState(false);
  const [soundOn, toggleSound] = useOrderSound();

  // Close the phone menu after moving to another page.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
    {/* Phones and tablets: slim top bar with a menu button */}
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-rose/15 bg-white px-3 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-brown hover:bg-cream"
      >
        <Menu size={22} aria-hidden />
      </button>
      <Logo size={22} />
      <p className="font-serif text-base text-brown">Becca Nena</p>
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label={soundOn ? "Mute online order alerts" : "Turn on online order alerts"}
        title={soundOn ? "Order alerts on" : "Order alerts muted"}
        className={`ml-auto flex h-10 w-10 items-center justify-center rounded-lg hover:bg-cream ${soundOn ? "text-brown" : "text-red-500"}`}
      >
        {soundOn ? <Bell size={19} aria-hidden /> : <BellOff size={19} aria-hidden />}
      </button>
    </div>
    {open && <div className="fixed inset-0 z-40 bg-brown/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-64 flex-shrink-0 flex-col border-r border-rose/15 bg-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-60 lg:translate-x-0 lg:shadow-none ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-rose/10 px-5 py-5">
        <Logo size={24} />
        <div>
          <p className="font-serif text-base leading-tight text-brown">Becca Nena</p>
          <p className="text-[11px] uppercase tracking-wide text-taupe">Admin</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-taupe hover:bg-cream lg:hidden"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => {
          const visibleLinks = group.links.filter(
            (l) => (!l.ownerOnly || isOwner) && (!l.catalogStaff || role === "owner_admin" || role === "sales_staff"),
          );
          if (!visibleLinks.length) return null;

          return (
            <div key={group.label}>
              <p className="px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-taupe/70">
                {group.label}
              </p>
              <div className="mt-2 space-y-0.5">
                {visibleLinks.map((link) => {
                  const active = link.exact
                    ? pathname === link.href
                    : pathname.startsWith(link.href);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-[15px] transition-colors ${
                        active
                          ? "border-rose bg-rose/10 font-medium text-rose"
                          : "border-transparent text-brown/75 hover:border-rose/30 hover:bg-cream hover:text-brown"
                      }`}
                    >
                      <Icon
                        size={19}
                        strokeWidth={2}
                        className={active ? "text-rose" : "text-taupe group-hover:text-brown"}
                      />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-rose/10 px-3 pt-3">
        <InstallAppButton className="w-full justify-center border border-rose/30 px-3 py-2.5 text-brown hover:border-rose hover:bg-cream" />
      </div>

      <div className="border-t border-rose/10 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-brown">{staffName}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                isOwner ? "bg-rose/10 text-rose" : "bg-sage/20 text-brown/70"
              }`}
            >
              {role.replace("_", " ")}
            </span>
          </div>
          <button
            onClick={async () => {
              await signOutStaff();
              // Hard navigation, not router.push/refresh — Next's client
              // router can serve a stale cached page, which here would
              // mean still looking "signed in" for a moment after
              // signing out.
              window.location.href = "/admin/login";
            }}
            aria-label="Sign out"
            className="flex-shrink-0 rounded-md p-2 text-taupe transition-colors hover:bg-cream hover:text-rose"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
