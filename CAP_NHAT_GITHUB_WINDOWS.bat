@echo off
setlocal
chcp 65001 >nul
set "ROOT=%~dp0"
set "REPO=https://github.com/haianh15/HTQL-ngh-mua-s-m-v-ki-m-so-t-ng-n-s-ch-.git"
set "WORK=%TEMP%\procure_ai_backend_v11_%RANDOM%%RANDOM%"
where git >nul 2>&1 || (echo CHUA CAI GIT FOR WINDOWS & pause & exit /b 1)
git clone "%REPO%" "%WORK%"
if errorlevel 1 (echo Loi clone repo. & pause & exit /b 1)
echo ===== DANG SAO CHEP CAC FILE V11 =====
for %%D in (api server database) do (
  robocopy "%ROOT%%%D" "%WORK%\%%D" /E /R:1 /W:1 /NFL /NDL /NJH /NJS >nul
  if errorlevel 8 (echo Loi sao chep %%D. & pause & exit /b 1)
)
if not exist "%WORK%\src\services" mkdir "%WORK%\src\services"
copy /Y "%ROOT%src\services\aiApi.ts" "%WORK%\src\services\aiApi.ts" >nul
copy /Y "%ROOT%src\context\AppContext.tsx" "%WORK%\src\context\AppContext.tsx" >nul
copy /Y "%ROOT%src\components\auth\LoginForm.tsx" "%WORK%\src\components\auth\LoginForm.tsx" >nul
copy /Y "%ROOT%src\components\layout\AppShell.tsx" "%WORK%\src\components\layout\AppShell.tsx" >nul
copy /Y "%ROOT%src\components\ai\InsightCard.tsx" "%WORK%\src\components\ai\InsightCard.tsx" >nul
copy /Y "%ROOT%src\ai\insights.ts" "%WORK%\src\ai\insights.ts" >nul
for %%V in (CreateEditPRView PRDetailView BudgetManagementView) do copy /Y "%ROOT%src\views\%%V.tsx" "%WORK%\src\views\%%V.tsx" >nul
if not exist "%WORK%\tests" mkdir "%WORK%\tests"
copy /Y "%ROOT%tests\backend.test.mjs" "%WORK%\tests\backend.test.mjs" >nul
copy /Y "%ROOT%package.json" "%WORK%\package.json" >nul
copy /Y "%ROOT%.env.example" "%WORK%\.env.example" >nul
copy /Y "%ROOT%README.md" "%WORK%\README.md" >nul
copy /Y "%ROOT%HUONG_DAN_V11_BACKEND.md" "%WORK%\HUONG_DAN_V11_BACKEND.md" >nul
copy /Y "%ROOT%run_windows.bat" "%WORK%\run_windows.bat" >nul
if errorlevel 1 (echo Loi sao chep. & pause & exit /b 1)
git -C "%WORK%" status --short
echo.
echo Khong day API KEY len GitHub. Chi .env.example KHONG CHUA khoa that.
set /p OK=Kiem tra cac thay doi tren va day len main? (Y/N):
if /I not "%OK%"=="Y" (echo Da huy, file tam tai: %WORK% & pause & exit /b 0)
git -C "%WORK%" add api server database src/services/aiApi.ts src/context/AppContext.tsx src/components/auth/LoginForm.tsx src/components/layout/AppShell.tsx src/components/ai/InsightCard.tsx src/ai/insights.ts src/views/CreateEditPRView.tsx src/views/PRDetailView.tsx src/views/BudgetManagementView.tsx tests/backend.test.mjs package.json .env.example README.md HUONG_DAN_V11_BACKEND.md run_windows.bat
git -C "%WORK%" commit -m "feat: add real Gemini AI API with Supabase role authorization"
if errorlevel 1 (echo Commit that bai. & pause & exit /b 1)
git -C "%WORK%" push origin main
if errorlevel 1 (echo Push that bai - KHONG force push. & pause & exit /b 1)
echo === DA CAP NHAT GITHUB ===
echo Vao Vercel Settings de nhap cac bien SUPABASE va GEMINI.
pause
