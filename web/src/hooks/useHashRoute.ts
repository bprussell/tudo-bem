import { useEffect, useState } from "react";

export function useHashRoute(): string {
  const [hash, setHash] = useState(() => normalize(window.location.hash));
  useEffect(() => {
    const onHash = () => setHash(normalize(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

export function navigate(path: string): void {
  const target = path.startsWith("#") ? path : `#${path}`;
  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}

function normalize(hash: string): string {
  if (!hash || hash === "#") return "#/";
  return hash;
}
