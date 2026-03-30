param(
  [string]$FramerUrl = "https://moonshotsmates.framer.ai/"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$WebsiteDir = Join-Path $RepoRoot "Website"
$TargetDir = Join-Path $RepoRoot "public"
$IndexFile = Join-Path $TargetDir "index.html"

if (-not (Test-Path $WebsiteDir)) {
  throw "Website directory not found: $WebsiteDir"
}

Write-Host "Syncing local Framer code via API..."
Push-Location $WebsiteDir
try {
  & node "scripts/framer-sync.mjs"
  if ($LASTEXITCODE -ne 0) {
    throw "Framer sync failed with exit code $LASTEXITCODE"
  }

  & node "scripts/framer-publish.mjs"
  if ($LASTEXITCODE -ne 0) {
    throw "Framer publish failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

Write-Host "Pulling published HTML from $FramerUrl ..."
$response = Invoke-WebRequest -Uri $FramerUrl -UseBasicParsing -TimeoutSec 60
if ($response.StatusCode -ne 200) {
  throw "Unexpected status code from Framer URL: $($response.StatusCode)"
}

$html = [string]$response.Content
$normalized = [regex]::Replace(
  $html,
  '(?<!https?://)(?<!//)framerusercontent\.com/',
  'https://framerusercontent.com/',
  [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)

$withoutBadgeScript = [regex]::Replace(
  $normalized,
  '<script id="self-hosted-framer-hide-badge-script">[\s\S]*?</script>',
  '',
  [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)

$badgeCss = @"
<style id="self-hosted-framer-hide-badge">
  #__framer-badge-container,
  .__framer-badge,
  [aria-label="Made in Framer"] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
</style>
"@

if ($withoutBadgeScript -notmatch 'id="self-hosted-framer-hide-badge"') {
  if ($withoutBadgeScript -match '</head>') {
    $withoutBadgeScript = $withoutBadgeScript -replace '</head>', ($badgeCss + '</head>')
  } else {
    $withoutBadgeScript = $badgeCss + $withoutBadgeScript
  }
}

if ($withoutBadgeScript -notmatch '^\s*<!doctype html>') {
  $withoutBadgeScript = "<!doctype html>`n" + $withoutBadgeScript.TrimStart()
}

New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
[System.IO.File]::WriteAllText(
  $IndexFile,
  $withoutBadgeScript,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "Done. Updated public/index.html from Framer API publish."
