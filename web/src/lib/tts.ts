export type Rate = "normal" | "slow" | "slower";
export type Voice = "pt-PT-RaquelNeural" | "pt-PT-DuarteNeural" | "pt-PT-FernandaNeural";

export async function fetchTtsAudio(
  text: string,
  rate: Rate,
  voice: Voice
): Promise<string> {
  const params = new URLSearchParams({ text, rate, voice });
  const res = await fetch(`/api/tts?${params}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`TTS failed (${res.status}): ${detail}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
