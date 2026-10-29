@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Can cai Node.js 22 va thu lai. & pause & exit /b 1)
call npm install
if errorlevel 1 (echo Khong cai duoc npm dependencies. & pause & exit /b 1)
echo ==== SU DUNG VERCEL DEV de chay Vite va backend cung luc ====
echo Cai Vercel CLI neu can: npm install -g vercel
where vercel >nul 2>nul || (echo Chua co Vercel CLI. Chay: npm install -g vercel & pause & exit /b 1)
call vercel dev
pause
