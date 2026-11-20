// The till writes the current sale to localStorage. A separate customer
// display window listens for storage changes and updates independently.
// The cashier page is never replaced or put into customer-display fullscreen.

import { useEffect, useState } from "react";

export interface DisplayLine {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export type DisplayState =
  | { kind: "idle"; at: number }
  | {
      kind: "sale";
      lines: DisplayLine[];
      total: number;
      /** The product to show large (the one just scanned). */
      focusId: string | null;
      /** Goes up with every scan so scanning the same product twice still animates. */
      seq: number;
      at: number;
    }
  | { kind: "thanks"; total: number; at: number };

export const DISPLAY_KEY = "bn-customer-display";
const CHANGE_EVENT = "bn-display-change";

const SLIDE_STALE_MS = 5 * 60 * 1000; // a sale left untouched this long goes back to idle
const THANKS_MS = 9000; // how long "thank you" stays
export const DISPLAY_PATH = "/admin/customer-display";

export function publishDisplay(state: DisplayState) {
  try {
    window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(state));
    // Browsers only tell OTHER windows about storage changes, so tell this one too.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // storage unavailable: the customer screen just stays on its idle picture
  }
}

export function readDisplay(): DisplayState | null {
  try {
    const raw = window.localStorage.getItem(DISPLAY_KEY);
    return raw ? (JSON.parse(raw) as DisplayState) : null;
  } catch {
    return null;
  }
}

/**
 * Opens a separate customer-facing browser window.
 *
 * window.open runs before any asynchronous permission request so the browser
 * treats it as a user-initiated popup. If the Multi-Screen Window Placement
 * API is available, move the new window to the other display afterwards.
 * If positioning is blocked or unsupported, the window remains available for
 * the cashier to drag to the customer monitor.
 */
export async function openCustomerDisplay() {
  const displayWindow = window.open(
    DISPLAY_PATH,
    "bn-customer-display",
    "popup=yes,width=1100,height=760"
  );

  if (!displayWindow) {
    window.alert(
      "The customer display window was blocked. Allow pop-ups for this site, then click Customer screen again."
    );
    return;
  }

  try {
    const w = window as unknown as {
      getScreenDetails?: () => Promise<{
        screens: {
          isPrimary: boolean;
          availLeft: number;
          availTop: number;
          availWidth: number;
          availHeight: number;
        }[];
      }>;
    };

    if (typeof w.getScreenDetails !== "function") return;

    const details = await w.getScreenDetails();
    const other = details.screens.find((screen) => !screen.isPrimary);
    if (!other || displayWindow.closed) return;

    try {
      displayWindow.moveTo(other.availLeft, other.availTop);
      displayWindow.resizeTo(other.availWidth, other.availHeight);
    } catch {
      // Manual dragging remains available.
    }
  } catch {
    // Permission denied or unsupported. The separate popup still works.
  }
}

/** Opens the separate customer window from the cashier's button click. */
export function startCustomerScreen() {
  void openCustomerDisplay();
}

/** The latest state for whoever is drawing the customer screen. */
export function useDisplayState(): DisplayState {
  const [state, setState] = useState<DisplayState>({ kind: "idle", at: 0 });

  useEffect(() => {
    const refresh = () => {
      const latest = readDisplay();
      if (latest) setState(latest);
    };
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISPLAY_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

  // "Thank you" fades back to idle, and an abandoned sale does too.
  useEffect(() => {
    if (state.kind === "thanks") {
      const t = setTimeout(() => setState({ kind: "idle", at: Date.now() }), THANKS_MS);
      return () => clearTimeout(t);
    }
    if (state.kind === "sale") {
      const wait = Math.max(1000, SLIDE_STALE_MS - (Date.now() - state.at));
      const t = setTimeout(() => setState({ kind: "idle", at: Date.now() }), wait);
      return () => clearTimeout(t);
    }
  }, [state]);

  return state;
}
