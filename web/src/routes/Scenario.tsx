import { useState } from "react";
import { getScenario } from "../data/scenarios";
import { PhraseList } from "../components/PhraseList";
import { ChatView } from "../components/ChatView";
import type { Voice } from "../lib/tts";

type Tab = "phrases" | "practice";

type Props = {
  scenarioId: string;
  voice: Voice;
  showTranslation: boolean;
  handsFree: boolean;
};

export function Scenario({ scenarioId, voice, showTranslation, handsFree }: Props) {
  const scenario = getScenario(scenarioId);
  const [tab, setTab] = useState<Tab>("phrases");

  if (!scenario) {
    return (
      <div className="missing">
        <p>Scenario not found.</p>
        <a href="#/">← Back</a>
      </div>
    );
  }

  return (
    <div className="scenario">
      <header className="scenario-header">
        <a href="#/" className="back" aria-label="Back to scenarios">←</a>
        <div>
          <h1>{scenario.emoji} {scenario.title}</h1>
          <p className="tag">{scenario.blurb}</p>
        </div>
      </header>

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "phrases"}
          className={tab === "phrases" ? "active" : ""}
          onClick={() => setTab("phrases")}
        >
          Phrases
        </button>
        <button
          role="tab"
          aria-selected={tab === "practice"}
          className={tab === "practice" ? "active" : ""}
          onClick={() => setTab("practice")}
        >
          Practice
        </button>
      </div>

      {tab === "phrases" ? (
        <PhraseList
          phrases={scenario.phrases}
          voice={voice}
          showTranslation={showTranslation}
          scenarioContext={scenario.title}
        />
      ) : (
        <ChatView
          scenarioId={scenario.id}
          voice={voice}
          showTranslation={showTranslation}
          handsFree={handsFree}
        />
      )}
    </div>
  );
}
