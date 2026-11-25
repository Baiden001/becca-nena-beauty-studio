"use client";

import { useEffect } from "react";
import { startPosApp } from "@/lib/pos-app";

/** Mounted once in the admin layout: turns on the installed-app support. */
export function PosAppSetup() {
  useEffect(() => {
    startPosApp();
  }, []);
  return null;
}
