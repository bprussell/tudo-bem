import { describe, expect, it } from "vitest";
import { encodeWav, linearResample } from "../src/lib/audio";

describe("linearResample", () => {
  it("returns the input unchanged when from == to", () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const out = linearResample(input, 16_000, 16_000);
    expect(out).toBe(input);
  });

  it("downsamples 2:1 by skipping samples", () => {
    const input = new Float32Array([0, 1, 2, 3, 4, 5]);
    const out = linearResample(input, 32_000, 16_000);
    expect(out.length).toBe(3);
    // Linear interp at indices 0, 2, 4 → values 0, 2, 4
    expect(Array.from(out)).toEqual([0, 2, 4]);
  });

  it("upsamples 1:2 with linear interpolation", () => {
    const input = new Float32Array([0, 1, 2]);
    const out = linearResample(input, 16_000, 32_000);
    expect(out.length).toBe(6);
    // Indices 0, 0.5, 1, 1.5, 2, 2.5 → 0, 0.5, 1, 1.5, 2, ~2 (clamped)
    expect(out[0]).toBeCloseTo(0);
    expect(out[1]).toBeCloseTo(0.5);
    expect(out[2]).toBeCloseTo(1);
    expect(out[3]).toBeCloseTo(1.5);
    expect(out[4]).toBeCloseTo(2);
  });
});

describe("encodeWav", () => {
  it("produces a Blob with audio/wav MIME type", async () => {
    const samples = new Float32Array([0, 0.5, -0.5]);
    const blob = encodeWav(samples, 16_000);
    expect(blob.type).toBe("audio/wav");
  });

  it("writes a valid 44-byte RIFF/WAVE header for PCM int16 mono 16k", async () => {
    const samples = new Float32Array([0, 0.5]);
    const blob = encodeWav(samples, 16_000);
    const ab = await blob.arrayBuffer();
    expect(ab.byteLength).toBe(44 + samples.length * 2);

    const view = new DataView(ab);
    const ascii = (offset: number, len: number) =>
      String.fromCharCode(...new Uint8Array(ab, offset, len));

    expect(ascii(0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(36 + samples.length * 2); // file size - 8
    expect(ascii(8, 4)).toBe("WAVE");
    expect(ascii(12, 4)).toBe("fmt ");
    expect(view.getUint32(16, true)).toBe(16); // fmt chunk size
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16_000); // sample rate
    expect(view.getUint32(28, true)).toBe(16_000 * 2); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(ascii(36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
  });

  it("clamps samples to [-1, 1] and converts to int16", async () => {
    const samples = new Float32Array([0, 1, -1, 1.5, -1.5]);
    const blob = encodeWav(samples, 16_000);
    const ab = await blob.arrayBuffer();
    const view = new DataView(ab);

    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff); // clamped
    expect(view.getInt16(52, true)).toBe(-0x8000); // clamped
  });

  it("rounds 0.5 to roughly 16383 (half of int16 max)", async () => {
    const samples = new Float32Array([0.5]);
    const blob = encodeWav(samples, 16_000);
    const ab = await blob.arrayBuffer();
    const view = new DataView(ab);
    const sample = view.getInt16(44, true);
    expect(sample).toBe(Math.floor(0.5 * 0x7fff));
  });
});
