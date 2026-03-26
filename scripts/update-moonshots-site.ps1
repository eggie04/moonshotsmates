param(
  [string]$FramerUrl = "https://moonshotsmates.framer.ai/",
  [string]$Slug = "moonshotsmates",
  [string]$UtilityRoot = "C:\Users\marke\OneDrive\Documents\Cursor Projects\Self Hosted Framer"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$UtilityExe = Join-Path $UtilityRoot "release\self-hosted-framer.exe"
$SourceDir = Join-Path $UtilityRoot "sites\$Slug\src"
$TargetDir = Join-Path $RepoRoot "public"

if (-not (Test-Path $UtilityExe)) {
  throw "Utility exe not found: $UtilityExe"
}

Write-Host "Staging from Framer via utility..."
Push-Location $UtilityRoot
try {
  & $UtilityExe stage $FramerUrl --output $Slug --clean
  if ($LASTEXITCODE -ne 0) {
    throw "Staging failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

if (-not (Test-Path $SourceDir)) {
  throw "Expected staged source directory not found: $SourceDir"
}

New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null

Write-Host "Syncing staged site into repo public/ ..."
robocopy $SourceDir $TargetDir /MIR /XD ".vercel" /XF "vercel.json" ".gitignore" /NFL /NDL /NJH /NJS /NC /NS | Out-Null

$VercelConfig = Join-Path $SourceDir "vercel.json"
if (Test-Path $VercelConfig) {
  Copy-Item -LiteralPath $VercelConfig -Destination (Join-Path $RepoRoot "vercel.json") -Force
}

$IndexFile = Join-Path $TargetDir "index.html"
if (Test-Path $IndexFile) {
  $html = Get-Content -LiteralPath $IndexFile -Raw
  # Ensure scheme-less Framer CDN URLs always resolve remotely (1:1 parity with Framer output).
  $normalized = [regex]::Replace(
    $html,
    '(?<!https?://)(?<!//)framerusercontent\.com/',
    'https://framerusercontent.com/',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  if ($normalized -ne $html) {
    [System.IO.File]::WriteAllText(
      (Resolve-Path $IndexFile),
      $normalized,
      [System.Text.UTF8Encoding]::new($false)
    )
  }
}

Write-Host "Done. Updated public/ and vercel.json"
