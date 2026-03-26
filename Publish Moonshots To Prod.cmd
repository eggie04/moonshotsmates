@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\publish-moonshots-prod.ps1"
