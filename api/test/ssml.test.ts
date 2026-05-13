import { describe, expect, it } from "vitest";
import { ALLOWED_VOICES, RATE_TO_PROSODY, buildSsml, escapeForSsml, isValidRate } from "../src/lib/ssml";

describe("escapeForSsml", () => {
  it("escapes the five XML special characters", () => {
    expect(escapeForSsml("&")).toBe("&amp;");
    expect(escapeForSsml("<")).toBe("&lt;");
    expect(escapeForSsml(">")).toBe("&gt;");
    expect(escapeForSsml('"')).toBe("&quot;");
    expect(escapeForSsml("'")).toBe("&apos;");
  });

  it("escapes & before other entities so we don't double-encode", () => {
    expect(escapeForSsml("a & b < c")).toBe("a &amp; b &lt; c");
    expect(escapeForSsml("&lt;")).toBe("&amp;lt;");
  });

  it("leaves Portuguese accented characters alone", () => {
    expect(escapeForSsml("Olá! Está bem?")).toBe("Olá! Está bem?");
    expect(escapeForSsml("pequeno-almoço, ementa, casa de banho")).toBe(
      "pequeno-almoço, ementa, casa de banho"
    );
  });
});

describe("RATE_TO_PROSODY", () => {
  it("maps every Rate value", () => {
    expect(RATE_TO_PROSODY.normal).toBeNull();
    expect(RATE_TO_PROSODY.slow).toBe("-25%");
    expect(RATE_TO_PROSODY.slower).toBe("-40%");
  });
});

describe("isValidRate", () => {
  it("accepts only normal/slow/slower", () => {
    expect(isValidRate("normal")).toBe(true);
    expect(isValidRate("slow")).toBe(true);
    expect(isValidRate("slower")).toBe(true);
    expect(isValidRate("fast")).toBe(false);
    expect(isValidRate("")).toBe(false);
  });
});

describe("ALLOWED_VOICES", () => {
  it("contains exactly the three pt-PT neural voices", () => {
    expect(ALLOWED_VOICES.size).toBe(3);
    expect(ALLOWED_VOICES.has("pt-PT-RaquelNeural")).toBe(true);
    expect(ALLOWED_VOICES.has("pt-PT-DuarteNeural")).toBe(true);
    expect(ALLOWED_VOICES.has("pt-PT-FernandaNeural")).toBe(true);
  });

  it("rejects pt-BR voices", () => {
    expect(ALLOWED_VOICES.has("pt-BR-FranciscaNeural")).toBe(false);
  });
});

describe("buildSsml", () => {
  it("wraps text in speak/voice without prosody when rate is normal", () => {
    const out = buildSsml("Olá", "pt-PT-RaquelNeural", "normal");
    expect(out).toBe(
      `<speak version="1.0" xml:lang="pt-PT"><voice name="pt-PT-RaquelNeural">Olá</voice></speak>`
    );
    expect(out).not.toContain("prosody");
  });

  it("wraps text in prosody for slow/slower", () => {
    expect(buildSsml("Olá", "pt-PT-RaquelNeural", "slow")).toContain(
      `<prosody rate="-25%">Olá</prosody>`
    );
    expect(buildSsml("Olá", "pt-PT-RaquelNeural", "slower")).toContain(
      `<prosody rate="-40%">Olá</prosody>`
    );
  });

  it("escapes user text so quotes/angle brackets can't break out of the voice element", () => {
    const out = buildSsml(`Quote: "<bad>"`, "pt-PT-RaquelNeural", "normal");
    expect(out).toContain("&quot;&lt;bad&gt;&quot;");
    expect(out).not.toContain("<bad>");
  });
});
