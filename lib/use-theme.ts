"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PAPER_SPEC,
  THEME_STORAGE_KEY,
  applyVariant,
  buildStored,
  buildVariant,
  matchPreset,
  parseStored,
  presetById,
  resolveMode,
  type ThemeSpec,
} from "@/lib/theme";

/**
 * Owns the active theme: loads it from localStorage, applies it to <html>, saves it, and follows
 * the OS setting when the mode is "auto". The boot script in layout.tsx already painted the saved
 * theme before React started, so this hook only has to keep the UI state in sync with it.
 */
export function useTheme() {
  const [id, setId] = useState("paper");
  const [spec, setSpec] = useState<ThemeSpec>(PAPER_SPEC);
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Load once. Everything is set in one batch so the apply effect never sees a half-loaded state.
  useEffect(() => {
    try {
      const saved = parseStored(JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) ?? "null"));
      if (saved) {
        setId(saved.id);
        setSpec(saved.spec);
      }
    } catch {
      /* unreadable or blocked storage: stay on the default */
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    setReady(true);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Apply + persist whenever the theme (or the OS preference, for "auto") changes.
  useEffect(() => {
    if (!ready) return;
    applyVariant(buildVariant(spec, resolveMode(spec.mode, systemDark)));
    try {
      const json = JSON.stringify(buildStored(id, spec));
      if (window.localStorage.getItem(THEME_STORAGE_KEY) !== json) window.localStorage.setItem(THEME_STORAGE_KEY, json);
    } catch {
      /* storage full or blocked: the theme still applies for this session */
    }
  }, [ready, id, spec, systemDark]);

  const setPreset = useCallback((presetId: string) => {
    const p = presetById(presetId);
    if (!p) return;
    setId(p.id);
    setSpec(p.spec);
  }, []);

  /** Change part of the theme. Editing a preset forks it into "custom" (unless it lands exactly on another preset). */
  const update = useCallback((patch: Partial<ThemeSpec>) => {
    setSpec((prev) => {
      const next = { ...prev, ...patch };
      setId(matchPreset(next)?.id ?? "custom");
      return next;
    });
  }, []);

  const reset = useCallback(() => setPreset("paper"), [setPreset]);

  return { id, spec, systemDark, setPreset, update, reset };
}

export type ThemeController = ReturnType<typeof useTheme>;
