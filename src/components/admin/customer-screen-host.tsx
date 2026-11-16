"use client";

import { useEffect, useRef, useState } from "react";
import { CustomerScreen } from "@/components/customer-display";
import {
  START_CUSTOMER_SCREEN_EVENT,
  openCustomerDisplay,
  useDisplayState,
} from "@/lib/customer-display";

type ScreenLike = object;
interface ScreenDetailsLike {
  screens: ScreenLike[];
  currentScreen: ScreenLike;
}

/**
 * Holds the customer screen inside the admin so it survives moving between
 * admin pages. One click on "Customer screen" (on the till) makes it fill the
 * second monitor. Nothing on the customer's screen needs touching or clicking.
 *
 * It uses the browser's multi-screen feature: Chrome or Edge asks once for
 * permission to "manage windows on all your displays". The first time, click
 * Allow, then click the button again.
 */
export function CustomerScreenHost() {
  const state = useDisplayState();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 8000);
    return () => clearTimeout(t);
  }, [note]);

  useEffect(() => {
    const start = async () => {
      const el = ref.current;
      if (!el) return;

      // Second click turns it off again.
      if (document.fullscreenElement === el) {
        await document.exitFullscreen().catch(() => {});
        setNote("Customer screen stopped.");
        return;
      }

      const w = window as unknown as {
        screen: { isExtended?: boolean };
        getScreenDetails?: () => Promise<ScreenDetailsLike>;
      };

      try {
        if (w.screen.isExtended && typeof w.getScreenDetails === "function") {
          const details = await w.getScreenDetails();
          const target = details.screens.find((s) => s !== details.currentScreen);
          if (target) {
            await (el as unknown as {
              requestFullscreen: (o: { screen: ScreenLike }) => Promise<void>;
            }).requestFullscreen({ screen: target });
            setNote("Customer screen started.");
            return;
          }
        }
        // No second monitor found: fall back to a normal window.
        await openCustomerDisplay();
        setNote(
          "No second screen was found, so a window was opened instead. In Windows display settings, choose Extend these displays."
        );
      } catch {
        setNote(
          "Allow the browser's permission to manage windows on your displays, then click Customer screen once more."
        );
      }
    };

    const handler = () => void start();
    window.addEventListener(START_CUSTOMER_SCREEN_EVENT, handler);
    return () => window.removeEventListener(START_CUSTOMER_SCREEN_EVENT, handler);
  }, []);

  return (
    <>
      {/* Parked off-screen until it is sent to the customer monitor. */}
      <div
        ref={ref}
        aria-hidden
        style={
          active
            ? undefined
            : {
                position: "fixed",
                left: "-200vw",
                top: 0,
                width: "100vw",
                height: "100dvh",
                pointerEvents: "none",
              }
        }
      >
        <CustomerScreen state={state} />
      </div>

      {note && (
        <p
          role="status"
          className="fixed bottom-16 right-4 z-40 max-w-xs rounded-lg border border-rose/30 bg-white px-4 py-3 text-xs text-brown shadow-md"
        >
          {note}
        </p>
      )}
    </>
  );
}
