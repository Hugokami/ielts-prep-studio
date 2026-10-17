@echo off
title IELTS Prep Studio - Telegram Approval Bot
echo ========================================================
echo   Starting IELTS Prep Studio 1-Tap Approval Bot...
echo ========================================================
cd /d "%~dp0\telegram-bot"
node bot.js
pause
