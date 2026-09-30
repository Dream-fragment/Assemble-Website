param([string]$Exe)
if (-not $Exe) { $Exe = "$env:LOCALAPPDATA\Programs\Assemble\Assemble.exe" }

if (-not (Test-Path $Exe)) { "❌ not found: $Exe"; exit 1 }

$old = Select-String -Path $Exe -Pattern 'cannot move running binary' -SimpleMatch -Quiet   # 舊危險流程
$new = Select-String -Path $Exe -Pattern 'assemble-install-update.cmd' -SimpleMatch -Quiet  # 新安全流程
$pl  = Select-String -Path $Exe -Pattern 'unsupported payload' -SimpleMatch -Quiet          # payload 契約
$ns  = Select-String -Path $Exe -Pattern 'Nullsoft' -SimpleMatch -Quiet                     # 不該是 installer

"path : $Exe"
"size : $([math]::Round((Get-Item $Exe).Length/1MB,2)) MB"
"old_replace（should be False）      : $old"
"new_installer（should be True）     : $new"
"payload_contract（should be True）  : $pl"
"is_installer（should be False）     : $ns"

if ($old -or -not $new -or -not $pl -or $ns) { "NOT SAFE"; exit 1 }
"Safe"
