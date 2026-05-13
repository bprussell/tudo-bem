import { useEffect, useRef, useState } from "react";
import { askExplain, type ExplainMessage, type ExplainTopic } from "../lib/explain";

type Props = {
  topic: ExplainTopic;
  onClose: () => void;
};

type Turn =
  | { role: "user"; content: string }
  | { role: "tutor"; content: string; mock?: boolean };

export function ExplainSidebar({ topic, onClose }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset on topic change
  useEffect(() => {
    setTurns([]);
    setInput("");
    setError(null);
    inputRef.current?.focus();
  }, [topic.pt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, busy]);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send() {
    if (busy) return;
    const text = input.trim();
    if (!text) return;
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const messages: ExplainMessage[] = next.map((t) => ({
        role: t.role === "user" ? "user" : "assistant",
        content: t.content,
      }));
      const reply = await askExplain(topic, messages);
      setTurns((prev) => [...prev, { role: "tutor", content: reply.answer, mock: reply.mock }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="explain-overlay" onClick={onClose}>
      <div className="explain-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="explain-header">
          <div className="explain-topic">
            <div className="label">Asking about</div>
            <div className="pt">{topic.pt}</div>
            {topic.en && <div className="en">{topic.en}</div>}
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="explain-stream">
          {turns.length === 0 && !busy && (
            <div className="explain-empty">
              <p>
                Ask anything in English about this phrase — grammar, alternatives,
                pt-PT vs pt-BR, when to use it, etc.
              </p>
              <ul className="explain-suggestions">
                <li>"Why 'a celebrar' and not 'celebrando'?"</li>
                <li>"Is there a more casual way to say this?"</li>
                <li>"How would a Brazilian say this differently?"</li>
              </ul>
            </div>
          )}
          {turns.map((t, i) =>
            t.role === "user" ? (
              <div key={i} className="bubble user">{t.content}</div>
            ) : (
              <div key={i} className={`bubble tutor${t.mock ? " mock" : ""}`}>
                {t.content.split("\n").map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
              </div>
            )
          )}
          {busy && <div className="bubble tutor pending">…</div>}
          <div ref={endRef} />
        </div>

        {error && <div className="error">{error}</div>}

        <div className="explain-input">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask in English… (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={busy}
          />
          <button type="button" onClick={() => void send()} disabled={busy || !input.trim()}>
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
