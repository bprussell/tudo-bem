import { beforeEach, describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "../src/lib/settings";

beforeEach(() => {
  localStorage.clear();
});

describe("loadSettings", () => {
  it("returns defaults when storage is empty", () => {
    const s = loadSettings();
    expect(s.voice).toBe("pt-PT-RaquelNeural");
    expect(s.showTranslation).toBe(true);
    expect(s.handsFree).toBe(false);
  });

  it("returns defaults when stored value is malformed", () => {
    localStorage.setItem("tudo-bem.settings", "not json");
    const s = loadSettings();
    expect(s.voice).toBe("pt-PT-RaquelNeural");
  });

  it("merges stored partial settings with defaults", () => {
    localStorage.setItem("tudo-bem.settings", JSON.stringify({ handsFree: true }));
    const s = loadSettings();
    expect(s.handsFree).toBe(true);
    expect(s.showTranslation).toBe(true);
    expect(s.voice).toBe("pt-PT-RaquelNeural");
  });
});

describe("saveSettings", () => {
  it("round-trips through localStorage", () => {
    saveSettings({
      voice: "pt-PT-DuarteNeural",
      showTranslation: false,
      handsFree: true,
    });
    const s = loadSettings();
    expect(s.voice).toBe("pt-PT-DuarteNeural");
    expect(s.showTranslation).toBe(false);
    expect(s.handsFree).toBe(true);
  });
});
