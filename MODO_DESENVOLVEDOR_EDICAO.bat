@echo off
chcp 65001 >nul
title Optomed Clinica - Modo Desenvolvedor / Edicao
color 0E

echo ===============================================================================
echo            OPTOMED CLINICA - MODO DE EDICAO / DESENVOLVIMENTO
echo ===============================================================================
echo.
echo  Neste modo, qualquer alteracao no codigo reflete instantaneamente na tela!
echo.
cd /d "%~dp0"

:: Abre o navegador apos 3 segundos
start "" powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173/'"

npm run dev

pause
