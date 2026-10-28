@echo off
setlocal EnableExtensions
chcp 65001 >nul
where git >nul 2>nul
if errorlevel 1 (
  echo Chua cai Git for Windows. Cai tai https://git-scm.com/download/win
  pause
  exit /b 1
)
set "REPO=https://github.com/haianh15/HTQL-ngh-mua-s-m-v-ki-m-so-t-ng-n-s-ch-.git"
set "TEMP_DIR=%TEMP%\procure-ui-rbac-v3-%RANDOM%"
echo Dang tai repo GitHub va cap nhat phan quyen V3...
git clone "%REPO%" "%TEMP_DIR%"
if errorlevel 1 (
  echo Khong tai duoc repo. Hay kiem tra dang nhap GitHub/Git.
  pause
  exit /b 1
)
robocopy "%~dp0" "%TEMP_DIR%" /E /XD .git node_modules .test-build dist /XF CAP_NHAT_GITHUB_WINDOWS.bat >nul
if errorlevel 8 (
  echo Sao chep ma nguon that bai.
  pause
  exit /b 1
)
cd /d "%TEMP_DIR%"
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo Khong co thay doi moi.
  pause
  exit /b 0
)
git commit -m "fix: enforce region-scoped role permissions and hide staff dashboards"
if errorlevel 1 (
  echo Khong the commit. Kiem tra git config user.name va user.email.
  pause
  exit /b 1
)
git push origin main
if errorlevel 1 (
  echo Push that bai. Kiem tra quyen ghi va dang nhap GitHub.
  pause
  exit /b 1
)
echo.
echo DA CAP NHAT GITHUB! Vercel se tu build lai neu da ket noi voi main.
pause
