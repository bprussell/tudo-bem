import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { SCENARIOS } from "../scenarios";

type IncomingMessage = { role: "user" | "assistant"; content: string };
type ChatRequest = { scenarioId: string; messages: IncomingMessage[] };
type ChatReply = { reply_pt: string; reply_en: string; tip: string | null; mock?: boolean };

const API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
const MAX_HISTORY = 40;

export async function chat(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return { status: 400, jsonBody: { error: "invalid JSON body" } };
  }

  if (!body?.scenarioId || !Array.isArray(body.messages)) {
    return { status: 400, jsonBody: { error: "scenarioId and messages required" } };
  }
  if (body.messages.length > MAX_HISTORY) {
    return { status: 400, jsonBody: { error: `messages exceeds ${MAX_HISTORY}` } };
  }
  const persona = SCENARIOS[body.scenarioId];
  if (!persona) {
    return { status: 404, jsonBody: { error: `unknown scenario: ${body.scenarioId}` } };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const mockMode = process.env.MOCK_MODE === "1" || !endpoint || !key || !deployment;

  if (mockMode) {
    return { status: 200, jsonBody: mockReply(body) };
  }

  const url = `${endpoint!.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${API_VERSION}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": key! },
    body: JSON.stringify({
      messages: [
        { role: "system", content: persona.systemPrompt },
        ...body.messages,
      ],
      max_tokens: 400,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    context.error(`Azure OpenAI upstream ${upstream.status}: ${detail}`);
    return { status: 502, jsonBody: { error: "chat upstream failed", status: upstream.status } };
  }

  const json = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { status: 502, jsonBody: { error: "empty completion" } };
  }

  let parsed: ChatReply;
  try {
    parsed = JSON.parse(content) as ChatReply;
  } catch {
    return { status: 502, jsonBody: { error: "non-JSON completion", content } };
  }
  if (!parsed.reply_pt || !parsed.reply_en) {
    return { status: 502, jsonBody: { error: "malformed completion", content } };
  }

  return { status: 200, jsonBody: parsed };
}

function mockReply(req: ChatRequest): ChatReply {
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const opener = openerFor(req.scenarioId);
  const reply_pt = lastUser
    ? `${opener.ack} (Recebi: "${truncate(lastUser, 40)}")`
    : opener.greeting;
  return {
    reply_pt,
    reply_en: lastUser
      ? `(mock) Got your message. Configure AZURE_OPENAI_* for real replies.`
      : `(mock) ${opener.greetingEn}`,
    tip: "Mock mode is active. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT to use the real model.",
    mock: true,
  };
}

function openerFor(scenarioId: string): { greeting: string; greetingEn: string; ack: string } {
  switch (scenarioId) {
    case "cafe":
      return { greeting: "Bom dia! O que vai querer?", greetingEn: "Good morning! What would you like?", ack: "Com certeza." };
    case "restaurant":
      return { greeting: "Boa noite! Aqui está a ementa.", greetingEn: "Good evening! Here's the menu.", ack: "Muito bem." };
    case "taxi":
      return { greeting: "Olá! Para onde vamos?", greetingEn: "Hi! Where are we going?", ack: "Com certeza, já vamos." };
    case "hotel":
      return { greeting: "Boa tarde! Tem reserva?", greetingEn: "Good afternoon! Do you have a reservation?", ack: "Vou verificar." };
    case "directions":
      return { greeting: "Olá! Em que posso ajudar?", greetingEn: "Hi! How can I help?", ack: "Vou explicar." };
    default:
      return { greeting: "Olá!", greetingEn: "Hi!", ack: "Está bem." };
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

app.http("chat", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: chat,
});
