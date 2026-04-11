@echo off
setlocal

:: --- Konfigurasi ---
:: Ganti dengan path ke folder repositori Git lokal Anda
:: set "REPO_PATH=D:\dibina"
set "REPO_PATH=%~dp0"
:: Ganti dengan nama branch utama Anda (misal: main, master, development)
set "MAIN_BRANCH=main"
:: Interval pemeriksaan dalam detik (misal: 300 detik = 5 menit)
set "CHECK_INTERVAL_SECONDS=300" 

:: --- Jangan ubah di bawah garis ini kecuali Anda tahu apa yang Anda lakukan ---

echo Memulai pemantauan repositori: %REPO_PATH%
echo Branch utama yang dipantau: %MAIN_BRANCH%
echo Interval pemeriksaan: %CHECK_INTERVAL_SECONDS% detik

:loop
echo.
echo [%date% %time%] Memeriksa pembaruan di %REPO_PATH%...

:: Pindah ke direktori repositori
cd /d "%REPO_PATH%"
if %errorlevel% neq 0 (
    echo Error: Tidak dapat pindah ke direktori %REPO_PATH%. Pastikan path benar.
    pause
    goto :eof
)

:: Fetch pembaruan dari remote tanpa menggabungkan
git fetch origin %MAIN_BRANCH%

:: Periksa apakah ada perbedaan antara branch lokal dan remote
:: Ini akan membandingkan HEAD lokal dengan origin/MAIN_BRANCH
for /f "delims=" %%i in ('git rev-parse HEAD') do set "LOCAL_COMMIT=%%i"
for /f "delims=" %%j in ('git rev-parse origin/%MAIN_BRANCH%') do set "REMOTE_COMMIT=%%j"

if "%LOCAL_COMMIT%" neq "%REMOTE_COMMIT%" (
    echo Ditemukan pembaruan! Melakukan git pull...
    git pull origin %MAIN_BRANCH%
    if %errorlevel% neq 0 (
        echo Error saat melakukan git pull. Periksa koneksi atau konflik.
    ) else (
        echo Git pull berhasil.
    )
) else (
    echo Tidak ada pembaruan.
)

echo Menunggu %CHECK_INTERVAL_SECONDS% detik sebelum pemeriksaan berikutnya...
timeout /t %CHECK_INTERVAL_SECONDS% /nobreak >nul

goto :loop

endlocal