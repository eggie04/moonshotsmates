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
  # Remove legacy JS badge-stripper (it can interfere with runtime behavior) and use CSS-only hide.
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

  # Add durable Moonshot simulator button press feedback in exported Framer HTML.
  $moonshotButtonCss = @"
<style id="self-hosted-moonshot-button-press">
  .moonshot-sim-widget button {
    transition: transform 24ms linear, filter 40ms linear, box-shadow 90ms ease-out !important;
    will-change: transform, filter;
  }
  .moonshot-sim-widget button:active {
    transform: translateY(1px) scale(0.992);
    filter: brightness(1.04);
  }
</style>
"@
  if ($withoutBadgeScript -notmatch 'id="self-hosted-moonshot-button-press"') {
    if ($withoutBadgeScript -match '</head>') {
      $withoutBadgeScript = $withoutBadgeScript -replace '</head>', ($moonshotButtonCss + '</head>')
    } else {
      $withoutBadgeScript = $moonshotButtonCss + $withoutBadgeScript
    }
  }

  # Force stable mobile nav container behavior to avoid sticky/menu regressions.
  $mobileNavFixCss = @"
<style id="self-hosted-mobile-nav-fix">
  @media (max-width: 809.98px) {
    .framer-jge7m-container {
      position: absolute !important;
      left: 50% !important;
      top: 0 !important;
      transform: translateX(-50%) !important;
      z-index: 1000 !important;
      pointer-events: auto !important;
    }
  }
</style>
"@
  if ($withoutBadgeScript -notmatch 'id="self-hosted-mobile-nav-fix"') {
    if ($withoutBadgeScript -match '</head>') {
      $withoutBadgeScript = $withoutBadgeScript -replace '</head>', ($mobileNavFixCss + '</head>')
    } else {
      $withoutBadgeScript = $mobileNavFixCss + $withoutBadgeScript
    }
  }

  $moonshotButtonScript = @"
<script id="self-hosted-moonshot-button-press-script">
  (() => {
    const attachMoonshotWidgetClass = () => {
      const headings = document.querySelectorAll("h2");
      for (const heading of headings) {
        if ((heading.textContent || "").trim() !== "Moonshot Simulator") continue;
        const widgetRoot = heading.closest("div");
        if (!widgetRoot) return false;
        widgetRoot.classList.add("moonshot-sim-widget");
        return true;
      }
      return false;
    };

    if (attachMoonshotWidgetClass()) return;
    const observer = new MutationObserver(() => {
      if (!attachMoonshotWidgetClass()) return;
      observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  })();
</script>
"@
  if ($withoutBadgeScript -notmatch 'id="self-hosted-moonshot-button-press-script"') {
    if ($withoutBadgeScript -match '</body>') {
      $withoutBadgeScript = $withoutBadgeScript -replace '</body>', ($moonshotButtonScript + '</body>')
    } else {
      $withoutBadgeScript += $moonshotButtonScript
    }
  }

  # Preserve standards mode. Missing doctype can break wheel scrolling/Lenis behavior.
  if ($withoutBadgeScript -notmatch '^\s*<!doctype html>') {
    $withoutBadgeScript = "<!doctype html>`n" + $withoutBadgeScript.TrimStart()
  }

  if ($withoutBadgeScript -ne $html) {
    [System.IO.File]::WriteAllText(
      (Resolve-Path $IndexFile),
      $withoutBadgeScript,
      [System.Text.UTF8Encoding]::new($false)
    )
  }
}

# Patch known mobile sticky-nav regression in Framer compiled bundles.
$scriptRoots = Join-Path $TargetDir "framerusercontent.com\sites"
if (Test-Path $scriptRoots) {
  $bundleFiles = Get-ChildItem -Path $scriptRoots -Recurse -File -Filter "script_main*.mjs"
  foreach ($bundle in $bundleFiles) {
    $bundleText = Get-Content -LiteralPath $bundle.FullName -Raw
    $patchedBundle = $bundleText

    # Revert mobile nav sticky override to Framer's original absolute centered behavior.
    $patchedBundle = [regex]::Replace(
      $patchedBundle,
      'position:\s*sticky;\s*transform:\s*unset;?',
      'position: absolute; left: 50%; transform: translateX(-50%);',
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    # Remove hardcoded mobile y-offset overrides introduced with sticky experiments.
    $patchedBundle = $patchedBundle -replace 'overrides:\{Q8FSHRUOI:\{y:200\}\}', 'overrides:{}'
    $patchedBundle = $patchedBundle -replace 'overrides:\{Q8FSHRUOI:\{y:1285\}\}', 'overrides:{}'

    if ($patchedBundle -ne $bundleText) {
      [System.IO.File]::WriteAllText(
        (Resolve-Path $bundle.FullName),
        $patchedBundle,
        [System.Text.UTF8Encoding]::new($false)
      )
    }
  }
}

Write-Host "Done. Updated public/ and vercel.json"
