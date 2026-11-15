"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, X } from "lucide-react";
import { checkNewOnlineOrders, type NewOrderInfo } from "@/app/actions/admin/order-alerts";
import { chime, unlockAudio } from "@/lib/beep";
import { formatCedis } from "@/lib/pricing";

const POLL_MS = 12_000; // how often to look for new orders
const REPEAT_MS = 30_000; // how often the chime repeats while an order is waiting
const CURSOR_KEY = "bn-orders-cursor";
const SOUND_KEY = "bn-order-sound";

/**
 * Alerts the store team the moment an online order is paid: a chime, a banner
 * with a link to the order, and the browser tab title. Mounted once in the
 * admin layout, so it works on every admin page, including the walk-in screen.
 * Orders that arrived while the page was closed are announced when it opens.
 */
export function NewOrderAlerts() {
  const [pending, setPending] = useState<NewOrderInfo[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(true);
  const seen = useRef(new Set<string>());
  const cursor = useRef("");
  const originalTitle = useRef("");

  // Remember the sound choice and unlock audio on the first touch of the page.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SOUND_KEY);
      if (saved === "off") {
        setSoundOn(false);
        soundRef.current = false;
      }
    } catch {
      // storage unavailable: keep the default
    }
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const announce = useCallback((orders: NewOrderInfo[]) => {
    setPending((current) => [...current, ...orders]);
    if (soundRef.current) chime();
    try {
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        const first = orders[0];
        new Notification("New online order", {
          body:
            orders.length === 1
              ? `#${first.orderNumber}: ${formatCedis(first.total)}`
              : `${orders.length} new orders waiting`,
        });
      }
    } catch {
      // some mobile browsers don't allow this: the banner and sound still work
    }
  }, []);

  // Look for new orders every few seconds.
  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      let since = cursor.current;
      if (!since) {
        try {
          since = window.localStorage.getItem(CURSOR_KEY) ?? "";
        } catch {
          since = "";
        }
      }

      const result = await checkNewOnlineOrders(since).catch(() => null);
      if (!result || !result.ok || stopped) return;

      // First ever run in this browser: just note where "now" is.
      if (!since) {
        cursor.current = result.now;
      } else if (result.orders.length > 0) {
        const fresh = result.orders.filter((o) => !seen.current.has(o.id));
        fresh.forEach((o) => seen.current.add(o.id));
        cursor.current = result.orders[result.orders.length - 1].paidAt;
        if (fresh.length > 0) announce(fresh);
      } else {
        cursor.current = since;
      }

      try {
        window.localStorage.setItem(CURSOR_KEY, cursor.current);
      } catch {
        // ignore
      }
    };

    void poll();
    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [announce]);

  // Keep chiming until somebody deals with it.
  useEffect(() => {
    if (pending.length === 0) return;
    const repeat = setInterval(() => {
      if (soundRef.current) chime();
    }, REPEAT_MS);
    return () => clearInterval(repeat);
  }, [pending.length]);

  // Tab title shows the waiting count.
  useEffect(() => {
    if (!originalTitle.current) originalTitle.current = document.title;
    document.title =
      pending.length > 0
        ? `(${pending.length}) New online order`
        : originalTitle.current;
  }, [pending.length]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    soundRef.current = next;
    try {
      window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      // ignore
    }
    if (next) {
      chime(); // lets them hear it, and unlocks sound in the browser
      try {
        if ("Notification" in window && Notification.permission === "default") {
          void Notification.requestPermission();
        }
      } catch {
        // ignore
      }
    }
  }

  const latest = pending[pending.length - 1];

  return (
    <>
      {pending.length > 0 && latest && (
        <div
          role="alert"
          className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
        >
          <div className="flex w-full max-w-xl items-center gap-4 rounded-lg border border-rose bg-white px-5 py-4 shadow-xl">
            <Bell className="shrink-0 text-rose" size={22} strokeWidth={1.75} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brown">
                {pending.length === 1
                  ? "New online order"
                  : `${pending.length} new online orders`}
              </p>
              <p className="truncate text-sm text-taupe">
                #{latest.orderNumber} · {formatCedis(latest.total)} · paid
              </p>
            </div>
            <Link
              href={pending.length === 1 ? `/admin/orders/${latest.id}` : "/admin/orders"}
              onClick={() => setPending([])}
              className="shrink-0 rounded-full bg-rose px-4 py-2 text-sm font-medium text-cream hover:bg-brown"
            >
              {pending.length === 1 ? "View order" : "View orders"}
            </Link>
            <button
              type="button"
              onClick={() => setPending([])}
              aria-label="Dismiss"
              className="shrink-0 text-taupe hover:text-brown"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={soundOn}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-rose/30 bg-white px-4 py-2 text-xs text-brown shadow-md hover:border-rose"
      >
        {soundOn ? <Bell size={14} aria-hidden /> : <BellOff size={14} aria-hidden />}
        Order alerts {soundOn ? "on" : "muted"}
      </button>
    </>
  );
}
