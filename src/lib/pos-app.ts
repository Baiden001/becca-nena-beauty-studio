"use client";

// Installed-app support for the admin / POS: registers the service worker and
// exposes the browser's "Install app" prompt to a button.

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let started = false;

/** Call once (from the admin layout). Safe to call again. */
export function startPosApp() {
  if (started || typeof window === "undefined") return;
  started = true;

  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("/pos-sw.js", { scope: "/admin/" }).catch((e) => {
      console.warn("[pos] service worker registration failed", e);
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // show our own button instead of the browser's mini bar
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

/** True when running as the installed app (its own window, no browser bar). */
export function isInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export type InstallState =
  | { kind: "installed" }
  | { kind: "prompt"; install: () => Promise<void> }
  /** iPhone/iPad: Safari has no prompt, the user uses Share → Add to Home Screen. */
  | { kind: "ios" }
  | { kind: "unavailable" };

export function useInstallState(): InstallState {
  const [, force] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (!mounted) return { kind: "unavailable" };
  if (isInstalledApp()) return { kind: "installed" };
  if (deferredPrompt) {
    const p = deferredPrompt;
    return {
      kind: "prompt",
      install: async () => {
        await p.prompt();
        await p.userChoice;
        deferredPrompt = null;
        notify();
      },
    };
  }
  if (isIos()) return { kind: "ios" };
  return { kind: "unavailable" };
}
