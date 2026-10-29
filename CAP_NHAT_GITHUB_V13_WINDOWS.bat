@echo off
setlocal
chcp 65001 >nul
set "ROOT=%~dp0"
set "REPO=https://github.com/haianh15/HTQL-ngh-mua-s-m-v-ki-m-so-t-ng-n-s-ch-.git"
set "BRANCH=feature/procure-v13-real"
set "WORK=%TEMP%\procure_v13_%RANDOM%%RANDOM%"
where git >nul 2>&1 || (echo Can cai Git for Windows. & pause & exit /b 1)
echo === CHI TAO FEATURE BRANCH. KHONG CHAM VAO MAIN ===
git clone --single-branch --branch main "%REPO%" "%WORK%"
if errorlevel 1 (echo Loi clone repo. & pause & exit /b 1)
cd /d "%WORK%"
git switch -c %BRANCH%
if errorlevel 1 (echo Khong tao duoc nhanh moi. & pause & exit /b 1)
for %%D in (api server src tests database) do (
  robocopy "%ROOT%%%D" "%WORK%\%%D" /E /R:1 /W:1 /NFL /NDL /NJH /NJS >nul
  if errorlevel 8 (echo Loi sao chep %%D. & pause & exit /b 1)
)
copy /Y "%ROOT%HUONG_DAN_V13_HE_THONG_THAT.md" "%WORK%HUONG_DAN_V13_HE_THONG_THAT.md" >nul
copy /Y "%ROOT%package.json" "%WORK%package.json" >nul
rem Add only intended source paths, never .env or sensitive local files.
git add api server src tests database HUONG_DAN_V13_HE_THONG_THAT.md package.json
git diff --cached --stat
echo.
echo LUU Y: SQL chua chay tren Supabase. CHI TAO NHANH STAGING.
set /p CONFIRM=Day feature branch %BRANCH% len GitHub? (Y/N):
if /I not "%CONFIRM%"=="Y" (echo Da huy. Ma nguon tai %WORK% & pause & exit /b 0)
git commit -m "feat: V13 staging server-authoritative procurement and budget transactions"
if errorlevel 1 (echo Commit that bai. Ma nguon tai %WORK% & pause & exit /b 1)
git push -u origin %BRANCH%
if errorlevel 1 (echo Push that bai. Kiem tra GitHub permission. & pause & exit /b 1)
echo Da push nhanh %BRANCH%. KHONG merge main khi chua test Supabase staging.
pause
