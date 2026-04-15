const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = 3000;
const DB_FILE_PATH = path.join(__dirname, 'data.db');

function getPublicDataVersion() {
  try {
    return fs.statSync(DB_FILE_PATH).mtimeMs;
  } catch {
    return Date.now();
  }
}

const MENU_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'menu');
if (!fs.existsSync(MENU_UPLOAD_DIR)) {
  fs.mkdirSync(MENU_UPLOAD_DIR, { recursive: true });
}

const menuStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MENU_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'foto-menu';
    cb(null, `${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const menuUpload = multer({
  storage: menuStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('File harus berupa gambar.'));
  }
});

const VIDEO_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'video');
if (!fs.existsSync(VIDEO_UPLOAD_DIR)) {
  fs.mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });
}

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-video${ext}`);
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    cb(new Error('File harus berupa video.'));
  }
});

const RAZIA_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'razia');
if (!fs.existsSync(RAZIA_UPLOAD_DIR)) {
  fs.mkdirSync(RAZIA_UPLOAD_DIR, { recursive: true });
}

const raziaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RAZIA_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'foto-razia';
    cb(null, `${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const raziaUpload = multer({
  storage: raziaStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('File harus berupa gambar.'));
  }
});

function removeUploadedFile(photoPath) {
  if (!photoPath) return;
  const fullPath = path.join(__dirname, 'public', photoPath.replace(/^\/+/, ''));
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch (_err) { }
  }
}

function getAppSetting(settingKey, fallbackValue = '') {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(settingKey);
  return row?.value || fallbackValue;
}

function getTodayYmd() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function syncPembinaanMasterByName(namaWbp, statusIntegrasi) {
  const normalizedName = (namaWbp || '').trim().toUpperCase();
  if (!normalizedName) return;

  const existing = db.prepare(`
    SELECT id
    FROM pentahapan_pembinaan
    WHERE UPPER(TRIM(nama_wbp)) = UPPER(TRIM(?))
    LIMIT 1
  `).get(normalizedName);

  if (existing) {
    db.prepare('UPDATE pentahapan_pembinaan SET nama_wbp=?, status_integrasi=? WHERE id=?')
      .run(normalizedName, statusIntegrasi, existing.id);
    return;
  }

  db.prepare('INSERT INTO pentahapan_pembinaan (nama_wbp, status_integrasi) VALUES (?, ?)')
    .run(normalizedName, statusIntegrasi);
}

// ─── Template Engine ──────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'lapas-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 jam
}));

// ─── Role Access Map ─────────────────────────────────────────────────────────
const ROLES = ['superadmin', 'registrasi', 'pembinaan', 'klinik', 'dapur', 'humas'];

const roleAccess = {
  superadmin: ['dashboard', 'statistik', 'remisi', 'kata-bijak', 'menu', 'jadwal', 'razia', 'strapsel', 'tu-umum', 'kamar-blok', 'papan-isi', 'users', 'video', 'klinik-medis', 'klinik-berobat', 'klinik-oncall', 'klinik-kontrol', 'klinik-statistik'],
  registrasi: ['dashboard', 'statistik', 'remisi', 'kata-bijak'],
  pembinaan: ['dashboard', 'jadwal', 'razia', 'strapsel', 'kamar-blok', 'papan-isi'],
  klinik: ['dashboard', 'klinik-medis', 'klinik-berobat', 'klinik-oncall', 'klinik-kontrol', 'klinik-statistik'],
  dapur: ['dashboard', 'menu'],
  humas: ['dashboard', 'video', 'kata-bijak'],
};

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/admin/login');
}

function requireAccess(page) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/admin/login');
    const allowed = roleAccess[req.session.user.role] || [];
    if (allowed.includes(page)) return next();
    return res.status(403).render('admin/403', { user: req.session.user, active: '' });
  };
}

// ─── Helper: baca semua data publik dari SQLite ───────────────────────────────
function getPublicData() {
  const statistik = db.prepare('SELECT * FROM statistik WHERE id = 1').get();
  const remisiTitle = getAppSetting('remisi_title', 'BESARAN REMISI');
  const menuTitle = getAppSetting('menu_title', 'DAFTAR MENU MAKAN HARI INI');
  const kataBijak = getAppSetting('kata_bijak_text', 'KRISNA adalah sistem Keterbukaan Informasi Warga Binaan di Lapas Kelas I Medan.');
  const todayYmd = getTodayYmd();
  const todayMenuLabel = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const besaranRemisi = db
    .prepare('SELECT jenis, nama, besaran, remisi_total AS remisiTotal FROM besaran_remisi ORDER BY nama COLLATE NOCASE ASC')
    .all();

  const menuMakan = db
    .prepare('SELECT tanggal, waktu, menu, photo_path AS photoPath FROM menu_makan WHERE tanggal = ? ORDER BY id')
    .all(todayYmd);

  const menuMakanHistory = db
    .prepare('SELECT tanggal, waktu, menu, photo_path AS photoPath FROM menu_makan ORDER BY tanggal DESC, id DESC')
    .all();

  const rawPembinaan = db
    .prepare('SELECT nama_wbp, status_integrasi FROM pentahapan_pembinaan ORDER BY nama_wbp COLLATE NOCASE ASC')
    .all();
  const pentahapanPembinaan = [];
  for (let i = 0; i < rawPembinaan.length; i += 2) {
    pentahapanPembinaan.push({
      namaWbp: rawPembinaan[i]?.nama_wbp ?? '',
      statusIntegrasi: rawPembinaan[i]?.status_integrasi ?? '',
      namaWbp2: rawPembinaan[i + 1]?.nama_wbp ?? '',
      statusIntegrasi2: rawPembinaan[i + 1]?.status_integrasi ?? '',
    });
  }

  const pentahapanPembinaanDetail = db
      .prepare(`SELECT d.no_reg AS noReg,
        d.nama_wbp AS namaWbp,
        d.tanggal1,
        d.tanggal2,
        d.tanggal4,
        d.keterangan,
        COALESCE(NULLIF(TRIM(d.status_integrasi), ''), p.status_integrasi, '-') AS statusIntegrasi
      FROM pentahapan_pembinaan_detail d
      LEFT JOIN pentahapan_pembinaan p ON UPPER(TRIM(p.nama_wbp)) = UPPER(TRIM(d.nama_wbp))
      ORDER BY d.nama_wbp COLLATE NOCASE ASC`)
    .all();

  const jadwalKegiatan = db
    .prepare('SELECT hari, waktu, kegiatan, lokasi, penanggung_jawab AS penanggungJawab FROM jadwal_kegiatan ORDER BY id')
    .all();

  const dokumentasiVideoRow = db.prepare('SELECT video_path FROM dokumentasi_video WHERE id = 1').get();

  return {
    totalPenghuni: statistik.total_penghuni,
    kapasitas: statistik.kapasitas,
    bebasHariIni: statistik.bebas_hari_ini,
    tanggal: new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    remisiTitle,
    menuTitle,
    kataBijak,
    todayMenuLabel,
    todayYmd,
    besaranRemisi,
    menuMakan,
    menuMakanHistory,
    pentahapanPembinaan,
    pentahapanPembinaanDetail,
    jadwalKegiatan,
    dokumentasiVideo: dokumentasiVideoRow?.video_path || null,
  };
}

function getClinicData() {
  const tenagaMedis = db
    .prepare('SELECT nama, profesi, status_tugas AS statusTugas, kontak FROM clinic_tenaga_medis ORDER BY id')
    .all();

  const wbpBerobat = db
    .prepare(`SELECT no_reg AS noReg, nama_wbp AS namaWbp, layanan, diagnosa, blok,
                     status_perawatan AS statusPerawatan, tanggal
              FROM clinic_wbp_berobat ORDER BY id DESC`)
    .all();

  const jadwalOnCall = db
    .prepare('SELECT hari, shift, petugas, profesi, kontak FROM clinic_jadwal_on_call ORDER BY id')
    .all();

  const jadwalKontrol = db
    .prepare('SELECT hari, waktu, lokasi_blok AS lokasiBlok, petugas, keterangan FROM clinic_jadwal_kontrol ORDER BY id')
    .all();

  const stat = db.prepare('SELECT * FROM clinic_statistik WHERE id = 1').get() || {
    blok_lansia: 0,
    tb: 0,
    paru: 0,
    hiv: 0,
    lainnya: 0,
    rawat_inap: 0,
  };

  const rawatJalan = wbpBerobat.filter(w => w.statusPerawatan === 'Rawat Jalan').length;
  const rawatInapAktif = wbpBerobat.filter(w => w.statusPerawatan === 'Rawat Inap').length;

  return {
    tenagaMedis,
    wbpBerobat,
    jadwalOnCall,
    jadwalKontrol,
    clinicSummary: {
      totalTenagaMedis: tenagaMedis.length,
      totalWbpBerobat: wbpBerobat.length,
      rawatJalan,
      rawatInapAktif,
      rawatInapStat: stat.rawat_inap,
      blokLansia: stat.blok_lansia,
      tb: stat.tb,
      paru: stat.paru,
      hiv: stat.hiv,
      lainnya: stat.lainnya,
      totalKronis: stat.tb + stat.paru + stat.hiv + stat.lainnya,
    },
  };
}

function getRaziaData() {
  const jadwalRazia = db
    .prepare('SELECT id, tanggal, petugas, dokumentasi_path AS dokumentasiPath FROM razia_jadwal ORDER BY id DESC')
    .all();

  const barangBuktiRazia = db
    .prepare('SELECT id, pemilik, kamar_blok AS kamarBlok, foto_path AS fotoPath FROM razia_barang_bukti ORDER BY id DESC')
    .all();

  return {
    jadwalRazia,
    barangBuktiRazia,
    raziaSummary: {
      totalJadwalRazia: jadwalRazia.length,
      totalBarangBukti: barangBuktiRazia.length,
    }
  };
}

function getSecurityData() {
  const strapselList = db
    .prepare(`SELECT
      id,
      nama_wbp AS namaWbp,
      blok_hunian AS blokHunian,
      tanggal_masuk_strapsel AS tanggalMasukStrapsel,
      ekspirasi,
      permasalahan,
      barang_bukti AS barangBukti,
      dokumentasi_path AS dokumentasiPath
    FROM strapsel_data ORDER BY id DESC`)
    .all();

  return {
    strapselList,
    securitySummary: {
      totalStrapsel: strapselList.length,
    }
  };
}

function getTuUmumData() {
  const tuUmumList = db
    .prepare(`SELECT
      id,
      kode,
      uraian,
      satuan,
      saldo_awal_kuantitas AS saldoAwalKuantitas,
      saldo_awal_nilai AS saldoAwalNilai,
      bertambah_kuantitas AS bertambahKuantitas,
      bertambah_nilai AS bertambahNilai,
      berkurang_kuantitas AS berkurangKuantitas,
      berkurang_nilai AS berkurangNilai,
      saldo_akhir_kuantitas AS saldoAkhirKuantitas,
      saldo_akhir_nilai AS saldoAkhirNilai
    FROM tu_umum_barang ORDER BY id DESC`)
    .all();

  return {
    tuUmumList,
    tuUmumSummary: {
      totalTuUmum: tuUmumList.length,
    }
  };
}

function getHousingData() {
  const blocks = db
    .prepare('SELECT id, gedung, nama_block AS namaBlock FROM housing_blocks ORDER BY gedung COLLATE NOCASE ASC, nama_block COLLATE NOCASE ASC')
    .all();

  const rooms = db
    .prepare(`SELECT
      r.id,
      r.block_id AS blockId,
      r.nama_kamar AS namaKamar,
      r.jumlah_penghuni AS jumlahPenghuni,
      r.kapasitas,
      b.gedung,
      b.nama_block AS namaBlock
    FROM housing_rooms r
    INNER JOIN housing_blocks b ON b.id = r.block_id
    ORDER BY b.gedung COLLATE NOCASE ASC, b.nama_block COLLATE NOCASE ASC, r.nama_kamar COLLATE NOCASE ASC`)
    .all();

  const groupedBlocks = blocks.map(block => {
    const blockRooms = rooms.filter(room => room.blockId === block.id);
    const totalPenghuni = blockRooms.reduce((sum, room) => sum + (Number(room.jumlahPenghuni) || 0), 0);
    const totalKapasitas = blockRooms.reduce((sum, room) => sum + (Number(room.kapasitas) || 0), 0);
    const okupansi = totalKapasitas > 0 ? ((totalPenghuni / totalKapasitas) * 100) : 0;

    return {
      ...block,
      rooms: blockRooms,
      totalPenghuni,
      totalKapasitas,
      okupansi,
    };
  });

  return {
    housingBlocks: groupedBlocks,
    housingRooms: rooms,
    housingSummary: {
      totalBlocks: groupedBlocks.length,
      totalKamar: rooms.length,
      totalPenghuniKamar: rooms.reduce((sum, room) => sum + (Number(room.jumlahPenghuni) || 0), 0),
    }
  };
}

function getBoardData() {
  const pidanaKhusus = db
    .prepare("SELECT id, kategori, jenis, jumlah FROM board_pidana WHERE kategori='khusus' ORDER BY id")
    .all();
  const pidanaUmum = db
    .prepare("SELECT id, kategori, jenis, jumlah FROM board_pidana WHERE kategori='umum' ORDER BY id")
    .all();

  const luarTembok = db
    .prepare(`SELECT id, status,
      wni_keluar AS wniKeluar,
      wni_masuk AS wniMasuk,
      wna_keluar AS wnaKeluar,
      wna_masuk AS wnaMasuk,
      keterangan
      FROM board_luar_tembok ORDER BY id`)
    .all();

  const agama = db
    .prepare('SELECT id, agama, wni, wna FROM board_agama ORDER BY id')
    .all();

  const totalPidanaKhusus = pidanaKhusus.reduce((sum, row) => sum + (Number(row.jumlah) || 0), 0);
  const totalPidanaUmum = pidanaUmum.reduce((sum, row) => sum + (Number(row.jumlah) || 0), 0);
  const totalLuarTembok = luarTembok.reduce((sum, row) => {
    return sum + (Number(row.wniKeluar) || 0) + (Number(row.wniMasuk) || 0) + (Number(row.wnaKeluar) || 0) + (Number(row.wnaMasuk) || 0);
  }, 0);
  const totalAgama = agama.reduce((sum, row) => sum + (Number(row.wni) || 0) + (Number(row.wna) || 0), 0);

  return {
    pidanaKhusus,
    pidanaUmum,
    luarTembok,
    agama,
    boardSummary: {
      totalPidanaKhusus,
      totalPidanaUmum,
      totalLuarTembok,
      totalAgama,
    }
  };
}

function getKalapasData() {
  const umum = getPublicData();
  const klinik = getClinicData();
  const razia = getRaziaData();
  const security = getSecurityData();
  const tuUmum = getTuUmumData();
  const housing = getHousingData();
  const board = getBoardData();

  const okupansi = umum.kapasitas > 0
    ? ((umum.totalPenghuni / umum.kapasitas) * 100).toFixed(1)
    : '0.0';

  return {
    ...umum,
    clinicSummary: klinik.clinicSummary,
    topRemisi: umum.besaranRemisi.slice(0, 5),
    topOnCall: klinik.jadwalOnCall.slice(0, 5),
    topKontrol: klinik.jadwalKontrol.slice(0, 5),
    wbpBerobat: klinik.wbpBerobat,
    tenagaMedis: klinik.tenagaMedis,
    jadwalRazia: razia.jadwalRazia,
    barangBuktiRazia: razia.barangBuktiRazia,
    raziaSummary: razia.raziaSummary,
    strapselList: security.strapselList,
    securitySummary: security.securitySummary,
    tuUmumList: tuUmum.tuUmumList,
    tuUmumSummary: tuUmum.tuUmumSummary,
    housingBlocks: housing.housingBlocks,
    housingRooms: housing.housingRooms,
    housingSummary: housing.housingSummary,
    pidanaKhusus: board.pidanaKhusus,
    pidanaUmum: board.pidanaUmum,
    luarTembok: board.luarTembok,
    agama: board.agama,
    boardSummary: board.boardSummary,
    okupansi,
  };
}

// ─── Inject allowed pages into every admin view ──────────────────────────────
app.use('/admin', (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.allowed = roleAccess[req.session.user.role] || [];
  } else {
    res.locals.allowed = [];
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.render('index', {
    ...getPublicData(),
    clinicSummary: getClinicData().clinicSummary,
    activePage: 'umum'
  });
});

app.get('/klinik', (req, res) => {
  const kataBijak = getAppSetting('kata_bijak_text', 'KRISNA adalah sistem Keterbukaan Informasi Warga Binaan di Lapas Kelas I Medan.');
  const tanggal = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  res.render('klinik', { ...getClinicData(), kataBijak, tanggal, activePage: 'klinik' });
});

app.get('/kalapas', (req, res) => {
  res.render('kalapas', { ...getKalapasData(), activePage: 'kalapas' });
});

app.get('/kalapas/table/pengamanan', (req, res) => {
  res.render('kalapas-pengamanan', {
    activePage: 'kalapas'
  });
});

app.get('/kalapas/papan-isi', (req, res) => {
  const umum = getPublicData();
  const housing = getHousingData();
  const board = getBoardData();
  res.render('kalapas-papan-isi', {
    ...umum,
    ...housing,
    ...board,
    activePage: 'kalapas'
  });
});

app.get('/kalapas/table/okupansi', (req, res) => {
  const umum = getPublicData();
  const okupansi = umum.kapasitas > 0
    ? ((umum.totalPenghuni / umum.kapasitas) * 100).toFixed(1)
    : '0.0';

  res.render('kalapas-table', {
    pageTitle: 'Detail Okupansi Hunian',
    sectionTitle: 'OKUPANSI HUNIAN WARGA BINAAN',
    subtitle: `Data tanggal ${umum.tanggal}`,
    columns: ['TOTAL PENGHUNI', 'KAPASITAS', 'OKUPANSI (%)', 'BEBAS HARI INI'],
    rows: [[String(umum.totalPenghuni), String(umum.kapasitas), `${okupansi}%`, `${umum.bebasHariIni} Orang`]],
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/remisi', (req, res) => {
  const umum = getPublicData();
  const rows = umum.besaranRemisi.map(item => [
    item.nama || '-',
    item.besaran || '-',
    item.remisiTotal || '-',
    item.jenis || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: umum.remisiTitle,
    sectionTitle: umum.remisiTitle,
    subtitle: `Total data: ${rows.length}`,
    columns: ['NAMA WARGA BINAAN', 'BESARAN REMISI', 'REMISI TOTAL', 'KETERANGAN'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/pembinaan', (req, res) => {
  const umum = getPublicData();
  const rows = umum.pentahapanPembinaanDetail.map(item => [
    item.noReg || '-',
    item.namaWbp || '-',
    item.tanggal1 || '-',
    item.tanggal2 || '-',
    item.tanggal4 || '-',
    item.keterangan || '-',
    item.statusIntegrasi || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Pentahapan Pembinaan',
    sectionTitle: 'DETAIL PENTAHAPAN PEMBINAAN',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NO REG', 'NAMA WARGA BINAAN', 'TANGGAL 1/2', 'TANGGAL 2/3', 'TANGGAL EKSPIRASI', 'KETERANGAN PROGRAM PEMBINAAN', 'STATUS INTEGRASI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/berobat', (req, res) => {
  const klinik = getClinicData();
  const rows = klinik.wbpBerobat.map(item => [
    item.noReg || '-',
    item.namaWbp || '-',
    item.layanan || '-',
    item.diagnosa || '-',
    item.blok || '-',
    item.statusPerawatan || '-',
    item.tanggal || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Warga Binaan Berobat',
    sectionTitle: 'WARGA BINAAN BEROBAT',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NO REG', 'NAMA WARGA BINAAN', 'LAYANAN', 'DIAGNOSA', 'BLOK', 'STATUS', 'TANGGAL'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/razia-jadwal', (req, res) => {
  const razia = getRaziaData();
  const rows = razia.jadwalRazia.map(item => [
    item.tanggal || '-',
    item.petugas || '-',
    item.dokumentasiPath || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Jadwal Razia',
    sectionTitle: 'JADWAL RAZIA',
    subtitle: `Total data: ${rows.length}`,
    columns: ['TANGGAL', 'PETUGAS', 'DOKUMENTASI RAZIA'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/razia-barang-bukti', (req, res) => {
  const razia = getRaziaData();
  const rows = razia.barangBuktiRazia.map(item => [
    item.pemilik || '-',
    item.kamarBlok || '-',
    item.fotoPath || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Barang Bukti Razia',
    sectionTitle: 'BARANG BUKTI RAZIA',
    subtitle: `Total data: ${rows.length}`,
    columns: ['PEMILIK', 'KAMAR/BLOK', 'FOTO BARANG BUKTI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/strapsel', (req, res) => {
  const security = getSecurityData();
  const rows = security.strapselList.map(item => [
    item.namaWbp || '-',
    item.blokHunian || '-',
    item.tanggalMasukStrapsel || '-',
    item.ekspirasi || '-',
    item.permasalahan || '-',
    item.barangBukti || '-',
    item.dokumentasiPath || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Data Strapsel',
    sectionTitle: 'DATA STRAPSEL',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NAMA WBP', 'BLOK HUNIAN', 'TANGGAL MASUK STRAPSEL', 'EKSPIRASI', 'PERMASALAHAN', 'BARANG BUKTI', 'DOKUMENTASI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/kamtib', (req, res) => {
  const razia = getRaziaData();
  const security = getSecurityData();

  res.render('kalapas-kamtib', {
    pageTitle: 'Kamtib',
    subtitle: `Jadwal Razia: ${razia.jadwalRazia.length} | Barang Bukti: ${razia.barangBuktiRazia.length} | Strapsel: ${security.strapselList.length}`,
    jadwalRazia: razia.jadwalRazia,
    barangBuktiRazia: razia.barangBuktiRazia,
    strapselList: security.strapselList,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/tu-umum', (req, res) => {
  const data = getTuUmumData();
  const rows = data.tuUmumList.map(item => [
    item.kode || '-',
    item.uraian || '-',
    item.satuan || '-',
    item.saldoAwalKuantitas || '0',
    item.saldoAwalNilai || '0',
    item.bertambahKuantitas || '0',
    item.bertambahNilai || '0',
    item.berkurangKuantitas || '0',
    item.berkurangNilai || '0',
    item.saldoAkhirKuantitas || '0',
    item.saldoAkhirNilai || '0',
  ]);

  res.render('kalapas-table', {
    pageTitle: 'TU Bagian Umum',
    sectionTitle: 'LAPORAN BARANG PENGGUNA - TU BAGIAN UMUM',
    subtitle: `Total data: ${rows.length}`,
    columns: ['KODE', 'URAIAN', 'SATUAN', 'SALDO AWAL QTY', 'SALDO AWAL NILAI', 'BERTAMBAH QTY', 'BERTAMBAH NILAI', 'BERKURANG QTY', 'BERKURANG NILAI', 'SALDO AKHIR QTY', 'SALDO AKHIR NILAI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/kamar-blok', (req, res) => {
  const housing = getHousingData();
  const rows = housing.housingRooms.map(item => {
    const jumlahPenghuni = Number(item.jumlahPenghuni) || 0;
    const kapasitas = Number(item.kapasitas) || 0;
    const okupansi = kapasitas > 0 ? `${((jumlahPenghuni / kapasitas) * 100).toFixed(1)}%` : '-';
    return [
      item.gedung || '-',
      item.namaBlock || '-',
      item.namaKamar || '-',
      String(jumlahPenghuni),
      String(kapasitas),
      okupansi,
    ];
  });

  res.render('kalapas-table', {
    pageTitle: 'Informasi Kamar/Blok',
    sectionTitle: 'INFORMASI KAMAR/BLOK',
    subtitle: `Total blok: ${housing.housingSummary.totalBlocks} | Total kamar: ${housing.housingSummary.totalKamar}`,
    columns: ['GEDUNG', 'BLOK', 'KAMAR', 'JUMLAH PENGHUNI', 'KAPASITAS', 'OKUPANSI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/pidana-khusus', (req, res) => {
  const board = getBoardData();
  const rows = board.pidanaKhusus.map(item => [item.jenis || '-', String(item.jumlah || 0)]);
  res.render('kalapas-table', {
    pageTitle: 'Pidana Khusus',
    sectionTitle: 'JENIS TINDAK PIDANA KHUSUS',
    subtitle: `Total kategori: ${rows.length}`,
    columns: ['JENIS', 'JUMLAH'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/pidana-umum', (req, res) => {
  const board = getBoardData();
  const rows = board.pidanaUmum.map(item => [item.jenis || '-', String(item.jumlah || 0)]);
  res.render('kalapas-table', {
    pageTitle: 'Pidana Umum',
    sectionTitle: 'JENIS TINDAK PIDANA UMUM',
    subtitle: `Total kategori: ${rows.length}`,
    columns: ['JENIS', 'JUMLAH'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/luar-tembok', (req, res) => {
  const board = getBoardData();
  const rows = board.luarTembok.map(item => {
    const wniKeluar = Number(item.wniKeluar) || 0;
    const wniMasuk = Number(item.wniMasuk) || 0;
    const wnaKeluar = Number(item.wnaKeluar) || 0;
    const wnaMasuk = Number(item.wnaMasuk) || 0;
    const total = wniKeluar + wniMasuk + wnaKeluar + wnaMasuk;
    return [item.status || '-', String(wniKeluar), String(wniMasuk), String(wnaKeluar), String(wnaMasuk), String(total), item.keterangan || '-'];
  });
  res.render('kalapas-table', {
    pageTitle: 'WBP di Luar Tembok',
    sectionTitle: 'WBP DI LUAR TEMBOK',
    subtitle: `Total status: ${rows.length}`,
    columns: ['STATUS', 'WNI KELUAR', 'WNI MASUK', 'WNA KELUAR', 'WNA MASUK', 'JUMLAH', 'KETERANGAN'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/agama', (req, res) => {
  const board = getBoardData();
  const rows = board.agama.map(item => {
    const wni = Number(item.wni) || 0;
    const wna = Number(item.wna) || 0;
    return [item.agama || '-', String(wni), String(wna), String(wni + wna)];
  });
  res.render('kalapas-table', {
    pageTitle: 'Jumlah Berdasarkan Agama',
    sectionTitle: 'JUMLAH WBP BERDASARKAN AGAMA',
    subtitle: `Total agama: ${rows.length}`,
    columns: ['AGAMA', 'WNI', 'WNA', 'JUMLAH'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/api/public-data-version', (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({ version: getPublicDataVersion() });
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════

app.get('/admin/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('admin/login', { error: 'Username atau password salah.' });
  }
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.redirect('/admin/dashboard');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN PROTECTED ROUTES
// ═══════════════════════════════════════════════════════════════════

// ── Dashboard ────────────────────────────────────────────────────
app.get('/admin', requireLogin, (req, res) => res.redirect('/admin/dashboard'));

app.get('/admin/dashboard', requireAccess('dashboard'), (req, res) => {
  const stats = {
    remisi: db.prepare('SELECT COUNT(*) AS c FROM besaran_remisi').get().c,
    menu: db.prepare('SELECT COUNT(*) AS c FROM menu_makan').get().c,
    pembinaan: db.prepare('SELECT COUNT(*) AS c FROM pentahapan_pembinaan').get().c,
    detail: db.prepare('SELECT COUNT(*) AS c FROM pentahapan_pembinaan_detail').get().c,
    jadwal: db.prepare('SELECT COUNT(*) AS c FROM jadwal_kegiatan').get().c,
    raziaJadwal: db.prepare('SELECT COUNT(*) AS c FROM razia_jadwal').get().c,
    raziaBarangBukti: db.prepare('SELECT COUNT(*) AS c FROM razia_barang_bukti').get().c,
    strapsel: db.prepare('SELECT COUNT(*) AS c FROM strapsel_data').get().c,
    tuUmum: db.prepare('SELECT COUNT(*) AS c FROM tu_umum_barang').get().c,
    kamarBlok: db.prepare('SELECT COUNT(*) AS c FROM housing_blocks').get().c,
    papanIsi: db.prepare('SELECT COUNT(*) AS c FROM board_pidana').get().c + db.prepare('SELECT COUNT(*) AS c FROM board_luar_tembok').get().c + db.prepare('SELECT COUNT(*) AS c FROM board_agama').get().c,
    users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
  };
  const allowed = roleAccess[req.session.user.role] || [];
  res.render('admin/dashboard', { user: req.session.user, stats, active: 'dashboard', allowed });
});

// ── Statistik ────────────────────────────────────────────────────
app.get('/admin/statistik', requireAccess('statistik'), (req, res) => {
  const data = db.prepare('SELECT * FROM statistik WHERE id = 1').get();
  res.render('admin/statistik', { user: req.session.user, data, active: 'statistik', success: req.query.success });
});

app.post('/admin/statistik/update', requireAccess('statistik'), (req, res) => {
  const { total_penghuni, kapasitas, bebas_hari_ini, tanggal } = req.body;
  db.prepare(`UPDATE statistik SET total_penghuni=?, kapasitas=?, bebas_hari_ini=?, tanggal=? WHERE id=1`)
    .run(Number(total_penghuni), Number(kapasitas), Number(bebas_hari_ini), tanggal);
  res.redirect('/admin/statistik?success=1');
});

// ── Besaran Remisi ────────────────────────────────────────────────
app.get('/admin/remisi', requireAccess('remisi'), (req, res) => {
  const list = db.prepare('SELECT * FROM besaran_remisi ORDER BY id').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM besaran_remisi WHERE id=?').get(Number(req.query.edit)) : null;
  const remisiTitle = getAppSetting('remisi_title', 'BESARAN REMISI');
  res.render('admin/remisi', {
    user: req.session.user,
    list,
    edit,
    remisiTitle,
    active: 'remisi',
    success: req.query.success,
    titleSuccess: req.query.titleSuccess
  });
});

app.post('/admin/remisi/title/update', requireAccess('remisi'), (req, res) => {
  const nextTitle = (req.body.remisi_title || '').trim() || 'BESARAN REMISI';
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run('remisi_title', nextTitle);
  res.redirect('/admin/remisi?titleSuccess=1');
});

app.post('/admin/remisi/add', requireAccess('remisi'), (req, res) => {
  const { jenis, besaran, remisi_total } = req.body;
  const nama = (req.body.nama || '').toUpperCase();
  db.prepare('INSERT INTO besaran_remisi (jenis, nama, besaran, remisi_total) VALUES (?, ?, ?, ?)')
    .run(jenis, nama, besaran, remisi_total || besaran || '');
  res.redirect('/admin/remisi?success=1');
});

app.post('/admin/remisi/:id/update', requireAccess('remisi'), (req, res) => {
  const { jenis, besaran, remisi_total } = req.body;
  const nama = (req.body.nama || '').toUpperCase();
  db.prepare('UPDATE besaran_remisi SET jenis=?, nama=?, besaran=?, remisi_total=? WHERE id=?')
    .run(jenis, nama, besaran, remisi_total || besaran || '', Number(req.params.id));
  res.redirect('/admin/remisi?success=1');
});

app.post('/admin/remisi/:id/delete', requireAccess('remisi'), (req, res) => {
  db.prepare('DELETE FROM besaran_remisi WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/remisi');
});

// ── Kata Bijak ────────────────────────────────────────────────────
app.get('/admin/kata-bijak', requireAccess('kata-bijak'), (req, res) => {
  const kataBijak = getAppSetting('kata_bijak_text', 'KRISNA adalah sistem Keterbukaan Informasi Warga Binaan di Lapas Kelas I Medan.');
  res.render('admin/kata-bijak', {
    user: req.session.user,
    kataBijak,
    active: 'kata-bijak',
    success: req.query.success
  });
});

app.post('/admin/kata-bijak/update', requireAccess('kata-bijak'), (req, res) => {
  const nextText = (req.body.kata_bijak || '').trim() || 'KRISNA adalah sistem Keterbukaan Informasi Warga Binaan di Lapas Kelas I Medan.';
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run('kata_bijak_text', nextText);
  res.redirect('/admin/kata-bijak?success=1');
});

// ── Menu Makan ────────────────────────────────────────────────────
app.get('/admin/menu', requireAccess('menu'), (req, res) => {
  const selectedTanggal = (req.query.tanggal || '').trim() || getTodayYmd();
  const list = db.prepare('SELECT * FROM menu_makan WHERE tanggal = ? ORDER BY id DESC').all(selectedTanggal);
  const totalHistory = db.prepare('SELECT COUNT(*) AS c FROM menu_makan').get().c;
  const edit = req.query.edit ? db.prepare('SELECT * FROM menu_makan WHERE id=?').get(Number(req.query.edit)) : null;
  const menuTitle = getAppSetting('menu_title', 'DAFTAR MENU MAKAN HARI INI');
  res.render('admin/menu', {
    user: req.session.user,
    list,
    edit,
    menuTitle,
    todayYmd: getTodayYmd(),
    selectedTanggal,
    totalHistory,
    active: 'menu',
    success: req.query.success,
    titleSuccess: req.query.titleSuccess,
    error: req.query.error
  });
});

app.post('/admin/menu/title/update', requireAccess('menu'), (req, res) => {
  const nextTitle = (req.body.menu_title || '').trim() || 'DAFTAR MENU MAKAN HARI INI';
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run('menu_title', nextTitle);
  res.redirect('/admin/menu?titleSuccess=1');
});

app.post('/admin/menu/add', requireAccess('menu'), menuUpload.single('photo'), (req, res) => {
  const tanggal = (req.body.tanggal || '').trim() || getTodayYmd();
  const { waktu, menu } = req.body;
  const photoPath = req.file ? `/uploads/menu/${req.file.filename}` : null;
  db.prepare('INSERT INTO menu_makan (tanggal, waktu, menu, photo_path) VALUES (?, ?, ?, ?)').run(tanggal, waktu, menu, photoPath);
  res.redirect('/admin/menu?success=1');
});

app.post('/admin/menu/:id/update', requireAccess('menu'), menuUpload.single('photo'), (req, res) => {
  const tanggal = (req.body.tanggal || '').trim() || getTodayYmd();
  const { waktu, menu } = req.body;
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT photo_path FROM menu_makan WHERE id=?').get(id);
  let nextPhotoPath = existing?.photo_path || null;

  if (req.file) {
    if (nextPhotoPath) removeUploadedFile(nextPhotoPath);
    nextPhotoPath = `/uploads/menu/${req.file.filename}`;
  }

  db.prepare('UPDATE menu_makan SET tanggal=?, waktu=?, menu=?, photo_path=? WHERE id=?').run(tanggal, waktu, menu, nextPhotoPath, id);
  res.redirect('/admin/menu?success=1');
});

app.post('/admin/menu/:id/delete', requireAccess('menu'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT photo_path FROM menu_makan WHERE id=?').get(id);
  if (existing?.photo_path) removeUploadedFile(existing.photo_path);
  db.prepare('DELETE FROM menu_makan WHERE id=?').run(id);
  res.redirect('/admin/menu');
});

// ── Pentahapan Pembinaan ──────────────────────────────────────────
app.get('/admin/pembinaan', requireAccess('pembinaan'), (req, res) => {
  const list = db.prepare('SELECT * FROM pentahapan_pembinaan ORDER BY id').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM pentahapan_pembinaan WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/pembinaan', { user: req.session.user, list, edit, active: 'pembinaan', success: req.query.success });
});

app.post('/admin/pembinaan/add', requireAccess('pembinaan'), (req, res) => {
  const { status_integrasi } = req.body;
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare('INSERT INTO pentahapan_pembinaan (nama_wbp, status_integrasi) VALUES (?, ?)').run(nama_wbp, status_integrasi);
  res.redirect('/admin/pembinaan?success=1');
});

app.post('/admin/pembinaan/:id/update', requireAccess('pembinaan'), (req, res) => {
  const { status_integrasi } = req.body;
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare('UPDATE pentahapan_pembinaan SET nama_wbp=?, status_integrasi=? WHERE id=?').run(nama_wbp, status_integrasi, Number(req.params.id));
  res.redirect('/admin/pembinaan?success=1');
});

app.post('/admin/pembinaan/:id/delete', requireAccess('pembinaan'), (req, res) => {
  db.prepare('DELETE FROM pentahapan_pembinaan WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/pembinaan');
});

// ── Pentahapan Pembinaan Detail ───────────────────────────────────
app.get('/admin/pembinaan-detail', requireAccess('pembinaan-detail'), (req, res) => {
  const list = db.prepare('SELECT * FROM pentahapan_pembinaan_detail ORDER BY id').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM pentahapan_pembinaan_detail WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/pembinaan-detail', { user: req.session.user, list, edit, active: 'pembinaan-detail', success: req.query.success });
});

app.post('/admin/pembinaan-detail/add', requireAccess('pembinaan-detail'), (req, res) => {
  const { no_reg, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan } = req.body;
  const statusIntegrasi = (req.body.status_integrasi || '').trim();
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare(`INSERT INTO pentahapan_pembinaan_detail (no_reg, nama_wbp, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan, status_integrasi)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(no_reg, nama_wbp, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan, statusIntegrasi);
  syncPembinaanMasterByName(nama_wbp, statusIntegrasi);
  res.redirect('/admin/pembinaan-detail?success=1');
});

app.post('/admin/pembinaan-detail/:id/update', requireAccess('pembinaan-detail'), (req, res) => {
  const { no_reg, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan } = req.body;
  const statusIntegrasi = (req.body.status_integrasi || '').trim();
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare(`UPDATE pentahapan_pembinaan_detail SET no_reg=?, nama_wbp=?, tanggal1=?, tanggal2=?, tanggal3=?, tanggal4=?, total_remisi=?, keterangan=?, status_integrasi=? WHERE id=?`)
    .run(no_reg, nama_wbp, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan, statusIntegrasi, Number(req.params.id));
  syncPembinaanMasterByName(nama_wbp, statusIntegrasi);
  res.redirect('/admin/pembinaan-detail?success=1');
});

app.post('/admin/pembinaan-detail/:id/delete', requireAccess('pembinaan-detail'), (req, res) => {
  db.prepare('DELETE FROM pentahapan_pembinaan_detail WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/pembinaan-detail');
});

// ── Jadwal Kegiatan ───────────────────────────────────────────────
app.get('/admin/jadwal', requireAccess('jadwal'), (req, res) => {
  const list = db.prepare('SELECT * FROM jadwal_kegiatan ORDER BY id').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM jadwal_kegiatan WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/jadwal', { user: req.session.user, list, edit, active: 'jadwal', success: req.query.success });
});

app.post('/admin/jadwal/add', requireAccess('jadwal'), (req, res) => {
  const hari = (req.body.hari || '').trim();
  const waktu = (req.body.waktu || '').trim();
  const kegiatan = (req.body.kegiatan || '').trim();
  const lokasi = (req.body.lokasi || '').trim();
  const penanggungJawab = (req.body.penanggung_jawab || '').trim();
  db.prepare('INSERT INTO jadwal_kegiatan (hari, waktu, kegiatan, lokasi, penanggung_jawab) VALUES (?, ?, ?, ?, ?)')
    .run(hari, waktu, kegiatan, lokasi, penanggungJawab);
  res.redirect('/admin/jadwal?success=1');
});

app.post('/admin/jadwal/:id/update', requireAccess('jadwal'), (req, res) => {
  const hari = (req.body.hari || '').trim();
  const waktu = (req.body.waktu || '').trim();
  const kegiatan = (req.body.kegiatan || '').trim();
  const lokasi = (req.body.lokasi || '').trim();
  const penanggungJawab = (req.body.penanggung_jawab || '').trim();
  db.prepare('UPDATE jadwal_kegiatan SET hari=?, waktu=?, kegiatan=?, lokasi=?, penanggung_jawab=? WHERE id=?')
    .run(hari, waktu, kegiatan, lokasi, penanggungJawab, Number(req.params.id));
  res.redirect('/admin/jadwal?success=1');
});

app.post('/admin/jadwal/:id/delete', requireAccess('jadwal'), (req, res) => {
  db.prepare('DELETE FROM jadwal_kegiatan WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/jadwal');
});

// ── Razia ─────────────────────────────────────────────────────────
app.get('/admin/razia', requireAccess('razia'), (req, res) => {
  const jadwalList = db.prepare('SELECT * FROM razia_jadwal ORDER BY id DESC').all();
  const buktiList = db.prepare('SELECT * FROM razia_barang_bukti ORDER BY id DESC').all();
  const editJadwal = req.query.editJadwal ? db.prepare('SELECT * FROM razia_jadwal WHERE id=?').get(Number(req.query.editJadwal)) : null;
  const editBukti = req.query.editBukti ? db.prepare('SELECT * FROM razia_barang_bukti WHERE id=?').get(Number(req.query.editBukti)) : null;

  res.render('admin/razia', {
    user: req.session.user,
    jadwalList,
    buktiList,
    editJadwal,
    editBukti,
    active: 'razia',
    success: req.query.success,
    error: req.query.error
  });
});

app.post('/admin/razia/jadwal/add', requireAccess('razia'), raziaUpload.single('dokumentasi'), (req, res) => {
  const { tanggal, petugas } = req.body;
  const dokumentasiPath = req.file ? `/uploads/razia/${req.file.filename}` : null;
  db.prepare('INSERT INTO razia_jadwal (tanggal, petugas, dokumentasi_path) VALUES (?, ?, ?)').run(tanggal, petugas, dokumentasiPath);
  res.redirect('/admin/razia?success=1');
});

app.post('/admin/razia/jadwal/:id/update', requireAccess('razia'), raziaUpload.single('dokumentasi'), (req, res) => {
  const id = Number(req.params.id);
  const { tanggal, petugas } = req.body;
  const existing = db.prepare('SELECT dokumentasi_path FROM razia_jadwal WHERE id=?').get(id);
  let nextPath = existing?.dokumentasi_path || null;

  if (req.file) {
    if (nextPath) removeUploadedFile(nextPath);
    nextPath = `/uploads/razia/${req.file.filename}`;
  }

  db.prepare('UPDATE razia_jadwal SET tanggal=?, petugas=?, dokumentasi_path=? WHERE id=?').run(tanggal, petugas, nextPath, id);
  res.redirect('/admin/razia?success=1');
});

app.post('/admin/razia/jadwal/:id/delete', requireAccess('razia'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT dokumentasi_path FROM razia_jadwal WHERE id=?').get(id);
  if (existing?.dokumentasi_path) removeUploadedFile(existing.dokumentasi_path);
  db.prepare('DELETE FROM razia_jadwal WHERE id=?').run(id);
  res.redirect('/admin/razia?success=1');
});

app.post('/admin/razia/bukti/add', requireAccess('razia'), raziaUpload.single('foto'), (req, res) => {
  const { pemilik, kamar_blok } = req.body;
  const fotoPath = req.file ? `/uploads/razia/${req.file.filename}` : null;
  db.prepare('INSERT INTO razia_barang_bukti (pemilik, kamar_blok, foto_path) VALUES (?, ?, ?)').run(pemilik, kamar_blok, fotoPath);
  res.redirect('/admin/razia?success=1');
});

app.post('/admin/razia/bukti/:id/update', requireAccess('razia'), raziaUpload.single('foto'), (req, res) => {
  const id = Number(req.params.id);
  const { pemilik, kamar_blok } = req.body;
  const existing = db.prepare('SELECT foto_path FROM razia_barang_bukti WHERE id=?').get(id);
  let nextPath = existing?.foto_path || null;

  if (req.file) {
    if (nextPath) removeUploadedFile(nextPath);
    nextPath = `/uploads/razia/${req.file.filename}`;
  }

  db.prepare('UPDATE razia_barang_bukti SET pemilik=?, kamar_blok=?, foto_path=? WHERE id=?').run(pemilik, kamar_blok, nextPath, id);
  res.redirect('/admin/razia?success=1');
});

app.post('/admin/razia/bukti/:id/delete', requireAccess('razia'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT foto_path FROM razia_barang_bukti WHERE id=?').get(id);
  if (existing?.foto_path) removeUploadedFile(existing.foto_path);
  db.prepare('DELETE FROM razia_barang_bukti WHERE id=?').run(id);
  res.redirect('/admin/razia?success=1');
});

// ── Strapsel ──────────────────────────────────────────────────────
app.get('/admin/strapsel', requireAccess('strapsel'), (req, res) => {
  const list = db.prepare('SELECT * FROM strapsel_data ORDER BY id DESC').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM strapsel_data WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/strapsel', { user: req.session.user, list, edit, active: 'strapsel', success: req.query.success, error: req.query.error });
});

app.post('/admin/strapsel/add', requireAccess('strapsel'), raziaUpload.single('dokumentasi'), (req, res) => {
  const { nama_wbp, blok_hunian, tanggal_masuk_strapsel, ekspirasi, permasalahan, barang_bukti } = req.body;
  const dokumentasiPath = req.file ? `/uploads/razia/${req.file.filename}` : null;
  db.prepare(`
    INSERT INTO strapsel_data
      (nama_wbp, blok_hunian, tanggal_masuk_strapsel, ekspirasi, permasalahan, barang_bukti, dokumentasi_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nama_wbp, blok_hunian, tanggal_masuk_strapsel, ekspirasi || '', permasalahan || '', barang_bukti || '', dokumentasiPath);
  res.redirect('/admin/strapsel?success=1');
});

app.post('/admin/strapsel/:id/update', requireAccess('strapsel'), raziaUpload.single('dokumentasi'), (req, res) => {
  const id = Number(req.params.id);
  const { nama_wbp, blok_hunian, tanggal_masuk_strapsel, ekspirasi, permasalahan, barang_bukti } = req.body;
  const existing = db.prepare('SELECT dokumentasi_path FROM strapsel_data WHERE id=?').get(id);
  let nextPath = existing?.dokumentasi_path || null;

  if (req.file) {
    if (nextPath) removeUploadedFile(nextPath);
    nextPath = `/uploads/razia/${req.file.filename}`;
  }

  db.prepare(`
    UPDATE strapsel_data
    SET nama_wbp=?, blok_hunian=?, tanggal_masuk_strapsel=?, ekspirasi=?, permasalahan=?, barang_bukti=?, dokumentasi_path=?
    WHERE id=?
  `).run(nama_wbp, blok_hunian, tanggal_masuk_strapsel, ekspirasi || '', permasalahan || '', barang_bukti || '', nextPath, id);
  res.redirect('/admin/strapsel?success=1');
});

app.post('/admin/strapsel/:id/delete', requireAccess('strapsel'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT dokumentasi_path FROM strapsel_data WHERE id=?').get(id);
  if (existing?.dokumentasi_path) removeUploadedFile(existing.dokumentasi_path);
  db.prepare('DELETE FROM strapsel_data WHERE id=?').run(id);
  res.redirect('/admin/strapsel?success=1');
});

// ── TU Bagian Umum ───────────────────────────────────────────────
app.get('/admin/tu-umum', requireAccess('tu-umum'), (req, res) => {
  const list = db.prepare('SELECT * FROM tu_umum_barang ORDER BY id DESC').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM tu_umum_barang WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/tu-umum', { user: req.session.user, list, edit, active: 'tu-umum', success: req.query.success });
});

app.post('/admin/tu-umum/add', requireAccess('tu-umum'), (req, res) => {
  const {
    kode, uraian, satuan,
    saldo_awal_kuantitas, saldo_awal_nilai,
    bertambah_kuantitas, bertambah_nilai,
    berkurang_kuantitas, berkurang_nilai,
    saldo_akhir_kuantitas, saldo_akhir_nilai,
  } = req.body;

  db.prepare(`
    INSERT INTO tu_umum_barang
      (kode, uraian, satuan, saldo_awal_kuantitas, saldo_awal_nilai, bertambah_kuantitas, bertambah_nilai, berkurang_kuantitas, berkurang_nilai, saldo_akhir_kuantitas, saldo_akhir_nilai)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    kode, uraian, satuan,
    saldo_awal_kuantitas || '0', saldo_awal_nilai || '0',
    bertambah_kuantitas || '0', bertambah_nilai || '0',
    berkurang_kuantitas || '0', berkurang_nilai || '0',
    saldo_akhir_kuantitas || '0', saldo_akhir_nilai || '0'
  );

  res.redirect('/admin/tu-umum?success=1');
});

app.post('/admin/tu-umum/:id/update', requireAccess('tu-umum'), (req, res) => {
  const {
    kode, uraian, satuan,
    saldo_awal_kuantitas, saldo_awal_nilai,
    bertambah_kuantitas, bertambah_nilai,
    berkurang_kuantitas, berkurang_nilai,
    saldo_akhir_kuantitas, saldo_akhir_nilai,
  } = req.body;

  db.prepare(`
    UPDATE tu_umum_barang
    SET kode=?, uraian=?, satuan=?, saldo_awal_kuantitas=?, saldo_awal_nilai=?, bertambah_kuantitas=?, bertambah_nilai=?, berkurang_kuantitas=?, berkurang_nilai=?, saldo_akhir_kuantitas=?, saldo_akhir_nilai=?
    WHERE id=?
  `).run(
    kode, uraian, satuan,
    saldo_awal_kuantitas || '0', saldo_awal_nilai || '0',
    bertambah_kuantitas || '0', bertambah_nilai || '0',
    berkurang_kuantitas || '0', berkurang_nilai || '0',
    saldo_akhir_kuantitas || '0', saldo_akhir_nilai || '0',
    Number(req.params.id)
  );

  res.redirect('/admin/tu-umum?success=1');
});

app.post('/admin/tu-umum/:id/delete', requireAccess('tu-umum'), (req, res) => {
  db.prepare('DELETE FROM tu_umum_barang WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/tu-umum?success=1');
});

// ── Kamar/Blok ──────────────────────────────────────────────────
app.get('/admin/kamar-blok', requireAccess('kamar-blok'), (req, res) => {
  const blocks = db.prepare('SELECT * FROM housing_blocks ORDER BY gedung COLLATE NOCASE ASC, nama_block COLLATE NOCASE ASC').all();
  const rooms = db.prepare(`
    SELECT r.*, b.gedung, b.nama_block
    FROM housing_rooms r
    INNER JOIN housing_blocks b ON b.id = r.block_id
    ORDER BY b.gedung COLLATE NOCASE ASC, b.nama_block COLLATE NOCASE ASC, r.nama_kamar COLLATE NOCASE ASC
  `).all();
  const editBlock = req.query.editBlock ? db.prepare('SELECT * FROM housing_blocks WHERE id=?').get(Number(req.query.editBlock)) : null;
  const editRoom = req.query.editRoom ? db.prepare('SELECT * FROM housing_rooms WHERE id=?').get(Number(req.query.editRoom)) : null;
  res.render('admin/kamar-blok', { user: req.session.user, blocks, rooms, editBlock, editRoom, active: 'kamar-blok', success: req.query.success, error: req.query.error });
});

app.post('/admin/kamar-blok/block/add', requireAccess('kamar-blok'), (req, res) => {
  const gedung = (req.body.gedung || '').trim();
  const namaBlock = (req.body.nama_block || '').trim();
  if (!gedung || !namaBlock) return res.redirect('/admin/kamar-blok?error=Gedung+dan+nama+blok+wajib+diisi');
  try {
    db.prepare('INSERT INTO housing_blocks (gedung, nama_block) VALUES (?, ?)').run(gedung, namaBlock);
    res.redirect('/admin/kamar-blok?success=1');
  } catch {
    res.redirect('/admin/kamar-blok?error=Nama+blok+sudah+ada');
  }
});

app.post('/admin/kamar-blok/block/:id/update', requireAccess('kamar-blok'), (req, res) => {
  const gedung = (req.body.gedung || '').trim();
  const namaBlock = (req.body.nama_block || '').trim();
  if (!gedung || !namaBlock) return res.redirect('/admin/kamar-blok?error=Gedung+dan+nama+blok+wajib+diisi');
  try {
    db.prepare('UPDATE housing_blocks SET gedung=?, nama_block=? WHERE id=?').run(gedung, namaBlock, Number(req.params.id));
    res.redirect('/admin/kamar-blok?success=1');
  } catch {
    res.redirect('/admin/kamar-blok?error=Nama+blok+sudah+ada');
  }
});

app.post('/admin/kamar-blok/block/:id/delete', requireAccess('kamar-blok'), (req, res) => {
  const blockId = Number(req.params.id);
  db.prepare('DELETE FROM housing_rooms WHERE block_id=?').run(blockId);
  db.prepare('DELETE FROM housing_blocks WHERE id=?').run(blockId);
  res.redirect('/admin/kamar-blok?success=1');
});

app.post('/admin/kamar-blok/room/add', requireAccess('kamar-blok'), (req, res) => {
  const blockId = Number(req.body.block_id);
  const namaKamar = (req.body.nama_kamar || '').trim();
  const jumlahPenghuni = Number(req.body.jumlah_penghuni || 0);
  const kapasitas = Number(req.body.kapasitas || 0);
  if (!blockId || !namaKamar) return res.redirect('/admin/kamar-blok?error=Data+kamar+belum+lengkap');
  db.prepare('INSERT INTO housing_rooms (block_id, nama_kamar, jumlah_penghuni, kapasitas) VALUES (?, ?, ?, ?)').run(blockId, namaKamar, jumlahPenghuni, kapasitas);
  res.redirect('/admin/kamar-blok?success=1');
});

app.post('/admin/kamar-blok/room/:id/update', requireAccess('kamar-blok'), (req, res) => {
  const blockId = Number(req.body.block_id);
  const namaKamar = (req.body.nama_kamar || '').trim();
  const jumlahPenghuni = Number(req.body.jumlah_penghuni || 0);
  const kapasitas = Number(req.body.kapasitas || 0);
  if (!blockId || !namaKamar) return res.redirect('/admin/kamar-blok?error=Data+kamar+belum+lengkap');
  db.prepare('UPDATE housing_rooms SET block_id=?, nama_kamar=?, jumlah_penghuni=?, kapasitas=? WHERE id=?').run(blockId, namaKamar, jumlahPenghuni, kapasitas, Number(req.params.id));
  res.redirect('/admin/kamar-blok?success=1');
});

app.post('/admin/kamar-blok/room/:id/delete', requireAccess('kamar-blok'), (req, res) => {
  db.prepare('DELETE FROM housing_rooms WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/kamar-blok?success=1');
});

// ── Papan Keadaan Isi Lapas ─────────────────────────────────────
app.get('/admin/papan-isi', requireAccess('papan-isi'), (req, res) => {
  const data = getBoardData();
  const editPidana = req.query.editPidana ? db.prepare('SELECT * FROM board_pidana WHERE id=?').get(Number(req.query.editPidana)) : null;
  const editLuar = req.query.editLuar ? db.prepare('SELECT * FROM board_luar_tembok WHERE id=?').get(Number(req.query.editLuar)) : null;
  const editAgama = req.query.editAgama ? db.prepare('SELECT * FROM board_agama WHERE id=?').get(Number(req.query.editAgama)) : null;
  res.render('admin/papan-isi', {
    user: req.session.user,
    active: 'papan-isi',
    success: req.query.success,
    ...data,
    editPidana,
    editLuar,
    editAgama,
  });
});

app.post('/admin/papan-isi/pidana/add', requireAccess('papan-isi'), (req, res) => {
  const kategori = req.body.kategori === 'umum' ? 'umum' : 'khusus';
  const jenis = (req.body.jenis || '').trim();
  const jumlah = Number(req.body.jumlah || 0);
  if (!jenis) return res.redirect('/admin/papan-isi');
  db.prepare('INSERT INTO board_pidana (kategori, jenis, jumlah) VALUES (?, ?, ?)').run(kategori, jenis, jumlah);
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/pidana/:id/update', requireAccess('papan-isi'), (req, res) => {
  const kategori = req.body.kategori === 'umum' ? 'umum' : 'khusus';
  const jenis = (req.body.jenis || '').trim();
  const jumlah = Number(req.body.jumlah || 0);
  if (!jenis) return res.redirect('/admin/papan-isi');
  db.prepare('UPDATE board_pidana SET kategori=?, jenis=?, jumlah=? WHERE id=?').run(kategori, jenis, jumlah, Number(req.params.id));
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/pidana/:id/delete', requireAccess('papan-isi'), (req, res) => {
  db.prepare('DELETE FROM board_pidana WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/luar/add', requireAccess('papan-isi'), (req, res) => {
  const status = (req.body.status || '').trim();
  if (!status) return res.redirect('/admin/papan-isi');
  db.prepare(`
    INSERT INTO board_luar_tembok (status, wni_keluar, wni_masuk, wna_keluar, wna_masuk, keterangan)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    status,
    Number(req.body.wni_keluar || 0),
    Number(req.body.wni_masuk || 0),
    Number(req.body.wna_keluar || 0),
    Number(req.body.wna_masuk || 0),
    (req.body.keterangan || '').trim()
  );
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/luar/:id/update', requireAccess('papan-isi'), (req, res) => {
  const status = (req.body.status || '').trim();
  if (!status) return res.redirect('/admin/papan-isi');
  db.prepare(`
    UPDATE board_luar_tembok
    SET status=?, wni_keluar=?, wni_masuk=?, wna_keluar=?, wna_masuk=?, keterangan=?
    WHERE id=?
  `).run(
    status,
    Number(req.body.wni_keluar || 0),
    Number(req.body.wni_masuk || 0),
    Number(req.body.wna_keluar || 0),
    Number(req.body.wna_masuk || 0),
    (req.body.keterangan || '').trim(),
    Number(req.params.id)
  );
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/luar/:id/delete', requireAccess('papan-isi'), (req, res) => {
  db.prepare('DELETE FROM board_luar_tembok WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/agama/add', requireAccess('papan-isi'), (req, res) => {
  const agama = (req.body.agama || '').trim();
  if (!agama) return res.redirect('/admin/papan-isi');
  db.prepare('INSERT INTO board_agama (agama, wni, wna) VALUES (?, ?, ?)').run(agama, Number(req.body.wni || 0), Number(req.body.wna || 0));
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/agama/:id/update', requireAccess('papan-isi'), (req, res) => {
  const agama = (req.body.agama || '').trim();
  if (!agama) return res.redirect('/admin/papan-isi');
  db.prepare('UPDATE board_agama SET agama=?, wni=?, wna=? WHERE id=?').run(agama, Number(req.body.wni || 0), Number(req.body.wna || 0), Number(req.params.id));
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/agama/:id/delete', requireAccess('papan-isi'), (req, res) => {
  db.prepare('DELETE FROM board_agama WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/papan-isi?success=1');
});

// ── Klinik: Tenaga Medis ──────────────────────────────────────────
app.get('/admin/klinik-medis', requireAccess('klinik-medis'), (req, res) => {
  const list = db.prepare('SELECT * FROM clinic_tenaga_medis ORDER BY id').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM clinic_tenaga_medis WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/klinik-medis', { user: req.session.user, list, edit, active: 'klinik-medis', success: req.query.success });
});

app.post('/admin/klinik-medis/add', requireAccess('klinik-medis'), (req, res) => {
  const { nama, profesi, status_tugas, kontak } = req.body;
  db.prepare('INSERT INTO clinic_tenaga_medis (nama, profesi, status_tugas, kontak) VALUES (?, ?, ?, ?)').run(nama, profesi, status_tugas, kontak || '');
  res.redirect('/admin/klinik-medis?success=1');
});

app.post('/admin/klinik-medis/:id/update', requireAccess('klinik-medis'), (req, res) => {
  const { nama, profesi, status_tugas, kontak } = req.body;
  db.prepare('UPDATE clinic_tenaga_medis SET nama=?, profesi=?, status_tugas=?, kontak=? WHERE id=?').run(nama, profesi, status_tugas, kontak || '', Number(req.params.id));
  res.redirect('/admin/klinik-medis?success=1');
});

app.post('/admin/klinik-medis/:id/delete', requireAccess('klinik-medis'), (req, res) => {
  db.prepare('DELETE FROM clinic_tenaga_medis WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/klinik-medis');
});

// ── Klinik: WBP Berobat ───────────────────────────────────────────
app.get('/admin/klinik-berobat', requireAccess('klinik-berobat'), (req, res) => {
  const list = db.prepare('SELECT * FROM clinic_wbp_berobat ORDER BY id DESC').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM clinic_wbp_berobat WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/klinik-berobat', { user: req.session.user, list, edit, active: 'klinik-berobat', success: req.query.success });
});

app.post('/admin/klinik-berobat/add', requireAccess('klinik-berobat'), (req, res) => {
  const { no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal } = req.body;
  db.prepare('INSERT INTO clinic_wbp_berobat (no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal) VALUES (?, ?, ?, ?, ?, ?, ?)').run(no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal);
  res.redirect('/admin/klinik-berobat?success=1');
});

app.post('/admin/klinik-berobat/:id/update', requireAccess('klinik-berobat'), (req, res) => {
  const { no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal } = req.body;
  db.prepare('UPDATE clinic_wbp_berobat SET no_reg=?, nama_wbp=?, layanan=?, diagnosa=?, blok=?, status_perawatan=?, tanggal=? WHERE id=?').run(no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal, Number(req.params.id));
  res.redirect('/admin/klinik-berobat?success=1');
});

app.post('/admin/klinik-berobat/:id/delete', requireAccess('klinik-berobat'), (req, res) => {
  db.prepare('DELETE FROM clinic_wbp_berobat WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/klinik-berobat');
});

// ── Klinik: Jadwal On Call ────────────────────────────────────────
app.get('/admin/klinik-oncall', requireAccess('klinik-oncall'), (req, res) => {
  const list = db.prepare('SELECT * FROM clinic_jadwal_on_call ORDER BY id').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM clinic_jadwal_on_call WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/klinik-oncall', { user: req.session.user, list, edit, active: 'klinik-oncall', success: req.query.success });
});

app.post('/admin/klinik-oncall/add', requireAccess('klinik-oncall'), (req, res) => {
  const { hari, shift, petugas, profesi, kontak } = req.body;
  db.prepare('INSERT INTO clinic_jadwal_on_call (hari, shift, petugas, profesi, kontak) VALUES (?, ?, ?, ?, ?)').run(hari, shift, petugas, profesi, kontak || '');
  res.redirect('/admin/klinik-oncall?success=1');
});

app.post('/admin/klinik-oncall/:id/update', requireAccess('klinik-oncall'), (req, res) => {
  const { hari, shift, petugas, profesi, kontak } = req.body;
  db.prepare('UPDATE clinic_jadwal_on_call SET hari=?, shift=?, petugas=?, profesi=?, kontak=? WHERE id=?').run(hari, shift, petugas, profesi, kontak || '', Number(req.params.id));
  res.redirect('/admin/klinik-oncall?success=1');
});

app.post('/admin/klinik-oncall/:id/delete', requireAccess('klinik-oncall'), (req, res) => {
  db.prepare('DELETE FROM clinic_jadwal_on_call WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/klinik-oncall');
});

// ── Klinik: Jadwal Kontrol ────────────────────────────────────────
app.get('/admin/klinik-kontrol', requireAccess('klinik-kontrol'), (req, res) => {
  const list = db.prepare('SELECT * FROM clinic_jadwal_kontrol ORDER BY id').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM clinic_jadwal_kontrol WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/klinik-kontrol', { user: req.session.user, list, edit, active: 'klinik-kontrol', success: req.query.success });
});

app.post('/admin/klinik-kontrol/add', requireAccess('klinik-kontrol'), (req, res) => {
  const { hari, waktu, lokasi_blok, petugas, keterangan } = req.body;
  db.prepare('INSERT INTO clinic_jadwal_kontrol (hari, waktu, lokasi_blok, petugas, keterangan) VALUES (?, ?, ?, ?, ?)').run(hari, waktu, lokasi_blok, petugas, keterangan || '');
  res.redirect('/admin/klinik-kontrol?success=1');
});

app.post('/admin/klinik-kontrol/:id/update', requireAccess('klinik-kontrol'), (req, res) => {
  const { hari, waktu, lokasi_blok, petugas, keterangan } = req.body;
  db.prepare('UPDATE clinic_jadwal_kontrol SET hari=?, waktu=?, lokasi_blok=?, petugas=?, keterangan=? WHERE id=?').run(hari, waktu, lokasi_blok, petugas, keterangan || '', Number(req.params.id));
  res.redirect('/admin/klinik-kontrol?success=1');
});

app.post('/admin/klinik-kontrol/:id/delete', requireAccess('klinik-kontrol'), (req, res) => {
  db.prepare('DELETE FROM clinic_jadwal_kontrol WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/klinik-kontrol');
});

// ── Klinik: Statistik ─────────────────────────────────────────────
app.get('/admin/klinik-statistik', requireAccess('klinik-statistik'), (req, res) => {
  const data = db.prepare('SELECT * FROM clinic_statistik WHERE id = 1').get() || { blok_lansia: 0, tb: 0, paru: 0, hiv: 0, lainnya: 0, rawat_inap: 0 };
  res.render('admin/klinik-statistik', { user: req.session.user, data, active: 'klinik-statistik', success: req.query.success });
});

app.post('/admin/klinik-statistik/update', requireAccess('klinik-statistik'), (req, res) => {
  const { blok_lansia, tb, paru, hiv, lainnya, rawat_inap } = req.body;
  db.prepare('UPDATE clinic_statistik SET blok_lansia=?, tb=?, paru=?, hiv=?, lainnya=?, rawat_inap=? WHERE id=1')
    .run(Number(blok_lansia), Number(tb), Number(paru), Number(hiv), Number(lainnya), Number(rawat_inap));
  res.redirect('/admin/klinik-statistik?success=1');
});

// ── Video Dokumentasi ──────────────────────────────────────────────
app.get('/admin/video', requireAccess('video'), (req, res) => {
  const data = db.prepare('SELECT * FROM dokumentasi_video WHERE id = 1').get();
  res.render('admin/video', { user: req.session.user, data, active: 'video', success: req.query.success, error: req.query.error });
});

app.post('/admin/video/update', requireAccess('video'), videoUpload.single('video'), (req, res) => {
  const existing = db.prepare('SELECT video_path FROM dokumentasi_video WHERE id = 1').get();
  let nextVideoPath = existing?.video_path || null;

  if (req.file) {
    if (nextVideoPath) removeUploadedFile(nextVideoPath);
    nextVideoPath = `/uploads/video/${req.file.filename}`;
  }

  db.prepare('UPDATE dokumentasi_video SET video_path=? WHERE id=1').run(nextVideoPath);
  res.redirect('/admin/video?success=1');
});

// ── Users ─────────────────────────────────────────────────────────
app.get('/admin/users', requireAccess('users'), (req, res) => {
  const list = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all();
  const edit = req.query.edit ? db.prepare('SELECT id, username, role FROM users WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/users', { user: req.session.user, list, edit, active: 'users', success: req.query.success, error: req.query.error, ROLES });
});

app.post('/admin/users/add', requireAccess('users'), (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashed, role || 'registrasi');
    res.redirect('/admin/users?success=1');
  } catch {
    res.redirect('/admin/users?error=Username+sudah+digunakan');
  }
});

app.post('/admin/users/:id/update', requireAccess('users'), (req, res) => {
  const { username, password, role } = req.body;
  const id = Number(req.params.id);
  try {
    if (password && password.trim() !== '') {
      const hashed = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET username=?, password=?, role=? WHERE id=?').run(username, hashed, role, id);
    } else {
      db.prepare('UPDATE users SET username=?, role=? WHERE id=?').run(username, role, id);
    }
    res.redirect('/admin/users?success=1');
  } catch {
    res.redirect('/admin/users?error=Username+sudah+digunakan');
  }
});

app.post('/admin/users/:id/delete', requireAccess('users'), (req, res) => {
  const id = Number(req.params.id);
  if (id === req.session.user.id) return res.redirect('/admin/users?error=Tidak+bisa+hapus+akun+sendiri');
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  res.redirect('/admin/users');
});

app.use((err, req, res, next) => {
  if (!err) return next();

  if (req.path.startsWith('/admin/menu')) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.redirect('/admin/menu?error=Ukuran+foto+maksimal+3MB');
    }
    if (err.message && err.message.includes('File harus berupa gambar')) {
      return res.redirect('/admin/menu?error=File+harus+berupa+gambar');
    }
    return res.redirect('/admin/menu?error=Gagal+upload+foto');
  }

  if (req.path.startsWith('/admin/video')) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.redirect('/admin/video?error=Ukuran+video+maksimal+50MB');
    }
    if (err.message && err.message.includes('File harus berupa video')) {
      return res.redirect('/admin/video?error=File+harus+berupa+video');
    }
    return res.redirect('/admin/video?error=Gagal+upload+video');
  }

  if (req.path.startsWith('/admin/razia')) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.redirect('/admin/razia?error=Ukuran+foto+maksimal+5MB');
    }
    if (err.message && err.message.includes('File harus berupa gambar')) {
      return res.redirect('/admin/razia?error=File+harus+berupa+gambar');
    }
    return res.redirect('/admin/razia?error=Gagal+upload+foto');
  }

  if (req.path.startsWith('/admin/strapsel')) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.redirect('/admin/strapsel?error=Ukuran+foto+maksimal+5MB');
    }
    if (err.message && err.message.includes('File harus berupa gambar')) {
      return res.redirect('/admin/strapsel?error=File+harus+berupa+gambar');
    }
    return res.redirect('/admin/strapsel?error=Gagal+upload+foto');
  }

  return next(err);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
  console.log(`🔐 Admin panel  : http://localhost:${PORT}/admin/login`);
  console.log(`   Default login: admin / admin123`);
});
