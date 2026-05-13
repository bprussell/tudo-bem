// Tudo Bem — Azure infrastructure
//
// Provisions:
//   - Speech Service (F0)        for /api/tts and (later) /api/stt
//   - Azure OpenAI (S0)          for /api/chat
//   - OpenAI model deployment    gpt-5.4-mini, Global Standard
//   - Static Web App (Free)      hosts the React PWA + managed Functions
//   - SWA app settings           injects keys/endpoints into the Functions runtime
//
// Outside this template (set after first deploy by deploy.ps1 or by hand):
//   - GitHub OAuth app           registered at github.com/settings/developers
//   - GITHUB_CLIENT_ID / SECRET  added as SWA app settings
//   - AUTH_ALLOWED_USERS         added as SWA app settings
//   - AZURE_STATIC_WEB_APPS_API_TOKEN  set as a GitHub repo secret

targetScope = 'resourceGroup'

@description('Region for all resources. SWA Free supports: westus2, centralus, eastus2, westeurope, eastasia.')
param location string = 'eastus2'

@description('Prefix for resource names. Resources requiring globally-unique DNS get a hash suffix appended.')
param namePrefix string = 'tudo-bem'

@description('Short suffix for globally-unique DNS names (Speech and OpenAI endpoints). Defaults to a hash of the resource group ID — stable across redeploys.')
param uniqueSuffix string = take(uniqueString(resourceGroup().id), 6)

@description('Speech Service SKU. F0 is the free tier: 0.5M TTS chars + 5 STT hours/month.')
param speechSku string = 'F0'

@description('Azure OpenAI account SKU. S0 is standard pay-as-you-go.')
param openAiSku string = 'S0'

@description('Chat model to deploy. As of May 2026: gpt-5.4-mini is the cheap multilingual default.')
param chatModelName string = 'gpt-5.4-mini'

@description('Chat model version. Look this up in Azure AI Foundry → Model catalog if a newer one ships.')
param chatModelVersion string = '2026-03-17'

@description('Deployment name. This is what AZURE_OPENAI_DEPLOYMENT will be set to.')
param chatDeploymentName string = 'gpt-5-4-mini'

@description('Deployment SKU. GlobalStandard is required for gpt-5.4-mini in non-data-zone regions.')
param chatDeploymentSku string = 'GlobalStandard'

@description('Thousands of tokens per minute. 30K is plenty for personal use; DEPLOY.md recommends starting here.')
param chatTpmCapacity int = 30

@description('Azure OpenAI REST API version used by /api/chat. Newer models may need a newer version.')
param openAiApiVersion string = '2025-04-01-preview'

var speechName = '${namePrefix}-speech-${uniqueSuffix}'
var openAiName = '${namePrefix}-openai-${uniqueSuffix}'
var swaName = namePrefix

resource speech 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: speechName
  location: location
  kind: 'SpeechServices'
  sku: {
    name: speechSku
  }
  properties: {
    customSubDomainName: speechName
    publicNetworkAccess: 'Enabled'
  }
}

resource openAi 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: openAiName
  location: location
  kind: 'OpenAI'
  sku: {
    name: openAiSku
  }
  properties: {
    customSubDomainName: openAiName
    publicNetworkAccess: 'Enabled'
  }
}

resource chatDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openAi
  name: chatDeploymentName
  sku: {
    name: chatDeploymentSku
    capacity: chatTpmCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: chatModelName
      version: chatModelVersion
    }
  }
}

resource swa 'Microsoft.Web/staticSites@2024-04-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
  }
}

resource swaAppSettings 'Microsoft.Web/staticSites/config@2024-04-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    AZURE_SPEECH_KEY: speech.listKeys().key1
    AZURE_SPEECH_REGION: location
    AZURE_OPENAI_ENDPOINT: openAi.properties.endpoint
    AZURE_OPENAI_KEY: openAi.listKeys().key1
    AZURE_OPENAI_DEPLOYMENT: chatDeploymentName
    AZURE_OPENAI_API_VERSION: openAiApiVersion
  }
  dependsOn: [
    chatDeployment
  ]
}

output swaName string = swa.name
output swaHostname string = swa.properties.defaultHostname
output openAiEndpoint string = openAi.properties.endpoint
output openAiName string = openAi.name
output speechName string = speech.name
output speechRegion string = location
output chatDeploymentName string = chatDeploymentName
