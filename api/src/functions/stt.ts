import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

type STTRequest = {
  audioBase64: string;
  contentType: string;
  referenceText?: string;
};

// STT response shapes mirrored in web/src/lib/stt.ts — keep in sync (issue #9).
type WordScore = { word: string; accuracy: number };
type Pronunciation = {
  accuracy: number;
  fluency: number;
  completeness: number;
  words: WordScore[];
};
type STTResponse = {
  transcript: string;
  pronunciation: Pronunciation | null;
  mock?: boolean;
};

const MAX_AUDIO_BYTES = 1_500_000;
const MAX_REFERENCE_CHARS = 500;

export async function stt(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: STTRequest;
  try {
    body = (await request.json()) as STTRequest;
  } catch {
    return { status: 400, jsonBody: { error: "invalid JSON body" } };
  }

  if (!body?.audioBase64 || typeof body.audioBase64 !== "string") {
    return { status: 400, jsonBody: { error: "audioBase64 required" } };
  }
  if (!body.contentType || typeof body.contentType !== "string") {
    return { status: 400, jsonBody: { error: "contentType required" } };
  }

  let audioBuffer: ArrayBuffer;
  try {
    const buf = Buffer.from(body.audioBase64, "base64");
    audioBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    return { status: 400, jsonBody: { error: "invalid base64 audio" } };
  }
  if (audioBuffer.byteLength === 0) {
    return { status: 400, jsonBody: { error: "empty audio" } };
  }
  if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
    return { status: 400, jsonBody: { error: `audio exceeds ${MAX_AUDIO_BYTES} bytes` } };
  }

  const refText =
    typeof body.referenceText === "string" && body.referenceText.trim()
      ? body.referenceText.trim().slice(0, MAX_REFERENCE_CHARS)
      : undefined;

  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  const explicitMock = process.env.MOCK_MODE === "1";
  const mockMode = explicitMock || !key || !region;

  if (mockMode) {
    if (!explicitMock) {
      context.warn(
        "Azure Speech env vars missing — serving mock STT. Set AZURE_SPEECH_KEY, AZURE_SPEECH_REGION."
      );
    }
    return { status: 200, jsonBody: mockResponse(refText) };
  }

  const url = new URL(
    `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`
  );
  url.searchParams.set("language", "pt-PT");
  url.searchParams.set("format", "detailed");

  const headers: Record<string, string> = {
    "Ocp-Apim-Subscription-Key": key!,
    "Content-Type": body.contentType,
    "User-Agent": "tudo-bem",
  };

  if (refText) {
    const config = JSON.stringify({
      ReferenceText: refText,
      GradingSystem: "HundredMark",
      Granularity: "Word",
      Dimension: "Comprehensive",
    });
    headers["Pronunciation-Assessment"] = Buffer.from(config, "utf8").toString("base64");
  }

  const upstream = await fetch(url.toString(), { method: "POST", headers, body: audioBuffer });

  if (!upstream.ok) {
    const detail = await upstream.text();
    context.error(`Azure Speech STT upstream ${upstream.status}: ${detail}`);
    return { status: 502, jsonBody: { error: "STT upstream failed", status: upstream.status } };
  }

  const json = (await upstream.json()) as AzureSttResponse;
  return { status: 200, jsonBody: parseAzureResponse(json) };
}

type AzureWord = {
  Word: string;
  PronunciationAssessment?: { AccuracyScore?: number };
};
type AzureNBest = {
  Display?: string;
  PronunciationAssessment?: {
    AccuracyScore?: number;
    FluencyScore?: number;
    CompletenessScore?: number;
  };
  Words?: AzureWord[];
};
type AzureSttResponse = {
  RecognitionStatus?: string;
  DisplayText?: string;
  NBest?: AzureNBest[];
};

function parseAzureResponse(json: AzureSttResponse): STTResponse {
  const transcript = json.DisplayText ?? json.NBest?.[0]?.Display ?? "";
  const best = json.NBest?.[0];
  const assessment = best?.PronunciationAssessment;
  if (!assessment) {
    return { transcript, pronunciation: null };
  }
  return {
    transcript,
    pronunciation: {
      accuracy: assessment.AccuracyScore ?? 0,
      fluency: assessment.FluencyScore ?? 0,
      completeness: assessment.CompletenessScore ?? 0,
      words: (best?.Words ?? []).map((w) => ({
        word: w.Word,
        accuracy: w.PronunciationAssessment?.AccuracyScore ?? 0,
      })),
    },
  };
}

const MOCK_FREE_TRANSCRIPTS = [
  "Bom dia, queria uma bica.",
  "Onde fica a estação de metro mais próxima?",
  "Para o aeroporto, se faz favor.",
  "A conta, se faz favor.",
];

function mockResponse(refText: string | undefined): STTResponse {
  if (refText) {
    const words = refText.split(/\s+/).filter(Boolean);
    return {
      transcript: refText,
      pronunciation: {
        accuracy: 82,
        fluency: 78,
        completeness: 95,
        words: words.map((word, i) => ({
          word,
          accuracy: i % 3 === 1 ? 65 : 88,
        })),
      },
      mock: true,
    };
  }
  const idx = Math.floor(Math.random() * MOCK_FREE_TRANSCRIPTS.length);
  return {
    transcript: MOCK_FREE_TRANSCRIPTS[idx],
    pronunciation: null,
    mock: true,
  };
}

app.http("stt", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: stt,
});
