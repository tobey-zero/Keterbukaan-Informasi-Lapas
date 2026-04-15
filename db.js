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
    besaran TEXT NOT NULL,
    remisi_total TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS menu_makan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL DEFAULT '',
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
    keterangan TEXT,
    status_integrasi TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS jadwal_kegiatan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hari TEXT NOT NULL DEFAULT '',
    waktu TEXT NOT NULL DEFAULT '',
    kegiatan TEXT NOT NULL,
    lokasi TEXT NOT NULL DEFAULT '',
    penanggung_jawab TEXT NOT NULL DEFAULT '',
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

  CREATE TABLE IF NOT EXISTS razia_jadwal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    petugas TEXT NOT NULL,
    dokumentasi_path TEXT
  );

  CREATE TABLE IF NOT EXISTS razia_barang_bukti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pemilik TEXT NOT NULL,
    kamar_blok TEXT NOT NULL,
    foto_path TEXT
  );

  CREATE TABLE IF NOT EXISTS strapsel_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_wbp TEXT NOT NULL,
    blok_hunian TEXT NOT NULL,
    tanggal_masuk_strapsel TEXT NOT NULL,
    ekspirasi TEXT,
    permasalahan TEXT,
    barang_bukti TEXT,
    dokumentasi_path TEXT
  );

  CREATE TABLE IF NOT EXISTS tu_umum_barang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT NOT NULL,
    uraian TEXT NOT NULL,
    satuan TEXT NOT NULL,
    saldo_awal_kuantitas TEXT DEFAULT '0',
    saldo_awal_nilai TEXT DEFAULT '0',
    bertambah_kuantitas TEXT DEFAULT '0',
    bertambah_nilai TEXT DEFAULT '0',
    berkurang_kuantitas TEXT DEFAULT '0',
    berkurang_nilai TEXT DEFAULT '0',
    saldo_akhir_kuantitas TEXT DEFAULT '0',
    saldo_akhir_nilai TEXT DEFAULT '0'
  );

  CREATE TABLE IF NOT EXISTS housing_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gedung TEXT NOT NULL DEFAULT '',
    nama_block TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS housing_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id INTEGER NOT NULL,
    nama_kamar TEXT NOT NULL,
    jumlah_penghuni INTEGER NOT NULL DEFAULT 0,
    kapasitas INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (block_id) REFERENCES housing_blocks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS board_pidana (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kategori TEXT NOT NULL CHECK (kategori IN ('khusus', 'umum')),
    jenis TEXT NOT NULL,
    jumlah INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS board_luar_tembok (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL,
    wni_keluar INTEGER NOT NULL DEFAULT 0,
    wni_masuk INTEGER NOT NULL DEFAULT 0,
    wna_keluar INTEGER NOT NULL DEFAULT 0,
    wna_masuk INTEGER NOT NULL DEFAULT 0,
    keterangan TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS board_agama (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agama TEXT NOT NULL,
    wni INTEGER NOT NULL DEFAULT 0,
    wna INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS board_registrasi_hunian (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_urut INTEGER NOT NULL DEFAULT 0,
    blok TEXT NOT NULL,
    registrasi TEXT NOT NULL,
    wni_isi INTEGER NOT NULL DEFAULT 0,
    wni_tambah INTEGER NOT NULL DEFAULT 0,
    wni_kurang INTEGER NOT NULL DEFAULT 0,
    wna_isi INTEGER NOT NULL DEFAULT 0,
    wna_tambah INTEGER NOT NULL DEFAULT 0,
    wna_kurang INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS board_wna_negara (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_negara TEXT NOT NULL,
    jumlah INTEGER NOT NULL DEFAULT 0,
    keterangan TEXT DEFAULT ''
  );
`);

const menuColumns = db.prepare("PRAGMA table_info('menu_makan')").all();
const hasMenuTanggal = menuColumns.some(col => col.name === 'tanggal');
if (!hasMenuTanggal) {
  db.exec("ALTER TABLE menu_makan ADD COLUMN tanggal TEXT NOT NULL DEFAULT ''");
}
const hasMenuPhotoPath = menuColumns.some(col => col.name === 'photo_path');
if (!hasMenuPhotoPath) {
  db.exec('ALTER TABLE menu_makan ADD COLUMN photo_path TEXT');
}

db.exec(`
  UPDATE menu_makan
  SET tanggal = COALESCE(NULLIF(TRIM(tanggal), ''), date('now', 'localtime'))
`);

const strapselColumns = db.prepare("PRAGMA table_info('strapsel_data')").all();
const strapselColumnNames = strapselColumns.map(col => col.name);
if (!strapselColumnNames.includes('nama_wbp')) db.exec("ALTER TABLE strapsel_data ADD COLUMN nama_wbp TEXT DEFAULT ''");
if (!strapselColumnNames.includes('blok_hunian')) db.exec("ALTER TABLE strapsel_data ADD COLUMN blok_hunian TEXT DEFAULT ''");
if (!strapselColumnNames.includes('tanggal_masuk_strapsel')) db.exec("ALTER TABLE strapsel_data ADD COLUMN tanggal_masuk_strapsel TEXT DEFAULT ''");
if (!strapselColumnNames.includes('ekspirasi')) db.exec('ALTER TABLE strapsel_data ADD COLUMN ekspirasi TEXT');
if (!strapselColumnNames.includes('permasalahan')) db.exec('ALTER TABLE strapsel_data ADD COLUMN permasalahan TEXT');
if (!strapselColumnNames.includes('barang_bukti')) db.exec('ALTER TABLE strapsel_data ADD COLUMN barang_bukti TEXT');
if (!strapselColumnNames.includes('dokumentasi_path')) db.exec('ALTER TABLE strapsel_data ADD COLUMN dokumentasi_path TEXT');

const housingRoomColumns = db.prepare("PRAGMA table_info('housing_rooms')").all();
const housingRoomColumnNames = housingRoomColumns.map(col => col.name);
if (!housingRoomColumnNames.includes('kapasitas')) db.exec('ALTER TABLE housing_rooms ADD COLUMN kapasitas INTEGER NOT NULL DEFAULT 0');

const housingBlockColumns = db.prepare("PRAGMA table_info('housing_blocks')").all();
const housingBlockColumnNames = housingBlockColumns.map(col => col.name);
if (!housingBlockColumnNames.includes('gedung')) db.exec("ALTER TABLE housing_blocks ADD COLUMN gedung TEXT NOT NULL DEFAULT ''");

db.exec(`
  UPDATE housing_blocks
  SET gedung = COALESCE(NULLIF(TRIM(gedung), ''), 'Gedung 1')
`);

const jadwalColumns = db.prepare("PRAGMA table_info('jadwal_kegiatan')").all();
const jadwalColumnNames = jadwalColumns.map(col => col.name);
if (!jadwalColumnNames.includes('hari')) db.exec("ALTER TABLE jadwal_kegiatan ADD COLUMN hari TEXT NOT NULL DEFAULT ''");
if (!jadwalColumnNames.includes('waktu')) db.exec("ALTER TABLE jadwal_kegiatan ADD COLUMN waktu TEXT NOT NULL DEFAULT ''");
if (!jadwalColumnNames.includes('lokasi')) db.exec("ALTER TABLE jadwal_kegiatan ADD COLUMN lokasi TEXT NOT NULL DEFAULT ''");
if (!jadwalColumnNames.includes('penanggung_jawab')) db.exec("ALTER TABLE jadwal_kegiatan ADD COLUMN penanggung_jawab TEXT NOT NULL DEFAULT ''");

const remisiColumns = db.prepare("PRAGMA table_info('besaran_remisi')").all();
const remisiColumnNames = remisiColumns.map(col => col.name);
if (!remisiColumnNames.includes('remisi_total')) db.exec("ALTER TABLE besaran_remisi ADD COLUMN remisi_total TEXT NOT NULL DEFAULT ''");

db.exec(`
  UPDATE besaran_remisi
  SET remisi_total = COALESCE(NULLIF(TRIM(remisi_total), ''), besaran)
`);

db.exec(`
  UPDATE jadwal_kegiatan
  SET
    hari = COALESCE(NULLIF(TRIM(hari), ''), 'Selasa'),
    waktu = CASE
      WHEN TRIM(waktu) = '' THEN '-'
      WHEN TRIM(waktu) GLOB '*[0-9]*' THEN TRIM(waktu)
      ELSE '-'
    END,
    kegiatan = COALESCE(NULLIF(TRIM(selasa), ''), NULLIF(TRIM(kegiatan), ''), '-'),
    lokasi = COALESCE(
      NULLIF(TRIM(lokasi), ''),
      CASE
        WHEN TRIM(waktu) <> '' AND TRIM(waktu) NOT GLOB '*[0-9]*' THEN TRIM(waktu)
        ELSE NULL
      END,
      NULLIF(TRIM(rabu), ''),
      '-'
    ),
    penanggung_jawab = COALESCE(NULLIF(TRIM(penanggung_jawab), ''), 'Petugas Pembinaan'),
    selasa = '',
    rabu = ''
`);

const pembinaanDetailColumns = db.prepare("PRAGMA table_info('pentahapan_pembinaan_detail')").all();
const pembinaanDetailColumnNames = pembinaanDetailColumns.map(col => col.name);
if (!pembinaanDetailColumnNames.includes('status_integrasi')) {
  db.exec("ALTER TABLE pentahapan_pembinaan_detail ADD COLUMN status_integrasi TEXT NOT NULL DEFAULT ''");
}

db.exec(`
  UPDATE pentahapan_pembinaan_detail
  SET status_integrasi = COALESCE(
    NULLIF(TRIM(status_integrasi), ''),
    (
      SELECT p.status_integrasi
      FROM pentahapan_pembinaan p
      WHERE UPPER(TRIM(p.nama_wbp)) = UPPER(TRIM(pentahapan_pembinaan_detail.nama_wbp))
      LIMIT 1
    ),
    ''
  )
`);

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
    'INSERT INTO besaran_remisi (jenis, nama, besaran, remisi_total) VALUES (?, ?, ?, ?)'
  );
  const rows = [
    ['REMISI UMUM', 'MUHAMAD RIDWAN IX TIFANI', '4 BULAN', '4 BULAN'],
    ['REMISI UMUM', 'SYEKWAN BIN SAYUTI', '3 BULAN', '3 BULAN'],
    ['REMISI UMUM', 'ALFANTSYAR ANDI SAPUTRA ALS', '4 BULAN', '4 BULAN'],
    ['REMISI UMUM', 'ACHMAD SUTENO SAPUTRA', '4 BULAN', '4 BULAN'],
    ['REMISI UMUM', 'GHIFARI SYAHRU RAMADHAN ALS', '3 BULAN', '3 BULAN'],
    ['REMISI UMUM', 'GALUH ANDREAN ALS GALUH', '3 BULAN', '3 BULAN'],
    ['REMISI UMUM', 'TRI JOHAN WAHYUDI ALS JOHAN', '3 BULAN', '3 BULAN'],
    ['REMISI UMUM', 'ERWANTO BIN PARDIN', '4 BULAN', '4 BULAN'],
    ['REMISI UMUM', 'AZIS FERDIYANTO BIN SUPARJAN', '4 BULAN', '4 BULAN'],
    ['REMISI UMUM', 'WAHYUDI HARTONO BIN DJOKO', '4 BULAN', '4 BULAN'],
    ['REMISI UMUM', 'DEDE CAHYA BIN AGUS', '4 BULAN', '4 BULAN'],
    ['REMISI UMUM', 'IRAWAN JAYA BIN ZAINAL ABIDIN', '4 BULAN', '4 BULAN'],
    ['REMISI UMUM', 'ASRUL SANI ALS ANDEK ALS', '4 BULAN', '4 BULAN'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('menu_makan', () => {
  const insert = db.prepare('INSERT INTO menu_makan (tanggal, waktu, menu) VALUES (?, ?, ?)');
  const rows = [
    ['2026-04-15', 'MAKAN PAGI',  'Nasi Putih, Telur rebus, Tumis wortel + kacang panjang'],
    ['2026-04-15', 'SNACK',       'Bubur Kc hijau'],
    ['2026-04-15', 'MAKAN SIANG', 'Nasi putih, Ayam kecap, Tahu goreng Tumis sawi + wortel, Sambal, Pisang'],
    ['2026-04-15', 'SNACK',       'Ubi rebus'],
    ['2026-04-15', 'MAKAN SORE',  'Nasi putih, Ikan goreng, Kacang tanah giling Pecel sayuran, Sambal'],
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
      (no_reg, nama_wbp, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan, status_integrasi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['BI.15-PK/PD/2023',  'NUR SLAMET ALS IGOR BIN SRIYANTO (ALM)', '19 Feb 2020', '15 Oct 2020', '17 Oct 2020', '28 Dec 2023', '3 Bulan, 9 Hari',  'HADIR', 'Menunggu SK'],
    ['BI.1296-D/2020',    'IFANDI RIZKI FATMA BIN ILYAS',           '25 Dec 2022', '22 Jun 2026', '28 Dec 2028', '28 Dec 2023', '12 Bulan, 9 Hari', 'HADIR', 'Sudah dijatuhi Permintaan'],
    ['BI.084-O/2022',     'ARFAN HERMAWAN BIN A.B.A KARIES AHMAD',  '08 Dec 2022', '15 Oct 2025', '10 Aug 2024', '15 Apr 2026', '6 Bulan, 0 Hari',  'HADIR', 'Sudah ada hasil SK'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('jadwal_kegiatan', () => {
  const insert = db.prepare(
    'INSERT INTO jadwal_kegiatan (hari, waktu, kegiatan, lokasi, penanggung_jawab) VALUES (?, ?, ?, ?, ?)'
  );
  const rows = [
    ['Selasa', '08.00 - 09.30', 'Relaksasi Jiwa', 'Lapangan Lapas', 'Petugas Bimbingan'],
    ['Selasa', '09.30 - 11.00', 'Voli, Basket, Futsal', 'Lapangan Lapas', 'Petugas Bimbingan'],
    ['Selasa', '13.00 - 14.30', 'Therapeutic Community, Ceramah, Terapi Kognitif', 'Ruangan Kelas Gedung 3', 'Petugas Bimbingan'],
    ['Selasa', '14.30 - 16.00', 'PNPM, Pramuka, Kader Kesehatan', 'Lapangan Lapas, Ruangan Kelas', 'Petugas Bimbingan'],
    ['Selasa', '16.00 - 17.00', 'Sholat Zuhur, Sholat Ashar, Tawarrudu', 'Masjid Darawaruya', 'Petugas Bimbingan'],
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

seedIfEmpty('razia_jadwal', () => {
  const insert = db.prepare('INSERT INTO razia_jadwal (tanggal, petugas, dokumentasi_path) VALUES (?, ?, ?)');
  const rows = [
    ['12 April 2026', 'Tim Pengamanan Regu A', null],
    ['13 April 2026', 'Tim Pengamanan Regu B', null],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('razia_barang_bukti', () => {
  const insert = db.prepare('INSERT INTO razia_barang_bukti (pemilik, kamar_blok, foto_path) VALUES (?, ?, ?)');
  const rows = [
    ['WBP A.N. A', 'Blok A-03', null],
    ['WBP A.N. B', 'Blok C-01', null],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('strapsel_data', () => {
  const insert = db.prepare(`
    INSERT INTO strapsel_data
      (nama_wbp, blok_hunian, tanggal_masuk_strapsel, ekspirasi, permasalahan, barang_bukti, dokumentasi_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['WBP A.N. C', 'Blok B-02', '13 April 2026', '13 Mei 2026', 'Membawa alat terlarang', 'Pisau rakitan', null],
    ['WBP A.N. D', 'Blok C-04', '14 April 2026', '14 Mei 2026', 'Menyimpan barang terlarang', 'Handphone', null],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('tu_umum_barang', () => {
  const insert = db.prepare(`
    INSERT INTO tu_umum_barang
      (kode, uraian, satuan, saldo_awal_kuantitas, saldo_awal_nilai, bertambah_kuantitas, bertambah_nilai, berkurang_kuantitas, berkurang_nilai, saldo_akhir_kuantitas, saldo_akhir_nilai)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['3090101002', 'Pistol', 'Buah', '0', '0', '0', '0', '27', '147,441,806', '(27)', '(147,441,806)'],
    ['3090103001', 'Senapan Grendel (Bolt Action Figle)', 'Buah', '0', '0', '0', '0', '23', '43,300,013', '(23)', '(43,300,013)'],
    ['3090103999', 'Senjata Bahu/Senjata Laras Panjang Lainnya', 'dummy', '0', '0', '28', '53,287,513', '28', '62,341,513', '0', '(9,054,000)'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('housing_blocks', () => {
  const insertBlock = db.prepare('INSERT INTO housing_blocks (gedung, nama_block) VALUES (?, ?)');
  const blockRows = [
    ['Gedung 1', 'Blok A'],
    ['Gedung 1', 'Blok B'],
    ['Gedung 2', 'Blok C'],
  ];
  blockRows.forEach(row => insertBlock.run(...row));

  const blocks = db.prepare('SELECT id, nama_block FROM housing_blocks').all();
  const blockMap = Object.fromEntries(blocks.map(b => [b.nama_block, b.id]));

  const insertRoom = db.prepare('INSERT INTO housing_rooms (block_id, nama_kamar, jumlah_penghuni, kapasitas) VALUES (?, ?, ?, ?)');
  const roomRows = [
    [blockMap['Blok A'], 'A-01', 24, 30],
    [blockMap['Blok A'], 'A-02', 26, 30],
    [blockMap['Blok B'], 'B-01', 28, 32],
    [blockMap['Blok B'], 'B-02', 22, 32],
    [blockMap['Blok C'], 'C-01', 30, 36],
  ];
  roomRows.forEach(r => {
    if (r[0]) insertRoom.run(...r);
  });
});

seedIfEmpty('board_pidana', () => {
  const insert = db.prepare('INSERT INTO board_pidana (kategori, jenis, jumlah) VALUES (?, ?, ?)');
  const rows = [
    ['khusus', 'TERORIS', 1],
    ['khusus', 'TIPIKOR', 57],
    ['khusus', 'NARKOTIKA', 2428],
    ['khusus', 'PERLINDUNGAN ANAK', 337],
    ['umum', 'PEMBUNUHAN', 231],
    ['umum', 'PENCURIAN', 42],
    ['umum', 'PENGANIAYAAN', 15],
    ['umum', 'PENIPUAN', 17],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('board_luar_tembok', () => {
  const insert = db.prepare('INSERT INTO board_luar_tembok (status, wni_keluar, wni_masuk, wna_keluar, wna_masuk, keterangan) VALUES (?, ?, ?, ?, ?, ?)');
  const rows = [
    ['BNN', 0, 0, 0, 0, '-'],
    ['POLISI', 0, 0, 0, 0, '-'],
    ['KEJAKSAAN', 0, 0, 0, 0, '-'],
    ['PPN', 1, 0, 0, 0, 'Pengawalan sidang'],
    ['RUMAH SAKIT', 2, 0, 0, 0, 'Kontrol kesehatan'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('board_agama', () => {
  const insert = db.prepare('INSERT INTO board_agama (agama, wni, wna) VALUES (?, ?, ?)');
  const rows = [
    ['ISLAM', 2494, 0],
    ['KRISTEN', 271, 0],
    ['KATOLIK', 37, 0],
    ['HINDU', 8, 0],
    ['BUDHA', 47, 0],
    ['KONG HU CU', 1, 0],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('board_registrasi_hunian', () => {
  const insert = db.prepare(`
    INSERT INTO board_registrasi_hunian
      (no_urut, blok, registrasi, wni_isi, wni_tambah, wni_kurang, wna_isi, wna_tambah, wna_kurang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    [1, 'A', 'A.I', 0, 0, 0, 0, 0, 0],
    [1, 'A', 'A.II', 0, 0, 0, 0, 0, 0],
    [1, 'A', 'A.III', 39, 0, 0, 0, 0, 0],
    [1, 'A', 'A.IV', 86, 0, 0, 0, 0, 0],
    [1, 'A', 'A.V', 44, 0, 0, 0, 0, 0],
    [2, 'B', 'MATI', 67, 0, 0, 0, 0, 0],
    [2, 'B', 'S H', 294, 0, 0, 2, 0, 0],
    [2, 'B', 'B.I', 2304, 0, 0, 5, 0, 0],
    [2, 'B', 'B.IIA', 0, 0, 0, 0, 0, 0],
    [2, 'B', 'B.IIB', 0, 0, 0, 0, 0, 0],
    [2, 'B', 'B.III', 27, 0, 0, 0, 0, 0],
    [2, 'B', 'B.IIIS', 2, 0, 0, 0, 0, 0],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('board_wna_negara', () => {
  const insert = db.prepare('INSERT INTO board_wna_negara (nama_negara, jumlah, keterangan) VALUES (?, ?, ?)');
  const rows = [
    ['MYANMAR', 2, '-'],
    ['MALAYSIA', 5, '-'],
  ];
  rows.forEach(r => insert.run(...r));
});

db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('remisi_title', 'BESARAN REMISI');
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('kata_bijak_text', 'KRISNA adalah sistem Keterbukaan Informasi Warga Binaan di Lapas Kelas I Medan.');
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('menu_title', 'DAFTAR MENU MAKAN HARI INI');

module.exports = db;
