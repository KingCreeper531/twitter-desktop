# Builds the Twitter app and publishes a GitHub release with:
#   - Twitter-Setup-<version>.exe     (Windows installer, updates itself)
#   - latest.yml + .blockmap           (used by the in-app Update button)
#   - Twitter-iOS-<version>.ipa       (added a few minutes later by GitHub's Mac build, .github/workflows/ios.yml)
#
# Usage:  npm run release                      -> bumps patch (1.0.0 -> 1.0.1) if this version is already out
#         npm run release -- -Bump minor       -> 1.0.0 -> 1.1.0
#         npm run release -- -Notes "Fixed X"  -> custom release notes
param(
  [ValidateSet('patch', 'minor', 'major')] [string]$Bump = 'patch',
  [string]$Notes = ''
)
# Native tools write progress to stderr; failures are caught by exit codes in Run() instead.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Run($exe, [string[]]$argv) {
  & $exe @argv
  if ($LASTEXITCODE -ne 0) { throw "$exe $($argv -join ' ') failed (exit $LASTEXITCODE)" }
}

$name = 'Twitter'
$repo = 'KingCreeper531/twitter-desktop'

$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') { throw "Releases come from the main branch (you're on '$branch'). Run: git checkout main" }

$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
& gh release view "v$version" --repo $repo *> $null
if ($LASTEXITCODE -eq 0) {
  Run npm @('version', $Bump, '--no-git-tag-version')
  $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
}
Write-Host "Releasing $name v$version" -ForegroundColor Green

if (Test-Path dist) { Remove-Item -Recurse -Force dist }
Run npx @('electron-builder', '--win', '--publish', 'never')

$assets = @(
  "dist\$name-Setup-$version.exe",
  "dist\$name-Setup-$version.exe.blockmap",
  'dist\latest.yml'
)
foreach ($a in $assets) { if (-not (Test-Path $a)) { throw "Missing build output: $a" } }

# The iPhone app's page script is made from src/preload.js
Run node @('scripts/make-ios-script.js')

# Commit and push the source for this version (the iPhone build uses it).
Run git @('add', '-A')
& git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { Run git @('commit', '-m', "Release v$version") }
Run git @('push', 'origin', 'HEAD')

if (-not $Notes) {
  $Notes = "## Download`n" +
    "- **$name-Setup-$version.exe**: Windows installer. Updates itself with the green Update button.`n" +
    "- **$name-iOS-$version.ipa**: iPhone and iPad app (appears a few minutes after this release). Install it with [AltStore](https://altstore.io) or [Sideloadly](https://sideloadly.io) using your Apple ID.`n`n" +
    "Or install and update it from the [Ranch Launcher](https://github.com/KingCreeper531/ranch-launcher/releases/latest).`n`n" +
    "Windows may show a SmartScreen warning because the app isn't code-signed. Click **More info**, then **Run anyway**.`n"
}
$notesFile = Join-Path $env:TEMP "ranch-$($name.ToLower())-notes-$version.md"
[IO.File]::WriteAllText($notesFile, $Notes)
$ghArgs = @('release', 'create', "v$version", '--repo', $repo, '--target', 'main', '--title', "$name v$version", '--notes-file', $notesFile) + $assets
Run gh $ghArgs
Write-Host "Published https://github.com/$repo/releases/tag/v$version (the .ipa follows in a few minutes)" -ForegroundColor Green
