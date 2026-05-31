@echo off
title GemCoin — Оновлення
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0update.ps1"
