@echo off
chcp 65001 > nul
cd /d "%~dp0"
title Hệ Thống Nhập Sản Lượng Shotblast (SMC3)

echo ========================================================================
echo   KHỞI ĐỘNG HỆ THỐNG BÁO CÁO SHOTBLAST - TABLET XƯỞNG (SMC3)
echo ========================================================================
echo.

echo Đang mở trình duyệt máy tính...
start http://localhost:3000
echo.

echo Đang khởi động Server và Đường truyền 4G/5G cố định...
echo (Lưu ý: Giữ nguyên cửa sổ này trong suốt ca làm việc)
echo.

node server.js
pause

