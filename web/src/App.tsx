import { useEffect, useRef, useState } from "react";
import { cafePhrases } from "./data/cafe";
import { fetchTtsAudio, type Rate, type Voice } from "./lib/tts";

const VOICES: { id: Voice; label: string }[] = [
  { id: "pt-PT-RaquelNeural", label: "Raquel (f)" },
  { id: "pt-PT-DuarteNeural", label: "Duarte (m)" },
  { id: "pt-PT-FernandaNeural", label: "Fernanda (f)" },
];

export function App() {
  const [voice, setVoice] = useState<Voice>("pt-PT-RaquelNeural");
  const [showTranslation, setShowTranslation] = useState(true);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    };
  }, []);

  async function play(text: string, rate: Rate, key: string) {
    setError(null);
    setLoadingKey(key);
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
      setLoadingKey(null);
    }
  }

  return (
    <main>
      <header>
        <h1>Tudo Bem</h1>
        <p className="tag">European Portuguese — café scenario</p>
      </header>

      <section className="controls">
        <label>
          Voice:
          <select value={voice} onChange={(e) => setVoice(e.target.value as Voice)}>
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showTranslation}
            onChange={(e) => setShowTranslation(e.target.checked)}
          />
          Show English
        </label>
      </section>

      {error && <div className="error">{error}</div>}

      <ol className="phrases">
        {cafePhrases.map((p, i) => {
          const normalKey = `${i}-normal`;
          const slowKey = `${i}-slow`;
          return (
            <li key={i}>
              <div className="pt">{p.pt}</div>
              {showTranslation && <div className="en">{p.en}</div>}
              {p.note && <div className="note">{p.note}</div>}
              <div className="actions">
                <button
                  onClick={() => play(p.pt, "normal", normalKey)}
                  disabled={loadingKey !== null}
                >
                  {loadingKey === normalKey ? "…" : "▶ Normal"}
                </button>
                <button
                  onClick={() => play(p.pt, "slow", slowKey)}
                  disabled={loadingKey !== null}
                >
                  {loadingKey === slowKey ? "…" : "▶ Slow"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <footer>
        <p>M1 demo · TTS only · see PLAN.md for roadmap</p>
      </footer>
    </main>
  );
}
