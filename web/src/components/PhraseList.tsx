import type { Phrase } from "../data/types";
import type { Voice } from "../lib/tts";
import { TtsButtons } from "./TtsButtons";
import { PracticeButton } from "./PracticeButton";

type Props = {
  phrases: Phrase[];
  voice: Voice;
  showTranslation: boolean;
};

export function PhraseList({ phrases, voice, showTranslation }: Props) {
  return (
    <ol className="phrases">
      {phrases.map((p, i) => (
        <li key={i}>
          <div className="pt">{p.pt}</div>
          {showTranslation && <div className="en">{p.en}</div>}
          {p.note && <div className="note">{p.note}</div>}
          <TtsButtons text={p.pt} voice={voice} />
          <PracticeButton referenceText={p.pt} />
        </li>
      ))}
    </ol>
  );
}
