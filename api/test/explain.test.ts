import { describe, expect, it } from "vitest";
import {
  MAX_HISTORY,
  MAX_MESSAGE_CHARS,
  MAX_TOPIC_CHARS,
  buildSystemPrompt,
  isValidationError,
  mockExplainReply,
  validateExplainRequest,
} from "../src/lib/explain";

describe("validateExplainRequest", () => {
  const goodMessages = [{ role: "user", content: "Why this and not that?" }];

  it("accepts a valid request", () => {
    const r = validateExplainRequest({
      topic: { pt: "Bom dia." },
      messages: goodMessages,
    });
    expect(isValidationError(r)).toBe(false);
  });

  it("requires a topic with pt", () => {
    expect(isValidationError(validateExplainRequest({ messages: goodMessages }))).toBe(true);
    expect(
      isValidationError(validateExplainRequest({ topic: {}, messages: goodMessages }))
    ).toBe(true);
    expect(
      isValidationError(
        validateExplainRequest({ topic: { pt: "" }, messages: goodMessages })
      )
    ).toBe(true);
  });

  it("rejects oversized topic.pt", () => {
    const r = validateExplainRequest({
      topic: { pt: "x".repeat(MAX_TOPIC_CHARS + 1) },
      messages: goodMessages,
    });
    expect(isValidationError(r)).toBe(true);
  });

  it("rejects empty messages", () => {
    expect(
      isValidationError(validateExplainRequest({ topic: { pt: "Bom dia." }, messages: [] }))
    ).toBe(true);
  });

  it("rejects too many messages", () => {
    const messages = Array.from({ length: MAX_HISTORY + 1 }, () => ({
      role: "user" as const,
      content: "x",
    }));
    expect(
      isValidationError(validateExplainRequest({ topic: { pt: "Bom dia." }, messages }))
    ).toBe(true);
  });

  it("rejects bad role / oversized content", () => {
    expect(
      isValidationError(
        validateExplainRequest({
          topic: { pt: "x" },
          messages: [{ role: "system", content: "y" }],
        })
      )
    ).toBe(true);
    expect(
      isValidationError(
        validateExplainRequest({
          topic: { pt: "x" },
          messages: [{ role: "user", content: "y".repeat(MAX_MESSAGE_CHARS + 1) }],
        })
      )
    ).toBe(true);
  });

  it("trims topic strings", () => {
    const r = validateExplainRequest({
      topic: { pt: "  Bom dia.  ", en: "  Hi.  " },
      messages: goodMessages,
    });
    if (!isValidationError(r)) {
      expect(r.topic.pt).toBe("Bom dia.");
      expect(r.topic.en).toBe("Hi.");
    } else {
      throw new Error("expected non-error");
    }
  });
});

describe("buildSystemPrompt", () => {
  it("includes the topic phrase + English", () => {
    const p = buildSystemPrompt({ pt: "Bom dia.", en: "Good morning." });
    expect(p).toContain('"Bom dia."');
    expect(p).toContain('"Good morning."');
  });

  it("includes the optional scenario context", () => {
    const p = buildSystemPrompt({ pt: "Olá", context: "café" });
    expect(p).toContain('"café"');
  });

  it("contains the literal token JSON for response_format compatibility", () => {
    const p = buildSystemPrompt({ pt: "x" });
    expect(p.toUpperCase().includes("JSON")).toBe(true);
  });

  it("forbids pt-BR", () => {
    const p = buildSystemPrompt({ pt: "x" });
    expect(p.includes("pt-BR")).toBe(true);
  });
});

describe("mockExplainReply", () => {
  it("includes the topic and the user's last message", () => {
    const r = mockExplainReply({
      topic: { pt: "Bom dia." },
      messages: [{ role: "user", content: "Why?" }],
    });
    expect(r.mock).toBe(true);
    expect(r.answer).toContain("Bom dia.");
    expect(r.answer).toContain("Why?");
  });

  it("truncates long user messages", () => {
    const long = "y".repeat(200);
    const r = mockExplainReply({
      topic: { pt: "x" },
      messages: [{ role: "user", content: long }],
    });
    expect(r.answer).not.toContain(long);
    expect(r.answer).toContain("...");
  });
});
