import { useState } from "react";
import { transcribe, type Pronunciation, type STTReply } from "../lib/stt";
import { useRecorder } from "../hooks/useRecorder";

type Props = {
  referenceText: string;
};

export function PracticeButton({ referenceText }: Props) {
  const [transcribing, setTranscribing] = useState(false);
  const [result, setResult] = useState<STTReply | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRecorder({
    onComplete: (blob) => {
      void scoreBlob(blob);
    },
  });

  async function scoreBlob(blob: Blob) {
    setTranscribing(true);
    setError(null);
    try {
      const reply = await transcribe(blob, referenceText);
      console.debug("[practice] stt reply", reply);
      setResult(reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranscribing(false);
    }
  }

  async function toggle() {
    if (transcribing) return;
    if (recorder.state === "recording") {
      recorder.stop();
      return;
    }
    setError(null);
    setResult(null);
    await recorder.start();
  }

  const label =
    transcribing
      ? "…"
      : recorder.state === "recording"
      ? "⏹ Stop"
      : "🎤 Practice";

  return (
    <div className="practice">
      <button
        type="button"
        className={`practice-button ${recorder.state}`}
        onClick={() => void toggle()}
        disabled={transcribing}
        aria-label={recorder.state === "recording" ? "Stop and score" : "Practice this phrase"}
      >
        {label}
      </button>
      {(error || recorder.error) && (
        <span className="tts-error">{error ?? recorder.error}</span>
      )}
      {result && <PracticeResult result={result} />}
    </div>
  );
}

function PracticeResult({ result }: { result: STTReply }) {
  const transcript = result.transcript.trim();
  if (!transcript && !result.pronunciation) {
    return <div className="practice-empty">Couldn't hear that — try again.</div>;
  }
  return (
    <div className="practice-result">
      {transcript && (
        <div className="transcript">
          <span className="transcript-label">Heard:</span> {transcript}
        </div>
      )}
      {result.pronunciation ? (
        <ScoreBreakdown pronunciation={result.pronunciation} mock={result.mock} />
      ) : (
        <div className="practice-empty">No pronunciation score returned for that clip.</div>
      )}
    </div>
  );
}

function ScoreBreakdown({
  pronunciation,
  mock,
}: {
  pronunciation: Pronunciation;
  mock?: boolean;
}) {
  return (
    <div className={`scores${mock ? " mock" : ""}`}>
      <div className="overall">
        Accuracy {Math.round(pronunciation.accuracy)} · Fluency{" "}
        {Math.round(pronunciation.fluency)} · Completeness{" "}
        {Math.round(pronunciation.completeness)}
        {mock && <span className="mock-tag"> (mock)</span>}
      </div>
      {pronunciation.words.length > 0 && (
        <div className="words">
          {pronunciation.words.map((w, i) => (
            <span key={i} className={`word ${tier(w.accuracy)}`} title={`${w.word}: ${Math.round(w.accuracy)}`}>
              {w.word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function tier(score: number): "good" | "okay" | "bad" {
  if (score >= 80) return "good";
  if (score >= 60) return "okay";
  return "bad";
}
