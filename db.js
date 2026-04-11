// Menggunakan node:sqlite bawaan Node.js v22.5+ (tidak perlu install apapun)
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new DatabaseSync(DB_PATH);

// Aktifkan WAL mode untuk performa lebih baik
db.exec('PRAGMA journal_mode = WAL');

// ─── Buat Tabel ───────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS statistik (
    id INTEGER PRIMARY KEY,
    total_penghuni INTEGER NOT NULL DEFAULT 0,
    kapasitas INTEGER NOT NULL DEFAULT 0,
    bebas_hari_ini INTEGER NOT NULL DEFAULT 0,
    tanggal TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS besaran_remisi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jenis TEXT NOT NULL,
    nama TEXT NOT NULL,
    besaran TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS menu_makan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    waktu TEXT NOT NULL,
    menu TEXT NOT NULL,
    photo_path TEXT
  );

  CREATE TABLE IF NOT EXISTS pentahapan_pembinaan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_wbp TEXT NOT NULL,
    status_integrasi TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pentahapan_pembinaan_detail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_reg TEXT NOT NULL,
    nama_wbp TEXT NOT NULL,
    tanggal1 TEXT,
    tanggal2 TEXT,
    tanggal3 TEXT,
    tanggal4 TEXT,
    total_remisi TEXT,
    keterangan TEXT
  );

  CREATE TABLE IF NOT EXISTS jadwal_kegiatan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kegiatan TEXT NOT NULL,
    selasa TEXT,
    rabu TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS clinic_tenaga_medis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    profesi TEXT NOT NULL,
    status_tugas TEXT NOT NULL,
    kontak TEXT
  );

  CREATE TABLE IF NOT EXISTS clinic_wbp_berobat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_reg TEXT NOT NULL,
    nama_wbp TEXT NOT NULL,
    layanan TEXT NOT NULL,
    diagnosa TEXT NOT NULL,
    blok TEXT NOT NULL,
    status_perawatan TEXT NOT NULL,
    tanggal TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clinic_jadwal_on_call (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hari TEXT NOT NULL,
    shift TEXT NOT NULL,
    petugas TEXT NOT NULL,
    profesi TEXT NOT NULL,
    kontak TEXT
  );

  CREATE TABLE IF NOT EXISTS clinic_jadwal_kontrol (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hari TEXT NOT NULL,
    waktu TEXT NOT NULL,
    lokasi_blok TEXT NOT NULL,
    petugas TEXT NOT NULL,
    keterangan TEXT
  );

  CREATE TABLE IF NOT EXISTS clinic_statistik (
    id INTEGER PRIMARY KEY,
    blok_lansia INTEGER NOT NULL DEFAULT 0,
    tb INTEGER NOT NULL DEFAULT 0,
    paru INTEGER NOT NULL DEFAULT 0,
    hiv INTEGER NOT NULL DEFAULT 0,
    lainnya INTEGER NOT NULL DEFAULT 0,
    rawat_inap INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS dokumentasi_video (
    id INTEGER PRIMARY KEY,
    video_path TEXT
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
`);

const menuColumns = db.prepare("PRAGMA table_info('menu_makan')").all();
const hasMenuPhotoPath = menuColumns.some(col => col.name === 'photo_path');
if (!hasMenuPhotoPath) {
  db.exec('ALTER TABLE menu_makan ADD COLUMN photo_path TEXT');
}

// ─── Seed Data (hanya jika tabel masih kosong) ────────────────────────────────

const seedIfEmpty = (table, insertFn) => {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
  if (row.count === 0) insertFn();
};

seedIfEmpty('statistik', () => {
  db.prepare(`
    INSERT INTO statistik (id, total_penghuni, kapasitas, bebas_hari_ini, tanggal)
    VALUES (1, 3022, 1084, 6, 'Kamis, 14 September 2023')
  `).run();
});

seedIfEmpty('besaran_remisi', () => {
  const insert = db.prepare(
    'INSERT INTO besaran_remisi (jenis, nama, besaran) VALUES (?, ?, ?)'
  );
  const rows = [
    ['REMISI UMUM', 'MUHAMAD RIDWAN IX TIFANI', '4 BULAN'],
    ['REMISI UMUM', 'SYEKWAN BIN SAYUTI', '3 BULAN'],
    ['REMISI UMUM', 'ALFANTSYAR ANDI SAPUTRA ALS', '4 BULAN'],
    ['REMISI UMUM', 'ACHMAD SUTENO SAPUTRA', '4 BULAN'],
    ['REMISI UMUM', 'GHIFARI SYAHRU RAMADHAN ALS', '3 BULAN'],
    ['REMISI UMUM', 'GALUH ANDREAN ALS GALUH', '3 BULAN'],
    ['REMISI UMUM', 'TRI JOHAN WAHYUDI ALS JOHAN', '3 BULAN'],
    ['REMISI UMUM', 'ERWANTO BIN PARDIN', '4 BULAN'],
    ['REMISI UMUM', 'AZIS FERDIYANTO BIN SUPARJAN', '4 BULAN'],
    ['REMISI UMUM', 'WAHYUDI HARTONO BIN DJOKO', '4 BULAN'],
    ['REMISI UMUM', 'DEDE CAHYA BIN AGUS', '4 BULAN'],
    ['REMISI UMUM', 'IRAWAN JAYA BIN ZAINAL ABIDIN', '4 BULAN'],
    ['REMISI UMUM', 'ASRUL SANI ALS ANDEK ALS', '4 BULAN'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('menu_makan', () => {
  const insert = db.prepare('INSERT INTO menu_makan (waktu, menu) VALUES (?, ?)');
  const rows = [
    ['MAKAN PAGI',  'Nasi Putih, Telur rebus, Tumis wortel + kacang panjang'],
    ['SNACK',       'Bubur Kc hijau'],
    ['MAKAN SIANG', 'Nasi putih, Ayam kecap, Tahu goreng Tumis sawi + wortel, Sambal, Pisang'],
    ['SNACK',       'Ubi rebus'],
    ['MAKAN SORE',  'Nasi putih, Ikan goreng, Kacang tanah giling Pecel sayuran, Sambal'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('pentahapan_pembinaan', () => {
  const insert = db.prepare(
    'INSERT INTO pentahapan_pembinaan (nama_wbp, status_integrasi) VALUES (?, ?)'
  );
  const rows = [
    ['DIMAS ARGADITYA BIN AGUS PURWANTO', 'Menunggu SK'],
    ['MOH RIDWAN ARIFIN ALS BAKOT BIN HIDAYATILLAH (ALM)', 'Menunggu SK'],
    ['ENDA PERMANA ALIM BIN SARMAN', 'Sudah dijatuhi Permintaan'],
    ['AHMAD FADLI ANSYHAR', 'Sudah dijatuhi Permintaan'],
    ['AREP SUHENDI BIN SUHAIRI', 'Sudah ada hasil SK'],
    ['KETUT HERU DARMAYANA ALIAS BAGOL BIN I WAYAN', 'Menunggu SK'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('pentahapan_pembinaan_detail', () => {
  const insert = db.prepare(`
    INSERT INTO pentahapan_pembinaan_detail
      (no_reg, nama_wbp, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['BI.15-PK/PD/2023',  'NUR SLAMET ALS IGOR BIN SRIYANTO (ALM)', '19 Feb 2020', '15 Oct 2020', '17 Oct 2020', '28 Dec 2023', '3 Bulan, 9 Hari',  'HADIR'],
    ['BI.1296-D/2020',    'IFANDI RIZKI FATMA BIN ILYAS',           '25 Dec 2022', '22 Jun 2026', '28 Dec 2028', '28 Dec 2023', '12 Bulan, 9 Hari', 'HADIR'],
    ['BI.084-O/2022',     'ARFAN HERMAWAN BIN A.B.A KARIES AHMAD',  '08 Dec 2022', '15 Oct 2025', '10 Aug 2024', '15 Apr 2026', '6 Bulan, 0 Hari',  'HADIR'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('jadwal_kegiatan', () => {
  const insert = db.prepare(
    'INSERT INTO jadwal_kegiatan (kegiatan, selasa, rabu) VALUES (?, ?, ?)'
  );
  const rows = [
    ['Kegiatan Olahraga & Warakawiri', 'Relaksai Jiwa', 'Lapangan Lapas'],
    ['Voli, Basket, Futsal',           '',              'Lapangan Lapas'],
    ['PIB, Penyuluhan Hukum, Konseling Keagamaan', '', 'Ruangan Kelas'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('users', () => {
  // Default: username=admin, password=admin123
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashed, 'superadmin');
});

seedIfEmpty('clinic_tenaga_medis', () => {
  const insert = db.prepare(
    'INSERT INTO clinic_tenaga_medis (nama, profesi, status_tugas, kontak) VALUES (?, ?, ?, ?)'
  );
  const rows = [
    ['dr. Sinta Rahayu', 'Dokter', 'On Duty', '0812-1000-1001'],
    ['Ns. Farhan Maulana', 'Perawat', 'On Duty', '0812-1000-1002'],
    ['apt. Nur Aini', 'Apoteker', 'On Duty', '0812-1000-1003'],
    ['Dian Purnama', 'Pengelola Data Kesehatan', 'Office Hour', '0812-1000-1004'],
    ['Rina Puspitasari', 'Administrasi', 'Office Hour', '0812-1000-1005'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('clinic_wbp_berobat', () => {
  const insert = db.prepare(`
    INSERT INTO clinic_wbp_berobat
      (no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['BI.150-A/2023', 'AGUS FIRMAN', 'Poliklinik', 'ISPA', 'Blok A1', 'Rawat Jalan', '15 Maret 2026'],
    ['BI.220-B/2022', 'RUDI SAPUTRA', 'Poliklinik', 'TB Paru', 'Blok B3', 'Rawat Inap', '15 Maret 2026'],
    ['BI.310-C/2024', 'HAMDAN ALI', 'Poliklinik', 'Hipertensi', 'Blok Lansia', 'Rawat Jalan', '15 Maret 2026'],
    ['BI.411-D/2021', 'M. IQBAL', 'Poliklinik', 'HIV', 'Blok C2', 'Rawat Inap', '15 Maret 2026'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('clinic_jadwal_on_call', () => {
  const insert = db.prepare(
    'INSERT INTO clinic_jadwal_on_call (hari, shift, petugas, profesi, kontak) VALUES (?, ?, ?, ?, ?)'
  );
  const rows = [
    ['Senin', 'Pagi', 'dr. Sinta Rahayu', 'Dokter', '0812-1000-1001'],
    ['Senin', 'Malam', 'Ns. Farhan Maulana', 'Perawat', '0812-1000-1002'],
    ['Selasa', 'Pagi', 'dr. Sinta Rahayu', 'Dokter', '0812-1000-1001'],
    ['Selasa', 'Malam', 'Ns. Farhan Maulana', 'Perawat', '0812-1000-1002'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('clinic_jadwal_kontrol', () => {
  const insert = db.prepare(
    'INSERT INTO clinic_jadwal_kontrol (hari, waktu, lokasi_blok, petugas, keterangan) VALUES (?, ?, ?, ?, ?)'
  );
  const rows = [
    ['Senin', '09.00 WIB', 'Blok Lansia', 'dr. Sinta Rahayu', 'Kontrol rutin tekanan darah dan gula darah'],
    ['Selasa', '10.00 WIB', 'Blok B3', 'Ns. Farhan Maulana', 'Monitoring WBP TB Paru'],
    ['Rabu', '09.30 WIB', 'Blok C2', 'dr. Sinta Rahayu', 'Evaluasi terapi HIV'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('clinic_statistik', () => {
  db.prepare(`
    INSERT INTO clinic_statistik (id, blok_lansia, tb, paru, hiv, lainnya, rawat_inap)
    VALUES (1, 42, 11, 8, 6, 19, 14)
  `).run();
});

seedIfEmpty('dokumentasi_video', () => {
  db.prepare('INSERT INTO dokumentasi_video (id, video_path) VALUES (1, NULL)').run();
});

db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('remisi_title', 'BESARAN REMISI');

module.exports = db;
