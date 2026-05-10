import { useEffect, useRef, useState } from "react";
import { sendChat, type ChatMessage, type ChatReply } from "../lib/chat";
import { clearChatTurns, loadChatTurns, saveChatTurns } from "../lib/chatStorage";
import { transcribe } from "../lib/stt";
import { fetchTtsAudio, type Voice } from "../lib/tts";
import { useRecorder } from "../hooks/useRecorder";
import { useExplain } from "../contexts/ExplainContext";
import { TtsButtons } from "./TtsButtons";

type TutorTurn = { role: "tutor"; reply: ChatReply };
type UserTurn = { role: "user"; content: string };
type Turn = TutorTurn | UserTurn;

type RecordingMode = "manual" | "hands-free";

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
  const autoSpokenIndexRef = useRef(-1);
  const autoAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoUrlRef = useRef<string | null>(null);
  const recordingModeRef = useRef<RecordingMode | null>(null);

  // Refs mirror state / props so async handlers and cross-effect cleanup
  // see fresh values without re-binding callbacks every render.
  const turnsRef = useRef(turns);
  const handsFreeRef = useRef(handsFree);
  const busyRef = useRef(busy);
  const voiceRef = useRef(voice);
  const scenarioIdRef = useRef(scenarioId);
  useEffect(() => { turnsRef.current = turns; }, [turns]);
  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => { voiceRef.current = voice; }, [voice]);
  scenarioIdRef.current = scenarioId;

  const recorder = useRecorder({ onComplete: handleRecordingComplete });

  useEffect(() => {
    const stored = loadChatTurns<Turn>(scenarioId) ?? [];
    setTurns(stored);
    setError(null);
    // Don't re-speak the last tutor turn on hands-free when restoring history.
    autoSpokenIndexRef.current = stored.length - 1;
    autoAudioRef.current?.pause();
    if (autoUrlRef.current) {
      URL.revokeObjectURL(autoUrlRef.current);
      autoUrlRef.current = null;
    }
  }, [scenarioId]);

  useEffect(() => {
    if (turns.length > 0) saveChatTurns(scenarioIdRef.current, turns);
  }, [turns]);

  useEffect(() => {
    return () => {
      autoAudioRef.current?.pause();
      if (autoUrlRef.current) URL.revokeObjectURL(autoUrlRef.current);
    };
  }, []);

  const recorderApiRef = useRef(recorder);
  recorderApiRef.current = recorder;

  useEffect(() => {
    if (!handsFree) {
      autoAudioRef.current?.pause();
      setAutoSpeaking(false);
      // If we were auto-listening, stop. Mode stays "hands-free" so the
      // recording-complete handler can fall through to dropping the
      // transcript into the input box instead of discarding silently.
      if (recorderApiRef.current.state === "recording" &&
          recordingModeRef.current === "hands-free") {
        recorderApiRef.current.stop();
      }
    }
  }, [handsFree]);

  useEffect(() => {
    if (!handsFree) return;
    const lastIndex = turns.length - 1;
    const last = turns[lastIndex];
    if (!last || last.role !== "tutor") return;
    if (lastIndex === autoSpokenIndexRef.current) return;
    autoSpokenIndexRef.current = lastIndex;
    void autoSpeakAndListen(last.reply.reply_pt);
  }, [turns, handsFree, voice]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  async function autoSpeakAndListen(text: string) {
    setAutoSpeaking(true);
    try {
      const url = await fetchTtsAudio(text, "normal", voiceRef.current);
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
      if (!(e instanceof Error && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setAutoSpeaking(false);
    }

    // After speaking, auto-listen if still in hands-free and not mid-API.
    if (!handsFreeRef.current || busyRef.current) return;
    if (recorder.state !== "idle") return;
    recordingModeRef.current = "hands-free";
    await recorder.start({ autoStopOnSilence: true });
  }

  async function start() {
    if (busy) return;
    await callApi([]);
  }

  function reset() {
    clearChatTurns(scenarioIdRef.current);
    setTurns([]);
    setInput("");
    setError(null);
    autoSpokenIndexRef.current = -1;
    autoAudioRef.current?.pause();
    if (autoUrlRef.current) {
      URL.revokeObjectURL(autoUrlRef.current);
      autoUrlRef.current = null;
    }
    if (recorder.state === "recording") {
      recordingModeRef.current = null;
      recorder.stop();
    }
  }

  async function send() {
    if (busy) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendText(text);
  }

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    const next: Turn[] = [...turnsRef.current, { role: "user", content: trimmed }];
    setTurns(next);
    await callApi(toApiMessages(next));
  }

  async function toggleMic() {
    if (busy || transcribing) return;
    if (recorder.state === "recording") {
      recorder.stop();
      return;
    }
    setError(null);
    recordingModeRef.current = "manual";
    await recorder.start();
  }

  function handleRecordingComplete(blob: Blob) {
    const mode = recordingModeRef.current;
    recordingModeRef.current = null;
    void completeRecording(blob, mode);
  }

  async function completeRecording(blob: Blob, mode: RecordingMode | null) {
    setError(null);
    setTranscribing(true);
    try {
      const reply = await transcribe(blob);
      const text = reply.transcript.trim();
      if (!text) return;
      if (mode === "manual") {
        setInput((prev) => (prev ? `${prev} ${text}` : text));
      } else if (mode === "hands-free") {
        if (handsFreeRef.current) {
          await sendText(text);
        } else {
          // Hands-free was turned off mid-flight; drop transcript into input
          // so the user can edit/send.
          setInput(text);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranscribing(false);
    }
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

  const isAutoListening =
    handsFree && recordingModeRef.current === "hands-free" && recorder.state === "recording";

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
      {isAutoListening && (
        <div className="hands-free-indicator listening">👂 A ouvir…</div>
      )}

      {(error || recorder.error) && (
        <div className="error">{error ?? recorder.error}</div>
      )}

      {turns.length > 0 && (
        <div className="chat-actions">
          <button type="button" className="link-button" onClick={reset}>
            ⟳ Reset conversation
          </button>
        </div>
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
  const explain = useExplain();
  return (
    <div className={`bubble tutor${reply.mock ? " mock" : ""}`}>
      <div className="pt">{reply.reply_pt}</div>
      {showTranslation && <div className="en">{reply.reply_en}</div>}
      {reply.tip && <div className="note">💡 {reply.tip}</div>}
      <TtsButtons text={reply.reply_pt} voice={voice} />
      <button
        type="button"
        className="link-button ask-link"
        onClick={() => explain.open({ pt: reply.reply_pt, en: reply.reply_en })}
      >
        💡 Ask about this
      </button>
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
