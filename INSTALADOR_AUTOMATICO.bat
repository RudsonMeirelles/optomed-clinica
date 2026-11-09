@echo off
chcp 65001 >nul
title Instalador Autonomo - Optomed Clinica
color 1F

echo ===============================================================================
echo            OPTOMED CLINICA - INSTALADOR AUTONOMO / AUTOMATIZADO
echo ===============================================================================
echo.
echo  Este instalador ira configurar automaticamente o sistema neste computador.
echo  Verificando ambiente...
echo.

cd /d "%~dp0"

:: 1. Verificar se Node.js esta instalado
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo  [OK] Node.js detectado:
    node -v
    echo.
) else (
    echo  [AVISO] Node.js nao foi detectado no sistema!
    echo  Iniciando instalacao automatica do Node.js LTS via winget ou download...
    echo.
    where winget >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo  Instalando Node.js automaticamente com winget...
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    ) else (
        echo  Baixando instalador oficial do Node.js LTS...
        powershell -Command "Start-BitsTransfer -Source 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -Destination '%TEMP%\nodejs_installer.msi'"
        echo  Executando instalador silencioso...
        msiexec /i "%TEMP%\nodejs_installer.msi" /quiet /norestart
    )
    echo.
    echo  Atualizando variaveis de ambiente...
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
)

:: 2. Instalar dependencias do projeto (npm install)
echo ===============================================================================
echo  Passo 1/3: Instalando dependencias do projeto (npm install)...
echo  (Isso pode levar de 1 a 3 minutos na primeira execucao)
echo ===============================================================================
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERRO] Falha ao executar npm install. Tentando com --force...
    call npm install --force
)

:: 3. Compilar os modulos (Build)
echo.
echo ===============================================================================
echo  Passo 2/3: Compilando os modulos do sistema (Build de Producao)...
echo ===============================================================================
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [AVISO] Erro na compilacao geral, executando compilacao especifica do frontend...
    call npm --workspace=@optotipo/clinical run build
    call npm --workspace=@optotipo/server run build
)

:: 4. Criar atalhos na Area de Trabalho
echo.
echo ===============================================================================
echo  Passo 3/3: Criando atalhos na Area de Trabalho...
echo ===============================================================================
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'Optomed Clinica.lnk')); $s.TargetPath = '%~dp0EXECUTAR_SISTEMA.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0packages\clinical\public\favicon.ico'; $s.Save()"

echo.
echo ===============================================================================
echo  [SUCESSO] INSTALACAO CONCLUIDA COM SUCESSO!
echo ===============================================================================
echo.
echo  Foi criado o atalho "Optomed Clinica" na sua Area de Trabalho.
echo.
echo  Pressione qualquer tecla para INICIAR o sistema agora mesmo...
pause >nul

start "" "%~dp0EXECUTAR_SISTEMA.bat"
exit
