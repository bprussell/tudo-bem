import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { SCENARIOS } from "../scenarios";

type Role = "user" | "assistant";
type IncomingMessage = { role: Role; content: string };
type ChatRequest = { scenarioId: string; messages: IncomingMessage[] };
type ChatReply = { reply_pt: string; reply_en: string; tip: string | null; mock?: boolean };

const API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
const MAX_HISTORY = 40;
const MAX_MESSAGE_CHARS = 2000;
const VALID_ROLES = new Set<Role>(["user", "assistant"]);

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
  for (const m of body.messages) {
    if (!m || typeof m !== "object") {
      return { status: 400, jsonBody: { error: "each message must be an object" } };
    }
    if (!VALID_ROLES.has(m.role)) {
      return { status: 400, jsonBody: { error: "message.role must be 'user' or 'assistant'" } };
    }
    if (typeof m.content !== "string") {
      return { status: 400, jsonBody: { error: "message.content must be a string" } };
    }
    if (m.content.length > MAX_MESSAGE_CHARS) {
      return { status: 400, jsonBody: { error: `message.content exceeds ${MAX_MESSAGE_CHARS} chars` } };
    }
  }
  const persona = SCENARIOS[body.scenarioId];
  if (!persona) {
    return { status: 404, jsonBody: { error: `unknown scenario: ${body.scenarioId}` } };
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

type MockBank = {
  greeting: { pt: string; en: string };
  followUps: { pt: string; en: string }[];
};

function mockReply(req: ChatRequest): ChatReply {
  const bank = mockBankFor(req.scenarioId);
  const userTurns = req.messages.filter((m) => m.role === "user").length;
  const tip = "Mock mode active — set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT for real replies.";

  if (userTurns === 0) {
    return { reply_pt: bank.greeting.pt, reply_en: bank.greeting.en, tip, mock: true };
  }
  const choice = bank.followUps[(userTurns - 1) % bank.followUps.length];
  return { reply_pt: choice.pt, reply_en: choice.en, tip, mock: true };
}

function mockBankFor(scenarioId: string): MockBank {
  switch (scenarioId) {
    case "cafe":
      return {
        greeting: { pt: "Bom dia! O que vai querer?", en: "Good morning! What would you like?" },
        followUps: [
          { pt: "Com certeza, já trago.", en: "Of course, I'll bring it right away." },
          { pt: "Mais alguma coisa, se faz favor?", en: "Anything else, please?" },
          { pt: "Aqui tem. Bom proveito!", en: "Here you go. Enjoy!" },
          { pt: "São cinco euros, se faz favor.", en: "That'll be five euros, please." },
        ],
      };
    case "restaurant":
      return {
        greeting: { pt: "Boa noite! Aqui está a ementa.", en: "Good evening! Here's the menu." },
        followUps: [
          { pt: "Hoje o prato do dia é bacalhau à brás.", en: "Today's dish of the day is bacalhau à brás." },
          { pt: "Para beber, prefere água ou vinho?", en: "To drink, would you prefer water or wine?" },
          { pt: "Muito bem, anotado.", en: "Very good, noted." },
          { pt: "A casa de banho é por aquela porta.", en: "The bathroom is through that door." },
        ],
      };
    case "taxi":
      return {
        greeting: { pt: "Olá! Para onde vamos?", en: "Hi! Where are we going?" },
        followUps: [
          { pt: "Está bem, são uns vinte minutos com este trânsito.", en: "OK, about twenty minutes with this traffic." },
          { pt: "Aceito cartão, sim.", en: "Yes, I take card." },
          { pt: "Já chegámos. São doze euros.", en: "We've arrived. That'll be twelve euros." },
          { pt: "Quer que espere?", en: "Would you like me to wait?" },
        ],
      };
    case "hotel":
      return {
        greeting: { pt: "Boa tarde! Tem reserva?", en: "Good afternoon! Do you have a reservation?" },
        followUps: [
          { pt: "Posso ver o seu passaporte, se faz favor?", en: "May I see your passport, please?" },
          { pt: "O pequeno-almoço é das sete às dez, no primeiro andar.", en: "Breakfast is from seven to ten, on the first floor." },
          { pt: "A senha do Wi-Fi está no cartão da chave.", en: "The Wi-Fi password is on the keycard." },
          { pt: "O check-out é até às onze.", en: "Check-out is by eleven." },
        ],
      };
    case "directions":
      return {
        greeting: { pt: "Olá! Em que posso ajudar?", en: "Hi! How can I help?" },
        followUps: [
          { pt: "Siga em frente e vire à direita no segundo cruzamento.", en: "Go straight and turn right at the second intersection." },
          { pt: "É perto, uns cinco minutos a pé.", en: "It's close, about five minutes on foot." },
          { pt: "Pode apanhar o elétrico 28 ali à esquina.", en: "You can catch tram 28 just round the corner." },
          { pt: "A paragem do autocarro fica do outro lado da rua.", en: "The bus stop is across the street." },
        ],
      };
    default:
      return {
        greeting: { pt: "Olá!", en: "Hi!" },
        followUps: [{ pt: "Está bem.", en: "All right." }],
      };
  }
}

app.http("chat", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: chat,
});
