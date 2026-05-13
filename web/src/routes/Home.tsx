import { SCENARIOS } from "../data/scenarios";
import { favoritesCount } from "../lib/favorites";

export function Home() {
  const favCount = favoritesCount();

  return (
    <div className="home">
      <header>
        <h1>Tudo Bem</h1>
        <p className="tag">Practice European Portuguese for your trip.</p>
      </header>

      <a href="#/favorites" className="favorites-card">
        <span className="emoji" aria-hidden>⭐</span>
        <div>
          <div className="title">My phrases</div>
          <div className="blurb">
            {favCount === 0
              ? "Star phrases from any scenario to drill them here."
              : `${favCount} ${favCount === 1 ? "phrase" : "phrases"} saved.`}
          </div>
        </div>
      </a>

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
