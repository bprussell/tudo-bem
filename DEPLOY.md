# Deploying tudo-bem to Azure

Step-by-step walkthrough for the first production deploy. This complements
the "Before first public deploy" checklist in [PLAN.md](./PLAN.md) — that
list is the *what*; this is the *how*.

Estimated time: ~45 minutes if Azure resources are new to you.

---

## 0. Prerequisites

- [ ] Azure subscription with $150/mo personal credits (you have these)
- [ ] GitHub admin on the `bprussell/tudo-bem` repo
- [ ] Local Node 20+ and Git
- [ ] [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
      (`az`) — optional but speeds things up
- [ ] [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
      — only needed if you want to run `/api/chat` locally

```bash
git clone https://github.com/bprussell/tudo-bem.git
cd tudo-bem
(cd api && npm ci && npm run build && npm test)
(cd web && npm ci && npm run build && npm test)
```

All four commands should succeed locally before you provision anything.

---

## 1. Azure Speech Service

Used by `/api/tts` (mp3 generation) and `/api/stt` (transcription +
pronunciation assessment).

1. Azure portal → **Create a resource** → search "Speech".
2. **Subscription**: your personal one.
3. **Resource group**: create a new one called `tudo-bem` (or pick existing).
4. **Region**: **West Europe** — lowest latency to Portugal and full pt-PT
   support including pronunciation assessment.
5. **Name**: `tudo-bem-speech` (must be globally unique; suffix if taken).
6. **Pricing tier**: **F0** (Free). Gives you 0.5M TTS chars + 5 STT audio
   hours per month. Plenty for daily practice.
7. Create.

Once provisioned, open the resource → **Keys and Endpoint**:

- Copy `KEY 1` → save as `AZURE_SPEECH_KEY`.
- The location code (e.g. `westeurope`) → save as `AZURE_SPEECH_REGION`.

---

## 2. Azure OpenAI

Used by `/api/chat` (the conversational tutor).

1. Azure portal → **Create a resource** → search "Azure OpenAI".
2. Same subscription + resource group (`tudo-bem`).
3. **Region**: **West Europe** if model availability allows; otherwise pick a
   region that has the chat model you want.
4. **Name**: `tudo-bem-openai`.
5. **Pricing tier**: Standard S0 (Azure OpenAI is pay-per-token; no free
   tier, but usage will be cents per day at this scale).
6. Create. (Approval may be needed; usually instant for personal use.)

Once provisioned, open **Azure AI Foundry** (button on the resource page) →
**Deployments**:

7. **Create new deployment** → pick a chat model. See [issue #3] for
   verification — at the time of writing, target `gpt-5.4-mini` if available;
   otherwise `gpt-5-mini`, `gpt-4.1-mini`, or `gpt-4o-mini` are all fine
   substitutes. The deployment name is what matters — note it down.
8. **Tokens-per-minute (TPM)**: start with 30K; you can raise later. With
   ~500-token replies and a few dozen turns per day, this is more than
   enough.
9. Wait until the deployment shows "Succeeded".

Back at the OpenAI resource → **Keys and Endpoint**:

- `KEY 1` → `AZURE_OPENAI_KEY`
- The full endpoint URL (e.g. `https://tudo-bem-openai.openai.azure.com`)
  → `AZURE_OPENAI_ENDPOINT`
- The deployment name from step 7 → `AZURE_OPENAI_DEPLOYMENT`
- API version → `AZURE_OPENAI_API_VERSION` (default in the code is
  `2024-10-21`; bump if your model needs newer)

[issue #3]: https://github.com/bprussell/tudo-bem/issues/3

---

## 3. Static Web App + GitHub Actions hookup

This is the hosting layer. It bundles `web/` (the React PWA), runs `api/`
(the Functions), and wires up CI/CD via GitHub Actions.

1. Azure portal → **Create a resource** → search "Static Web App".
2. Same subscription + resource group.
3. **Name**: `tudo-bem`.
4. **Plan type**: **Free**.
5. **Region for Functions**: **West Europe**.
6. **Source**: GitHub. Authorise; pick the `tudo-bem` repo and `main`
   branch.
7. **Build presets**: Custom.
   - **App location**: `web`
   - **API location**: `api`
   - **Output location**: `dist`
8. Create.

Azure now writes a `azure-static-web-apps-<random>.yml` workflow into your
repo. We already have `.github/workflows/azure-static-web-apps.yml` checked
in — **delete the auto-generated file** and keep our committed one. They
do the same thing; ours is the source of truth.

The auto-generated workflow also adds a repo secret called something like
`AZURE_STATIC_WEB_APPS_API_TOKEN_<random>`. Our workflow expects exactly
`AZURE_STATIC_WEB_APPS_API_TOKEN`:

9. GitHub repo → **Settings** → **Secrets and variables** → **Actions**.
10. Find the auto-generated secret and **copy its value**.
11. Create a new secret named `AZURE_STATIC_WEB_APPS_API_TOKEN` with the
    same value. Delete the random-named one.

---

## 4. Wire env vars into the Static Web App

Critical step — without these, `/api/chat` and `/api/tts` either error or
serve mock replies in production.

1. SWA resource → **Configuration** → **Application settings**.
2. Add each of these:
   - `AZURE_SPEECH_KEY` (from step 1)
   - `AZURE_SPEECH_REGION` (e.g. `westeurope`)
   - `AZURE_OPENAI_ENDPOINT` (from step 2)
   - `AZURE_OPENAI_KEY` (from step 2)
   - `AZURE_OPENAI_DEPLOYMENT` (from step 2)
   - `AZURE_OPENAI_API_VERSION` (default `2024-10-21` is fine)
3. **Save**.

> SWA injects these into the Functions runtime at request time. They're
> *not* env vars at build time, so the build doesn't see them — that's fine,
> we don't need them at build.

---

## 5. Trigger the first deploy

```bash
git checkout claude/portuguese-ai-app-plan-neVuX
git checkout main           # create main if it doesn't exist
git merge claude/portuguese-ai-app-plan-neVuX
git push origin main
```

GitHub → **Actions** tab → watch the workflow run. Two jobs:
- `Build and Deploy` (the SWA workflow)
- `CI` (typecheck + tests)

Both should be green. The SWA job emits a deploy URL — typically
`https://<random-words>.azurestaticapps.net`. (This deployment lives at
https://proud-ground-0bffca10f.7.azurestaticapps.net.)

---

## 6. Smoke-test in production

Visit the deploy URL on your phone. Verify:

- [ ] Home page loads, all 16 scenarios visible
- [ ] Open café scenario → tap a phrase → Normal/Slow buttons play audio
      (this exercises Speech)
- [ ] Open Practice tab on any scenario → tap Start → tutor reply appears
      and is real pt-PT, not the dashed-border mock fallback (this exercises
      OpenAI)
- [ ] Chat works: type a Portuguese phrase, get a response

If you see dashed-border ("mock") replies in production, one of the env
vars in step 4 is missing or wrong. Check the Functions log:

  SWA resource → **Functions** → **chat** → **Monitor**

Look for the `Azure OpenAI env vars missing` warning — it'll tell you
which variable wasn't picked up.

---

## 7. Auth — already wired, needs setup

`staticwebapp.config.json` already restricts every route to the
`authenticated` role and routes 401s to `/.auth/login/github`. The
backend (`api/src/lib/auth.ts`) additionally checks the GitHub username
in the SWA-injected `x-ms-client-principal` header against
`AUTH_ALLOWED_USERS` — defense in depth. You just need to provision
the OAuth bits and wire env vars.

### 7a. Register a GitHub OAuth app

1. https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. **Application name**: `tudo-bem`
3. **Homepage URL**: your SWA deploy URL (e.g. `https://<random>.azurestaticapps.net`)
4. **Authorization callback URL**: `<homepage>/.auth/login/github/callback`
5. Register → on the next page, **Generate a new client secret**.
6. Copy the **Client ID** and the **Client Secret** (the secret only shows once).

### 7b. Set SWA application settings

SWA resource → **Configuration** → **Application settings** → add:

- `GITHUB_CLIENT_ID` = the Client ID from 7a
- `GITHUB_CLIENT_SECRET` = the Client Secret from 7a
- `AUTH_ALLOWED_USERS` = your GitHub username (e.g. `bprussell`).
  Comma-separated for multiple users.

> `AUTH_DISABLED` is **not** set in prod — that var is only for local dev
> (it's pre-set in `local.settings.json.example`). If `AUTH_ALLOWED_USERS`
> is missing in prod, the backend fails closed and every request 401s.
> A misconfigured prod is locked, not open.

### 7c. Smoke-test

Open the deploy URL in an incognito window. You should:

1. Get bounced to GitHub OAuth — sign in with the allowed account
2. Land back on the app, see all 17 scenarios + favorites card
3. Voice + chat + practice all work as in dev

In a second incognito window, sign in with a different GitHub account.
You should see a 401 from any `/api/*` call (frontend HTML still loads
because the route restriction is "authenticated", but the backend
allowlist rejects them — no chat, no TTS, no STT, no explain).

[issue #5]: https://github.com/bprussell/tudo-bem/issues/5

---

## 8. Custom domain (optional)

If you want `tudobem.example.com` instead of the auto URL:

1. SWA → **Custom domains** → **Add**.
2. Add a `CNAME` record at your DNS provider pointing to the SWA hostname.
3. Wait for verification + free SSL provisioning (~5–15 min).

---

## Cost watch (first week)

After a day or two of real use, check **Cost Management** in the portal.
Daily totals you should see:

- Speech (TTS): ~$0.20
- Speech (STT + pronunciation assessment): ~$0.30 if voice practice 30min/day
- OpenAI (chat): ~$0.01–$0.05 depending on turn count
- SWA Free tier: $0
- **Total**: well under $1/day

If you see anything over $5/day, something's wrong (loop, abuse, or
mis-deployment). The free-tier limits on Speech kick in for the first
~10 days each month, shaving costs further.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 404 on `/api/chat` | api_location wrong in workflow, or SWA didn't build the api/ folder |
| 500 from `/api/tts` with "Speech credentials not configured" | env vars from step 4 not saved or names mistyped |
| Dashed-border ("mock") chat replies in production | OpenAI env vars missing — see step 4 + log check in step 6 |
| 502 from `/api/chat` with "non-JSON completion" | Model deployment doesn't support `response_format: json_object`, or the system prompt doesn't contain the literal word "JSON" — the unit test guards against the latter |
| `npm ci` fails on Oryx build | Lockfile out of sync with package.json — re-run `npm install` locally and commit |
| TTS audio plays once then breaks on subsequent taps in Safari | Already fixed in commit `dc5354d` (AbortError swallow) |
| Endless 401 loop after sign-in | `AUTH_ALLOWED_USERS` doesn't include your GitHub username (case-sensitive). Or the GitHub OAuth callback URL is wrong. |
| Endless redirect to /login on every page | `responseOverrides.401` and route `allowedRoles: ["authenticated"]` are both applied to the login route itself. Verify the explicit `/login` and `/.auth/*` routes come BEFORE the catch-all in `staticwebapp.config.json`. |
