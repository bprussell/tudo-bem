import { SCENARIOS } from "../data/scenarios";

export function Home() {
  return (
    <div className="home">
      <header>
        <h1>Tudo Bem</h1>
        <p className="tag">Practice European Portuguese for your trip.</p>
      </header>

      <ul className="scenario-grid">
        {SCENARIOS.map((s) => (
          <li key={s.id}>
            <a href={`#/${s.id}`} className="scenario-card">
              <span className="emoji" aria-hidden>{s.emoji}</span>
              <div>
                <div className="title">{s.title}</div>
                <div className="title-pt">{s.titlePt}</div>
                <div className="blurb">{s.blurb}</div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
