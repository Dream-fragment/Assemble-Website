param(
    [Parameter(Mandatory=$true)][string]$Version,     # 要比「已安裝版本」高，例：1.0.2
    [Parameter(Mandatory=$true)][string]$KeyPath,
    [string]$AppDir      = 'C:\VSCode\Assemble\myproject',
    [string]$PayloadDir  = 'C:\temp\updates',
    [string]$ManifestUrl = 'http://127.0.0.1:9000',
    [string]$MinSupported = '1.0.0'
)
$ErrorActionPreference = 'Stop'

$installedExe = "$env:LOCALAPPDATA\Programs\Assemble\Assemble.exe"
if (Test-Path $installedExe) {
    $cur = Select-String -Path $installedExe -Pattern 'productVersion":\s*"[0-9.]+' -AllMatches |
        ForEach-Object { $_.Matches } | ForEach-Object { $_.Value } | Select-Object -First 1
    "installed app : $cur     （payload 必須比它新）"
}

$w    = Join-Path $AppDir 'wails.json'
$orig = [System.IO.File]::ReadAllText($w)   # ★ 記住原版本，最後還原
[System.IO.File]::WriteAllText($w,
    [regex]::Replace($orig, '("productVersion"\s*:\s*")[^"]*(")', '${1}' + $Version + '${2}'),
    (New-Object System.Text.UTF8Encoding($false)))

try {
    Push-Location $AppDir
    wails build -clean -nsis -installscope user
    Pop-Location

    New-Item -ItemType Directory -Force $PayloadDir | Out-Null
    $installer = Get-ChildItem (Join-Path $AppDir 'build\bin') -Filter '*-installer.exe' |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $payload = Join-Path $PayloadDir "AssembleSetup-$Version.exe"
    Copy-Item $installer.FullName $payload -Force

    $sha  = (Get-FileHash $payload -Algorithm SHA256).Hash.ToLower()
    $size = (Get-Item $payload).Length
    $url  = "$ManifestUrl/AssembleSetup-$Version.exe"

    Push-Location $AppDir
    $sig = (go run ./tools/signmanifest $KeyPath $Version $sha $url | Select-Object -Last 1).Trim()
    Pop-Location

    $manifest = [ordered]@{
        channel = 'stable'; version = $Version; publishedAt = (Get-Date -Format 'yyyy-MM-dd')
        minSupported = $MinSupported; payload = 'nsis'; installerUrl = $url
        sha256 = $sha; sig = $sig; size = $size
        downloadUrl = 'https://assemblenotes.com/download.html'; mandatory = $false
        notes = @("test payload $Version")
    }
    [System.IO.File]::WriteAllText((Join-Path $PayloadDir 'latest.json'),
        ($manifest | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))

    "payload  : $payload"
    "sha256   : $sha"
    "manifest : $PayloadDir\latest.json"
    ""
    "★ 保持安裝版較舊 → 開 app → Check → Update now → Restart & update"
    "★ 更新後 About 應顯示 $Version；log 應出現 'update verified: now running $Version'"
}
finally {
    [System.IO.File]::WriteAllText($w, $orig, (New-Object System.Text.UTF8Encoding($false)))
    "wails.json 已還原（開發 build 不會被測試版本污染）"
}
