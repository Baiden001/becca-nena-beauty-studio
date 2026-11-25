"use client";

import { useState } from "react";
import { Download, Share } from "lucide-react";
import { useInstallState } from "@/lib/pos-app";

/**
 * "Install app" for the till. Shows nothing once the app is installed, or in
 * browsers that can't install apps.
 */
export function InstallAppButton({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const state = useInstallState();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (state.kind === "installed" || state.kind === "unavailable") return null;

  const base =
    "inline-flex items-center gap-2 rounded-lg text-sm font-medium transition-colors " + className;

  if (state.kind === "ios") {
    return (
      <div className="relative">
        <button type="button" onClick={() => setShowIosHelp((v) => !v)} className={base}>
          <Share size={16} aria-hidden />
          {!compact && "Install app"}
        </button>
        {showIosHelp && (
          <p className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg bg-brown p-3 text-xs leading-relaxed text-cream shadow-xl">
            In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
            The till then opens from its own icon, full screen.
          </p>
        )}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => void state.install()} className={base} title="Install the till as an app on this device">
      <Download size={16} aria-hidden />
      {!compact && "Install app"}
    </button>
  );
}
