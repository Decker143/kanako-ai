"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(error => {
        console.error("KANAKO AI service worker registration failed", error);
      });
    }
  }, []);
  return null;
}
