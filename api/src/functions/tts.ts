import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ALLOWED_VOICES, buildSsml, isValidRate, type Rate } from "../lib/ssml";

export async function tts(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return { status: 500, jsonBody: { error: "Speech credentials not configured" } };
  }

  const body = request.method === "POST" ? ((await request.json()) as Record<string, unknown>) : {};
  const text = String(body.text ?? request.query.get("text") ?? "").trim();
  const rateParam = String(body.rate ?? request.query.get("rate") ?? "normal");
  const voiceParam = String(body.voice ?? request.query.get("voice") ?? "pt-PT-RaquelNeural");

  if (!text) {
    return { status: 400, jsonBody: { error: "text is required" } };
  }
  if (text.length > 1000) {
    return { status: 400, jsonBody: { error: "text exceeds 1000 chars" } };
  }
  if (!isValidRate(rateParam)) {
    return { status: 400, jsonBody: { error: "rate must be normal|slow|slower" } };
  }
  if (!ALLOWED_VOICES.has(voiceParam)) {
    return { status: 400, jsonBody: { error: "unsupported voice" } };
  }

  const ssml = buildSsml(text, voiceParam, rateParam as Rate);
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "tudo-bem",
    },
    body: ssml,
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    context.error(`Speech TTS upstream ${upstream.status}: ${detail}`);
    return { status: 502, jsonBody: { error: "TTS upstream failed", status: upstream.status } };
  }

  const audio = Buffer.from(await upstream.arrayBuffer());
  return {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
    body: audio,
  };
}

app.http("tts", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: tts,
});
