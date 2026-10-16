$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host '夜行赛道 · 正在检查本地环境…' -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host '需要 Node.js 22 或更新版本。请安装后重新运行。'; exit 1 }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist\index.html'))) {
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\vite'))) { & npm.cmd ci --include=optional; if ($LASTEXITCODE -ne 0) { exit 1 } }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { exit 1 }
}
$nightPort = $null
foreach ($candidatePort in 5178..5208) {
    try {
        $probe = Invoke-RestMethod -Uri "http://127.0.0.1:$candidatePort/__night-circuit-health" -TimeoutSec 1
        if ($probe.game -eq 'night-circuit' -and $probe.root -eq $PSScriptRoot) { $nightPort = $candidatePort; break }
    } catch {}
}
if ($null -eq $nightPort) {
    $serverScript = Join-Path $PSScriptRoot 'scripts\serve.mjs'
    Start-Process -FilePath (Get-Command node).Source -ArgumentList @('"' + $serverScript + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot '.server.log') -RedirectStandardError (Join-Path $PSScriptRoot '.server-error.log')
    foreach ($attempt in 1..30) {
        Start-Sleep -Milliseconds 300
        if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '.server.json')) {
            try {
                $state = Get-Content -LiteralPath (Join-Path $PSScriptRoot '.server.json') -Raw | ConvertFrom-Json
                $probe = Invoke-RestMethod -Uri "http://127.0.0.1:$($state.port)/__night-circuit-health" -TimeoutSec 1
                if ($probe.root -eq $PSScriptRoot) { $nightPort = $state.port; break }
            } catch {}
        }
    }
}
if ($null -eq $nightPort) { Write-Host '启动失败，请查看 .server-error.log。'; exit 1 }
$localUrl = "http://localhost:$nightPort"
Write-Host "电脑访问：$localUrl" -ForegroundColor Green
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { Write-Host "手机同网访问：http://$($_.IPAddress):$nightPort" }
Write-Host '已验证游戏服务。关闭此窗口不影响游戏；未停止其他项目服务。'
Start-Process $localUrl
