import { useEffect, useRef, useState } from "react";
import { sendChat, type ChatMessage, type ChatReply } from "../lib/chat";
import { transcribe } from "../lib/stt";
import type { Voice } from "../lib/tts";
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
};

export function ChatView({ scenarioId, voice, showTranslation }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recorder = useRecorder();

  useEffect(() => {
    setTurns([]);
    setError(null);
  }, [scenarioId]);

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
