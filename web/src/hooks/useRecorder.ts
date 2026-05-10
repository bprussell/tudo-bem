import { useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "stopping";

export type RecorderOptions = {
  onComplete?: (blob: Blob) => void;
  silenceTimeoutMs?: number;
  silenceThresholdRms?: number;
  speechThresholdRms?: number;
};

export type StartOptions = {
  autoStopOnSilence?: boolean;
};

const MAX_RECORDING_MS = 60_000;
const DEFAULT_SILENCE_TIMEOUT_MS = 1500;
const DEFAULT_SILENCE_THRESHOLD = 0.015;
const DEFAULT_SPEECH_THRESHOLD = 0.04;

export function useRecorder(options: RecorderOptions = {}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    return () => {
      cleanupVad();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function cleanupVad() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }

  function setupVad(stream: MediaStream): void {
    const opts = optionsRef.current;
    const silenceTimeoutMs = opts.silenceTimeoutMs ?? DEFAULT_SILENCE_TIMEOUT_MS;
    const silenceThreshold = opts.silenceThresholdRms ?? DEFAULT_SILENCE_THRESHOLD;
    const speechThreshold = opts.speechThresholdRms ?? DEFAULT_SPEECH_THRESHOLD;

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    let speechDetected = false;
    let silenceStartedAt: number | null = null;

    const tick = () => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        rafRef.current = null;
        return;
      }
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buffer.length);

      if (rms > speechThreshold) speechDetected = true;

      if (speechDetected) {
        if (rms < silenceThreshold) {
          if (silenceStartedAt === null) silenceStartedAt = performance.now();
          if (performance.now() - silenceStartedAt > silenceTimeoutMs) {
            recorder.stop();
            rafRef.current = null;
            return;
          }
        } else {
          silenceStartedAt = null;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function start(startOptions?: StartOptions): Promise<void> {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        cleanupVad();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setState("idle");
        if (blob.size > 0) optionsRef.current.onComplete?.(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
      timeoutRef.current = setTimeout(() => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      }, MAX_RECORDING_MS);
      if (startOptions?.autoStopOnSilence) {
        setupVad(stream);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("idle");
    }
  }

  function stop(): void {
    if (recorderRef.current?.state !== "recording") return;
    setState("stopping");
    recorderRef.current.stop();
  }

  return { state, error, start, stop };
}
