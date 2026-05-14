#!/usr/bin/env pwsh
<#
.SYNOPSIS
    WeldVision-X5 CLI deployment — builds and deploys to Cloudflare, then tags on GitHub.

.DESCRIPTION
    1. Bumps the semver version (patch/minor/major) in root + frontend package.json
    2. Builds the Vite frontend
    3. Deploys the Cloudflare Worker  → api.weldvision-x5.com
    4. Deploys the frontend to Pages  → www.weldvision-x5.com
    5. Commits the version bump, creates an annotated git tag, pushes to GitHub

.PARAMETER Bump
    Semver bump type: patch (default), minor, major.

.PARAMETER Message
    Optional release message used for the git tag annotation and Pages commit message.
    Defaults to "Release vX.Y.Z".

.PARAMETER SkipWorker
    Skip deploying the Cloudflare Worker (deploy frontend + tag only).

.PARAMETER SkipFrontend
    Skip building/deploying the frontend (deploy worker + tag only).

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 minor
    .\deploy.ps1 major -Message "New auth flow"
    .\deploy.ps1 patch -SkipFrontend
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('patch', 'minor', 'major')]
    [string]$Bump = 'patch',

    [string]$Message = '',

    [switch]$SkipWorker,
    [switch]$SkipFrontend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = $PSScriptRoot

# ── Helpers ──────────────────────────────────────────────────────────────────
function Step([string]$text) { Write-Host "`n>> $text" -ForegroundColor Cyan }
function Ok([string]$text)   { Write-Host "   OK  $text" -ForegroundColor Green }
function Warn([string]$text) { Write-Host "   !!  $text" -ForegroundColor Yellow }
function Fail([string]$text) { Write-Host "`n FAIL  $text" -ForegroundColor Red; exit 1 }

function Bump-Semver([string]$version, [string]$part) {
    if ($version -notmatch '^\d+\.\d+\.\d+$') {
        Fail "Invalid semver in package.json: '$version'"
    }
    $p = $version -split '\.'
    switch ($part) {
        'major' { return "$([int]$p[0] + 1).0.0" }
        'minor' { return "$($p[0]).$([int]$p[1] + 1).0" }
        'patch' { return "$($p[0]).$($p[1]).$([int]$p[2] + 1)" }
    }
}

function Update-PackageVersion([string]$path, [string]$newVer) {
    if (-not (Test-Path $path)) { Fail "package.json not found: $path" }
    $content = Get-Content $path -Raw -Encoding UTF8
    $updated = $content -replace '("version"\s*:\s*")[^"]+(")', "`${1}$newVer`${2}"
    [System.IO.File]::WriteAllText($path, $updated, [System.Text.UTF8Encoding]::new($false))
    Ok "Updated $path"
}

# ── 0. Pre-flight checks ──────────────────────────────────────────────────────
Step "Pre-flight checks"

# Verify wrangler is available
$null = Get-Command npx -ErrorAction Stop

# Check git remote
$remote = git -C $Root remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) { Fail "No git remote 'origin' found. Push requires a GitHub remote." }
Ok "Git remote: $remote"

# ── 1. Read and bump version ──────────────────────────────────────────────────
Step "Bumping version ($Bump)"

$rootPkg    = Join-Path $Root "package.json"
$frontPkg   = Join-Path $Root "welding_server\frontend\package.json"
$workerPkg  = Join-Path $Root "cloud_worker\package.json"

$pkgJson     = Get-Content $rootPkg -Raw | ConvertFrom-Json
$oldVersion  = $pkgJson.version
$newVersion  = Bump-Semver $oldVersion $Bump
$tag         = "v$newVersion"
$releaseMsg  = if ($Message) { $Message } else { "Release $tag" }

Ok "$oldVersion  ->  $newVersion  ($Bump)"

# ── 2. Ensure working tree is clean (tracked files only) ─────────────────────
Step "Checking git working tree"
$dirty = git -C $Root status --porcelain 2>&1 | Where-Object { $_ -match '^[MADRCU]' }
if ($dirty) {
    Fail "Working tree has uncommitted changes. Commit or stash before deploying.`n$($dirty -join "`n")"
}
Ok "Working tree is clean"

# ── 3. Update version in package.json files ──────────────────────────────────
Step "Updating package.json versions to $newVersion"
Update-PackageVersion $rootPkg   $newVersion
Update-PackageVersion $frontPkg  $newVersion
Update-PackageVersion $workerPkg $newVersion

# ── 4. Build frontend ─────────────────────────────────────────────────────────
if (-not $SkipFrontend) {
    Step "Building frontend (Vite + TypeScript)"
    Push-Location (Join-Path $Root "welding_server\frontend")
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { Fail "Frontend build failed" }
    } finally { Pop-Location }
    Ok "Frontend built to welding_server/frontend/dist/"
} else {
    Warn "SkipFrontend: skipping Vite build"
}

# ── 5. Deploy Cloudflare Worker ───────────────────────────────────────────────
if (-not $SkipWorker) {
    Step "Deploying Cloudflare Worker  ->  api.weldvision-x5.com"
    Push-Location (Join-Path $Root "cloud_worker")
    try {
        npx wrangler deploy
        if ($LASTEXITCODE -ne 0) { Fail "Worker deployment failed" }
    } finally { Pop-Location }
    Ok "Worker deployed"
} else {
    Warn "SkipWorker: skipping worker deployment"
}

# ── 6. Deploy frontend to Cloudflare Pages ────────────────────────────────────
if (-not $SkipFrontend) {
    Step "Deploying frontend  ->  Cloudflare Pages (weldvision-frontend)"
    Push-Location (Join-Path $Root "welding_server\frontend")
    try {
        npx wrangler pages deploy dist `
            --project-name weldvision-frontend `
            --branch main `
            --commit-message "$releaseMsg"
        if ($LASTEXITCODE -ne 0) { Fail "Pages deployment failed" }
    } finally { Pop-Location }
    Ok "Frontend deployed  ->  https://www.weldvision-x5.com"
} else {
    Warn "SkipFrontend: skipping Pages deployment"
}

# ── 7. Git commit, annotated tag, push ────────────────────────────────────────
Step "Committing version bump + tagging $tag"

git -C $Root add "package.json" "welding_server/frontend/package.json" "cloud_worker/package.json"
git -C $Root commit -m "chore: bump version to $newVersion"
if ($LASTEXITCODE -ne 0) { Fail "git commit failed" }

git -C $Root tag -a $tag -m "$releaseMsg"
if ($LASTEXITCODE -ne 0) { Fail "git tag failed" }

git -C $Root push origin main --follow-tags
if ($LASTEXITCODE -ne 0) { Fail "git push failed" }

Ok "Pushed main + $tag to GitHub"

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Deployed $tag successfully!" -ForegroundColor Green
Write-Host "  API:      https://api.weldvision-x5.com"  -ForegroundColor White
Write-Host "  Frontend: https://www.weldvision-x5.com"  -ForegroundColor White
Write-Host "  Tag:      $tag  (`"$releaseMsg`")"         -ForegroundColor White
Write-Host ""
