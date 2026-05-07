$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

function Copy-IfMissing {
    param([string]$Source, [string]$Destination)
    if (-not (Test-Path $Destination)) {
        Copy-Item $Source $Destination
        Write-Host "Created $Destination"
    }
}

Require-Command go
Require-Command npm

if (Get-Command py -ErrorAction SilentlyContinue) {
    $PythonLauncher = "py"
    $PythonArgs = @("-3")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $PythonLauncher = "python"
    $PythonArgs = @()
} else {
    throw "Missing required command: python or py"
}

New-Item -ItemType Directory -Force -Path "reader_outputs\audio" | Out-Null
New-Item -ItemType Directory -Force -Path "go-backend\reader_outputs" | Out-Null

Copy-IfMissing ".env.example" ".env"
Copy-IfMissing ".env.khmer-tts.local.example" ".env.khmer-tts.local"
Copy-IfMissing "go-backend\.env.example" "go-backend\.env"

if (-not (Test-Path ".venv")) {
    & $PythonLauncher @PythonArgs -m venv .venv
}

& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install -e ".[dev]"

Push-Location "go-backend"
go mod download
go build -o server.exe ./cmd/server
Pop-Location

Push-Location "narration-studio-web"
npm install
if (-not (Test-Path ".env.local")) {
@"
BACKEND_API_URL=http://127.0.0.1:8080
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
"@ | Set-Content ".env.local"
    Write-Host "Created narration-studio-web\.env.local"
}
Pop-Location

Write-Host "Setup complete."
Write-Host "Run: .\scripts\run-local-windows.ps1"
