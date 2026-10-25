@echo off
cd /d "%~dp0"
title Push code to GitHub
echo ========================================================================
echo   DANG KET NOI VA DAY CODE LEN GITHUB...
echo ========================================================================
echo.
git push -u origin main
echo.
echo ========================================================================
echo   XONG! Bam phim bat ky de dong cua so nay.
echo ========================================================================
pause
