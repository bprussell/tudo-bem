export type Rate = "normal" | "slow" | "slower";

export const RATE_TO_PROSODY: Record<Rate, string | null> = {
  normal: null,
  slow: "-25%",
  slower: "-40%",
};

export const ALLOWED_VOICES: ReadonlySet<string> = new Set([
  "pt-PT-RaquelNeural",
  "pt-PT-DuarteNeural",
  "pt-PT-FernandaNeural",
]);

export function escapeForSsml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSsml(text: string, voice: string, rate: Rate): string {
  const safe = escapeForSsml(text);
  const prosody = RATE_TO_PROSODY[rate];
  const inner = prosody
    ? `<prosody rate="${prosody}">${safe}</prosody>`
    : safe;
  return `<speak version="1.0" xml:lang="pt-PT"><voice name="${voice}">${inner}</voice></speak>`;
}

export function isValidRate(rate: string): rate is Rate {
  return rate in RATE_TO_PROSODY;
}
