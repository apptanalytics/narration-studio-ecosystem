$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$TtsPort = if ($env:NSTUDIO_TTS_PORT) { $env:NSTUDIO_TTS_PORT } else { "8810" }
$BackendPort = if ($env:NSTUDIO_BACKEND_PORT) { $env:NSTUDIO_BACKEND_PORT } else { "8080" }
$FrontendPort = if ($env:NSTUDIO_FRONTEND_PORT) { $env:NSTUDIO_FRONTEND_PORT } else { "3000" }
$Gpus = if ($env:NSTUDIO_GPUS) { $env:NSTUDIO_GPUS } else { "cpu" }
$LogDir = if ($env:NSTUDIO_LOG_DIR) { $env:NSTUDIO_LOG_DIR } else { Join-Path $Root "reader_outputs\narration-studio" }

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path "reader_outputs" | Out-Null
New-Item -ItemType Directory -Force -Path "go-backend\reader_outputs" | Out-Null

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    throw "Python virtual environment is missing. Run .\scripts\setup-windows.ps1 first."
}

if (-not (Test-Path ".\go-backend\server.exe")) {
    throw "Go backend binary is missing. Run .\scripts\setup-windows.ps1 first."
}

$TtsOut = Join-Path $LogDir "tts-8810.out.log"
$TtsErr = Join-Path $LogDir "tts-8810.err.log"
$BackendOut = Join-Path $LogDir "backend-8080.out.log"
$BackendErr = Join-Path $LogDir "backend-8080.err.log"
$FrontendOut = Join-Path $LogDir "frontend-3000.out.log"
$FrontendErr = Join-Path $LogDir "frontend-3000.err.log"

Start-Process -FilePath "$Root\.venv\Scripts\python.exe" `
    -ArgumentList @("reader_app.py", "--host", "127.0.0.1", "--port", $TtsPort, "--gpus", $Gpus) `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $TtsOut `
    -RedirectStandardError $TtsErr

$env:PORT = $BackendPort
$env:FASTAPI_TTS_URL = "http://127.0.0.1:$TtsPort"
Start-Process -FilePath "$Root\go-backend\server.exe" `
    -WorkingDirectory "$Root\go-backend" `
    -RedirectStandardOutput $BackendOut `
    -RedirectStandardError $BackendErr

$env:PORT = $FrontendPort
$env:BACKEND_API_URL = "http://127.0.0.1:$BackendPort"
$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:$BackendPort"
Start-Process -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory "$Root\narration-studio-web" `
    -RedirectStandardOutput $FrontendOut `
    -RedirectStandardError $FrontendErr

Write-Host "Python TTS service: http://127.0.0.1:$TtsPort"
Write-Host "Go backend:         http://127.0.0.1:$BackendPort"
Write-Host "Frontend:           http://127.0.0.1:$FrontendPort"
Write-Host "Logs:               $LogDir"
