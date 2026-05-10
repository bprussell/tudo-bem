import { useEffect, useRef, useState } from "react";
import { sendChat, type ChatMessage, type ChatReply } from "../lib/chat";
import type { Voice } from "../lib/tts";
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
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTurns([]);
    startedRef.current = false;
  }, [scenarioId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  async function start() {
    if (startedRef.current || busy) return;
    startedRef.current = true;
    await callApi([]);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    await callApi(toApiMessages(next));
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

      {error && <div className="error">{error}</div>}

      {turns.length > 0 && (
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva em português…"
            disabled={busy}
            autoFocus
          />
          <button type="submit" disabled={busy || !input.trim()}>Send</button>
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
