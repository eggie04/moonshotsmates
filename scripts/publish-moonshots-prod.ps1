param(
  [string]$CommitMessage = "sync: framer content update"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$UpdateScript = Join-Path $PSScriptRoot "update-moonshots-site.ps1"

Write-Host "Syncing latest Framer publish into repo..."
& powershell -ExecutionPolicy Bypass -File $UpdateScript
if ($LASTEXITCODE -ne 0) {
  throw "Update script failed with exit code $LASTEXITCODE"
}

Push-Location $RepoRoot
try {
  & git add -A
  if ($LASTEXITCODE -ne 0) {
    throw "git add failed with exit code $LASTEXITCODE"
  }

  & git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Host "No changes detected after sync. Nothing to commit or deploy."
    exit 0
  }

  if ($LASTEXITCODE -ne 1) {
    throw "git diff --cached --quiet failed with exit code $LASTEXITCODE"
  }

  & git commit -m $CommitMessage
  if ($LASTEXITCODE -ne 0) {
    throw "git commit failed with exit code $LASTEXITCODE"
  }

  & git push
  if ($LASTEXITCODE -ne 0) {
    throw "git push failed with exit code $LASTEXITCODE"
  }

  $commit = (& git rev-parse --short HEAD).Trim()
  Write-Host "Done. Published to GitHub with commit $commit."
  Write-Host "Vercel will deploy production from main."
}
finally {
  Pop-Location
}
