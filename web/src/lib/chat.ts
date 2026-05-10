export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatReply = {
  reply_pt: string;
  reply_en: string;
  tip: string | null;
  mock?: boolean;
};

export async function sendChat(
  scenarioId: string,
  messages: ChatMessage[]
): Promise<ChatReply> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId, messages }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`chat failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as ChatReply;
}
