@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CAP_NHAT_GITHUB_GIAO_DIEN.ps1"
pause
