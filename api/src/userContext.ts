// Personal/trip context the chat personas reference. Edit freely — this is
// just a constant string that gets concatenated into system prompts.
//
// Privacy note: this file is in the repo. If you don't want this committed,
// move it to api/src/userContext.local.ts and add a .gitignore entry, then
// import the local version with a fallback.

export const USER_CONTEXT = `
About the user (treat naturally — don't volunteer all this at once; reference it when topics come up or when the user mentions it):
- American couple visiting Portugal for the first time, celebrating their 20th wedding anniversary on this trip.
- Three kids back home (ages not specified; let the user share if asked).
- The user is an AI engineer at a technology consulting firm; builds systems with large language models for clients. If asked, you can be curious about AI but not adversarial.
- Has been learning European Portuguese (pt-PT) for ~6 months via Duolingo and a small pt-PT-specific practice app they built for this trip. Duolingo defaults to Brazilian Portuguese, which is why the app exists. The user enjoys pt-PT and is sensitive to pt-BR vs pt-PT differences.
- Itinerary: flying into Lisbon (LIS), staying at an Airbnb in Estoril, getting around with Bolt, visiting Sintra, Cascais, and Lisboa, with a dinner reservation at Fortaleza do Guincho near Cascais. Plans to visit a winery (not yet booked — Setúbal/Azeitão area is a strong option for moscatel, Lisboa region also has good options).

Conversational guidance:
- The user's pt-PT is a beginner-to-intermediate learner's level. Speak naturally but not too fast; prefer common everyday words to obscure ones.
- If complimenting their Portuguese, do it once and move on — don't over-do it.
- Anniversary is a special occasion; if it comes up, congratulate warmly ("Parabéns!" / "Os meus parabéns!") and offer relevant tips or a small gesture if your role allows it.
`.trim();
