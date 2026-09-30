param(
    [Parameter(Mandatory = $true)][string]$Version,   # 例：1.0.1
    [Parameter(Mandatory = $true)][string]$KeyPath,   # Ed25519 私鑰（放在 repo 外）
    [string[]]$Notes = @(),
    [string]$AppDir  = 'C:\VSCode\Assemble\myproject',
    [string]$SiteDir = 'C:\VSCode\Assemble-Website',
    [switch]$SkipBuild,
    [switch]$NotifyOnly
)
$ErrorActionPreference = 'Stop'

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    # ★ 一定要 BOM-free：wails.json 由 go:embed + json.Unmarshal 讀，BOM 會讓它靜默失效
    [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

# ── 0) 前置檢查 ────────────────────────────────────────────
if (-not (Get-Command wails -ErrorAction SilentlyContinue)) { throw 'wails CLI not found in PATH' }
if (-not (Get-Command go -ErrorAction SilentlyContinue)) { throw 'go not found in PATH' }
if (-not (Get-Command makensis -ErrorAction SilentlyContinue)) {
    throw 'makensis not found in PATH — install NSIS first: winget install -e --id NSIS.NSIS'
}
if (-not (Test-Path $KeyPath)) { throw "signing key not found: $KeyPath" }

# ── 1) 版本寫進 wails.json（regex 取代，不重排格式）────────
$wailsJson = Join-Path $AppDir 'wails.json'
$raw = [System.IO.File]::ReadAllText($wailsJson)
$raw = [regex]::Replace($raw, '("productVersion"\s*:\s*")[^"]*(")', '${1}' + $Version + '${2}')
Write-Utf8NoBom $wailsJson $raw
Write-Host "[1/6] wails.json → $Version"

# ── 2) 建置（NSIS / per-user / 預設 webview2 download）─────
if (-not $SkipBuild) {
    Push-Location $AppDir
    try { wails build -clean -nsis -installscope user } finally { Pop-Location }
} else {
    Write-Host '[2/6] build skipped'
}

$installer = Get-ChildItem (Join-Path $AppDir 'build\bin') -Filter '*-installer.exe' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) { throw 'installer not found — did "wails build -nsis" succeed?' }
Write-Host "[2/6] built $($installer.Name)"

# ── 3) 複製到官網 + 算 sha256 ───────────────────────────────
$setupName = "AssembleSetup-$Version.exe"
$downloadsDir = Join-Path $SiteDir 'downloads'
New-Item -ItemType Directory -Force $downloadsDir | Out-Null
$dest = Join-Path $downloadsDir $setupName
Copy-Item $installer.FullName $dest -Force

$sha  = (Get-FileHash $dest -Algorithm SHA256).Hash.ToLower()
$size = (Get-Item $dest).Length
$url  = "https://assemblenotes.com/downloads/$setupName"
Write-Host "[3/6] $setupName  $([math]::Round($size / 1MB, 2)) MB"

# ── 4) 簽章 ────────────────────────────────────────────────
Push-Location $AppDir
try {
    $sig = (go run ./tools/signmanifest $KeyPath $Version $sha $url | Select-Object -Last 1).Trim()
} finally { Pop-Location }
if (-not $sig) { throw 'signing failed (empty signature)' }
Write-Host "[4/6] signed"

# ── 5) updates/latest.json（BOM-free！Go 的 json.Unmarshal 受不了 BOM）──
$updatesDir = Join-Path $SiteDir 'updates'
New-Item -ItemType Directory -Force $updatesDir | Out-Null

$manifest = [ordered]@{
    channel = 'stable'; version = $Version; publishedAt = (Get-Date -Format 'yyyy-MM-dd')
    minSupported = '1.0.0'
    payload      = $(if ($NotifyOnly) { '' } else { 'nsis' })
    installerUrl = $(if ($NotifyOnly) { '' } else { $url })
    sha256       = $(if ($NotifyOnly) { '' } else { $sha })
    sig          = $(if ($NotifyOnly) { '' } else { $sig })
    size         = $(if ($NotifyOnly) { 0 } else { $size })
    downloadUrl = 'https://assemblenotes.com/download.html'; mandatory = $false
    notes = $Notes
}
Write-Utf8NoBom (Join-Path $updatesDir 'latest.json') ($manifest | ConvertTo-Json -Depth 5)
Write-Host "[5/6] updates/latest.json"

# ── 6) 更新下載頁（只改 Windows 連結 + 版本字串；Mac DMG 不動）──
foreach ($file in @('download.html', 'index.html')) {
    $p = Join-Path $SiteDir $file
    if (-not (Test-Path $p)) { continue }
    $html = [System.IO.File]::ReadAllText($p)
    $html = $html -replace '(&middot;\s*)v\d+\.\d+\.\d+', ('${1}v' + $Version)          # ★ 通用
    $html = $html -replace 'downloads/AssembleSetup-[\d.]+\.exe', "downloads/$setupName"
    $html = $html -replace 'downloads/Assemble_[\d.]+\.\d+_x64\.msix', "downloads/$setupName"
    $html = $html -replace 'MSIX package', 'Windows installer'
    Write-Utf8NoBom $p $html
}
Write-Host '[6/6] download.html / index.html updated'

# ── 驗證 BOM ───────────────────────────────────────────────
foreach ($f in @($wailsJson, (Join-Path $updatesDir 'latest.json'))) {
    $h = ([System.IO.File]::ReadAllBytes($f)[0..2] | ForEach-Object { $_.ToString('X2') }) -join ' '
    if ($h -eq 'EF BB BF') { throw "BOM detected in $f — fix Write-Utf8NoBom usage" }
}

Write-Host ''
Write-Host "== release $Version ==" -ForegroundColor Green
Write-Host "installer : downloads\$setupName ($([math]::Round($size / 1MB, 2)) MB)"
Write-Host "sha256    : $sha"
Write-Host "sig       : $($sig.Substring(0, 24))..."
Write-Host ''
Write-Host '★ next: deploy the website, then verify:'
Write-Host '  Invoke-WebRequest https://assemblenotes.com/updates/latest.json -UseBasicParsing | Select-Object -Expand Content'
