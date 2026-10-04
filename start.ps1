$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Test-Api {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Headers['Content-Type'] -match 'application/json'
    } catch { return $false }
}

function Wait-Api {
    param([string]$Url, [string]$Name)
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if (Test-Api $Url) { return }
        Start-Sleep -Milliseconds 500
    }
    throw "$Name belum siap. Periksa log di folder logs."
}

try {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $logDirectory = Join-Path $PSScriptRoot 'logs'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    if (-not (Test-Api 'http://localhost:3001/api/health')) {
        Write-Host 'Menjalankan backend SIPANDA...'
        Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory (Join-Path $PSScriptRoot 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'backend.log') -RedirectStandardError (Join-Path $logDirectory 'backend-error.log') | Out-Null
    }
    Wait-Api 'http://localhost:3001/api/health' 'Backend'
    if (-not (Test-Api 'http://localhost:5173/api/health')) {
        Write-Host 'Menjalankan frontend SIPANDA...'
        Start-Process -FilePath $node -ArgumentList 'node_modules/vite/bin/vite.js --host localhost --port 5173 --strictPort' -WorkingDirectory (Join-Path $PSScriptRoot 'frontend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'frontend.log') -RedirectStandardError (Join-Path $logDirectory 'frontend-error.log') | Out-Null
    }
    Wait-Api 'http://localhost:5173/api/health' 'Koneksi frontend ke backend'
    Write-Host 'SIPANDA siap: http://localhost:5173'
    try {
        Start-Process 'http://localhost:5173'
    } catch {
        Write-Host 'Buka browser secara manual ke http://localhost:5173'
    }
} catch {
    Write-Host "Gagal menjalankan SIPANDA: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
