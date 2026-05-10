import type { Phrase } from "../data/types";
import type { Voice } from "../lib/tts";
import { useExplain } from "../contexts/ExplainContext";
import { TtsButtons } from "./TtsButtons";
import { PracticeButton } from "./PracticeButton";
import { StarButton } from "./StarButton";

type Props = {
  phrases: Phrase[];
  voice: Voice;
  showTranslation: boolean;
  scenarioContext?: string;
};

export function PhraseList({ phrases, voice, showTranslation, scenarioContext }: Props) {
  const explain = useExplain();
  return (
    <ol className="phrases">
      {phrases.map((p, i) => (
        <li key={i}>
          <div className="phrase-row">
            <div className="phrase-text">
              <div className="pt">{p.pt}</div>
              {showTranslation && <div className="en">{p.en}</div>}
              {p.note && <div className="note">{p.note}</div>}
            </div>
            <StarButton pt={p.pt} />
          </div>
          <TtsButtons text={p.pt} voice={voice} />
          <PracticeButton referenceText={p.pt} />
          <button
            type="button"
            className="link-button ask-link"
            onClick={() => explain.open({ pt: p.pt, en: p.en, context: scenarioContext })}
          >
            💡 Ask about this
          </button>
        </li>
      ))}
    </ol>
  );
}
