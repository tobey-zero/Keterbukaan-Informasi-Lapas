#!/bin/bash

# Pastikan script dijalankan dari direktori yang benar
cd "$(dirname "$0")"

# Cek apakah file PID ada
if [ -f app.pid ]; then
  PID=$(cat app.pid)
  
  # Cek apakah proses dengan PID tersebut masih aktif
  if ps -p $PID > /dev/null; then
    echo "Menghentikan aplikasi dengan PID $PID..."
    kill $PID
    
    # Tunggu sebentar untuk memastikan proses benar-benar mati
    sleep 2
    
    # Cek lagi, jika masih hidup, paksa mati (SIGKILL)
    if ps -p $PID > /dev/null; then
      echo "Proses masih berjalan, memaksa berhenti..."
      kill -9 $PID
    fi
    
    echo "Aplikasi berhasil dihentikan."
  else
    echo "Aplikasi tidak sedang berjalan. Membersihkan file PID lama."
  fi
  
  # Hapus file PID
  rm app.pid
else
  echo "File app.pid tidak ditemukan. Apakah aplikasi sedang berjalan?"
  
  # Coba mencari proses 'node server.js' secara manual sebagai cadangan
  PID=$(pgrep -f "node server.js")
  if [ -n "$PID" ]; then
    echo "Ditemukan proses 'node server.js' dengan PID $PID."
    echo "Gunakan 'kill $PID' secara manual jika ingin menghentikannya."
  fi
fi
