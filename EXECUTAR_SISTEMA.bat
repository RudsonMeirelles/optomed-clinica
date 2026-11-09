@echo off
chcp 65001 >nul
title Optomed Clinica - Servidor Local
color 0A

echo ===============================================================================
echo                     INICIANDO OPTOMED CLINICA
echo ===============================================================================
echo.
cd /d "%~dp0"

:: Abre a tela do navegador automaticamente apos 3 segundos
start "" powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:8765/clinical/'"

echo  Iniciando Servidor Web e Banco Local na porta 8765...
echo.
echo  Pressione CTRL+C nesta janela se desejar encerrar o sistema.
echo ===============================================================================
echo.

npm --workspace=@optotipo/server run start
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [AVISO] Servidor compilado nao encontrado, iniciando em modo direto (tsx)...
    npx tsx packages/server/src/index.ts
)

pause
