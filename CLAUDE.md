# CLAUDE.md

Context for Claude Code sessions on this repo. See `PLAN.md` for full architecture and roadmap, and the GitHub Issues tab for the active backlog.

## What this is

A personal-use European Portuguese travel-prep PWA for a trip to Portugal. The app exists to help with practical travel conversations (café, taxi, hotel, directions, restaurant) — **not** general Portuguese learning. Vocabulary and personas should always be travel-relevant.

## Hard rules

### Portuguese language

- All Portuguese content must be **European Portuguese (pt-PT)**. Brazilian Portuguese is the default in most online sources and Duolingo, so be vigilant.
- When adding or editing any Portuguese phrase, system prompt, or note, sanity-check it against pt-BR equivalents and call out the difference if it would surprise a Duolingo-trained ear.
- Common pt-PT vs pt-BR distinctions:

  | pt-PT | pt-BR | meaning |
  |---|---|---|
  | pequeno-almoço | café da manhã | breakfast |
  | ementa | cardápio | menu |
  | casa de banho | banheiro | bathroom |
  | autocarro | ônibus | bus |
  | paragem | ponto de ônibus | bus stop |
  | comboio | trem | train |
  | metro | metrô | subway |
  | elétrico | bonde | tram |
  | chávena | xícara | cup |
  | sumo | suco | juice |
  | telemóvel | celular | mobile phone |
  | receção | recepção | reception |
  | empregado de mesa | garçom | waiter |
  | bica | (n/a — Lisbon term) | espresso |

- pt-PT also uses different verb forms in many cases (clitic placement: `chamar-me`, not `me chamar`). Preserve this style in any generated phrases.

### Branch + deploy

- Develop on `claude/portuguese-ai-app-plan-neVuX` unless told otherwise.
- Push to `main` only on explicit instruction — `main` triggers the Azure Static Web Apps deploy workflow.
- Don't commit `local.settings.json` (secrets); only the `.example` template.
- Do commit `package-lock.json` files when they exist — SWA's Oryx builder defaults to `npm ci` and fails without them. (See open issue.)

## Stack

- **Frontend**: React + Vite + TypeScript PWA in `web/`. Hash routing.
- **Backend**: Azure Functions v4 TS programming model in `api/`.
- **Hosting**: Azure Static Web Apps Free tier with managed Functions.
- **AI**: Azure OpenAI (chat) + Azure Speech (TTS, REST API).

## Mock mode

`/api/chat` falls back to canned pt-PT replies when `AZURE_OPENAI_*` env vars are missing **or** `MOCK_MODE=1`. This means:

- The UI is fully testable locally without Azure provisioning.
- A half-configured production app silently serves mocks — `chat.ts` logs a warning when this happens implicitly. Verify env vars are set in production.

There is no equivalent mock for `/api/tts` — it requires a real Azure Speech key.

## Conventions

- Keep commits small and logically focused; the user often reviews on phone.
- Don't add comments unless the WHY isn't obvious. Identifiers should explain WHAT.
- The user can't always provision Azure resources during a session (often planning from a phone). Lean on mock mode and pure-logic verification when integration tests aren't possible.

## Type duplication note

`ChatReply` is intentionally defined in both `api/src/functions/chat.ts` and `web/src/lib/chat.ts` — they must stay in lock-step. There is an open issue tracking eventual deduplication; until then, edits to either side need a matching edit on the other.

## Where things live

- `PLAN.md` — architecture, milestones, pre-deploy checklist
- `README.md` — local dev setup
- `api/src/scenarios.ts` — server-side persona system prompts
- `web/src/data/{scenario}.ts` — phrase lists per scenario
- `web/src/data/scenarios.ts` — frontend scenario index
- `staticwebapp.config.json` — SWA routing + (eventually) auth rules
