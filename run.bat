@echo off

:: --- Konfigurasi ---
::set "REPO_PATH=D:\wartelv4\server"
set "REPO_PATH=%~dp0"

:: Pindah ke direktori server
cd /d "%REPO_PATH%"
if %errorlevel% neq 0 (
    echo Error: Tidak dapat pindah ke direktori %REPO_PATH%. Pastikan path benar.
    pause
	goto :eof
)

npm update && npm run dev