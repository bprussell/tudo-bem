import { describe, expect, it } from "vitest";
import {
  KNOWN_MOCK_SCENARIOS,
  MAX_HISTORY,
  MAX_MESSAGE_CHARS,
  isValidationError,
  mockBankFor,
  mockReply,
  validateChatRequest,
} from "../src/lib/chat";

describe("validateChatRequest", () => {
  it("accepts a minimal valid request", () => {
    const result = validateChatRequest({ scenarioId: "cafe", messages: [] });
    expect(isValidationError(result)).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isValidationError(validateChatRequest(null))).toBe(true);
    expect(isValidationError(validateChatRequest(""))).toBe(true);
    expect(isValidationError(validateChatRequest(42))).toBe(true);
  });

  it("rejects missing scenarioId", () => {
    const result = validateChatRequest({ messages: [] });
    expect(isValidationError(result)).toBe(true);
  });

  it("rejects non-array messages", () => {
    const result = validateChatRequest({ scenarioId: "cafe", messages: "oops" });
    expect(isValidationError(result)).toBe(true);
  });

  it("rejects too many messages", () => {
    const messages = Array.from({ length: MAX_HISTORY + 1 }, () => ({
      role: "user",
      content: "hi",
    }));
    const result = validateChatRequest({ scenarioId: "cafe", messages });
    expect(isValidationError(result)).toBe(true);
  });

  it("rejects bad role", () => {
    const result = validateChatRequest({
      scenarioId: "cafe",
      messages: [{ role: "system", content: "x" }],
    });
    expect(isValidationError(result)).toBe(true);
  });

  it("rejects non-string content", () => {
    const result = validateChatRequest({
      scenarioId: "cafe",
      messages: [{ role: "user", content: 42 }],
    });
    expect(isValidationError(result)).toBe(true);
  });

  it("rejects oversized content", () => {
    const result = validateChatRequest({
      scenarioId: "cafe",
      messages: [{ role: "user", content: "x".repeat(MAX_MESSAGE_CHARS + 1) }],
    });
    expect(isValidationError(result)).toBe(true);
  });
});

describe("mockBankFor", () => {
  it("returns a non-default bank for every known scenario", () => {
    for (const id of KNOWN_MOCK_SCENARIOS) {
      const bank = mockBankFor(id);
      expect(bank.greeting.pt.length).toBeGreaterThan(0);
      expect(bank.followUps.length).toBeGreaterThan(1);
    }
  });

  it("returns a default fallback for unknown scenarios", () => {
    const bank = mockBankFor("nonexistent");
    expect(bank.greeting.pt).toBe("Olá!");
  });
});

describe("mockReply", () => {
  it("returns the greeting on the first turn (empty messages)", () => {
    const reply = mockReply({ scenarioId: "cafe", messages: [] });
    expect(reply.reply_pt).toBe("Bom dia! O que vai querer?");
    expect(reply.mock).toBe(true);
  });

  it("returns the first follow-up after the first user turn", () => {
    const reply = mockReply({
      scenarioId: "cafe",
      messages: [{ role: "user", content: "uma bica" }],
    });
    const bank = mockBankFor("cafe");
    expect(reply.reply_pt).toBe(bank.followUps[0].pt);
  });

  it("rotates through follow-ups with modulo on later turns", () => {
    const bank = mockBankFor("cafe");
    for (let n = 1; n <= bank.followUps.length * 2; n++) {
      const messages = Array.from({ length: n }, () => ({
        role: "user" as const,
        content: "x",
      }));
      const reply = mockReply({ scenarioId: "cafe", messages });
      expect(reply.reply_pt).toBe(bank.followUps[(n - 1) % bank.followUps.length].pt);
    }
  });

  it("ignores assistant turns when counting", () => {
    const reply = mockReply({
      scenarioId: "cafe",
      messages: [
        { role: "assistant", content: "x" },
        { role: "assistant", content: "y" },
      ],
    });
    expect(reply.reply_pt).toBe("Bom dia! O que vai querer?");
  });
});
