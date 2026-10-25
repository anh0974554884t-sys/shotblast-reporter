@echo off
cd /d "%~dp0"
title HE THONG NHAP SAN LUONG SHOTBLAST (SMC3)

:: Don dep tien trinh cu neu co
taskkill /f /im ngrok.exe >nul 2>&1

echo ========================================================================
echo   KHOI DONG HE THONG BAO CAO SHOTBLAST - TABLET XUONG (SMC3)
echo ========================================================================
echo.
echo [1/3] Dang mo giao dien tren may tinh...
start http://localhost:3000
echo.
echo [2/3] Dang khoi dong Server Node.js va Ngrok...
echo.
echo [3/3] Link 4G/5G co dinh: https://autistic-chute-suspend.ngrok-free.dev
echo ========================================================================
echo LUU Y: GIU NGUYEN CUA SO NAY TRONG SUOT CA LAM VIEC!
echo ========================================================================
echo.

node server.js
pause
