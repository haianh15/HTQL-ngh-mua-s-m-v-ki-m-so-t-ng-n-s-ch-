@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
echo =============================================
echo Procure UI V7 - Cap nhat quyen 8 tac nhan
 echo =============================================
where git >nul 2>&1
if errorlevel 1 (
 echo Loi: chua cai Git for Windows. https://git-scm.com/download/win
 pause
 exit /b 1
)
set "ROOT=%~dp0"
set "REPO=https://github.com/haianh15/HTQL-ngh-mua-s-m-v-ki-m-so-t-ng-n-s-ch-.git"
set "WORK=%TEMP%\procure_rbac_v7_%RANDOM%%RANDOM%"
git clone "%REPO%" "%WORK%"
if errorlevel 1 (
 echo Khong clone duoc repo. Kiem tra dang nhap GitHub va mang.
 pause
 exit /b 1
)
robocopy "%ROOT%src" "%WORK%\src" /E /R:1 /W:1 /NFL /NDL /NJH /NJS >nul
if errorlevel 8 (
 echo Loi sao chep ma nguon.
 pause
 exit /b 1
)
if not exist "%WORK%\tests" mkdir "%WORK%\tests"
copy /Y "%ROOT%tests\finance.test.cjs" "%WORK%\tests\finance.test.cjs" >nul
copy /Y "%ROOT%PHAN_QUYEN_8_TAC_NHAN_V7.md" "%WORK%\PHAN_QUYEN_8_TAC_NHAN_V7.md" >nul
git -C "%WORK%" add src tests/finance.test.cjs PHAN_QUYEN_8_TAC_NHAN_V7.md
git -C "%WORK%" status --short
 echo.
set /p ANSWER=Ban co muon commit va day len main? (Y/N):
if /I not "%ANSWER%"=="Y" (
 echo Da huy. Du lieu tam: %WORK%
 pause
 exit /b 0
)
git -C "%WORK%" commit -m "fix: enforce role-based access for all eight Procure UI actors"
if errorlevel 1 (
 echo Khong commit duoc. Kiem tra git config user.name va user.email.
 pause
 exit /b 1
)
git -C "%WORK%" push origin main
if errorlevel 1 (
 echo GitHub tu choi push hoac branch da thay doi. Khong force push.
 pause
 exit /b 1
)
echo Cap nhat GitHub thanh cong. Kiem tra deployment Vercel.
pause
