// The customer-facing screen. The till writes what is happening (items scanned,
// sale finished, nothing going on) into the browser's local storage and the
// customer screen reacts to it instantly. It all happens inside this computer,
// so nothing goes through the internet.
//
// The customer screen can be shown two ways:
//  1. As a full-screen panel placed on the second monitor by the till page
//     itself (needs no clicking on the customer screen: one click on the till
//     starts it).
//  2. As a separate window, used when no second monitor is found.

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
const START_EVENT = "bn-start-customer-screen";

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
 * Opens the customer screen. If the computer has a second monitor and the
 * browser allows it, the window opens straight on that monitor. Otherwise it
 * opens as an ordinary window you can drag across.
 */
export async function openCustomerDisplay() {
  let features = "popup=yes,width=900,height=700";
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
    if (typeof w.getScreenDetails === "function") {
      const details = await w.getScreenDetails();
      const other = details.screens.find((s) => !s.isPrimary);
      if (other) {
        features = `popup=yes,left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`;
      }
    }
  } catch {
    // permission refused or unsupported: use the plain window
  }
  window.open(DISPLAY_PATH, "bn-customer-display", features);
}

/** Asks the customer screen to start (or stop). Must be called from a click. */
export function startCustomerScreen() {
  window.dispatchEvent(new Event(START_EVENT));
}
export const START_CUSTOMER_SCREEN_EVENT = START_EVENT;

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
