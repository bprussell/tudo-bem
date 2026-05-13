// Persists a per-scenario chat history to localStorage. Treats turns as
// opaque JSON — the ChatView module owns the Turn shape.

const KEY_PREFIX = "tudo-bem.chat.";
const VERSION = 1;

type Envelope<T> = { version: number; turns: T[] };

export function loadChatTurns<T>(scenarioId: string): T[] | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + scenarioId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Envelope<T>>;
    if (parsed?.version !== VERSION || !Array.isArray(parsed.turns)) return null;
    return parsed.turns;
  } catch {
    return null;
  }
}

export function saveChatTurns<T>(scenarioId: string, turns: T[]): void {
  try {
    const envelope: Envelope<T> = { version: VERSION, turns };
    localStorage.setItem(KEY_PREFIX + scenarioId, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or storage unavailable — silently no-op.
  }
}

export function clearChatTurns(scenarioId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + scenarioId);
  } catch {
    // no-op
  }
}
