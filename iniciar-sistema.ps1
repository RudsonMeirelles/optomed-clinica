# OPTOTIPO MEIRELLES v2.0 - PowerShell Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          OPTOTIPO MEIRELLES v2.0 - ESTAÇÃO CLÍNICA" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Iniciando Servidor LAN Local (Porta 8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm --workspace=@optotipo/server run dev"

Write-Host "[2/3] Iniciando Sistema A: Optotipo TV Offline (Porta 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm --workspace=@optotipo/offline-tv run dev"

Write-Host "[3/3] Iniciando Sistema B: Optotipo Clinical (Porta 5174)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm --workspace=@optotipo/clinical run dev"

Start-Sleep -Seconds 3

Write-Host "Abrindo interfaces no navegador..." -ForegroundColor Green
Start-Process "http://localhost:5173"
Start-Process "http://localhost:5174"

Write-Host ""
Write-Host "Sistema em execução!" -ForegroundColor Green
Write-Host "TV / Display:   http://localhost:5173" -ForegroundColor White
Write-Host "Clinical / Web: http://localhost:5174" -ForegroundColor White
Write-Host "LAN Relay:      http://localhost:8080" -ForegroundColor White
