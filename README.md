# tudo-bem

European Portuguese travel-prep tutor. PWA + Azure Functions + Azure Speech +
Azure OpenAI. See [PLAN.md](./PLAN.md) for design and roadmap.

Deployed at https://proud-ground-0bffca10f.7.azurestaticapps.net (gated by GitHub OAuth allowlist).

## Layout

```
web/    React + Vite + TS PWA (frontend)
api/    Azure Functions (TypeScript) — managed by Static Web Apps
```

## Local dev

Prereqs: Node 20+, [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local),
[SWA CLI](https://github.com/Azure/static-web-apps-cli).

```bash
# in one shell
cd api && npm install && npm run start

# in another
cd web && npm install && npm run dev

# or run both behind the SWA emulator (proxies /api to the functions host)
npm install -g @azure/static-web-apps-cli
swa start http://localhost:5173 --api-location api
```

## Secrets

Copy `api/local.settings.json.example` → `api/local.settings.json` and fill in:

- `AZURE_SPEECH_KEY` — from your Azure Speech resource
- `AZURE_SPEECH_REGION` — e.g. `westeurope`
- `AZURE_OPENAI_ENDPOINT` — e.g. `https://<name>.openai.azure.com`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT` — your deployment name (target: a cheap multilingual model such as gpt-5.4-mini; verify the exact name in the Azure portal — see PLAN.md)

If any of `AZURE_OPENAI_*` are missing, `/api/chat` automatically falls back
to canned mock replies so you can develop the UI without provisioning Azure
resources. Set `MOCK_MODE=1` to force this even when keys are present.

In production these are configured as Static Web App application settings.

## Status

- M1 (TTS demo) and M2 (conversational tutor, mocked) shipped on the dev branch.
- 5 scenarios: café, restaurant, taxi, hotel check-in, directions.
- Not yet deployed — see "Before first public deploy" in PLAN.md for the checklist.
