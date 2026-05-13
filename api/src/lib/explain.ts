import { USER_CONTEXT } from "../userContext";

export type Role = "user" | "assistant";
export type ExplainMessage = { role: Role; content: string };
export type ExplainTopic = { pt: string; en?: string; context?: string };
export type ExplainRequest = {
  topic: ExplainTopic;
  messages: ExplainMessage[];
};

// ExplainReply shape is mirrored in web/src/lib/explain.ts — keep in sync (issue #9).
export type ExplainReply = {
  answer: string;
  mock?: boolean;
};

export type ValidationError = { error: string };

export const MAX_HISTORY = 20;
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_TOPIC_CHARS = 1000;
const VALID_ROLES: ReadonlySet<Role> = new Set<Role>(["user", "assistant"]);

export function validateExplainRequest(body: unknown): ExplainRequest | ValidationError {
  if (!body || typeof body !== "object") return { error: "request must be an object" };
  const obj = body as Record<string, unknown>;
  if (!obj.topic || typeof obj.topic !== "object") return { error: "topic required" };
  const topic = obj.topic as Record<string, unknown>;
  if (typeof topic.pt !== "string" || !topic.pt.trim()) return { error: "topic.pt required" };
  if (topic.pt.length > MAX_TOPIC_CHARS) return { error: `topic.pt exceeds ${MAX_TOPIC_CHARS}` };
  if (topic.en !== undefined && typeof topic.en !== "string") return { error: "topic.en must be a string" };
  if (topic.context !== undefined && typeof topic.context !== "string") return { error: "topic.context must be a string" };

  if (!Array.isArray(obj.messages)) return { error: "messages must be an array" };
  if (obj.messages.length === 0) return { error: "messages must not be empty" };
  if (obj.messages.length > MAX_HISTORY) return { error: `messages exceeds ${MAX_HISTORY}` };
  for (const m of obj.messages) {
    if (!m || typeof m !== "object") return { error: "each message must be an object" };
    const msg = m as Record<string, unknown>;
    if (typeof msg.role !== "string" || !VALID_ROLES.has(msg.role as Role)) {
      return { error: "message.role must be 'user' or 'assistant'" };
    }
    if (typeof msg.content !== "string") return { error: "message.content must be a string" };
    if (msg.content.length > MAX_MESSAGE_CHARS) return { error: `message.content exceeds ${MAX_MESSAGE_CHARS}` };
  }

  return {
    topic: {
      pt: topic.pt.trim(),
      en: typeof topic.en === "string" ? topic.en.trim() : undefined,
      context: typeof topic.context === "string" ? topic.context.trim() : undefined,
    },
    messages: obj.messages as ExplainMessage[],
  };
}

export function isValidationError(x: ExplainRequest | ValidationError): x is ValidationError {
  return "error" in x;
}

export function buildSystemPrompt(topic: ExplainTopic): string {
  const topicLine = topic.en
    ? `Current topic: the European Portuguese phrase "${topic.pt}" (English: "${topic.en}")${topic.context ? `, from a "${topic.context}" practice scenario` : ""}.`
    : `Current topic: the European Portuguese phrase "${topic.pt}"${topic.context ? `, from a "${topic.context}" practice scenario` : ""}.`;

  return `You are a friendly European Portuguese (pt-PT) language tutor. The user asks questions in English about a specific pt-PT phrase or about Portuguese in general.

${topicLine}

${USER_CONTEXT}

Reply in English, clearly and concisely (2–4 short paragraphs typical, shorter when the answer is simple). Quote any Portuguese in "double quotes". When relevant:
- Compare to Spanish (the user knows it at B2) only when it actually clarifies — don't force it
- Call out pt-PT vs pt-BR differences (especially when the question touches on something Duolingo would have taught differently)
- Suggest one or two alternative phrasings when asked, including formal/casual variants
- Explain grammar (verb forms, clitic placement, ser vs estar, present continuous "estar a + inf" vs "estar -ndo", etc.)
- Note cultural context where it matters

If the user's question is unclear, ask one short clarifying question instead of guessing.

Output format — return ONLY a single JSON object with this exact shape, no markdown fences, no prose around it:
{
  "answer": "<your English explanation; line breaks with \\n are fine>"
}`;
}

const MOCK_ANSWER_PREFIX =
  "(mock answer — set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT for real explanations.)\n\n";

export function mockExplainReply(req: ExplainRequest): ExplainReply {
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const trimmed = lastUser.length > 80 ? `${lastUser.slice(0, 77)}...` : lastUser;
  return {
    answer: `${MOCK_ANSWER_PREFIX}You asked about "${req.topic.pt}" — specifically: "${trimmed}". A real Azure OpenAI deployment would give a pedagogical answer here, covering grammar, alternative phrasings, and any pt-PT vs pt-BR distinctions relevant to your question.`,
    mock: true,
  };
}
