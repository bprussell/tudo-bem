import { useMemo } from "react";
import { SCENARIOS } from "../data/scenarios";
import type { Phrase, Scenario } from "../data/types";
import type { Voice } from "../lib/tts";
import { getAllFavorites } from "../lib/favorites";
import { TtsButtons } from "../components/TtsButtons";
import { PracticeButton } from "../components/PracticeButton";
import { StarButton } from "../components/StarButton";

type Props = {
  voice: Voice;
  showTranslation: boolean;
};

type Item = { scenario: Scenario; phrase: Phrase };

export function Favorites({ voice, showTranslation }: Props) {
  const items = useMemo<Item[]>(() => {
    const set = getAllFavorites();
    if (set.size === 0) return [];
    const out: Item[] = [];
    for (const scenario of SCENARIOS) {
      for (const phrase of scenario.phrases) {
        if (set.has(phrase.pt)) out.push({ scenario, phrase });
      }
    }
    return out;
  }, []);

  return (
    <div className="scenario">
      <header className="scenario-header">
        <a href="#/" className="back" aria-label="Back to scenarios">←</a>
        <div>
          <h1>⭐ My phrases</h1>
          <p className="tag">Phrases you've starred for drilling.</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="missing">
          <p>You haven't starred any phrases yet.</p>
          <p className="tag">
            Tap the ☆ next to any phrase in a scenario to save it here.
          </p>
        </div>
      ) : (
        <ol className="phrases">
          {items.map(({ scenario, phrase }, i) => (
            <li key={i}>
              <div className="phrase-row">
                <div className="phrase-text">
                  <div className="pt">{phrase.pt}</div>
                  {showTranslation && <div className="en">{phrase.en}</div>}
                  {phrase.note && <div className="note">{phrase.note}</div>}
                  <a href={`#/${scenario.id}`} className="from-scenario">
                    {scenario.emoji} {scenario.title}
                  </a>
                </div>
                <StarButton pt={phrase.pt} />
              </div>
              <TtsButtons text={phrase.pt} voice={voice} />
              <PracticeButton referenceText={phrase.pt} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
