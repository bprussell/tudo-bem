import { useRef, useState } from "react";
import { fetchTtsAudio, type Rate, type Voice } from "../lib/tts";

type Props = {
  text: string;
  voice: Voice;
};

export function TtsButtons({ text, voice }: Props) {
  const [loading, setLoading] = useState<Rate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  async function play(rate: Rate) {
    setError(null);
    setLoading(rate);
    try {
      const url = await fetchTtsAudio(text, rate, voice);
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = url;
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="tts-buttons">
      <button onClick={() => play("normal")} disabled={loading !== null}>
        {loading === "normal" ? "…" : "▶ Normal"}
      </button>
      <button onClick={() => play("slow")} disabled={loading !== null}>
        {loading === "slow" ? "…" : "▶ Slow"}
      </button>
      {error && <span className="tts-error">{error}</span>}
    </div>
  );
}
