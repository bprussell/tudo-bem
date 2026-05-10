import type { Voice } from "./tts";

export type Settings = {
  voice: Voice;
  showTranslation: boolean;
};

const KEY = "tudo-bem.settings";

const DEFAULTS: Settings = {
  voice: "pt-PT-RaquelNeural",
  showTranslation: true,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // localStorage unavailable — silently no-op
  }
}
