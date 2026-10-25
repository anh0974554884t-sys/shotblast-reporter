@echo off
cd /d "%~dp0"
title Tat may chu Shotblast
echo ========================================================================
echo   DANG DUNG MAY CHU SHOTBLAST VA DUONG TRUYEN NGROK...
echo ========================================================================
taskkill /f /im ngrok.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
  taskkill /f /pid %%a >nul 2>&1
)
echo.
echo Da dung he thong thanh cong!
echo Bam phim bat ky de thoat.
pause
