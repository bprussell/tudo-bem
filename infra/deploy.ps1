#!/usr/bin/env pwsh
# Tudo Bem — one-shot infra deploy.
#
# Idempotent: rerun any time. Provisions the resource group + everything in main.bicep,
# then pushes the SWA deploy token into the GitHub repo as AZURE_STATIC_WEB_APPS_API_TOKEN.
#
# Usage:
#   ./infra/deploy.ps1                              # uses defaults from main.bicepparam
#   ./infra/deploy.ps1 -ResourceGroup tudo-bem-dev  # alt RG
#   ./infra/deploy.ps1 -WhatIf                      # preview without applying

[CmdletBinding()]
param(
    [string] $ResourceGroup = 'tudo-bem',
    [string] $Location = 'eastus2',
    [string] $GitHubRepo = 'bprussell/tudo-bem',
    [switch] $WhatIf,
    [switch] $SkipGitHubSecret
)

$ErrorActionPreference = 'Stop'
$InformationPreference = 'Continue'

$infraDir = Split-Path -Parent $PSCommandPath
$bicepFile = Join-Path $infraDir 'main.bicep'
$paramFile = Join-Path $infraDir 'main.bicepparam'

function Step($msg) { Write-Information "`n==> $msg" }
function OK($msg)   { Write-Information "    $msg" }

Step 'Checking prerequisites'
try { az account show --only-show-errors 1>$null } catch { throw 'Run `az login` first.' }
$sub = az account show --query '{name:name,id:id}' -o json | ConvertFrom-Json
OK "Azure subscription: $($sub.name) ($($sub.id))"

if (-not $SkipGitHubSecret) {
    try { gh auth status 2>&1 | Out-Null } catch { throw 'Run `gh auth login` first, or pass -SkipGitHubSecret.' }
    OK "GitHub: authenticated"
}

Step "Ensuring resource group '$ResourceGroup' exists in $Location"
az group create --name $ResourceGroup --location $Location --only-show-errors 1>$null
OK 'Resource group ready'

if ($WhatIf) {
    Step 'Running what-if (no changes will be applied)'
    az deployment group what-if `
        --resource-group $ResourceGroup `
        --template-file $bicepFile `
        --parameters $paramFile
    Write-Information "`nWhat-if complete. Re-run without -WhatIf to apply."
    return
}

Step 'Deploying main.bicep'
$deployName = "tudo-bem-$(Get-Date -Format yyyyMMdd-HHmmss)"
az deployment group create `
    --name $deployName `
    --resource-group $ResourceGroup `
    --template-file $bicepFile `
    --parameters $paramFile `
    --output none
if ($LASTEXITCODE -ne 0) { throw 'Bicep deployment failed.' }

# Re-fetch outputs via `deployment show` so stray warnings on stdout (e.g. Bicep
# upgrade nags) don't poison the JSON parse.
$outputs = az deployment group show `
    --resource-group $ResourceGroup `
    --name $deployName `
    --query 'properties.outputs' -o json | ConvertFrom-Json
$swaName = $outputs.swaName.value
$swaHostname = $outputs.swaHostname.value
$openAiEndpoint = $outputs.openAiEndpoint.value
OK "SWA:          $swaName"
OK "SWA hostname: https://$swaHostname"
OK "OpenAI:       $openAiEndpoint"

if (-not $SkipGitHubSecret) {
    Step 'Wiring SWA deploy token into GitHub repo secrets'
    $token = az staticwebapp secrets list `
        --name $swaName `
        --resource-group $ResourceGroup `
        --query 'properties.apiKey' -o tsv
    if (-not $token) { throw 'Could not retrieve SWA deploy token.' }

    $token | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo $GitHubRepo
    if ($LASTEXITCODE -ne 0) { throw 'Failed to set GitHub secret.' }
    OK 'AZURE_STATIC_WEB_APPS_API_TOKEN secret set on the repo'
}

Step 'Next steps'
Write-Information @"

1. Register the GitHub OAuth app at https://github.com/settings/developers
     Homepage URL:           https://$swaHostname
     Authorization callback: https://$swaHostname/.auth/login/github/callback
   Then set the SWA app settings (replace YOUR_* below):

     az staticwebapp appsettings set --name $swaName --resource-group $ResourceGroup --setting-names ``
       GITHUB_CLIENT_ID=YOUR_CLIENT_ID ``
       GITHUB_CLIENT_SECRET=YOUR_CLIENT_SECRET ``
       AUTH_ALLOWED_USERS=bprussell

2. Push 'main' to trigger the first deploy:
     git checkout main
     git merge claude/portuguese-ai-app-plan-neVuX
     git push origin main

3. Smoke-test once the GitHub Actions run finishes:
     https://$swaHostname

"@
