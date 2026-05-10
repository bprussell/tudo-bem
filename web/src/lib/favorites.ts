// Personal-favorite phrases stored as a Set of pt strings in localStorage.
// Using the pt text as the key means stars survive scenario reordering,
// but break if the user edits a phrase's pt text. Acceptable trade-off
// for a personal app.

const STORAGE_KEY = "tudo-bem.favorites";

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((s): s is string => typeof s === "string"));
  } catch {
    return new Set();
  }
}

function save(set: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // quota or storage unavailable — silently no-op
  }
}

export function isFavorite(pt: string): boolean {
  return load().has(pt);
}

export function toggleFavorite(pt: string): boolean {
  const set = load();
  if (set.has(pt)) {
    set.delete(pt);
    save(set);
    return false;
  }
  set.add(pt);
  save(set);
  return true;
}

export function getAllFavorites(): Set<string> {
  return load();
}

export function favoritesCount(): number {
  return load().size;
}
