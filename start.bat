@echo off
title GemCoin — Нумізматичний каталог
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════╗
echo  ║   ATR NumiScan AI  —  GemCoin    ║
echo  ╚══════════════════════════════════╝
echo.
echo  Запуск сервера на http://localhost:3001
echo  Закрийте це вікно щоб зупинити програму.
echo.

:: Відкриваємо браузер через 3 секунди
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3001"

:: Запускаємо сервер
npm run dev

echo.
echo  Сервер зупинено.
pause
