@echo off
chcp 65001 > nul
title OPTOTIPO MEIRELLES v2.0 - Launcher

echo ============================================================
echo           OPTOTIPO MEIRELLES v2.0 - ESTAÇÃO CLÍNICA
echo ============================================================
echo.
echo [1/3] Iniciando Servidor LAN Local (Porta 8080)...
start "Optotipo LAN Server" cmd /c "npm --workspace=@optotipo/server run dev"

echo [2/3] Iniciando Sistema A: Optotipo TV Offline (Porta 5173)...
start "Optotipo TV Station" cmd /c "npm --workspace=@optotipo/offline-tv run dev"

echo [3/3] Iniciando Sistema B: Optotipo Clinical (Porta 5174)...
start "Optotipo Clinical Platform" cmd /c "npm --workspace=@optotipo/clinical run dev"

echo.
echo Aguardando inicialização dos servidores locais...
timeout /t 3 > nul

echo.
echo Abrindo navegadores...
start http://localhost:5173
start http://localhost:5174

echo.
echo ============================================================
echo Sistema em execução!
echo TV / Display:   http://localhost:5173
echo Clinical / Web: http://localhost:5174
echo LAN Relay:      http://localhost:8080
echo ============================================================
echo.
pause
