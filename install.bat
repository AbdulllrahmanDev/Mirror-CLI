@echo off
setlocal
echo ==========================================================
echo        Installing Mirror CLI & Antigravity Skill         
echo ==========================================================

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1"

pause
