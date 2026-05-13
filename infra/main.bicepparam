using './main.bicep'

param location = 'eastus2'
param namePrefix = 'tudo-bem'

// Speech Service: F0 = free (0.5M TTS chars + 5 STT hrs/month).
param speechSku = 'F0'

// Azure OpenAI account: S0 = pay-per-token standard.
param openAiSku = 'S0'

// Chat model. Look up newer versions in Azure AI Foundry → Model catalog if needed.
param chatModelName = 'gpt-5.4-mini'
param chatModelVersion = '2026-03-17'
param chatDeploymentName = 'gpt-5-4-mini'
param chatDeploymentSku = 'GlobalStandard'
param chatTpmCapacity = 30

// API version used by /api/chat. Bump if the model rejects requests.
param openAiApiVersion = '2025-04-01-preview'
