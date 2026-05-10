import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  buildSystemPrompt,
  isValidationError,
  mockExplainReply,
  validateExplainRequest,
  type ExplainReply,
} from "../lib/explain";

const API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";

export async function explain(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { status: 400, jsonBody: { error: "invalid JSON body" } };
  }

  const validated = validateExplainRequest(raw);
  if (isValidationError(validated)) {
    return { status: 400, jsonBody: validated };
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const explicitMock = process.env.MOCK_MODE === "1";
  const mockMode = explicitMock || !endpoint || !key || !deployment;

  if (mockMode) {
    if (!explicitMock) {
      context.warn(
        "Azure OpenAI env vars missing — serving mock /api/explain reply."
      );
    }
    return { status: 200, jsonBody: mockExplainReply(validated) };
  }

  const url = `${endpoint!.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${API_VERSION}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": key! },
    body: JSON.stringify({
      messages: [
        { role: "system", content: buildSystemPrompt(validated.topic) },
        ...validated.messages,
      ],
      max_tokens: 600,
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    context.error(`Azure OpenAI upstream ${upstream.status}: ${detail}`);
    return { status: 502, jsonBody: { error: "explain upstream failed", status: upstream.status } };
  }

  const json = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { status: 502, jsonBody: { error: "empty completion" } };
  }

  let parsed: ExplainReply;
  try {
    parsed = JSON.parse(content) as ExplainReply;
  } catch {
    return { status: 502, jsonBody: { error: "non-JSON completion", content } };
  }
  if (typeof parsed.answer !== "string" || !parsed.answer) {
    return { status: 502, jsonBody: { error: "malformed completion", content } };
  }

  return { status: 200, jsonBody: parsed };
}

app.http("explain", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: explain,
});
