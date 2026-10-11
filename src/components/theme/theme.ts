"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY, type Theme } from "@/components/theme/constants";

// The theme lives on <html data-theme>, set before first paint by ThemeScript, so CSS can
// react to it without waiting for React. This hook just mirrors that attribute.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const read = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/** Current theme. Server renders "dark"; the client corrects it right after hydration. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "dark");
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the choice then lasts until reload.
  }
}
