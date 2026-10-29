@echo off
setlocal
chcp 65001 >nul
set "ROOT=%~dp0"
set "REPO=https://github.com/haianh15/HTQL-ngh-mua-s-m-v-ki-m-so-t-ng-n-s-ch-.git"
set "WORK=%TEMP%\procure_ui_v12_%RANDOM%%RANDOM%"
where git >nul 2>&1 || (echo Ban can cai Git for Windows truoc. & pause & exit /b 1)

echo Dang lay ban main moi nhat tu GitHub...
git clone --single-branch --branch main "%REPO%" "%WORK%"
if errorlevel 1 (echo Khong clone duoc repo. Kiem tra Internet/quyen truy cap. & pause & exit /b 1)

for %%D in (api server src tests) do (
  robocopy "%ROOT%%%D" "%WORK%\%%D" /E /R:1 /W:1 /NFL /NDL /NJH /NJS >nul
  if errorlevel 8 (echo Loi sao chep thu muc %%D. & pause & exit /b 1)
)
copy /Y "%ROOT%HUONG_DAN_V12.md" "%WORK%\HUONG_DAN_V12.md" >nul

cd /d "%WORK%"
git add api/auth/login.js server/lib/supabase.js src/App.tsx src/types/index.ts src/domain/rules.ts src/context/AppContext.tsx src/services/aiApi.ts src/components/auth/LoginForm.tsx src/views/ApprovalQueueView.tsx src/views/PurchaseRequestsView.tsx src/views/DashboardView.tsx tests/backend.test.mjs tests/finance.test.cjs tests/auth-login.test.mjs HUONG_DAN_V12.md
if errorlevel 1 (echo Khong the git add. & pause & exit /b 1)
echo.
echo === DANH SACH FILE THAY DOI ===
git diff --cached --stat
echo.
echo KHONG dua API key hay file .env len GitHub.
set /p CONFIRM=Ban co muon day ban sua V12 len GitHub main? (Y/N):
if /I not "%CONFIRM%"=="Y" (echo Da huy. Thu muc chua code: %WORK% & pause & exit /b 0)
git commit -m "fix: speed up auth and limit approvals to assigned reviewer"
if errorlevel 1 (echo Commit khong thanh cong. Ban co the kiem tra tai: %WORK% & pause & exit /b 1)
git push origin main
if errorlevel 1 (echo Khong push duoc. Kiem tra dang nhap GitHub, branch protection. Khong force push. & pause & exit /b 1)
echo.
echo === DA DAY LEN GITHUB ===
echo Vercel se tu dong deploy neu GitHub repo da duoc ket noi.
pause
