// Browser MediaRecorder produces audio/webm or audio/mp4 (depending on
// browser); Azure Speech REST accepts wav/mp3/ogg-opus but not webm/mp4.
// This converts whatever the browser captured into 16kHz mono 16-bit PCM
// WAV by routing through the Web Audio API's decodeAudioData (which can
// decode any format the browser knows how to play).

const TARGET_SAMPLE_RATE = 16_000;

type AudioCtxCtor = typeof AudioContext;
const AudioCtxImpl: AudioCtxCtor | undefined =
  (typeof window !== "undefined" &&
    (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext)) ||
  undefined;

export async function blobToWav16kMono(blob: Blob): Promise<Blob> {
  if (!AudioCtxImpl) {
    throw new Error("AudioContext not available — can't convert audio for Azure Speech.");
  }
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioCtxImpl();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close().catch(() => {});
  }

  const mono = mixToMono(audioBuffer);
  const resampled =
    audioBuffer.sampleRate === TARGET_SAMPLE_RATE
      ? mono
      : linearResample(mono, audioBuffer.sampleRate, TARGET_SAMPLE_RATE);
  return encodeWav(resampled, TARGET_SAMPLE_RATE);
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  const length = buffer.length;
  const out = new Float32Array(length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) out[i] += data[i];
  }
  const inv = 1 / buffer.numberOfChannels;
  for (let i = 0; i < length; i++) out[i] *= inv;
  return out;
}

export function linearResample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio;
    const left = Math.floor(srcIndex);
    const right = Math.min(left + 1, input.length - 1);
    const t = srcIndex - left;
    out[i] = input[left] * (1 - t) + input[right] * t;
  }
  return out;
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
