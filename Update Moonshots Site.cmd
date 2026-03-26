@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\update-moonshots-site.ps1"
