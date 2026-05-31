@echo off
title GemCoin — Встановлення
cd /d "%~dp0"

echo.
echo  Запуск скрипту встановлення GemCoin...
echo.

powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0setup.ps1"

if %errorlevel% neq 0 (
    echo.
    echo  Помилка під час встановлення. Зверніться за підтримкою.
    pause
)
