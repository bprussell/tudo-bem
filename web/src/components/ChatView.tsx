import { useEffect, useRef, useState } from "react";
import { sendChat, type ChatMessage, type ChatReply } from "../lib/chat";
import { transcribe } from "../lib/stt";
import { fetchTtsAudio, type Voice } from "../lib/tts";
import { useRecorder } from "../hooks/useRecorder";
import { TtsButtons } from "./TtsButtons";

type TutorTurn = {
  role: "tutor";
  reply: ChatReply;
};
type UserTurn = {
  role: "user";
  content: string;
};
type Turn = TutorTurn | UserTurn;

type Props = {
  scenarioId: string;
  voice: Voice;
  showTranslation: boolean;
  handsFree: boolean;
};

export function ChatView({ scenarioId, voice, showTranslation, handsFree }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [autoSpeaking, setAutoSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recorder = useRecorder();
  const autoSpokenIndexRef = useRef(-1);
  const autoAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setTurns([]);
    setError(null);
    autoSpokenIndexRef.current = -1;
    autoAudioRef.current?.pause();
    if (autoUrlRef.current) {
      URL.revokeObjectURL(autoUrlRef.current);
      autoUrlRef.current = null;
    }
  }, [scenarioId]);

  useEffect(() => {
    return () => {
      autoAudioRef.current?.pause();
      if (autoUrlRef.current) URL.revokeObjectURL(autoUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!handsFree) {
      autoAudioRef.current?.pause();
      setAutoSpeaking(false);
    }
  }, [handsFree]);

  useEffect(() => {
    if (!handsFree) return;
    const lastIndex = turns.length - 1;
    const last = turns[lastIndex];
    if (!last || last.role !== "tutor") return;
    if (lastIndex === autoSpokenIndexRef.current) return;
    autoSpokenIndexRef.current = lastIndex;
    void autoSpeak(last.reply.reply_pt);
  }, [turns, handsFree, voice]);

  async function autoSpeak(text: string) {
    setAutoSpeaking(true);
    try {
      const url = await fetchTtsAudio(text, "normal", voice);
      if (autoUrlRef.current) URL.revokeObjectURL(autoUrlRef.current);
      autoUrlRef.current = url;
      if (!autoAudioRef.current) autoAudioRef.current = new Audio();
      autoAudioRef.current.src = url;
      await autoAudioRef.current.play();
      await new Promise<void>((resolve) => {
        const audio = autoAudioRef.current!;
        const done = () => {
          audio.removeEventListener("ended", done);
          audio.removeEventListener("error", done);
          resolve();
        };
        audio.addEventListener("ended", done);
        audio.addEventListener("error", done);
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAutoSpeaking(false);
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  async function start() {
    if (busy) return;
    await callApi([]);
  }

  async function send() {
    if (busy) return;
    const text = input.trim();
    if (!text) return;
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    await callApi(toApiMessages(next));
  }

  async function toggleMic() {
    if (busy || transcribing) return;
    if (recorder.state === "recording") {
      const blob = await recorder.stop();
      if (!blob) return;
      setTranscribing(true);
      setError(null);
      try {
        const reply = await transcribe(blob);
        setInput((prev) => (prev ? `${prev} ${reply.transcript}` : reply.transcript));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setTranscribing(false);
      }
      return;
    }
    setError(null);
    await recorder.start();
  }

  async function callApi(history: ChatMessage[]) {
    setBusy(true);
    setError(null);
    try {
      const reply = await sendChat(scenarioId, history);
      setTurns((prev) => [...prev, { role: "tutor", reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      {turns.length === 0 ? (
        <div className="chat-empty">
          <p>Start the conversation — your tutor will speak first.</p>
          <button className="primary" onClick={start} disabled={busy}>
            {busy ? "…" : "Start"}
          </button>
        </div>
      ) : (
        <div className="chat-stream">
          {turns.map((t, i) => (t.role === "tutor" ? (
            <TutorBubble key={i} reply={t.reply} voice={voice} showTranslation={showTranslation} />
          ) : (
            <UserBubble key={i} content={t.content} />
          )))}
          {busy && <div className="bubble tutor pending">…</div>}
          <div ref={endRef} />
        </div>
      )}

      {autoSpeaking && (
        <div className="hands-free-indicator">🔊 A falar…</div>
      )}

      {(error || recorder.error) && (
        <div className="error">{error ?? recorder.error}</div>
      )}

      {turns.length > 0 && (
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <button
            type="button"
            className={`mic ${recorder.state}`}
            onClick={() => void toggleMic()}
            disabled={busy || transcribing}
            aria-label={recorder.state === "recording" ? "Stop recording" : "Record voice"}
            title={recorder.state === "recording" ? "Stop" : "Record"}
          >
            {transcribing ? "…" : recorder.state === "recording" ? "⏹" : "🎤"}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              recorder.state === "recording"
                ? "A gravar…"
                : transcribing
                ? "A transcrever…"
                : "Escreva em português…"
            }
            disabled={busy || recorder.state === "recording" || transcribing}
            autoFocus
          />
          <button
            type="submit"
            disabled={busy || transcribing || recorder.state !== "idle" || !input.trim()}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}

function TutorBubble({
  reply,
  voice,
  showTranslation,
}: {
  reply: ChatReply;
  voice: Voice;
  showTranslation: boolean;
}) {
  return (
    <div className={`bubble tutor${reply.mock ? " mock" : ""}`}>
      <div className="pt">{reply.reply_pt}</div>
      {showTranslation && <div className="en">{reply.reply_en}</div>}
      {reply.tip && <div className="note">💡 {reply.tip}</div>}
      <TtsButtons text={reply.reply_pt} voice={voice} />
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="bubble user">
      <div className="pt">{content}</div>
    </div>
  );
}

function toApiMessages(turns: Turn[]): ChatMessage[] {
  return turns.map((t) =>
    t.role === "user"
      ? { role: "user", content: t.content }
      : { role: "assistant", content: t.reply.reply_pt }
  );
}
