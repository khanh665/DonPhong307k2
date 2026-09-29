@echo off
chcp 65001 >nul
title HỆ THỐNG QUẢN LÝ LỊCH VỆ SINH PHÒNG TRỌ (8 NGƯỜI)
echo ========================================================================
echo   🎉 ĐANG KHỞI ĐỘNG HỆ THỐNG QUẢN LÝ LỊCH VỆ SINH PHÒNG TRỌ...
echo ========================================================================
echo.

start "" "http://localhost:3000"
node server.js

pause
