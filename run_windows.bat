@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Vui long cai Node.js 22 va chay lai. & pause & exit /b 1)
call npm install
if errorlevel 1 (echo Khong cai duoc dependencies. Kiem tra Internet. & pause & exit /b 1)
call npm run dev
pause
