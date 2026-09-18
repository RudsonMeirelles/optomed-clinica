@echo off
chcp 65001 > nul
title OPTOMED CLINICA v2.1

echo.
echo ============================================================
echo    OPTOMED CLINICA v2.1 - Instituto da Visao e Saude
echo ============================================================
echo.

where pm2 > nul 2>&1
if %errorlevel% neq 0 (
  echo [AVISO] PM2 nao encontrado. Instalando...
  call npm install -g pm2
)

echo [1/3] Compilando sistema (aguarde)...
call npm run build
if %errorlevel% neq 0 (
  echo [ERRO] Falha no build. Verifique os erros.
  pause
  exit /b 1
)
echo [OK] Build concluido!

echo.
echo [2/3] Iniciando servidor Express + Tunel Cloudflare via PM2...
call pm2 delete all 2>nul
call pm2 start ecosystem.config.js
call pm2 save

echo.
echo [3/3] Abrindo navegador...
timeout /t 5 > nul
start https://app.optomed.app.br/clinical

echo.
echo ============================================================
echo  Sistema ONLINE e operacional!
echo  Online:  https://app.optomed.app.br/clinical
echo  Local:   http://192.168.1.144:8765/clinical
echo  TV:      https://tv.optomed.app.br/tv
echo  Status:  pm2 status
echo  Logs:    pm2 logs optomed-server
echo  Parar:   pm2 stop all
echo ============================================================
echo.
pause
