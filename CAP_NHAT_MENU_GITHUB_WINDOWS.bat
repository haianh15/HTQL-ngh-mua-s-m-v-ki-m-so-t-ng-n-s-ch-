@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "REPO=https://github.com/haianh15/HTQL-ngh-mua-s-m-v-ki-m-so-t-ng-n-s-ch-.git"
set "WORK=%TEMP%\procure_ui_sidebar_%RANDOM%_%RANDOM%"
echo === PROCURE UI - CAP NHAT SIDEBAR ===
git --version >nul 2>&1
if errorlevel 1 (
  echo Chua tim thay Git. Hay cai Git for Windows hoac xem HUONG_DAN_MENU.txt
  pause
  exit /b 1
)
echo Dang lay ma nguon main moi nhat...
git clone --depth 1 --branch main "%REPO%" "%WORK%"
if errorlevel 1 (
  echo Khong tai duoc repository. Kiem tra quyen truy cap GitHub.
  pause
  exit /b 1
)
for %%F in (
  "src\navigation\sidebar.ts"
  "src\components\layout\AppShell.tsx"
  "src\views\DashboardView.tsx"
  "src\views\ApprovalQueueView.tsx"
  "src\views\ProcurementExecutionView.tsx"
  "src\views\AccountingReconciliationView.tsx"
  "tests\sidebar.test.cjs"
) do (
  if not exist "%~dp0%%~F" (
    echo Thieu file: %%~F
    pause
    exit /b 1
  )
  for %%D in ("%WORK%\%%~F") do if not exist "%%~dpD" mkdir "%%~dpD"
  copy /Y "%~dp0%%~F" "%WORK%\%%~F" >nul
)
cd /d "%WORK%"
git add -- src/navigation/sidebar.ts src/components/layout/AppShell.tsx src/views/DashboardView.tsx src/views/ApprovalQueueView.tsx src/views/ProcurementExecutionView.tsx src/views/AccountingReconciliationView.tsx tests/sidebar.test.cjs
git diff --cached --check
if errorlevel 1 (
  echo Diff co van de, khong day len GitHub.
  pause
  exit /b 1
)
echo.
echo === CAC FILE THAY DOI ===
git diff --cached --stat
git diff --cached --quiet
if not errorlevel 1 (
  echo Khong co thay doi can cap nhat.
  pause
  exit /b 0
)
echo.
set /p "ANSWER=Da xem danh sach file. Xac nhan cap nhat GitHub main? (Y/N): "
if /I not "%ANSWER%"=="Y" (
  echo Da huy; khong thay doi GitHub.
  pause
  exit /b 0
)
git commit -m "Simplify sidebar and link secondary screens from workflows"
if errorlevel 1 (
  echo Khong commit duoc. Kiem tra git config user.name/user.email.
  pause
  exit /b 1
)
git push origin main
if errorlevel 1 (
  echo Khong push duoc. Kiem tra quyen GitHub; khong force push.
  pause
  exit /b 1
)
echo Da day thanh cong. Cho Vercel deployment Ready.
pause
