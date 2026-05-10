import { blobToWav16kMono } from "./audio";

// STT response shapes mirrored in api/src/functions/stt.ts — keep in sync (issue #9).
export type WordScore = { word: string; accuracy: number };
export type Pronunciation = {
  accuracy: number;
  fluency: number;
  completeness: number;
  words: WordScore[];
};
export type STTReply = {
  transcript: string;
  pronunciation: Pronunciation | null;
  mock?: boolean;
};

export async function transcribe(audio: Blob, referenceText?: string): Promise<STTReply> {
  // Convert MediaRecorder output (webm/opus on Chromium, mp4/aac on Safari)
  // into 16kHz mono PCM WAV — the format Azure Speech accepts. Skip if the
  // recording is already WAV.
  const wav = audio.type.includes("wav") ? audio : await blobToWav16kMono(audio);
  const audioBase64 = await blobToBase64(wav);
  const res = await fetch("/api/stt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64,
      // Azure Speech REST expects this exact Content-Type for 16kHz mono PCM WAV.
      contentType: "audio/wav; codecs=audio/pcm; samplerate=16000",
      referenceText,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`STT failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as STTReply;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const i = result.indexOf(",");
      resolve(i >= 0 ? result.slice(i + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
