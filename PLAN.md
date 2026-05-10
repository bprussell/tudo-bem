# Tudo Bem — European Portuguese travel-prep tutor

## Goal
A small AI-powered web app that helps me practice **European Portuguese (pt-PT)**
conversations relevant to a 4-month-out trip to Portugal — café, taxi, hotel
check-in, directions, pharmacy, etc. Voice playback with a slowed-down toggle
is a hard requirement; voice input is a Phase 2 nice-to-have.

## Why not just keep using Duolingo
- Duolingo is **Brazilian Portuguese** — different pronunciation, different
  vocab in places (`comboio` vs `trem`, `pequeno-almoço` vs `café da manhã`,
  `casa de banho` vs `banheiro`, etc.).
- The vocabulary is generic ("my grandmother", "do homework") and not aligned
  with what I actually need to say in Portugal.

## Constraints
- $150/month Azure credits.
- Solo developer, iterating from phone planning + occasional laptop sessions.
- Must run on phone (PWA, installable).

## Tech choices (validated May 2026)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + TypeScript, PWA | Installable on phone, offline shell. |
| Backend | Azure Functions (TypeScript, v4 programming model) | Single language across stack. |
| Hosting | Azure Static Web Apps Free tier | Includes managed Functions. ~$0/mo. |
| LLM | Azure OpenAI **GPT-5.4-mini** | Cheap, fast, multilingual; ~$0.75 in / $4.50 out per 1M tokens. |
| TTS | Azure Speech Service neural voices | `pt-PT-RaquelNeural`, `pt-PT-DuarteNeural`, `pt-PT-FernandaNeural`. |
| STT (Phase 2) | Azure Speech Service + pronunciation assessment | pt-PT supported (no prosody score, but phoneme/word-level). |

### Why these
- **No HD voices for pt-PT** as of May 2026 — standard neural is the ceiling.
- SSML `<prosody rate="...">` officially supports `0.5`–`2.0` multiplier, so the
  "slow / normal" toggle is a one-line SSML difference.
- Static Web Apps + managed Functions is the cheapest path that still gets us
  proper backend secrets handling (no Azure keys in the browser).

## Architecture

```
phone PWA (React)  ──fetch──▶  /api/tts   ──REST──▶  Azure Speech (TTS, mp3)
                   ──fetch──▶  /api/chat  ──SDK───▶  Azure OpenAI (GPT-5.4-mini)
```

Secrets live in Static Web App application settings; the browser never sees
keys. Audio is returned as `audio/mpeg` and played via `<audio>` element.

## Rate control

The `/api/tts` endpoint accepts `?rate=normal|slow` and builds SSML:

```xml
<speak version="1.0" xml:lang="pt-PT">
  <voice name="pt-PT-RaquelNeural">
    <prosody rate="-25%">Bom dia, queria uma bica, por favor.</prosody>
  </voice>
</speak>
```

`slow` maps to `-25%` (≈0.75x); easy to add `slower` (`-40%`) later.

## Milestones

### M1 — TTS demo (this commit)
- [x] Repo scaffold, plan doc, README
- [x] `/api/tts` endpoint hitting Azure Speech REST API
- [x] Minimal React UI: pick a phrase from a café list, play normal/slow
- [ ] Provision Azure Speech + Static Web App, deploy
- [ ] Verify pronunciation on phone

### M2 — Conversational tutor
- [ ] `/api/chat` endpoint (Azure OpenAI GPT-5.4-mini)
- [ ] System prompt: Lisbon café server, pt-PT only, travel-appropriate vocab
- [ ] Multi-turn UI with translation toggle per line
- [ ] Auto-TTS on each tutor reply

### M3 — Voice input + scoring
- [ ] Browser mic capture → `/api/stt` (Azure Speech STT)
- [ ] Pronunciation assessment scores rendered per word
- [ ] Hands-free conversation mode

### M4 — Scenario library
- [ ] Café (M1/M2 baseline)
- [ ] Restaurant
- [ ] Taxi / Uber
- [ ] Hotel check-in
- [ ] Asking for directions
- [ ] Pharmacy
- [ ] Each scenario: warm-up vocab, role-play, debrief

## Cost estimate

Rough daily: STT $0.25 + TTS $0.20 + LLM $0.01 ≈ **$0.50/day** at 30 min of voice
practice. **~$15–20/month** projected; F0 free tiers (5 STT hrs + 0.5M TTS chars)
shave the first ~10 days of each month down further. $150 budget is comfortable.

## Open questions
- Voice preference — Raquel (default) vs Duarte vs Fernanda? Easy to make a
  user setting.
- Persist conversation history? (LocalStorage is enough for a personal app.)
- Ship a custom domain or live on `*.azurestaticapps.net`?
