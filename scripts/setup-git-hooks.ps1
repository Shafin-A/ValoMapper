$ErrorActionPreference = "Stop"

$repoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
  throw "Could not detect repository root."
}

Set-Location $repoRoot

git config core.hooksPath .githooks

Write-Host "Configured repo hooks path to .githooks"
