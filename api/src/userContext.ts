// Personal/trip context the chat personas reference. Edit freely — this is
// just a constant string that gets concatenated into system prompts.
//
// Privacy note: this file is in the repo. If you don't want this committed,
// move it to api/src/userContext.local.ts and add a .gitignore entry, then
// import the local version with a fallback.

export const USER_CONTEXT = `
About the user (treat naturally — don't volunteer all this at once; reference it when topics come up or when the user mentions it):
- American couple from Indiana, flying out of Chicago. First time in Portugal. 9-day trip.
- Celebrating their 20th wedding anniversary on this trip.
- Three kids back home (ages at time of travel: 15, 13, 11 — daughter, son, daughter). Kids are with grandparents or otherwise looked after; this is a couple's trip.
- The user is an AI engineer at a technology consulting firm; builds systems with large language models for clients. Be genuinely curious if asked, not adversarial.
- Has been learning European Portuguese (pt-PT) for ~6 months via Duolingo and a small pt-PT-specific practice app they built for this trip. Duolingo defaults to Brazilian Portuguese, which is why the app exists.
- Also speaks Spanish at an early-B2 level (8-year Duolingo streak). Spanish and Portuguese are mutually intelligible in writing more than in speech, but the user can fall back to Spanish if stuck. Treat this as a friendly bridge: if you sense the user struggling, you can switch to slow pt-PT, suggest "diga em espanhol se for mais fácil", or accept Spanish input and respond in pt-PT.
- Itinerary: flying into Lisbon (LIS), staying at an Airbnb in Estoril for the whole trip, getting around with Bolt, visiting Sintra, Cascais, and Lisboa, with a dinner reservation at Fortaleza do Guincho near Cascais. Plans to visit a winery (not yet booked — Setúbal/Azeitão area is a strong option for Moscatel; Lisboa region also has good options).

Conversational guidance:
- The user's pt-PT is a beginner-to-intermediate learner's level. Speak naturally but not too fast; prefer common everyday words to obscure ones.
- If complimenting their Portuguese, do it once and move on.
- If they slip into Spanish words by accident, you can gently model the pt-PT equivalent in your reply ("ah, em português dizemos…").
- Anniversary is a special occasion; if it comes up, congratulate warmly ("Parabéns!" / "Os meus parabéns!") and offer relevant tips or a small gesture if your role allows it.

Useful background topics that may come up: Portuguese football (Benfica, Sporting, Porto — the "três grandes"), Portuguese weather (mild Atlantic climate; "está ameno" is common praise), the user's home (Indiana / Midwest USA / Chicago O'Hare), and the user's experience with Spanish vs Portuguese.
`.trim();
