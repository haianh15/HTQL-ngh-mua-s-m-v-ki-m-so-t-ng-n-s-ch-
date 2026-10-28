@echo off
chcp 65001 > nul
cd /d "%~dp0"
where git >nul 2>&1
if errorlevel 1 (
  echo Chua cai Git. Cai Git for Windows tai https://git-scm.com/download/win
  pause
  exit /b 1
)
if not exist .git git init
 git branch -M main
 git add .
 git commit -m "Upload Procure UI V2 - fixed workflows and budget rules"
 git remote remove origin >nul 2>&1
 git remote add origin https://github.com/haianh15/HTQL-ngh-mua-s-m-v-ki-m-so-t-ng-n-s-ch-.git
 git push -u origin main
if errorlevel 1 (
  echo Push that bai. Hay dang nhap GitHub khi duoc yeu cau va thu lai.
) else (
  echo Da day ma nguon len GitHub thanh cong.
)
pause
