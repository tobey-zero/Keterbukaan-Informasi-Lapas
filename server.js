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

const HUMAS_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'humas');
if (!fs.existsSync(HUMAS_UPLOAD_DIR)) {
  fs.mkdirSync(HUMAS_UPLOAD_DIR, { recursive: true });
}

const humasMediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, HUMAS_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'media-humas';
    cb(null, `${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const humasMediaUpload = multer({
  storage: humasMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('File harus berupa foto atau video.'));
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

function getJakartaNowDatetimeLocal() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

function parseMoneyNumber(value) {
  const cleaned = String(value ?? '').replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value) || 0);
}

function formatFinanceUpdatedAt(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return '-';
  const [datePart, timePart] = raw.split('T');
  const dateObj = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(dateObj.getTime())) return '-';
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateObj);
  return `${formattedDate} pukul ${timePart} WIB`;
}

function getFinanceSummary() {
  const totalPagu = parseMoneyNumber(getAppSetting('keuangan_total_pagu', '0'));
  const realisasiBelanja = parseMoneyNumber(getAppSetting('keuangan_realisasi_belanja', '0'));
  const sisaPagu = Math.max(totalPagu - realisasiBelanja, 0);
  const updatedAtRaw = getAppSetting('keuangan_updated_at', getJakartaNowDatetimeLocal());
  const chartTotal = Math.max(totalPagu, realisasiBelanja + sisaPagu);
  const realisasiPercent = chartTotal > 0 ? ((realisasiBelanja / chartTotal) * 100) : 0;
  const sisaPercent = chartTotal > 0 ? ((sisaPagu / chartTotal) * 100) : 0;

  return {
    totalPagu,
    realisasiBelanja,
    sisaPagu,
    updatedAtRaw,
    updatedAtLabel: formatFinanceUpdatedAt(updatedAtRaw),
    realisasiPercent: Number(realisasiPercent.toFixed(1)),
    sisaPercent: Number(sisaPercent.toFixed(1)),
    totalPaguLabel: `Rp ${formatRupiah(totalPagu)}`,
    realisasiBelanjaLabel: `Rp ${formatRupiah(realisasiBelanja)}`,
    sisaPaguLabel: `Rp ${formatRupiah(sisaPagu)}`,
  };
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
const ROLES = ['superadmin', 'registrasi', 'pembinaan', 'klinik', 'dapur', 'humas', 'kamtib', 'tata_usaha', 'pengamanan'];

const roleAccess = {
  superadmin: ['dashboard', 'statistik', 'remisi', 'kata-bijak', 'menu', 'jadwal', 'pembinaan-detail', 'razia', 'pengawalan', 'strapsel', 'tu-umum', 'kamar-blok', 'papan-isi', 'luar-tembok', 'users', 'video', 'klinik-medis', 'klinik-berobat', 'klinik-oncall', 'klinik-kontrol', 'klinik-statistik'],
  registrasi: ['dashboard', 'statistik', 'remisi', 'papan-isi'],
  pembinaan: ['dashboard', 'jadwal', 'pembinaan-detail'],
  klinik: ['dashboard', 'klinik-medis', 'klinik-berobat', 'klinik-oncall', 'klinik-kontrol', 'klinik-statistik'],
  dapur: ['dashboard', 'menu'],
  humas: ['dashboard', 'video', 'kata-bijak'],
  kamtib: ['dashboard',  'razia', 'pengawalan', 'strapsel', 'kamar-blok'],
  tata_usaha: ['dashboard', 'tu-umum'],
  pengamanan: ['dashboard', 'kamar-blok', 'luar-tembok'],
  pengamana: ['dashboard', 'kamar-blok', 'luar-tembok'],
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

  const dokumentasiMedia = db.prepare(`
    SELECT
      id,
      media_type AS mediaType,
      media_path AS mediaPath,
      display_duration_sec AS displayDurationSec,
      sort_order AS sortOrder
    FROM dokumentasi_media
    ORDER BY sort_order ASC, id ASC
  `).all();

  const dokumentasiVideoFallbackRow = db.prepare('SELECT video_path FROM dokumentasi_video WHERE id = 1').get();
  if (!dokumentasiMedia.length && dokumentasiVideoFallbackRow?.video_path) {
    dokumentasiMedia.push({
      id: 0,
      mediaType: 'video',
      mediaPath: dokumentasiVideoFallbackRow.video_path,
      displayDurationSec: 8,
      sortOrder: 1,
    });
  }

  const dokumentasiVideo = dokumentasiMedia.find(item => item.mediaType === 'video')?.mediaPath || null;

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
    dokumentasiMedia,
    dokumentasiVideo,
  };
}

function getClinicData(filter = {}) {
  const selectedTanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(filter.tanggal || ''))
    ? String(filter.tanggal)
    : null;

  const tenagaMedis = db
    .prepare('SELECT nama, profesi, status_tugas AS statusTugas, kontak FROM clinic_tenaga_medis ORDER BY id')
    .all();

  const wbpBerobatSql = `SELECT no_reg AS noReg, nama_wbp AS namaWbp, layanan, diagnosa, blok,
                     status_perawatan AS statusPerawatan, tanggal
              FROM clinic_wbp_berobat`;
  const wbpBerobat = selectedTanggal
    ? db.prepare(`${wbpBerobatSql} WHERE tanggal = ? ORDER BY id DESC`).all(selectedTanggal)
    : db.prepare(`${wbpBerobatSql} ORDER BY id DESC`).all();

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
    selectedTanggal,
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

function getPengawalanData(filter = {}) {
  const { month, year } = filter;
  const where = [];
  const params = [];

  if (year) {
    where.push('substr(tanggal, 1, 4) = ?');
    params.push(String(year));
  }
  if (month) {
    where.push('substr(tanggal, 6, 2) = ?');
    params.push(String(month));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const list = db.prepare(`
    SELECT
      id,
      tanggal,
      nama_wbp AS namaWbp,
      petugas,
      keterangan,
      dokumentasi_path AS dokumentasiPath
    FROM giat_pengawalan
    ${whereSql}
    ORDER BY tanggal DESC, id DESC
  `).all(...params);

  const years = db.prepare(`
    SELECT DISTINCT substr(tanggal, 1, 4) AS year
    FROM giat_pengawalan
    WHERE length(tanggal) >= 7
    ORDER BY year DESC
  `).all().map(row => row.year).filter(Boolean);

  return { list, years };
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

  const pegawaiList = db
    .prepare(`SELECT
      id,
      nama_pegawai AS namaPegawai,
      nip,
      pangkat_gol AS pangkatGol,
      jabatan,
      agama,
      status,
      pendidikan,
      penempatan_seksi AS penempatanSeksi,
      penempatan_bidang AS penempatanBidang,
      jenis_kelamin AS jenisKelamin,
      type_pegawai AS typePegawai
    FROM tu_kepegawaian ORDER BY id ASC`)
    .all();

  return {
    tuUmumList,
    pegawaiList,
    financeSummary: getFinanceSummary(),
    tuUmumSummary: {
      totalTuUmum: tuUmumList.length,
      totalPegawai: pegawaiList.length,
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

  const luarTembokDetail = db
    .prepare(`SELECT
      id,
      no_registrasi AS noRegistrasi,
      nama,
      tanggal,
      pendamping,
      keterangan
      FROM board_luar_tembok_detail
      ORDER BY id DESC`)
    .all();

  const agama = db
    .prepare('SELECT id, agama, wni, wna FROM board_agama ORDER BY id')
    .all();

  const registrasiHunian = db
    .prepare(`SELECT
      id,
      no_urut AS noUrut,
      blok,
      registrasi,
      wni_isi AS wniIsi,
      wni_tambah AS wniTambah,
      wni_kurang AS wniKurang,
      wna_isi AS wnaIsi,
      wna_tambah AS wnaTambah,
      wna_kurang AS wnaKurang
    FROM board_registrasi_hunian
    ORDER BY no_urut ASC, id ASC`)
    .all();

  const wnaNegara = db
    .prepare(`SELECT
      id,
      no_registrasi AS noRegistrasi,
      nama_wbp AS namaWbp,
      asal_negara AS asalNegara,
      tindak_pidana AS tindakPidana
      FROM board_wna_negara
      ORDER BY nama_wbp COLLATE NOCASE ASC, id ASC`)
    .all();

  const wnaNegaraRekapMap = {};
  wnaNegara.forEach((item) => {
    const negara = (item.asalNegara || '-').trim() || '-';
    wnaNegaraRekapMap[negara] = (wnaNegaraRekapMap[negara] || 0) + 1;
  });
  const wnaNegaraRekap = Object.entries(wnaNegaraRekapMap)
    .sort((a, b) => a[0].localeCompare(b[0], 'id', { sensitivity: 'base' }))
    .map(([asalNegara, jumlah]) => ({ asalNegara, jumlah }));

  const totalPidanaKhusus = pidanaKhusus.reduce((sum, row) => sum + (Number(row.jumlah) || 0), 0);
  const totalPidanaUmum = pidanaUmum.reduce((sum, row) => sum + (Number(row.jumlah) || 0), 0);
  const totalLuarTembok = luarTembok.reduce((sum, row) => {
    return sum + (Number(row.wniKeluar) || 0) + (Number(row.wniMasuk) || 0) + (Number(row.wnaKeluar) || 0) + (Number(row.wnaMasuk) || 0);
  }, 0);
  const totalAgama = agama.reduce((sum, row) => sum + (Number(row.wni) || 0) + (Number(row.wna) || 0), 0);
  const totalRegistrasiWniIsi = registrasiHunian.reduce((sum, row) => sum + (Number(row.wniIsi) || 0), 0);
  const totalRegistrasiWniTambah = registrasiHunian.reduce((sum, row) => sum + (Number(row.wniTambah) || 0), 0);
  const totalRegistrasiWniKurang = registrasiHunian.reduce((sum, row) => sum + (Number(row.wniKurang) || 0), 0);
  const totalRegistrasiWnaIsi = registrasiHunian.reduce((sum, row) => sum + (Number(row.wnaIsi) || 0), 0);
  const totalRegistrasiWnaTambah = registrasiHunian.reduce((sum, row) => sum + (Number(row.wnaTambah) || 0), 0);
  const totalRegistrasiWnaKurang = registrasiHunian.reduce((sum, row) => sum + (Number(row.wnaKurang) || 0), 0);
  const totalRegistrasiJumlah = registrasiHunian.reduce((sum, row) => {
    return sum + (Number(row.wniIsi) || 0) + (Number(row.wniTambah) || 0) + (Number(row.wnaIsi) || 0) + (Number(row.wnaTambah) || 0);
  }, 0);
  const totalWnaNegara = wnaNegara.length;

  return {
    pidanaKhusus,
    pidanaUmum,
    luarTembok,
    luarTembokDetail,
    agama,
    registrasiHunian,
    wnaNegara,
    wnaNegaraRekap,
    boardSummary: {
      totalPidanaKhusus,
      totalPidanaUmum,
      totalLuarTembok,
      totalAgama,
      totalRegistrasiWniIsi,
      totalRegistrasiWniTambah,
      totalRegistrasiWniKurang,
      totalRegistrasiWnaIsi,
      totalRegistrasiWnaTambah,
      totalRegistrasiWnaKurang,
      totalRegistrasiJumlah,
      totalWnaNegara,
    }
  };
}

function getKalapasData() {
  const umum = getPublicData();
  const klinik = getClinicData({ tanggal: getTodayYmd() });
  const razia = getRaziaData();
  const security = getSecurityData();
  const pengawalan = getPengawalanData();
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
    pengawalanList: pengawalan.list,
    pengawalanSummary: {
      totalPengawalan: pengawalan.list.length,
    },
    tuUmumList: tuUmum.tuUmumList,
    pegawaiList: tuUmum.pegawaiList,
    financeSummary: tuUmum.financeSummary,
    tuUmumSummary: tuUmum.tuUmumSummary,
    housingBlocks: housing.housingBlocks,
    housingRooms: housing.housingRooms,
    housingSummary: housing.housingSummary,
    pidanaKhusus: board.pidanaKhusus,
    pidanaUmum: board.pidanaUmum,
    luarTembok: board.luarTembok,
    luarTembokDetail: board.luarTembokDetail,
    agama: board.agama,
    wnaNegara: board.wnaNegara,
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
  const todayYmd = getTodayYmd();
  res.render('index', {
    ...getPublicData(),
    clinicSummary: getClinicData({ tanggal: todayYmd }).clinicSummary,
    activePage: 'umum'
  });
});

app.get('/klinik', (req, res) => {
  const kataBijak = getAppSetting('kata_bijak_text', 'KRISNA adalah sistem Keterbukaan Informasi Warga Binaan di Lapas Kelas I Medan.');
  const tanggal = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  res.render('klinik', { ...getClinicData({ tanggal: getTodayYmd() }), kataBijak, tanggal, activePage: 'klinik' });
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
    item.tanggal2 || '-',
    item.tanggal4 || '-',
    item.keterangan || '-',
    item.statusIntegrasi || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Pentahapan Pembinaan',
    sectionTitle: 'DETAIL PENTAHAPAN PEMBINAAN',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NO REG', 'NAMA WARGA BINAAN', 'TANGGAL 2/3', 'TANGGAL EKSPIRASI', 'KETERANGAN PROGRAM PEMBINAAN', 'STATUS INTEGRASI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/jadwal-kegiatan', (req, res) => {
  const umum = getPublicData();
  const rows = umum.jadwalKegiatan.map(item => [
    item.hari || '-',
    item.waktu || '-',
    item.kegiatan || '-',
    item.lokasi || '-',
    item.penanggungJawab || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Jadwal Kegiatan Pembinaan',
    sectionTitle: 'JADWAL KEGIATAN PEMBINAAN',
    subtitle: `Total data: ${rows.length}`,
    columns: ['HARI', 'WAKTU', 'KEGIATAN', 'LOKASI', 'PENANGGUNG JAWAB'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/berobat', (req, res) => {
  const selectedTanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.tanggal || ''))
    ? String(req.query.tanggal)
    : getTodayYmd();
  const searchKeyword = String(req.query.search || '').trim();

  const wbpBerobat = searchKeyword
    ? db.prepare(`SELECT no_reg AS noReg, nama_wbp AS namaWbp, layanan, diagnosa, blok,
                         status_perawatan AS statusPerawatan, tanggal
                  FROM clinic_wbp_berobat
                  WHERE no_reg LIKE ?
                     OR nama_wbp LIKE ?
                     OR layanan LIKE ?
                     OR diagnosa LIKE ?
                     OR blok LIKE ?
                     OR status_perawatan LIKE ?
                     OR tanggal LIKE ?
                  ORDER BY tanggal DESC, id DESC`)
        .all(...Array(7).fill(`%${searchKeyword}%`))
    : getClinicData({ tanggal: selectedTanggal }).wbpBerobat;

  const rows = wbpBerobat.map(item => [
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
    subtitle: searchKeyword
      ? `Pencarian: "${searchKeyword}" | Total riwayat ditemukan: ${rows.length}`
      : `Tanggal: ${selectedTanggal} | Total data: ${rows.length}`,
    dateFilter: {
      action: '/kalapas/table/berobat',
      label: 'Filter tanggal WBP berobat',
      value: selectedTanggal,
      todayValue: getTodayYmd(),
      resetUrl: '/kalapas/table/berobat',
      searchEnabled: true,
      searchLabel: 'Pencarian riwayat WBP berobat',
      searchPlaceholder: 'Cari nama, no reg, diagnosa, blok, status, tanggal...',
      searchValue: searchKeyword
    },
    columns: ['NO REG', 'NAMA WARGA BINAAN', 'LAYANAN', 'DIAGNOSA', 'BLOK', 'STATUS', 'TANGGAL'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/tenaga-medis', (req, res) => {
  const klinik = getClinicData();
  const rows = klinik.tenagaMedis.map(item => [
    item.nama || '-',
    item.profesi || '-',
    item.statusTugas || '-',
    item.kontak || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Tenaga Medis',
    sectionTitle: 'TENAGA MEDIS',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NAMA', 'PROFESI', 'STATUS TUGAS', 'KONTAK'],
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
  const [defaultYear, defaultMonth] = getTodayYmd().split('-');
  const selectedYear = /^\d{4}$/.test(String(req.query.year || '')) ? String(req.query.year) : defaultYear;
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(String(req.query.month || '')) ? String(req.query.month) : defaultMonth;
  const pengawalan = getPengawalanData({ month: selectedMonth, year: selectedYear });

  const monthOptions = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];
  const activeMonthLabel = monthOptions.find(item => item.value === selectedMonth)?.label || '-';

  res.render('kalapas-kamtib', {
    pageTitle: 'Kamtib',
    subtitle: `Jadwal Razia: ${razia.jadwalRazia.length} | Barang Bukti: ${razia.barangBuktiRazia.length} | Giat Pengawalan: ${pengawalan.list.length} (${activeMonthLabel} ${selectedYear}) | Strapsel: ${security.strapselList.length}`,
    jadwalRazia: razia.jadwalRazia,
    barangBuktiRazia: razia.barangBuktiRazia,
    pengawalanList: pengawalan.list,
    selectedMonth,
    selectedYear,
    monthOptions,
    yearOptions: pengawalan.years.length ? pengawalan.years : [defaultYear],
    strapselList: security.strapselList,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/pengawalan', (req, res) => {
  const pengawalan = getPengawalanData();
  const rows = pengawalan.list.map(item => [
    item.tanggal || '-',
    item.namaWbp || '-',
    item.petugas || '-',
    item.keterangan || '-',
    item.dokumentasiPath || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Giat Pengawalan',
    sectionTitle: 'GIAT PENGAWALAN',
    subtitle: `Total data: ${rows.length}`,
    columns: ['TANGGAL', 'NAMA WBP', 'PETUGAS', 'KETERANGAN', 'DOKUMENTASI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/tu-realisasi', (req, res) => {
  const financeSummary = getFinanceSummary();

  res.render('kalapas-tu-realisasi', {
    pageTitle: 'Realisasi Keuangan Tata Usaha',
    sectionTitle: 'REALISASI KEUANGAN - TATA USAHA',
    subtitle: 'Ringkasan data realisasi belanja',
    financeSummary,
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

  const pegawaiRows = data.pegawaiList.map((item, index) => [
    String(index + 1),
    item.namaPegawai || '-',
    item.nip || '-',
    item.pangkatGol || '-',
    item.jabatan || '-',
    item.agama || '-',
    item.status || '-',
    item.pendidikan || '-',
    item.penempatanSeksi || '-',
    item.penempatanBidang || '-',
    item.jenisKelamin || '-',
    item.typePegawai || '-',
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Tata Usaha',
    sectionTitle: 'LAPORAN BARANG PENGGUNA - Tata Usaha',
    subtitle: `Total data: ${rows.length}`,
    financeSummary: data.financeSummary,
    columns: ['KODE', 'URAIAN', 'SATUAN', 'SALDO AWAL QTY', 'SALDO AWAL NILAI', 'BERTAMBAH QTY', 'BERTAMBAH NILAI', 'BERKURANG QTY', 'BERKURANG NILAI', 'SALDO AKHIR QTY', 'SALDO AKHIR NILAI'],
    rows,
    secondarySectionTitle: `DATA KEPEGAWAIAN (${pegawaiRows.length} data)`,
    secondaryColumns: ['No', 'Nama Pegawai', 'NIP', 'Pangkat/Gol', 'Jabatan', 'Agama', 'Status', 'Pendidikan', 'Penempatan/Seksi', 'Penempatan/Bidang', 'Jenis Kelamin', 'Type Pegawai'],
    secondaryRows: pegawaiRows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/tu-bmn', (req, res) => {
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
    pageTitle: 'Laporan BMN',
    sectionTitle: 'LAPORAN BARANG MILIK NEGARA (BMN)',
    subtitle: `Total data: ${rows.length}`,
    columns: ['KODE', 'URAIAN', 'SATUAN', 'SALDO AWAL QTY', 'SALDO AWAL NILAI', 'BERTAMBAH QTY', 'BERTAMBAH NILAI', 'BERKURANG QTY', 'BERKURANG NILAI', 'SALDO AKHIR QTY', 'SALDO AKHIR NILAI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/kepegawaian', (req, res) => {
  const data = getTuUmumData();
  const rows = data.pegawaiList.map((item, index) => [
    String(index + 1),
    item.namaPegawai || '-',
    item.nip || '-',
    item.pangkatGol || '-',
    item.jabatan || '-',
    item.agama || '-',
    item.status || '-',
    item.pendidikan || '-',
    item.penempatanSeksi || '-',
    item.penempatanBidang || '-',
    item.jenisKelamin || '-',
    item.typePegawai || '-',
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Data Kepegawaian',
    sectionTitle: 'DATA KEPEGAWAIAN',
    subtitle: `Total data: ${rows.length}`,
    columns: ['No', 'Nama Pegawai', 'NIP', 'Pangkat/Gol', 'Jabatan', 'Agama', 'Status', 'Pendidikan', 'Penempatan/Seksi', 'Penempatan/Bidang', 'Jenis Kelamin', 'Type Pegawai'],
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
  const rows = board.luarTembokDetail.map(item => [
    item.noRegistrasi || '-',
    item.nama || '-',
    item.tanggal || '-',
    item.pendamping || '-',
    item.keterangan || '-'
  ]);
  res.render('kalapas-table', {
    pageTitle: 'WBP di Luar Tembok',
    sectionTitle: 'WBP DI LUAR TEMBOK',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NO REGISTRASI', 'NAMA', 'TANGGAL', 'PENDAMPING', 'KETERANGAN'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/wbp-luar-lapas', (req, res) => {
  const board = getBoardData();
  const rows = board.luarTembok.map(item => {
    const wniKeluar = Number(item.wniKeluar) || 0;
    const wniMasuk = Number(item.wniMasuk) || 0;
    const wnaKeluar = Number(item.wnaKeluar) || 0;
    const wnaMasuk = Number(item.wnaMasuk) || 0;
    return [
      item.status || '-',
      String(wniKeluar),
      String(wniMasuk),
      String(wnaKeluar),
      String(wnaMasuk),
      String(wniKeluar + wniMasuk + wnaKeluar + wnaMasuk),
      item.keterangan || '-',
    ];
  });

  res.render('kalapas-table', {
    pageTitle: 'WBP di Luar Lapas',
    sectionTitle: 'WBP DI LUAR LAPAS',
    subtitle: `Total kategori: ${rows.length}`,
    columns: ['STATUS', 'WNI KELUAR', 'WNI MASUK', 'WNA KELUAR', 'WNA MASUK', 'JUMLAH', 'KETERANGAN'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/wna', (req, res) => {
  const board = getBoardData();
  const rows = board.wnaNegara.map(item => [
    item.noRegistrasi || '-',
    item.namaWbp || '-',
    item.asalNegara || '-',
    item.tindakPidana || '-'
  ]);
  res.render('kalapas-table', {
    pageTitle: 'Daftar WNA',
    sectionTitle: 'DAFTAR WARGA NEGARA ASING',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NO REGISTRASI', 'NAMA WBP', 'ASAL NEGARA', 'TINDAK PIDANA'],
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
    pengawalan: db.prepare('SELECT COUNT(*) AS c FROM giat_pengawalan').get().c,
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
  const { no_reg, tanggal2, tanggal4, keterangan } = req.body;
  const statusIntegrasi = (req.body.status_integrasi || '').trim();
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare(`INSERT INTO pentahapan_pembinaan_detail (no_reg, nama_wbp, tanggal2, tanggal4, keterangan, status_integrasi)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(no_reg, nama_wbp, tanggal2, tanggal4, keterangan, statusIntegrasi);
  syncPembinaanMasterByName(nama_wbp, statusIntegrasi);
  res.redirect('/admin/pembinaan-detail?success=1');
});

app.post('/admin/pembinaan-detail/:id/update', requireAccess('pembinaan-detail'), (req, res) => {
  const { no_reg, tanggal2, tanggal4, keterangan } = req.body;
  const statusIntegrasi = (req.body.status_integrasi || '').trim();
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare(`UPDATE pentahapan_pembinaan_detail SET no_reg=?, nama_wbp=?, tanggal2=?, tanggal4=?, keterangan=?, status_integrasi=? WHERE id=?`)
    .run(no_reg, nama_wbp, tanggal2, tanggal4, keterangan, statusIntegrasi, Number(req.params.id));
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
  const hariInput = (req.body.hari || '').trim();
  const hariCustom = (req.body.hari_custom || '').trim();
  const hari = hariInput === 'CUSTOM' ? hariCustom : hariInput;
  const waktu = (req.body.waktu || '').trim();
  const kegiatan = (req.body.kegiatan || '').trim();
  const lokasi = (req.body.lokasi || '').trim();
  const penanggungJawab = (req.body.penanggung_jawab || '').trim();
  if (!hari) return res.redirect('/admin/jadwal');
  db.prepare('INSERT INTO jadwal_kegiatan (hari, waktu, kegiatan, lokasi, penanggung_jawab) VALUES (?, ?, ?, ?, ?)')
    .run(hari, waktu, kegiatan, lokasi, penanggungJawab);
  res.redirect('/admin/jadwal?success=1');
});

app.post('/admin/jadwal/:id/update', requireAccess('jadwal'), (req, res) => {
  const hariInput = (req.body.hari || '').trim();
  const hariCustom = (req.body.hari_custom || '').trim();
  const hari = hariInput === 'CUSTOM' ? hariCustom : hariInput;
  const waktu = (req.body.waktu || '').trim();
  const kegiatan = (req.body.kegiatan || '').trim();
  const lokasi = (req.body.lokasi || '').trim();
  const penanggungJawab = (req.body.penanggung_jawab || '').trim();
  if (!hari) return res.redirect('/admin/jadwal');
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

// ── Giat Pengawalan ──────────────────────────────────────────────
app.get('/admin/pengawalan', requireAccess('pengawalan'), (req, res) => {
  const [defaultYear, defaultMonth] = getTodayYmd().split('-');
  const selectedYear = /^\d{4}$/.test(String(req.query.year || '')) ? String(req.query.year) : defaultYear;
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(String(req.query.month || '')) ? String(req.query.month) : defaultMonth;

  const list = db.prepare(`
    SELECT *
    FROM giat_pengawalan
    WHERE substr(tanggal, 1, 4) = ?
      AND substr(tanggal, 6, 2) = ?
    ORDER BY tanggal DESC, id DESC
  `).all(selectedYear, selectedMonth);

  const yearOptions = db.prepare(`
    SELECT DISTINCT substr(tanggal, 1, 4) AS year
    FROM giat_pengawalan
    WHERE length(tanggal) >= 7
    ORDER BY year DESC
  `).all().map(row => row.year).filter(Boolean);

  const monthOptions = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const filterQuery = `?month=${selectedMonth}&year=${selectedYear}`;
  const filterQueryWithAmp = `&month=${selectedMonth}&year=${selectedYear}`;
  const edit = req.query.edit ? db.prepare('SELECT * FROM giat_pengawalan WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/pengawalan', {
    user: req.session.user,
    list,
    edit,
    selectedMonth,
    selectedYear,
    monthOptions,
    yearOptions: yearOptions.length ? yearOptions : [defaultYear],
    filterQuery,
    filterQueryWithAmp,
    active: 'pengawalan',
    success: req.query.success,
    error: req.query.error
  });
});

app.post('/admin/pengawalan/add', requireAccess('pengawalan'), raziaUpload.single('dokumentasi'), (req, res) => {
  const [defaultYear, defaultMonth] = getTodayYmd().split('-');
  const selectedYear = /^\d{4}$/.test(String(req.query.year || '')) ? String(req.query.year) : defaultYear;
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(String(req.query.month || '')) ? String(req.query.month) : defaultMonth;
  const redirectBase = `/admin/pengawalan?month=${selectedMonth}&year=${selectedYear}`;
  const tanggal = (req.body.tanggal || '').trim();
  const namaWbp = (req.body.nama_wbp || '').trim().toUpperCase();
  const petugas = (req.body.petugas || '').trim();
  const keterangan = (req.body.keterangan || '').trim();
  if (!tanggal || !namaWbp || !petugas) return res.redirect(`${redirectBase}&error=Data+wajib+belum+lengkap`);

  const dokumentasiPath = req.file ? `/uploads/razia/${req.file.filename}` : null;
  db.prepare(`
    INSERT INTO giat_pengawalan (tanggal, nama_wbp, petugas, keterangan, dokumentasi_path)
    VALUES (?, ?, ?, ?, ?)
  `).run(tanggal, namaWbp, petugas, keterangan, dokumentasiPath);

  res.redirect(`${redirectBase}&success=1`);
});

app.post('/admin/pengawalan/:id/update', requireAccess('pengawalan'), raziaUpload.single('dokumentasi'), (req, res) => {
  const [defaultYear, defaultMonth] = getTodayYmd().split('-');
  const selectedYear = /^\d{4}$/.test(String(req.query.year || '')) ? String(req.query.year) : defaultYear;
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(String(req.query.month || '')) ? String(req.query.month) : defaultMonth;
  const redirectBase = `/admin/pengawalan?month=${selectedMonth}&year=${selectedYear}`;
  const id = Number(req.params.id);
  const tanggal = (req.body.tanggal || '').trim();
  const namaWbp = (req.body.nama_wbp || '').trim().toUpperCase();
  const petugas = (req.body.petugas || '').trim();
  const keterangan = (req.body.keterangan || '').trim();
  if (!tanggal || !namaWbp || !petugas) return res.redirect(`${redirectBase}&error=Data+wajib+belum+lengkap`);

  const existing = db.prepare('SELECT dokumentasi_path FROM giat_pengawalan WHERE id=?').get(id);
  let nextDokumentasiPath = existing?.dokumentasi_path || null;
  if (req.file) {
    if (nextDokumentasiPath) removeUploadedFile(nextDokumentasiPath);
    nextDokumentasiPath = `/uploads/razia/${req.file.filename}`;
  }

  db.prepare(`
    UPDATE giat_pengawalan
    SET tanggal=?, nama_wbp=?, petugas=?, keterangan=?, dokumentasi_path=?
    WHERE id=?
  `).run(tanggal, namaWbp, petugas, keterangan, nextDokumentasiPath, id);

  res.redirect(`${redirectBase}&success=1`);
});

app.post('/admin/pengawalan/:id/delete', requireAccess('pengawalan'), (req, res) => {
  const [defaultYear, defaultMonth] = getTodayYmd().split('-');
  const selectedYear = /^\d{4}$/.test(String(req.query.year || '')) ? String(req.query.year) : defaultYear;
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(String(req.query.month || '')) ? String(req.query.month) : defaultMonth;
  const redirectBase = `/admin/pengawalan?month=${selectedMonth}&year=${selectedYear}`;
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT dokumentasi_path FROM giat_pengawalan WHERE id=?').get(id);
  if (existing?.dokumentasi_path) removeUploadedFile(existing.dokumentasi_path);
  db.prepare('DELETE FROM giat_pengawalan WHERE id=?').run(id);
  res.redirect(`${redirectBase}&success=1`);
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
  res.redirect('/admin/tu-umum/realisasi');
});

app.get('/admin/tu-umum/realisasi', requireAccess('tu-umum'), (req, res) => {
  res.render('admin/tu-realisasi', {
    user: req.session.user,
    active: 'tu-realisasi',
    success: req.query.success,
    financeSummary: getFinanceSummary(),
  });
});

app.get('/admin/tu-umum/barang', requireAccess('tu-umum'), (req, res) => {
  const list = db.prepare('SELECT * FROM tu_umum_barang ORDER BY id DESC').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM tu_umum_barang WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/tu-barang', {
    user: req.session.user,
    list,
    edit,
    active: 'tu-barang',
    success: req.query.success,
  });
});

app.get('/admin/tu-umum/kepegawaian', requireAccess('tu-umum'), (req, res) => {
  const pegawaiList = db.prepare('SELECT * FROM tu_kepegawaian ORDER BY id ASC').all();
  const editPegawai = req.query.editPegawai ? db.prepare('SELECT * FROM tu_kepegawaian WHERE id=?').get(Number(req.query.editPegawai)) : null;
  res.render('admin/tu-kepegawaian', {
    user: req.session.user,
    pegawaiList,
    editPegawai,
    active: 'tu-kepegawaian',
    success: req.query.success,
  });
});

app.post('/admin/tu-umum/keuangan/update', requireAccess('tu-umum'), (req, res) => {
  const totalPagu = parseMoneyNumber(req.body.total_pagu);
  const realisasiBelanja = parseMoneyNumber(req.body.realisasi_belanja);
  const updatedAtRaw = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(req.body.updated_at || '').trim())
    ? String(req.body.updated_at).trim()
    : getJakartaNowDatetimeLocal();

  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run('keuangan_total_pagu', String(totalPagu));

  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run('keuangan_realisasi_belanja', String(realisasiBelanja));

  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run('keuangan_updated_at', updatedAtRaw);

  res.redirect('/admin/tu-umum/realisasi?success=1');
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

  res.redirect('/admin/tu-umum/barang?success=1');
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

  res.redirect('/admin/tu-umum/barang?success=1');
});

app.post('/admin/tu-umum/:id/delete', requireAccess('tu-umum'), (req, res) => {
  db.prepare('DELETE FROM tu_umum_barang WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/tu-umum/barang?success=1');
});

app.post('/admin/tu-umum/pegawai/add', requireAccess('tu-umum'), (req, res) => {
  const namaPegawai = (req.body.nama_pegawai || '').trim().toUpperCase();
  if (!namaPegawai) return res.redirect('/admin/tu-umum/kepegawaian');

  db.prepare(`
    INSERT INTO tu_kepegawaian
      (nama_pegawai, nip, pangkat_gol, jabatan, agama, status, pendidikan, penempatan_seksi, penempatan_bidang, jenis_kelamin, type_pegawai)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    namaPegawai,
    (req.body.nip || '').trim(),
    (req.body.pangkat_gol || '').trim(),
    (req.body.jabatan || '').trim(),
    (req.body.agama || '').trim(),
    (req.body.status || '').trim(),
    (req.body.pendidikan || '').trim(),
    (req.body.penempatan_seksi || '').trim(),
    (req.body.penempatan_bidang || '').trim(),
    (req.body.jenis_kelamin || '').trim(),
    (req.body.type_pegawai || '').trim(),
  );

  res.redirect('/admin/tu-umum/kepegawaian?success=1');
});

app.post('/admin/tu-umum/pegawai/:id/update', requireAccess('tu-umum'), (req, res) => {
  const id = Number(req.params.id);
  const namaPegawai = (req.body.nama_pegawai || '').trim().toUpperCase();
  if (!namaPegawai) return res.redirect('/admin/tu-umum/kepegawaian');

  db.prepare(`
    UPDATE tu_kepegawaian
    SET nama_pegawai=?, nip=?, pangkat_gol=?, jabatan=?, agama=?, status=?, pendidikan=?, penempatan_seksi=?, penempatan_bidang=?, jenis_kelamin=?, type_pegawai=?
    WHERE id=?
  `).run(
    namaPegawai,
    (req.body.nip || '').trim(),
    (req.body.pangkat_gol || '').trim(),
    (req.body.jabatan || '').trim(),
    (req.body.agama || '').trim(),
    (req.body.status || '').trim(),
    (req.body.pendidikan || '').trim(),
    (req.body.penempatan_seksi || '').trim(),
    (req.body.penempatan_bidang || '').trim(),
    (req.body.jenis_kelamin || '').trim(),
    (req.body.type_pegawai || '').trim(),
    id,
  );

  res.redirect('/admin/tu-umum/kepegawaian?success=1');
});

app.post('/admin/tu-umum/pegawai/:id/delete', requireAccess('tu-umum'), (req, res) => {
  db.prepare('DELETE FROM tu_kepegawaian WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/tu-umum/kepegawaian?success=1');
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
  const editRegistrasi = req.query.editRegistrasi ? db.prepare('SELECT * FROM board_registrasi_hunian WHERE id=?').get(Number(req.query.editRegistrasi)) : null;
  const editWnaNegara = req.query.editWnaNegara
    ? db.prepare('SELECT id, no_registrasi, nama_wbp, asal_negara, tindak_pidana FROM board_wna_negara WHERE id=?').get(Number(req.query.editWnaNegara))
    : null;
  res.render('admin/papan-isi', {
    user: req.session.user,
    active: 'papan-isi',
    success: req.query.success,
    ...data,
    editPidana,
    editLuar,
    editAgama,
    editRegistrasi,
    editWnaNegara,
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

app.get('/admin/luar-tembok', requireAccess('luar-tembok'), (req, res) => {
  const list = db.prepare(`
    SELECT id, no_registrasi, nama, tanggal, pendamping, keterangan
    FROM board_luar_tembok_detail
    ORDER BY id DESC
  `).all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM board_luar_tembok_detail WHERE id=?').get(Number(req.query.edit)) : null;

  res.render('admin/luar-tembok', {
    user: req.session.user,
    list,
    edit,
    active: 'luar-tembok',
    success: req.query.success
  });
});

app.post('/admin/luar-tembok/add', requireAccess('luar-tembok'), (req, res) => {
  const noRegistrasi = (req.body.no_registrasi || '').trim().toUpperCase();
  const nama = (req.body.nama || '').trim().toUpperCase();
  const tanggal = (req.body.tanggal || '').trim();
  const pendamping = (req.body.pendamping || '').trim();
  const keterangan = (req.body.keterangan || '').trim();
  if (!noRegistrasi || !nama || !tanggal || !pendamping) return res.redirect('/admin/luar-tembok');

  db.prepare(`
    INSERT INTO board_luar_tembok_detail (no_registrasi, nama, tanggal, pendamping, keterangan)
    VALUES (?, ?, ?, ?, ?)
  `).run(noRegistrasi, nama, tanggal, pendamping, keterangan);

  res.redirect('/admin/luar-tembok?success=1');
});

app.post('/admin/luar-tembok/:id/update', requireAccess('luar-tembok'), (req, res) => {
  const noRegistrasi = (req.body.no_registrasi || '').trim().toUpperCase();
  const nama = (req.body.nama || '').trim().toUpperCase();
  const tanggal = (req.body.tanggal || '').trim();
  const pendamping = (req.body.pendamping || '').trim();
  const keterangan = (req.body.keterangan || '').trim();
  if (!noRegistrasi || !nama || !tanggal || !pendamping) return res.redirect('/admin/luar-tembok');

  db.prepare(`
    UPDATE board_luar_tembok_detail
    SET no_registrasi=?, nama=?, tanggal=?, pendamping=?, keterangan=?
    WHERE id=?
  `).run(noRegistrasi, nama, tanggal, pendamping, keterangan, Number(req.params.id));

  res.redirect('/admin/luar-tembok?success=1');
});

app.post('/admin/luar-tembok/:id/delete', requireAccess('luar-tembok'), (req, res) => {
  db.prepare('DELETE FROM board_luar_tembok_detail WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/luar-tembok?success=1');
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

app.post('/admin/papan-isi/registrasi/add', requireAccess('papan-isi'), (req, res) => {
  const noUrut = Number(req.body.no_urut || 0);
  const blok = (req.body.blok || '').trim().toUpperCase();
  const registrasi = (req.body.registrasi || '').trim().toUpperCase();
  if (!noUrut || !blok || !registrasi) return res.redirect('/admin/papan-isi');

  db.prepare(`
    INSERT INTO board_registrasi_hunian
      (no_urut, blok, registrasi, wni_isi, wni_tambah, wni_kurang, wna_isi, wna_tambah, wna_kurang)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    noUrut,
    blok,
    registrasi,
    Number(req.body.wni_isi || 0),
    Number(req.body.wni_tambah || 0),
    Number(req.body.wni_kurang || 0),
    Number(req.body.wna_isi || 0),
    Number(req.body.wna_tambah || 0),
    Number(req.body.wna_kurang || 0)
  );
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/registrasi/:id/update', requireAccess('papan-isi'), (req, res) => {
  const noUrut = Number(req.body.no_urut || 0);
  const blok = (req.body.blok || '').trim().toUpperCase();
  const registrasi = (req.body.registrasi || '').trim().toUpperCase();
  if (!noUrut || !blok || !registrasi) return res.redirect('/admin/papan-isi');

  db.prepare(`
    UPDATE board_registrasi_hunian
    SET no_urut=?, blok=?, registrasi=?, wni_isi=?, wni_tambah=?, wni_kurang=?, wna_isi=?, wna_tambah=?, wna_kurang=?
    WHERE id=?
  `).run(
    noUrut,
    blok,
    registrasi,
    Number(req.body.wni_isi || 0),
    Number(req.body.wni_tambah || 0),
    Number(req.body.wni_kurang || 0),
    Number(req.body.wna_isi || 0),
    Number(req.body.wna_tambah || 0),
    Number(req.body.wna_kurang || 0),
    Number(req.params.id)
  );
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/registrasi/:id/delete', requireAccess('papan-isi'), (req, res) => {
  db.prepare('DELETE FROM board_registrasi_hunian WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/wna-negara/add', requireAccess('papan-isi'), (req, res) => {
  const noRegistrasi = (req.body.no_registrasi || '').trim().toUpperCase();
  const namaWbp = (req.body.nama_wbp || '').trim().toUpperCase();
  const asalNegara = (req.body.asal_negara || '').trim().toUpperCase();
  const tindakPidana = (req.body.tindak_pidana || '').trim().toUpperCase();
  if (!noRegistrasi || !namaWbp || !asalNegara || !tindakPidana) return res.redirect('/admin/papan-isi');

  db.prepare(`
    INSERT INTO board_wna_negara (no_registrasi, nama_wbp, asal_negara, tindak_pidana, nama_negara, jumlah, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(noRegistrasi, namaWbp, asalNegara, tindakPidana, asalNegara, 1, '-');
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/wna-negara/:id/update', requireAccess('papan-isi'), (req, res) => {
  const noRegistrasi = (req.body.no_registrasi || '').trim().toUpperCase();
  const namaWbp = (req.body.nama_wbp || '').trim().toUpperCase();
  const asalNegara = (req.body.asal_negara || '').trim().toUpperCase();
  const tindakPidana = (req.body.tindak_pidana || '').trim().toUpperCase();
  if (!noRegistrasi || !namaWbp || !asalNegara || !tindakPidana) return res.redirect('/admin/papan-isi');

  db.prepare(`
    UPDATE board_wna_negara
    SET no_registrasi=?, nama_wbp=?, asal_negara=?, tindak_pidana=?, nama_negara=?, jumlah=?, keterangan=?
    WHERE id=?
  `).run(noRegistrasi, namaWbp, asalNegara, tindakPidana, asalNegara, 1, '-', Number(req.params.id));
  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/wna-negara/:id/delete', requireAccess('papan-isi'), (req, res) => {
  db.prepare('DELETE FROM board_wna_negara WHERE id=?').run(Number(req.params.id));
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
  const selectedTanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.tanggal || ''))
    ? String(req.query.tanggal)
    : getTodayYmd();
  const searchKeyword = String(req.query.search || '').trim();
  const list = searchKeyword
    ? db.prepare(`SELECT * FROM clinic_wbp_berobat
                  WHERE no_reg LIKE ?
                     OR nama_wbp LIKE ?
                     OR layanan LIKE ?
                     OR diagnosa LIKE ?
                     OR blok LIKE ?
                     OR status_perawatan LIKE ?
                     OR tanggal LIKE ?
                  ORDER BY tanggal DESC, id DESC`)
        .all(...Array(7).fill(`%${searchKeyword}%`))
    : db.prepare('SELECT * FROM clinic_wbp_berobat WHERE tanggal = ? ORDER BY id DESC').all(selectedTanggal);
  const totalHistory = db.prepare('SELECT COUNT(*) AS c FROM clinic_wbp_berobat').get().c;
  const edit = req.query.edit ? db.prepare('SELECT * FROM clinic_wbp_berobat WHERE id=?').get(Number(req.query.edit)) : null;
  const filterParams = new URLSearchParams({ tanggal: selectedTanggal });
  if (searchKeyword) filterParams.set('search', searchKeyword);

  res.render('admin/klinik-berobat', {
    user: req.session.user,
    list,
    edit,
    todayYmd: getTodayYmd(),
    selectedTanggal,
    searchKeyword,
    totalHistory,
    filterQuery: `?${filterParams.toString()}`,
    filterQueryWithAmp: `&${filterParams.toString()}`,
    active: 'klinik-berobat',
    success: req.query.success
  });
});

app.post('/admin/klinik-berobat/add', requireAccess('klinik-berobat'), (req, res) => {
  const selectedTanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.tanggal || ''))
    ? String(req.query.tanggal)
    : getTodayYmd();
  const searchKeyword = String(req.query.search || '').trim();
  const { no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal } = req.body;
  db.prepare('INSERT INTO clinic_wbp_berobat (no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal) VALUES (?, ?, ?, ?, ?, ?, ?)').run(no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal || getTodayYmd());
  const redirectParams = new URLSearchParams({ tanggal: selectedTanggal, success: '1' });
  if (searchKeyword) redirectParams.set('search', searchKeyword);
  res.redirect(`/admin/klinik-berobat?${redirectParams.toString()}`);
});

app.post('/admin/klinik-berobat/:id/update', requireAccess('klinik-berobat'), (req, res) => {
  const selectedTanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.tanggal || ''))
    ? String(req.query.tanggal)
    : getTodayYmd();
  const searchKeyword = String(req.query.search || '').trim();
  const { no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal } = req.body;
  db.prepare('UPDATE clinic_wbp_berobat SET no_reg=?, nama_wbp=?, layanan=?, diagnosa=?, blok=?, status_perawatan=?, tanggal=? WHERE id=?').run(no_reg, nama_wbp, layanan, diagnosa, blok, status_perawatan, tanggal || getTodayYmd(), Number(req.params.id));
  const redirectParams = new URLSearchParams({ tanggal: selectedTanggal, success: '1' });
  if (searchKeyword) redirectParams.set('search', searchKeyword);
  res.redirect(`/admin/klinik-berobat?${redirectParams.toString()}`);
});

app.post('/admin/klinik-berobat/:id/delete', requireAccess('klinik-berobat'), (req, res) => {
  const selectedTanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.tanggal || ''))
    ? String(req.query.tanggal)
    : getTodayYmd();
  const searchKeyword = String(req.query.search || '').trim();
  db.prepare('DELETE FROM clinic_wbp_berobat WHERE id=?').run(Number(req.params.id));
  const redirectParams = new URLSearchParams({ tanggal: selectedTanggal });
  if (searchKeyword) redirectParams.set('search', searchKeyword);
  res.redirect(`/admin/klinik-berobat?${redirectParams.toString()}`);
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
  const list = db.prepare(`
    SELECT
      id,
      media_type AS mediaType,
      media_path AS mediaPath,
      display_duration_sec AS displayDurationSec,
      sort_order AS sortOrder,
      created_at AS createdAt
    FROM dokumentasi_media
    ORDER BY sort_order ASC, id ASC
  `).all();

  const nextOrder = (list.reduce((max, item) => Math.max(max, Number(item.sortOrder) || 0), 0)) + 1;
  const edit = req.query.edit
    ? db.prepare('SELECT id, media_type AS mediaType, media_path AS mediaPath, display_duration_sec AS displayDurationSec, sort_order AS sortOrder FROM dokumentasi_media WHERE id = ?').get(Number(req.query.edit))
    : null;

  res.render('admin/video', {
    user: req.session.user,
    list,
    nextOrder,
    edit,
    active: 'video',
    success: req.query.success,
    error: req.query.error
  });
});

app.post('/admin/video/add', requireAccess('video'), humasMediaUpload.single('media'), (req, res) => {
  if (!req.file) return res.redirect('/admin/video?error=File+media+wajib+diunggah');

  const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
  const mediaPath = `/uploads/humas/${req.file.filename}`;
  const sortOrder = Number(req.body.sort_order || 1);
  const displayDurationSec = Math.max(1, Number(req.body.display_duration_sec || 8));

  db.prepare(`
    INSERT INTO dokumentasi_media (media_type, media_path, display_duration_sec, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(mediaType, mediaPath, displayDurationSec, sortOrder);

  res.redirect('/admin/video?success=1');
});

app.post('/admin/video/:id/update', requireAccess('video'), (req, res) => {
  const id = Number(req.params.id);
  const sortOrder = Number(req.body.sort_order || 1);
  const displayDurationSec = Math.max(1, Number(req.body.display_duration_sec || 8));

  db.prepare('UPDATE dokumentasi_media SET sort_order=?, display_duration_sec=? WHERE id=?')
    .run(sortOrder, displayDurationSec, id);

  res.redirect('/admin/video?success=1');
});

app.post('/admin/video/:id/delete', requireAccess('video'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT media_path FROM dokumentasi_media WHERE id=?').get(id);
  if (existing?.media_path) removeUploadedFile(existing.media_path);
  db.prepare('DELETE FROM dokumentasi_media WHERE id=?').run(id);
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
      return res.redirect('/admin/video?error=Ukuran+media+maksimal+50MB');
    }
    if (err.message && err.message.includes('File harus berupa foto atau video')) {
      return res.redirect('/admin/video?error=File+harus+berupa+foto+atau+video');
    }
    return res.redirect('/admin/video?error=Gagal+upload+media');
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

  if (req.path.startsWith('/admin/pengawalan')) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.redirect('/admin/pengawalan?error=Ukuran+dokumentasi+maksimal+5MB');
    }
    if (err.message && err.message.includes('File harus berupa gambar')) {
      return res.redirect('/admin/pengawalan?error=File+dokumentasi+harus+berupa+gambar');
    }
    return res.redirect('/admin/pengawalan?error=Gagal+upload+dokumentasi');
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
