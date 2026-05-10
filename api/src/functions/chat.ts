import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { SCENARIOS } from "../scenarios";
import {
  isValidationError,
  mockReply,
  validateChatRequest,
  type ChatReply,
} from "../lib/chat";

const API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";

export async function chat(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { status: 400, jsonBody: { error: "invalid JSON body" } };
  }

  const validated = validateChatRequest(raw);
  if (isValidationError(validated)) {
    return { status: 400, jsonBody: validated };
  }

  const persona = SCENARIOS[validated.scenarioId];
  if (!persona) {
    return { status: 404, jsonBody: { error: `unknown scenario: ${validated.scenarioId}` } };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const explicitMock = process.env.MOCK_MODE === "1";
  const mockMode = explicitMock || !endpoint || !key || !deployment;

  if (mockMode) {
    if (!explicitMock) {
      context.warn(
        "Azure OpenAI env vars missing — serving mock replies. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT."
      );
    }
    return { status: 200, jsonBody: mockReply(validated) };
  }

  const url = `${endpoint!.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${API_VERSION}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": key! },
    body: JSON.stringify({
      messages: [
        { role: "system", content: persona.systemPrompt },
        ...validated.messages,
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

app.http("chat", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: chat,
});
