import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../src/scenarios";
import { KNOWN_MOCK_SCENARIOS } from "../src/lib/chat";

describe("SCENARIOS", () => {
  it("includes every known mock scenario", () => {
    for (const id of KNOWN_MOCK_SCENARIOS) {
      expect(SCENARIOS[id], `missing system prompt for ${id}`).toBeDefined();
    }
  });

  it("every system prompt contains the literal token 'JSON'", () => {
    // Azure OpenAI's response_format: json_object 400s if the prompt doesn't
    // contain the word JSON. Easy to break by editing a prompt — guard it.
    for (const [id, persona] of Object.entries(SCENARIOS)) {
      expect(
        persona.systemPrompt.toUpperCase().includes("JSON"),
        `${id} system prompt is missing the literal token "JSON"`
      ).toBe(true);
    }
  });

  it("every system prompt forbids pt-BR explicitly", () => {
    for (const [id, persona] of Object.entries(SCENARIOS)) {
      const prompt = persona.systemPrompt;
      const mentionsPtPt =
        prompt.includes("pt-PT") || prompt.includes("European Portuguese");
      const forbidsPtBr =
        prompt.includes("pt-BR") || prompt.includes("Brazilian Portuguese");
      expect(mentionsPtPt, `${id} doesn't mention pt-PT`).toBe(true);
      expect(forbidsPtBr, `${id} doesn't forbid pt-BR`).toBe(true);
    }
  });
});
