import { beforeEach, describe, expect, it } from "vitest";
import {
  favoritesCount,
  getAllFavorites,
  isFavorite,
  toggleFavorite,
} from "../src/lib/favorites";

beforeEach(() => {
  localStorage.clear();
});

describe("favorites", () => {
  it("starts empty", () => {
    expect(favoritesCount()).toBe(0);
    expect(getAllFavorites().size).toBe(0);
    expect(isFavorite("Bom dia.")).toBe(false);
  });

  it("toggle adds and returns true", () => {
    expect(toggleFavorite("Bom dia.")).toBe(true);
    expect(isFavorite("Bom dia.")).toBe(true);
    expect(favoritesCount()).toBe(1);
  });

  it("toggle removes and returns false", () => {
    toggleFavorite("Bom dia.");
    expect(toggleFavorite("Bom dia.")).toBe(false);
    expect(isFavorite("Bom dia.")).toBe(false);
    expect(favoritesCount()).toBe(0);
  });

  it("survives page reload (round-trips through localStorage)", () => {
    toggleFavorite("Uma bica, se faz favor.");
    toggleFavorite("A conta, se faz favor.");
    // Simulate fresh load by re-importing — actually our module just re-reads
    // localStorage on every call, so just verify both are still there.
    expect(favoritesCount()).toBe(2);
    expect(isFavorite("Uma bica, se faz favor.")).toBe(true);
    expect(isFavorite("A conta, se faz favor.")).toBe(true);
  });

  it("ignores malformed storage values", () => {
    localStorage.setItem("tudo-bem.favorites", "{not json");
    expect(getAllFavorites().size).toBe(0);
    localStorage.setItem("tudo-bem.favorites", JSON.stringify({ wrong: "shape" }));
    expect(getAllFavorites().size).toBe(0);
  });
});
