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

  CREATE TABLE IF NOT EXISTS menu_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    waktu TEXT NOT NULL,
    menu TEXT NOT NULL,
    photo_path TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS menu_harian (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    menu_master_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE (tanggal, menu_master_id),
    FOREIGN KEY (menu_master_id) REFERENCES menu_master(id)
  );

  CREATE TABLE IF NOT EXISTS menu_harian_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_list TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS menu_harian_list_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    menu_master_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (list_id, menu_master_id),
    FOREIGN KEY (list_id) REFERENCES menu_harian_list(id),
    FOREIGN KEY (menu_master_id) REFERENCES menu_master(id)
  );

  CREATE TABLE IF NOT EXISTS menu_harian_set (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL UNIQUE,
    list_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (list_id) REFERENCES menu_harian_list(id)
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
    jenis_kejahatan TEXT,
    blok_kamar TEXT,
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

  CREATE TABLE IF NOT EXISTS dokumentasi_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type TEXT NOT NULL CHECK (media_type IN ('video', 'image')),
    media_path TEXT NOT NULL,
    display_duration_sec INTEGER NOT NULL DEFAULT 8,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
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

  CREATE TABLE IF NOT EXISTS giat_pengawalan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,
    nama_wbp TEXT NOT NULL,
    petugas TEXT NOT NULL,
    keterangan TEXT DEFAULT '',
    dokumentasi_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS register_f (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_register TEXT NOT NULL,
    nama_wbp TEXT NOT NULL,
    jenis_pelanggaran TEXT NOT NULL,
    tanggal_pelanggaran TEXT NOT NULL,
    lama_hukuman TEXT NOT NULL DEFAULT '',
    hukuman_mulai TEXT NOT NULL DEFAULT '',
    hukuman_selesai TEXT NOT NULL DEFAULT '',
    keterangan TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS kamtib_piket_jaga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    month TEXT NOT NULL,
    regu1_name TEXT NOT NULL DEFAULT 'REGU I',
    regu2_name TEXT NOT NULL DEFAULT 'REGU II',
    regu3_name TEXT NOT NULL DEFAULT 'REGU III',
    regu4_name TEXT NOT NULL DEFAULT 'REGU IV',
    regu1_schedule TEXT NOT NULL DEFAULT '[]',
    regu2_schedule TEXT NOT NULL DEFAULT '[]',
    regu3_schedule TEXT NOT NULL DEFAULT '[]',
    regu4_schedule TEXT NOT NULL DEFAULT '[]',
    regu_names_json TEXT NOT NULL DEFAULT '[]',
    regu_schedules_json TEXT NOT NULL DEFAULT '[]',
    regu_members_json TEXT NOT NULL DEFAULT '[]',
    keterangan TEXT NOT NULL DEFAULT 'P: PIKET',
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(year, month)
  );

  CREATE TABLE IF NOT EXISTS tu_umum_barang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT NOT NULL,
    uraian TEXT NOT NULL,
    satuan TEXT NOT NULL,
    tahun_perolehan TEXT NOT NULL DEFAULT '',
    saldo_awal_kuantitas TEXT DEFAULT '0',
    saldo_awal_nilai TEXT DEFAULT '0',
    bertambah_kuantitas TEXT DEFAULT '0',
    bertambah_nilai TEXT DEFAULT '0',
    berkurang_kuantitas TEXT DEFAULT '0',
    berkurang_nilai TEXT DEFAULT '0',
    saldo_akhir_kuantitas TEXT DEFAULT '0',
    saldo_akhir_nilai TEXT DEFAULT '0'
  );

  CREATE TABLE IF NOT EXISTS tu_kepegawaian (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_pegawai TEXT NOT NULL,
    nip TEXT NOT NULL DEFAULT '',
    pangkat_gol TEXT NOT NULL DEFAULT '',
    jabatan TEXT NOT NULL DEFAULT '',
    agama TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    pendidikan TEXT NOT NULL DEFAULT '',
    penempatan_seksi TEXT NOT NULL DEFAULT '',
    penempatan_bidang TEXT NOT NULL DEFAULT '',
    jenis_kelamin TEXT NOT NULL DEFAULT '',
    type_pegawai TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS giiatja_kegiatan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kategori TEXT NOT NULL,
    jenis_kegiatan TEXT NOT NULL DEFAULT '',
    peserta_kegiatan TEXT NOT NULL DEFAULT '',
    pengawas TEXT NOT NULL DEFAULT '',
    dokumentasi_path TEXT,
    sort_order INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS giiatja_kegiatan_detail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kegiatan_id INTEGER NOT NULL,
    jenis_kegiatan TEXT NOT NULL DEFAULT '',
    peserta_kegiatan TEXT NOT NULL DEFAULT '',
    pengawas TEXT NOT NULL DEFAULT '',
    dokumentasi_path TEXT,
    sort_order INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (kegiatan_id) REFERENCES giiatja_kegiatan(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS giiatja_pelatihan_sertifikat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_registrasi TEXT NOT NULL DEFAULT '',
    nama_wbp TEXT NOT NULL,
    jenis_pelatihan TEXT NOT NULL DEFAULT '',
    tanggal_pelaksanaan TEXT NOT NULL DEFAULT '',
    instruktur TEXT NOT NULL DEFAULT '',
    poto_sertifikat_path TEXT,
    keterangan TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS giiatja_pnbp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tahun TEXT NOT NULL DEFAULT '',
    periode_pnbp TEXT NOT NULL,
    jumlah_pnbp TEXT NOT NULL DEFAULT '',
    target_realisasi TEXT NOT NULL DEFAULT '',
    persentase TEXT NOT NULL DEFAULT '',
    keterangan TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS giiatja_pnbp_pendapatan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tahun TEXT NOT NULL DEFAULT '',
    periode_pnbp TEXT NOT NULL DEFAULT '',
    kegiatan TEXT NOT NULL DEFAULT '',
    peserta TEXT NOT NULL DEFAULT '',
    jumlah TEXT NOT NULL DEFAULT '0',
    sort_order INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS giiatja_premi_wbp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_registrasi TEXT NOT NULL DEFAULT '',
    nama_wbp TEXT NOT NULL,
    periode_bulan TEXT NOT NULL DEFAULT '',
    periode_tahun TEXT NOT NULL DEFAULT '',
    jenis_kegiatan TEXT NOT NULL DEFAULT '',
    premi_didapat TEXT NOT NULL DEFAULT '',
    keterangan TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 1
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

  CREATE TABLE IF NOT EXISTS board_luar_tembok_detail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_registrasi TEXT NOT NULL,
    nama TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    pendamping TEXT NOT NULL,
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
    no_registrasi TEXT NOT NULL DEFAULT '',
    nama_wbp TEXT NOT NULL DEFAULT '',
    asal_negara TEXT NOT NULL DEFAULT '',
    tindak_pidana TEXT NOT NULL DEFAULT '',
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

const legacyMenuRows = db.prepare(`
  SELECT id, tanggal, waktu, menu, photo_path AS photoPath
  FROM menu_makan
  ORDER BY id ASC
`).all();

const masterMenuCount = db.prepare('SELECT COUNT(*) AS c FROM menu_master').get().c;
if (masterMenuCount === 0 && legacyMenuRows.length) {
  const insertMasterMenu = db.prepare('INSERT INTO menu_master (waktu, menu, photo_path, sort_order) VALUES (?, ?, ?, ?)');
  const seenMasterMenu = new Set();
  let sortOrder = 1;

  legacyMenuRows.forEach((item) => {
    const key = `${String(item.waktu || '').trim().toUpperCase()}|${String(item.menu || '').trim()}|${String(item.photoPath || '').trim()}`;
    if (!item.waktu || !item.menu || seenMasterMenu.has(key)) return;
    insertMasterMenu.run(item.waktu, item.menu, item.photoPath || null, sortOrder);
    seenMasterMenu.add(key);
    sortOrder += 1;
  });
}

const menuHarianCount = db.prepare('SELECT COUNT(*) AS c FROM menu_harian').get().c;
if (menuHarianCount === 0 && legacyMenuRows.length) {
  const getMasterId = db.prepare(`
    SELECT id
    FROM menu_master
    WHERE waktu = ?
      AND menu = ?
      AND COALESCE(photo_path, '') = COALESCE(?, '')
    ORDER BY id ASC
    LIMIT 1
  `);
  const insertMenuHarian = db.prepare('INSERT OR IGNORE INTO menu_harian (tanggal, menu_master_id, sort_order) VALUES (?, ?, ?)');
  const perDateOrder = new Map();

  legacyMenuRows.forEach((item) => {
    const tanggal = String(item.tanggal || '').trim();
    if (!tanggal || !item.waktu || !item.menu) return;

    const foundMaster = getMasterId.get(item.waktu, item.menu, item.photoPath || null);
    if (!foundMaster?.id) return;

    const nextOrder = (perDateOrder.get(tanggal) || 0) + 1;
    perDateOrder.set(tanggal, nextOrder);
    insertMenuHarian.run(tanggal, foundMaster.id, nextOrder);
  });
}

const menuListCount = db.prepare('SELECT COUNT(*) AS c FROM menu_harian_list').get().c;
if (menuListCount === 0) {
  const legacyDates = db.prepare('SELECT DISTINCT tanggal FROM menu_harian ORDER BY tanggal ASC').all();
  const insertList = db.prepare('INSERT INTO menu_harian_list (nama_list, sort_order) VALUES (?, ?)');
  const insertListItem = db.prepare('INSERT OR IGNORE INTO menu_harian_list_item (list_id, menu_master_id, sort_order) VALUES (?, ?, ?)');
  const upsertSet = db.prepare(`
    INSERT INTO menu_harian_set (tanggal, list_id)
    VALUES (?, ?)
    ON CONFLICT(tanggal) DO UPDATE SET list_id=excluded.list_id
  `);

  if (legacyDates.length) {
    legacyDates.forEach((row, index) => {
      const result = insertList.run(`Hari Ke-${index + 1}`, index + 1);
      const listId = Number(result.lastInsertRowid);

      const mappedItems = db.prepare(`
        SELECT menu_master_id AS menuMasterId, sort_order AS sortOrder
        FROM menu_harian
        WHERE tanggal = ?
        ORDER BY sort_order ASC, id ASC
      `).all(row.tanggal);

      mappedItems.forEach((item, itemIndex) => {
        insertListItem.run(listId, item.menuMasterId, Number(item.sortOrder) || (itemIndex + 1));
      });

      upsertSet.run(row.tanggal, listId);
    });
  } else {
    const result = insertList.run('Hari Ke-1', 1);
    const listId = Number(result.lastInsertRowid);
    const allMaster = db.prepare('SELECT id FROM menu_master ORDER BY sort_order ASC, id ASC').all();
    allMaster.forEach((item, index) => {
      insertListItem.run(listId, item.id, index + 1);
    });
  }
}

const menuSetCount = db.prepare('SELECT COUNT(*) AS c FROM menu_harian_set').get().c;
if (menuSetCount === 0) {
  const firstList = db.prepare('SELECT id FROM menu_harian_list ORDER BY sort_order ASC, id ASC LIMIT 1').get();
  if (firstList?.id) {
    const legacyDates = db.prepare('SELECT DISTINCT tanggal FROM menu_harian ORDER BY tanggal ASC').all();
    const upsertSet = db.prepare(`
      INSERT INTO menu_harian_set (tanggal, list_id)
      VALUES (?, ?)
      ON CONFLICT(tanggal) DO UPDATE SET list_id=excluded.list_id
    `);

    if (legacyDates.length) {
      legacyDates.forEach((row) => upsertSet.run(row.tanggal, firstList.id));
    } else {
      const todayRow = db.prepare("SELECT date('now','localtime') AS ymd").get();
      upsertSet.run(todayRow.ymd, firstList.id);
    }
  }
}

const strapselColumns = db.prepare("PRAGMA table_info('strapsel_data')").all();
const strapselColumnNames = strapselColumns.map(col => col.name);
if (!strapselColumnNames.includes('nama_wbp')) db.exec("ALTER TABLE strapsel_data ADD COLUMN nama_wbp TEXT DEFAULT ''");
if (!strapselColumnNames.includes('blok_hunian')) db.exec("ALTER TABLE strapsel_data ADD COLUMN blok_hunian TEXT DEFAULT ''");
if (!strapselColumnNames.includes('tanggal_masuk_strapsel')) db.exec("ALTER TABLE strapsel_data ADD COLUMN tanggal_masuk_strapsel TEXT DEFAULT ''");
if (!strapselColumnNames.includes('ekspirasi')) db.exec('ALTER TABLE strapsel_data ADD COLUMN ekspirasi TEXT');
if (!strapselColumnNames.includes('permasalahan')) db.exec('ALTER TABLE strapsel_data ADD COLUMN permasalahan TEXT');
if (!strapselColumnNames.includes('barang_bukti')) db.exec('ALTER TABLE strapsel_data ADD COLUMN barang_bukti TEXT');
if (!strapselColumnNames.includes('dokumentasi_path')) db.exec('ALTER TABLE strapsel_data ADD COLUMN dokumentasi_path TEXT');

const tuUmumBarangColumns = db.prepare("PRAGMA table_info('tu_umum_barang')").all();
const tuUmumBarangColumnNames = tuUmumBarangColumns.map(col => col.name);
if (!tuUmumBarangColumnNames.includes('tahun_perolehan')) db.exec("ALTER TABLE tu_umum_barang ADD COLUMN tahun_perolehan TEXT NOT NULL DEFAULT ''");

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

const registerFColumns = db.prepare("PRAGMA table_info('register_f')").all();
const registerFColumnNames = registerFColumns.map(col => col.name);
if (!registerFColumnNames.includes('no_register')) db.exec("ALTER TABLE register_f ADD COLUMN no_register TEXT NOT NULL DEFAULT ''");
if (!registerFColumnNames.includes('nama_wbp')) db.exec("ALTER TABLE register_f ADD COLUMN nama_wbp TEXT NOT NULL DEFAULT ''");
if (!registerFColumnNames.includes('jenis_pelanggaran')) db.exec("ALTER TABLE register_f ADD COLUMN jenis_pelanggaran TEXT NOT NULL DEFAULT ''");
if (!registerFColumnNames.includes('tanggal_pelanggaran')) db.exec("ALTER TABLE register_f ADD COLUMN tanggal_pelanggaran TEXT NOT NULL DEFAULT ''");
if (!registerFColumnNames.includes('lama_hukuman')) db.exec("ALTER TABLE register_f ADD COLUMN lama_hukuman TEXT NOT NULL DEFAULT ''");
if (!registerFColumnNames.includes('hukuman_mulai')) db.exec("ALTER TABLE register_f ADD COLUMN hukuman_mulai TEXT NOT NULL DEFAULT ''");
if (!registerFColumnNames.includes('hukuman_selesai')) db.exec("ALTER TABLE register_f ADD COLUMN hukuman_selesai TEXT NOT NULL DEFAULT ''");
if (!registerFColumnNames.includes('keterangan')) db.exec("ALTER TABLE register_f ADD COLUMN keterangan TEXT NOT NULL DEFAULT ''");

const piketJagaColumns = db.prepare("PRAGMA table_info('kamtib_piket_jaga')").all();
const piketJagaColumnNames = piketJagaColumns.map(col => col.name);
if (!piketJagaColumnNames.includes('regu_names_json')) db.exec("ALTER TABLE kamtib_piket_jaga ADD COLUMN regu_names_json TEXT NOT NULL DEFAULT '[]'");
if (!piketJagaColumnNames.includes('regu_schedules_json')) db.exec("ALTER TABLE kamtib_piket_jaga ADD COLUMN regu_schedules_json TEXT NOT NULL DEFAULT '[]'");
if (!piketJagaColumnNames.includes('regu_members_json')) db.exec("ALTER TABLE kamtib_piket_jaga ADD COLUMN regu_members_json TEXT NOT NULL DEFAULT '[]'");

const remisiColumns = db.prepare("PRAGMA table_info('besaran_remisi')").all();
const remisiColumnNames = remisiColumns.map(col => col.name);
if (!remisiColumnNames.includes('remisi_total')) db.exec("ALTER TABLE besaran_remisi ADD COLUMN remisi_total TEXT NOT NULL DEFAULT ''");

const giiatjaPnbpColumns = db.prepare("PRAGMA table_info('giiatja_pnbp')").all();
const giiatjaPnbpColumnNames = giiatjaPnbpColumns.map(col => col.name);
if (!giiatjaPnbpColumnNames.includes('tahun')) db.exec("ALTER TABLE giiatja_pnbp ADD COLUMN tahun TEXT NOT NULL DEFAULT ''");

const giiatjaPnbpPendapatanColumns = db.prepare("PRAGMA table_info('giiatja_pnbp_pendapatan')").all();
const giiatjaPnbpPendapatanColumnNames = giiatjaPnbpPendapatanColumns.map(col => col.name);
if (!giiatjaPnbpPendapatanColumnNames.includes('tahun')) db.exec("ALTER TABLE giiatja_pnbp_pendapatan ADD COLUMN tahun TEXT NOT NULL DEFAULT ''");
if (!giiatjaPnbpPendapatanColumnNames.includes('periode_pnbp')) db.exec("ALTER TABLE giiatja_pnbp_pendapatan ADD COLUMN periode_pnbp TEXT NOT NULL DEFAULT ''");
if (!giiatjaPnbpPendapatanColumnNames.includes('kegiatan')) db.exec("ALTER TABLE giiatja_pnbp_pendapatan ADD COLUMN kegiatan TEXT NOT NULL DEFAULT ''");
if (!giiatjaPnbpPendapatanColumnNames.includes('peserta')) db.exec("ALTER TABLE giiatja_pnbp_pendapatan ADD COLUMN peserta TEXT NOT NULL DEFAULT ''");
if (!giiatjaPnbpPendapatanColumnNames.includes('jumlah')) db.exec("ALTER TABLE giiatja_pnbp_pendapatan ADD COLUMN jumlah TEXT NOT NULL DEFAULT '0'");
if (!giiatjaPnbpPendapatanColumnNames.includes('sort_order')) db.exec("ALTER TABLE giiatja_pnbp_pendapatan ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 1");

const giiatjaPremiColumns = db.prepare("PRAGMA table_info('giiatja_premi_wbp')").all();
const giiatjaPremiColumnNames = giiatjaPremiColumns.map(col => col.name);
if (!giiatjaPremiColumnNames.includes('periode_bulan')) db.exec("ALTER TABLE giiatja_premi_wbp ADD COLUMN periode_bulan TEXT NOT NULL DEFAULT ''");
if (!giiatjaPremiColumnNames.includes('periode_tahun')) db.exec("ALTER TABLE giiatja_premi_wbp ADD COLUMN periode_tahun TEXT NOT NULL DEFAULT ''");

const defaultGiiatjaPnbpYear = String(new Date().getFullYear());
db.prepare(`
  UPDATE giiatja_pnbp
  SET tahun = COALESCE(NULLIF(TRIM(tahun), ''), ?)
`).run(defaultGiiatjaPnbpYear);

const giiatjaPnbpPendapatanCount = db.prepare('SELECT COUNT(*) AS c FROM giiatja_pnbp_pendapatan').get().c;
if (giiatjaPnbpPendapatanCount === 0) {
  const legacyPnbpRows = db.prepare(`
    SELECT tahun, periode_pnbp, jumlah_pnbp
    FROM giiatja_pnbp
    ORDER BY id ASC
  `).all();

  const insertPendapatan = db.prepare(`
    INSERT INTO giiatja_pnbp_pendapatan
      (tahun, periode_pnbp, kegiatan, peserta, jumlah, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  legacyPnbpRows.forEach((item, index) => {
    const normalizedJumlah = String(item.jumlah_pnbp ?? '').replace(/[^\d.-]/g, '');
    insertPendapatan.run(
      String(item.tahun || '').trim() || defaultGiiatjaPnbpYear,
      String(item.periode_pnbp || '').trim().toUpperCase(),
      'PENDAPATAN AWAL',
      '-',
      normalizedJumlah || '0',
      index + 1
    );
  });
}

const defaultGiiatjaPremiMonth = 'APRIL';
const defaultGiiatjaPremiYear = String(new Date().getFullYear());
db.prepare(`
  UPDATE giiatja_premi_wbp
  SET
    periode_bulan = COALESCE(NULLIF(TRIM(periode_bulan), ''), ?),
    periode_tahun = COALESCE(NULLIF(TRIM(periode_tahun), ''), ?)
`).run(defaultGiiatjaPremiMonth, defaultGiiatjaPremiYear);

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
if (!pembinaanDetailColumnNames.includes('jenis_kejahatan')) db.exec("ALTER TABLE pentahapan_pembinaan_detail ADD COLUMN jenis_kejahatan TEXT");
if (!pembinaanDetailColumnNames.includes('blok_kamar')) db.exec("ALTER TABLE pentahapan_pembinaan_detail ADD COLUMN blok_kamar TEXT");
if (!pembinaanDetailColumnNames.includes('tanggal1')) db.exec("ALTER TABLE pentahapan_pembinaan_detail ADD COLUMN tanggal1 TEXT");
if (!pembinaanDetailColumnNames.includes('tanggal3')) db.exec("ALTER TABLE pentahapan_pembinaan_detail ADD COLUMN tanggal3 TEXT");
if (!pembinaanDetailColumnNames.includes('total_remisi')) db.exec("ALTER TABLE pentahapan_pembinaan_detail ADD COLUMN total_remisi TEXT");

const pembinaanDetailColumnsAfterMigration = db.prepare("PRAGMA table_info('pentahapan_pembinaan_detail')").all();
const pembinaanDetailColumnNamesAfterMigration = pembinaanDetailColumnsAfterMigration.map(col => col.name);
if (!pembinaanDetailColumnNamesAfterMigration.includes('status_integrasi')) {
  db.exec("ALTER TABLE pentahapan_pembinaan_detail ADD COLUMN status_integrasi TEXT NOT NULL DEFAULT ''");
}

db.exec(`
  UPDATE pentahapan_pembinaan_detail
  SET
    jenis_kejahatan = COALESCE(NULLIF(TRIM(jenis_kejahatan), ''), '-'),
    blok_kamar = COALESCE(NULLIF(TRIM(blok_kamar), ''), '-'),
    tanggal1 = COALESCE(NULLIF(TRIM(tanggal1), ''), NULLIF(TRIM(tanggal2), ''), ''),
    tanggal3 = COALESCE(NULLIF(TRIM(tanggal3), ''), NULLIF(TRIM(tanggal2), ''), ''),
    total_remisi = COALESCE(NULLIF(TRIM(total_remisi), ''), '-')
`);

const wnaColumns = db.prepare("PRAGMA table_info('board_wna_negara')").all();
const wnaColumnNames = wnaColumns.map(col => col.name);
if (!wnaColumnNames.includes('no_registrasi')) db.exec("ALTER TABLE board_wna_negara ADD COLUMN no_registrasi TEXT NOT NULL DEFAULT ''");
if (!wnaColumnNames.includes('nama_wbp')) db.exec("ALTER TABLE board_wna_negara ADD COLUMN nama_wbp TEXT NOT NULL DEFAULT ''");
if (!wnaColumnNames.includes('asal_negara')) db.exec("ALTER TABLE board_wna_negara ADD COLUMN asal_negara TEXT NOT NULL DEFAULT ''");
if (!wnaColumnNames.includes('tindak_pidana')) db.exec("ALTER TABLE board_wna_negara ADD COLUMN tindak_pidana TEXT NOT NULL DEFAULT ''");

db.exec(`
  UPDATE board_wna_negara
  SET
    no_registrasi = COALESCE(NULLIF(TRIM(no_registrasi), ''), '-'),
    nama_wbp = COALESCE(NULLIF(TRIM(nama_wbp), ''), NULLIF(TRIM(nama_negara), ''), '-'),
    asal_negara = COALESCE(NULLIF(TRIM(asal_negara), ''), '-'),
    tindak_pidana = COALESCE(NULLIF(TRIM(tindak_pidana), ''), NULLIF(TRIM(keterangan), ''), '-')
`);

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

const oldVideoRow = db.prepare('SELECT video_path FROM dokumentasi_video WHERE id = 1').get();
const mediaCountRow = db.prepare('SELECT COUNT(*) AS c FROM dokumentasi_media').get();
if ((mediaCountRow?.c || 0) === 0 && oldVideoRow?.video_path) {
  db.prepare(`
    INSERT INTO dokumentasi_media (media_type, media_path, display_duration_sec, sort_order)
    VALUES ('video', ?, 8, 1)
  `).run(oldVideoRow.video_path);
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

seedIfEmpty('menu_master', () => {
  const insert = db.prepare('INSERT INTO menu_master (waktu, menu, sort_order) VALUES (?, ?, ?)');
  const rows = [
    ['MAKAN PAGI',  'Nasi Putih, Telur rebus, Tumis wortel + kacang panjang', 1],
    ['SNACK',       'Bubur Kacang Hijau', 2],
    ['MAKAN SIANG', 'Nasi Putih, Ayam Kecap, Tahu Goreng, Tumis Sawi + Wortel, Sambal, Pisang', 3],
    ['SNACK',       'Ubi Rebus', 4],
    ['MAKAN SORE',  'Nasi Putih, Ikan Goreng, Pecel Sayuran, Sambal', 5],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('menu_harian_list', () => {
  db.prepare('INSERT INTO menu_harian_list (nama_list, sort_order) VALUES (?, ?)').run('Hari Ke-1', 1);
});

seedIfEmpty('menu_harian_list_item', () => {
  const firstList = db.prepare('SELECT id FROM menu_harian_list ORDER BY sort_order ASC, id ASC LIMIT 1').get();
  if (!firstList?.id) return;
  const masterList = db.prepare('SELECT id FROM menu_master ORDER BY sort_order ASC, id ASC').all();
  const insert = db.prepare('INSERT INTO menu_harian_list_item (list_id, menu_master_id, sort_order) VALUES (?, ?, ?)');
  masterList.forEach((item, index) => {
    insert.run(firstList.id, item.id, index + 1);
  });
});

seedIfEmpty('menu_harian_set', () => {
  const firstList = db.prepare('SELECT id FROM menu_harian_list ORDER BY sort_order ASC, id ASC LIMIT 1').get();
  if (!firstList?.id) return;
  db.prepare('INSERT INTO menu_harian_set (tanggal, list_id) VALUES (?, ?)').run('2026-04-15', firstList.id);
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
      (no_reg, nama_wbp, jenis_kejahatan, blok_kamar, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan, status_integrasi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['BI.15-PK/PD/2023',  'NUR SLAMET ALS IGOR BIN SRIYANTO (ALM)', 'NARKOTIKA', 'BLOK A / KAMAR 01', '15 Oct 2020', '15 Oct 2020', '15 Oct 2020', '28 Dec 2023', '-', 'HADIR', 'Menunggu SK'],
    ['BI.1296-D/2020',    'IFANDI RIZKI FATMA BIN ILYAS',           'NARKOTIKA', 'BLOK B / KAMAR 05', '22 Jun 2026', '22 Jun 2026', '22 Jun 2026', '28 Dec 2023', '-', 'HADIR', 'Sudah dijatuhi Permintaan'],
    ['BI.084-O/2022',     'ARFAN HERMAWAN BIN A.B.A KARIES AHMAD',  'PENCURIAN', 'BLOK C / KAMAR 03', '15 Oct 2025', '15 Oct 2025', '15 Oct 2025', '15 Apr 2026', '-', 'HADIR', 'Sudah ada hasil SK'],
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

seedIfEmpty('dokumentasi_media', () => {
  const oldVideo = db.prepare('SELECT video_path FROM dokumentasi_video WHERE id = 1').get();
  if (oldVideo?.video_path) {
    db.prepare(`
      INSERT INTO dokumentasi_media (media_type, media_path, display_duration_sec, sort_order)
      VALUES ('video', ?, 8, 1)
    `).run(oldVideo.video_path);
  }
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

seedIfEmpty('giat_pengawalan', () => {
  const insert = db.prepare(`
    INSERT INTO giat_pengawalan
      (tanggal, nama_wbp, petugas, keterangan, dokumentasi_path)
    VALUES (?, ?, ?, ?, ?)
  `);
  const rows = [
    ['2026-04-12', 'WBP A.N. E\nWBP A.N. F', 'Tim Pengawalan Regu A\nStaf B', 'Pengawalan sidang lanjutan', null],
    ['2026-04-15', 'WBP A.N. G', 'Tim Pengawalan Regu B', 'Kontrol rumah sakit', null],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('register_f', () => {
  const insert = db.prepare(`
    INSERT INTO register_f
      (no_register, nama_wbp, jenis_pelanggaran, tanggal_pelanggaran, lama_hukuman, hukuman_mulai, hukuman_selesai, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['RF-001/IV/2026', 'WBP A.N. H', 'Membawa barang terlarang', '2026-04-10', '14 HARI', '2026-04-11', '2026-04-24', 'Pembinaan khusus blok disiplin'],
    ['RF-002/IV/2026', 'WBP A.N. I', 'Pelanggaran tata tertib kamar', '2026-04-13', '7 HARI', '2026-04-14', '2026-04-20', 'Teguran tertulis dan monitoring'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('tu_umum_barang', () => {
  const insert = db.prepare(`
    INSERT INTO tu_umum_barang
      (kode, uraian, satuan, tahun_perolehan, saldo_awal_kuantitas, saldo_awal_nilai, bertambah_kuantitas, bertambah_nilai, berkurang_kuantitas, berkurang_nilai, saldo_akhir_kuantitas, saldo_akhir_nilai)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['3090101002', 'Pistol', 'Buah', '2026', '0', '0', '0', '0', '27', '147,441,806', '(27)', '(147,441,806)'],
    ['3090103001', 'Senapan Grendel (Bolt Action Figle)', 'Buah', '2026', '0', '0', '0', '0', '23', '43,300,013', '(23)', '(43,300,013)'],
    ['3090103999', 'Senjata Bahu/Senjata Laras Panjang Lainnya', 'dummy', '2026', '0', '0', '28', '53,287,513', '28', '62,341,513', '0', '(9,054,000)'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('tu_kepegawaian', () => {
  const insert = db.prepare(`
    INSERT INTO tu_kepegawaian
      (nama_pegawai, nip, pangkat_gol, jabatan, agama, status, pendidikan, penempatan_seksi, penempatan_bidang, jenis_kelamin, type_pegawai)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['FONIKA AFFANDI, A.Md.I.P., S.H., M.H.', '198005282000121001', 'Pembina Tingkat I (IV/b)', 'KALAPAS', 'ISLAM', 'MENIKAH', 'STRATA 2', 'TATA USAHA', 'TATA USAHA', 'Laki-Laki', 'STRUKTURAL'],
    ['MARIA REZKI SANTOSO, A.Md.I.P., S.H., M.H.', '197903112000122001', 'Pembina (IV/a)', 'Kabag Tata Usaha', 'ISLAM', 'MENIKAH', 'STRATA 2', 'TATA USAHA', 'TATA USAHA', 'Perempuan', 'STRUKTURAL'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('giiatja_kegiatan', () => {
  const insert = db.prepare(`
    INSERT INTO giiatja_kegiatan
      (kategori, jenis_kegiatan, peserta_kegiatan, pengawas, dokumentasi_path, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['A (AREA DALAM)', '', '', '', null, 1],
    ['B (AREA PERTENGAHAN)', '', '', '', null, 2],
    ['C (AREA LUAR/ASIMILASI)', '', '', '', null, 3],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('giiatja_kegiatan_detail', () => {
  const categoryRows = db.prepare('SELECT id, kategori FROM giiatja_kegiatan ORDER BY sort_order ASC, id ASC').all();
  const categoryByName = Object.fromEntries(categoryRows.map(item => [String(item.kategori || '').trim().toUpperCase(), item.id]));

  const insert = db.prepare(`
    INSERT INTO giiatja_kegiatan_detail
      (kegiatan_id, jenis_kegiatan, peserta_kegiatan, pengawas, dokumentasi_path, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const rows = [
    [categoryByName['A (AREA DALAM)'], 'PANGKAS', 'WBP A.N. L', 'Petugas A', null, 1],
    [categoryByName['A (AREA DALAM)'], 'PANGKAS', 'WBP A.N. M', 'Petugas A', null, 2],
    [categoryByName['A (AREA DALAM)'], 'HIDROPONIK', 'WBP A.N. N', 'Petugas B', null, 3],
    [categoryByName['B (AREA PERTENGAHAN)'], 'IKAN NILA', 'WBP A.N. O', 'Petugas C', null, 1],
    [categoryByName['B (AREA PERTENGAHAN)'], 'SABLON', 'WBP A.N. P', 'Petugas D', null, 2],
    [categoryByName['C (AREA LUAR/ASIMILASI)'], 'BODY REPAIR', 'WBP A.N. Q', 'Petugas E', null, 1],
  ];

  rows.forEach(row => {
    if (row[0]) insert.run(...row);
  });
});

seedIfEmpty('giiatja_pelatihan_sertifikat', () => {
  const insert = db.prepare(`
    INSERT INTO giiatja_pelatihan_sertifikat
      (no_registrasi, nama_wbp, jenis_pelatihan, tanggal_pelaksanaan, instruktur, poto_sertifikat_path, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['BI.201-GJ/2026', 'WBP A.N. J', 'MENJAHIT', '18 April 2026', 'Instruktur BLK Medan', null, '-'],
    ['BI.202-GJ/2026', 'WBP A.N. K', 'HIDROPONIK', '19 April 2026', 'Instruktur Dinas Pertanian', null, '-'],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('giiatja_pnbp', () => {
  const insert = db.prepare(`
    INSERT INTO giiatja_pnbp
      (tahun, periode_pnbp, jumlah_pnbp, target_realisasi, persentase, keterangan, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['2026', 'JANUARI', '10.500.000', '10.000.000', '105%', 'TERCAPAI', 1],
    ['2026', 'FEBRUARI', '8.700.000', '10.000.000', '87%', 'TIDAK TERCAPAI', 2],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('giiatja_pnbp_pendapatan', () => {
  const insert = db.prepare(`
    INSERT INTO giiatja_pnbp_pendapatan
      (tahun, periode_pnbp, kegiatan, peserta, jumlah, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['2026', 'JANUARI', 'KERAJINAN', '35', '5500000', 1],
    ['2026', 'JANUARI', 'PANGKAS', '22', '5000000', 2],
    ['2026', 'FEBRUARI', 'SABLON', '29', '4200000', 1],
    ['2026', 'FEBRUARI', 'PERTANIAN', '31', '4500000', 2],
  ];
  rows.forEach(r => insert.run(...r));
});

seedIfEmpty('giiatja_premi_wbp', () => {
  const insert = db.prepare(`
    INSERT INTO giiatja_premi_wbp
      (no_registrasi, nama_wbp, periode_bulan, periode_tahun, jenis_kegiatan, premi_didapat, keterangan, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [
    ['BI.301-GJ/2026', 'WBP A.N. L', 'APRIL', '2026', 'PANGKAS', '150.000', '-', 1],
    ['BI.302-GJ/2026', 'WBP A.N. M', 'APRIL', '2026', 'SABLON', '125.000', '-', 2],
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

seedIfEmpty('board_luar_tembok_detail', () => {
  const insert = db.prepare('INSERT INTO board_luar_tembok_detail (no_registrasi, nama, tanggal, pendamping, keterangan) VALUES (?, ?, ?, ?, ?)');
  const rows = [
    ['BI.001-LT/2026', 'WBP A.N. E', '17 April 2026', 'Staf A', 'Kontrol rumah sakit'],
    ['BI.002-LT/2026', 'WBP A.N. F', '17 April 2026', 'Staf B', 'Sidang lanjutan'],
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
  const insert = db.prepare('INSERT INTO board_wna_negara (no_registrasi, nama_wbp, asal_negara, tindak_pidana, nama_negara, jumlah, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const rows = [
    ['BI.100-WNA/2026', 'U AUNG NAING', 'MYANMAR', 'NARKOTIKA', 'MYANMAR', 1, '-'],
    ['BI.101-WNA/2026', 'MOHD FAIZ BIN YUSOF', 'MALAYSIA', 'NARKOTIKA', 'MALAYSIA', 1, '-'],
  ];
  rows.forEach(r => insert.run(...r));
});

db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('remisi_title', 'BESARAN REMISI');
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('kata_bijak_text', 'KRISNA adalah sistem Keterbukaan Informasi Warga Binaan di Lapas Kelas I Medan.');
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('menu_title', 'DAFTAR MENU MAKAN HARI INI');
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('keuangan_total_pagu', '57736940000');
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('keuangan_realisasi_belanja', '17819254771');
db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run('keuangan_updated_at', '2026-04-16T13:39');

module.exports = db;
