@echo off
cd /d "%~dp0"
title Dong bo code tu GitHub
echo ========================================================================
echo   DANG DONG BO / TAI CODE MOI NHAT TU GITHUB VE MAY...
echo ========================================================================
echo.
git pull origin main
echo.
echo [Thong bao] Dang kiem tra va cai dat thu vien neu can...
call npm.cmd install
echo.
echo ========================================================================
echo   DONG BO HOAN TAT! Bam phim bat ky de dong cua so nay.
echo ========================================================================
pause
