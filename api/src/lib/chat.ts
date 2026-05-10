export type Role = "user" | "assistant";
export type IncomingMessage = { role: Role; content: string };
export type ChatRequest = { scenarioId: string; messages: IncomingMessage[] };

// ChatReply shape is mirrored in web/src/lib/chat.ts — keep in sync (issue #9).
export type ChatReply = {
  reply_pt: string;
  reply_en: string;
  tip: string | null;
  mock?: boolean;
};

export type ValidationError = { error: string };

export const MAX_HISTORY = 40;
export const MAX_MESSAGE_CHARS = 2000;
export const VALID_ROLES: ReadonlySet<Role> = new Set<Role>(["user", "assistant"]);

export function validateChatRequest(body: unknown): ChatRequest | ValidationError {
  if (!body || typeof body !== "object") {
    return { error: "scenarioId and messages required" };
  }
  const obj = body as Record<string, unknown>;
  if (typeof obj.scenarioId !== "string" || !obj.scenarioId) {
    return { error: "scenarioId and messages required" };
  }
  if (!Array.isArray(obj.messages)) {
    return { error: "scenarioId and messages required" };
  }
  if (obj.messages.length > MAX_HISTORY) {
    return { error: `messages exceeds ${MAX_HISTORY}` };
  }
  for (const m of obj.messages) {
    if (!m || typeof m !== "object") return { error: "each message must be an object" };
    const msg = m as Record<string, unknown>;
    if (typeof msg.role !== "string" || !VALID_ROLES.has(msg.role as Role)) {
      return { error: "message.role must be 'user' or 'assistant'" };
    }
    if (typeof msg.content !== "string") {
      return { error: "message.content must be a string" };
    }
    if (msg.content.length > MAX_MESSAGE_CHARS) {
      return { error: `message.content exceeds ${MAX_MESSAGE_CHARS} chars` };
    }
  }
  return { scenarioId: obj.scenarioId, messages: obj.messages as IncomingMessage[] };
}

export function isValidationError(x: ChatRequest | ValidationError): x is ValidationError {
  return "error" in x;
}

export type MockBank = {
  greeting: { pt: string; en: string };
  followUps: { pt: string; en: string }[];
};

const MOCK_TIP =
  "Mock mode active — set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT for real replies.";

export function mockReply(req: ChatRequest): ChatReply {
  const bank = mockBankFor(req.scenarioId);
  const userTurns = req.messages.filter((m) => m.role === "user").length;
  if (userTurns === 0) {
    return { reply_pt: bank.greeting.pt, reply_en: bank.greeting.en, tip: MOCK_TIP, mock: true };
  }
  const choice = bank.followUps[(userTurns - 1) % bank.followUps.length];
  return { reply_pt: choice.pt, reply_en: choice.en, tip: MOCK_TIP, mock: true };
}

export const KNOWN_MOCK_SCENARIOS = [
  "cafe",
  "restaurant",
  "taxi",
  "hotel",
  "directions",
  "pharmacy",
  "smalltalk",
  "bolt",
  "airbnb",
  "sintra",
  "fortaleza",
  "winery",
] as const;

export function mockBankFor(scenarioId: string): MockBank {
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
    case "pharmacy":
      return {
        greeting: { pt: "Bom dia! Em que posso ajudar?", en: "Good morning! How can I help?" },
        followUps: [
          { pt: "Recomendo paracetamol. Toma de oito em oito horas, depois das refeições.", en: "I recommend paracetamol. Take it every 8 hours, after meals." },
          { pt: "Para isso é preciso receita médica. Tem médico de família cá?", en: "For that you need a prescription. Do you have a family doctor here?" },
          { pt: "Temos um xarope que costuma ajudar. É para tomar duas vezes ao dia.", en: "We have a syrup that usually helps. Take it twice a day." },
          { pt: "Se piorar, deve mesmo ver um médico.", en: "If it gets worse, you really should see a doctor." },
        ],
      };
    case "smalltalk":
      return {
        greeting: { pt: "Olá, tudo bem? Está em férias?", en: "Hi, how are you? On holiday?" },
        followUps: [
          { pt: "Ah, americanos! Bem-vindos a Portugal. É a primeira vez?", en: "Ah, Americans! Welcome to Portugal. First time here?" },
          { pt: "Vinte anos de casamento! Parabéns! Onde vão jantar para festejar?", en: "Twenty years of marriage! Congratulations! Where will you celebrate dinner?" },
          { pt: "Engenheiro de IA, que interessante. Acha que vai mudar tudo?", en: "AI engineer, how interesting. Do you think it'll change everything?" },
          { pt: "O seu português está muito bom para seis meses!", en: "Your Portuguese is very good for six months!" },
        ],
      };
    case "bolt":
      return {
        greeting: { pt: "Boa tarde! Para o Estoril, certo? Como foi o voo?", en: "Good afternoon! To Estoril, right? How was the flight?" },
        followUps: [
          { pt: "Vamos pela A5, deve dar uns trinta minutos com este trânsito.", en: "We'll take the A5, should be about thirty minutes with this traffic." },
          { pt: "Em Cascais, recomendo o Mar do Inferno para almoço — vista linda.", en: "In Cascais, I recommend Mar do Inferno for lunch — beautiful view." },
          { pt: "O elétrico 28 é turístico, mas vai com calma — está sempre cheio.", en: "Tram 28 is touristy, but go calmly — it's always packed." },
          { pt: "Já chegámos. Boa estadia em Portugal!", en: "We've arrived. Have a great stay in Portugal!" },
        ],
      };
    case "airbnb":
      return {
        greeting: { pt: "Olá! Bem-vindos ao Estoril. Tiveram boa viagem?", en: "Hi! Welcome to Estoril. Did you have a good trip?" },
        followUps: [
          { pt: "Aqui está a chave. A senha do Wi-Fi está no frigorífico.", en: "Here's the key. The Wi-Fi password is on the fridge." },
          { pt: "O lixo é à terça e quinta, no ecoponto à esquina.", en: "Rubbish is collected Tuesday and Thursday, at the recycling point round the corner." },
          { pt: "Para o vosso aniversário, façam um passeio à Boca do Inferno ao pôr do sol — fica perto.", en: "For your anniversary, take a sunset walk to Boca do Inferno — it's nearby." },
          { pt: "Qualquer coisa, mandem mensagem. Boa estadia!", en: "Anything you need, send a message. Have a great stay!" },
        ],
      };
    case "sintra":
      return {
        greeting: { pt: "Boa tarde. Para quantas pessoas?", en: "Good afternoon. For how many people?" },
        followUps: [
          { pt: "Recomendo o bilhete combinado: Pena mais Castelo dos Mouros sai mais em conta.", en: "I recommend the combined ticket: Pena plus Moors' Castle is better value." },
          { pt: "A última entrada é às dezoito horas.", en: "Last entry is at six PM." },
          { pt: "Lá fora, o autocarro 434 leva-vos a todos os palácios.", en: "Outside, bus 434 takes you to all the palaces." },
          { pt: "Antes de voltarem, provem um travesseiro na Casa Piriquita.", en: "Before you leave, try a travesseiro at Casa Piriquita." },
        ],
      };
    case "fortaleza":
      return {
        greeting: { pt: "Boa noite, sejam bem-vindos. Em que nome está a reserva?", en: "Good evening, you're very welcome. What name is the reservation under?" },
        followUps: [
          { pt: "Encontrei. Permite-me acompanhá-los à mesa, com vista para o mar.", en: "Found it. Allow me to escort you to your table, with a sea view." },
          { pt: "Esta noite recomendo o menu de degustação, com harmonização de vinhos.", en: "Tonight I recommend the tasting menu, with wine pairings." },
          { pt: "Vinte anos de casamento! Os meus parabéns. Permita-nos um pequeno gesto da casa.", en: "Twenty years of marriage! Congratulations. Allow us a small gesture from the house." },
          { pt: "A nossa carta de vinhos tem mais de quatrocentas referências, mas posso sugerir.", en: "Our wine list has over four hundred entries, but I can suggest." },
        ],
      };
    case "winery":
      return {
        greeting: { pt: "Bem-vindos à adega! Vão fazer uma prova hoje?", en: "Welcome to the winery! Are you doing a tasting today?" },
        followUps: [
          { pt: "Começamos com um branco fresco da casta Arinto. O que acham?", en: "We'll start with a fresh white from the Arinto grape. What do you think?" },
          { pt: "Este tinto é da casta Castelão, envelhecido seis meses em carvalho.", en: "This red is from the Castelão grape, aged six months in oak." },
          { pt: "O Moscatel de Setúbal é o nosso ex-líbris — perfeito com queijo ou sobremesa.", en: "Setúbal Moscatel is our flagship — perfect with cheese or dessert." },
          { pt: "Sim, conseguimos enviar para os Estados Unidos, mas o envio fica caro. Querem que prepare uma encomenda?", en: "Yes, we can ship to the US, but shipping is expensive. Want me to put an order together?" },
        ],
      };
    default:
      return {
        greeting: { pt: "Olá!", en: "Hi!" },
        followUps: [{ pt: "Está bem.", en: "All right." }],
      };
  }
}
