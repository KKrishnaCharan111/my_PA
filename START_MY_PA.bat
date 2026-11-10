@echo off
title My PA - Personal Assistant Server
cd /d "%~dp0"
echo ========================================================
echo       Starting My PA (Personal Assistant) Web App
echo ========================================================
echo.
echo Opening browser at http://localhost:3000 ...
start http://localhost:3000
echo.
node server.js
pause
