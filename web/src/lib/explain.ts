// ExplainReply shape mirrored in api/src/lib/explain.ts — keep in sync (issue #9).

export type ExplainTopic = { pt: string; en?: string; context?: string };
export type ExplainMessage = { role: "user" | "assistant"; content: string };
export type ExplainReply = { answer: string; mock?: boolean };

export async function askExplain(
  topic: ExplainTopic,
  messages: ExplainMessage[]
): Promise<ExplainReply> {
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, messages }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`explain failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as ExplainReply;
}
