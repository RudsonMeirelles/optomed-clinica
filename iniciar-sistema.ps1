# OPTOMED CLINICA v2.1 - PowerShell Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   OPTOMED CLINICA v2.1 - Instituto da Visao e Saude" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar PM2
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "[AVISO] PM2 nao encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g pm2
}

Write-Host "[1/3] Compilando sistema (aguarde)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha no build!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "[OK] Build concluido!" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] Iniciando via PM2..." -ForegroundColor Yellow
pm2 delete all 2>$null
pm2 start ecosystem.config.js
pm2 save

Write-Host ""
Write-Host "[3/3] Abrindo navegador em 5s..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Start-Process "https://app.optomed.app.br/clinical"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Sistema ONLINE e operacional!" -ForegroundColor Green
Write-Host " Online:  https://app.optomed.app.br/clinical" -ForegroundColor White
Write-Host " Local:   http://192.168.1.144:8765/clinical" -ForegroundColor White
Write-Host " TV:      https://tv.optomed.app.br/tv" -ForegroundColor White
Write-Host " Status:  pm2 status" -ForegroundColor Cyan
Write-Host " Logs:    pm2 logs optomed-server" -ForegroundColor Cyan
Write-Host " Parar:   pm2 stop all" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Pressione Enter para fechar"
