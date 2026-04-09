#!/bin/bash

# Pastikan script dijalankan dari direktori yang benar
cd "$(dirname "$0")"

# Cek apakah aplikasi sudah berjalan dengan melihat keberadaan file PID
if [ -f app.pid ]; then
  PID=$(cat app.pid)
  # Cek apakah proses dengan PID tersebut masih aktif
  if ps -p $PID > /dev/null; then
    echo "Aplikasi sudah berjalan dengan PID $PID."
    exit 1
  else
    # Jika proses sudah tidak ada tapi file PID masih ada, hapus file PID
    echo "Membersihkan file app.pid yang tertinggal."
    rm app.pid
  fi
fi

echo "Memulai aplikasi di background..."

# Menjalankan aplikasi dengan nohup agar tetap berjalan meski terminal ditutup
# Output log akan disimpan di app.log
nohup npm start > app.log 2>&1 &

# Menyimpan Process ID (PID) ke dalam file untuk digunakan saat stop
echo $! > app.pid

echo "Aplikasi berhasil dijalankan dengan PID $(cat app.pid)."
echo "Log aplikasi dapat dilihat di file app.log (gunakan perintah: tail -f app.log)"
