"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Undo2,
  Package,
  Tag,
  Layers,
  Megaphone,
  Users,
  UserCog,
  LogOut,
  type LucideProps,
} from "lucide-react";
import { signOutStaff } from "@/app/actions/admin/auth";
import { Logo } from "@/components/logo";

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
  exact?: boolean;
  ownerOnly?: boolean;
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
      { href: "/admin/walk-in", label: "Walk-in sale", icon: Store },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/returns", label: "Returns", icon: Undo2 },
    ],
  },
  {
    label: "Catalog",
    links: [
      { href: "/admin/products", label: "Products", icon: Package, ownerOnly: true },
      { href: "/admin/categories", label: "Categories", icon: Tag, ownerOnly: true },
      { href: "/admin/collections", label: "Collections", icon: Layers, ownerOnly: true },
      { href: "/admin/promotions", label: "Promotions", icon: Megaphone, ownerOnly: true },
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

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-rose/15 bg-white">
      <div className="flex items-center gap-2.5 border-b border-rose/10 px-5 py-5">
        <Logo size={24} />
        <div>
          <p className="font-serif text-base leading-tight text-brown">Becca Nena</p>
          <p className="text-[11px] uppercase tracking-wide text-taupe">Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => {
          const visibleLinks = group.links.filter((l) => !l.ownerOnly || isOwner);
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
                      className={`group flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm transition-colors ${
                        active
                          ? "border-rose bg-rose/10 font-medium text-rose"
                          : "border-transparent text-brown/75 hover:border-rose/30 hover:bg-cream hover:text-brown"
                      }`}
                    >
                      <Icon
                        size={17}
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
  );
}
