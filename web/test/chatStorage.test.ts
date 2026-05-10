import { beforeEach, describe, expect, it } from "vitest";
import { clearChatTurns, loadChatTurns, saveChatTurns } from "../src/lib/chatStorage";

type Turn = { role: "user" | "tutor"; content: string };

beforeEach(() => {
  localStorage.clear();
});

describe("chatStorage", () => {
  it("returns null when nothing is stored", () => {
    expect(loadChatTurns<Turn>("cafe")).toBeNull();
  });

  it("round-trips turns through localStorage", () => {
    const turns: Turn[] = [
      { role: "user", content: "Olá" },
      { role: "tutor", content: "Bom dia!" },
    ];
    saveChatTurns("cafe", turns);
    expect(loadChatTurns<Turn>("cafe")).toEqual(turns);
  });

  it("isolates by scenarioId", () => {
    saveChatTurns("cafe", [{ role: "user", content: "uma bica" }]);
    saveChatTurns("taxi", [{ role: "user", content: "para o aeroporto" }]);
    expect(loadChatTurns<Turn>("cafe")).toEqual([{ role: "user", content: "uma bica" }]);
    expect(loadChatTurns<Turn>("taxi")).toEqual([{ role: "user", content: "para o aeroporto" }]);
  });

  it("clear removes only the named scenario", () => {
    saveChatTurns("cafe", [{ role: "user", content: "x" }]);
    saveChatTurns("taxi", [{ role: "user", content: "y" }]);
    clearChatTurns("cafe");
    expect(loadChatTurns<Turn>("cafe")).toBeNull();
    expect(loadChatTurns<Turn>("taxi")).not.toBeNull();
  });

  it("returns null on malformed JSON", () => {
    localStorage.setItem("tudo-bem.chat.cafe", "{not json");
    expect(loadChatTurns<Turn>("cafe")).toBeNull();
  });

  it("returns null on wrong envelope shape", () => {
    localStorage.setItem(
      "tudo-bem.chat.cafe",
      JSON.stringify({ version: 999, turns: [] })
    );
    expect(loadChatTurns<Turn>("cafe")).toBeNull();
  });
});
