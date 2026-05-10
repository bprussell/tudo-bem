import { useState } from "react";
import { isFavorite, toggleFavorite } from "../lib/favorites";

type Props = {
  pt: string;
};

export function StarButton({ pt }: Props) {
  const [fav, setFav] = useState(() => isFavorite(pt));

  function onClick() {
    const next = toggleFavorite(pt);
    setFav(next);
  }

  return (
    <button
      type="button"
      className={`star-button${fav ? " on" : ""}`}
      onClick={onClick}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      title={fav ? "Remove from favorites" : "Save to favorites"}
    >
      {fav ? "★" : "☆"}
    </button>
  );
}
