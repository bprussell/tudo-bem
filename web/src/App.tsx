import { useEffect, useRef, useState } from "react";
import { Home } from "./routes/Home";
import { Scenario } from "./routes/Scenario";
import { useHashRoute } from "./hooks/useHashRoute";
import { loadSettings, saveSettings, type Settings } from "./lib/settings";
import type { Voice } from "./lib/tts";

const VOICES: { id: Voice; label: string }[] = [
  { id: "pt-PT-RaquelNeural", label: "Raquel (f)" },
  { id: "pt-PT-DuarteNeural", label: "Duarte (m)" },
  { id: "pt-PT-FernandaNeural", label: "Fernanda (f)" },
];

export function App() {
  const hash = useHashRoute();
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const isFirstSettingsRender = useRef(true);

  useEffect(() => {
    if (isFirstSettingsRender.current) {
      isFirstSettingsRender.current = false;
      return;
    }
    saveSettings(settings);
  }, [settings]);

  const path = hash.replace(/^#/, "").replace(/\?.*$/, "").replace(/\/$/, "");
  const scenarioMatch = path.match(/^\/([a-z-]+)$/);
  const isHome = path === "" || path === "/";

  return (
    <main>
      <SettingsBar settings={settings} onChange={setSettings} />
      {isHome ? (
        <Home />
      ) : scenarioMatch ? (
        <Scenario
          scenarioId={scenarioMatch[1]}
          voice={settings.voice}
          showTranslation={settings.showTranslation}
          handsFree={settings.handsFree}
        />
      ) : (
        <div className="missing">
          <p>Page not found.</p>
          <a href="#/">← Home</a>
        </div>
      )}
      <footer>
        <p>See PLAN.md for roadmap · pt-PT only</p>
      </footer>
    </main>
  );
}

function SettingsBar({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  return (
    <div className="settings-bar">
      <label>
        Voice
        <select
          value={settings.voice}
          onChange={(e) => onChange({ ...settings, voice: e.target.value as Voice })}
        >
          {VOICES.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.showTranslation}
          onChange={(e) => onChange({ ...settings, showTranslation: e.target.checked })}
        />
        EN
      </label>
      <label className="toggle" title="Auto-play tutor replies and (in chat) auto-record after they finish.">
        <input
          type="checkbox"
          checked={settings.handsFree}
          onChange={(e) => onChange({ ...settings, handsFree: e.target.checked })}
        />
        Hands-free
      </label>
    </div>
  );
}
