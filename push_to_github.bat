@echo off
cd /d "%~dp0"
title Push code to GitHub
echo ========================================================================
echo   DANG KET NOI VA DAY CODE LEN GITHUB...
echo ========================================================================
echo.
git add .
git commit -m "Cap nhat du lieu va tinh nang he thong"
echo.
echo [1/2] Dang dong bo voi GitHub (pull)...
git pull origin main --rebase
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Khong the pull. Dang force push...
    git push origin main --force
    goto done
)
echo.
echo [2/2] Dang day code len GitHub (push)...
git push -u origin main
:done
echo.
echo ========================================================================
echo   XONG! Bam phim bat ky de dong cua so nay.
echo ========================================================================
pause
