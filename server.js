const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = 3000;

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

function removeUploadedFile(photoPath) {
  if (!photoPath) return;
  const fullPath = path.join(__dirname, 'public', photoPath.replace(/^\/+/, ''));
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch (_err) { }
  }
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
  superadmin: ['dashboard', 'statistik', 'remisi', 'menu', 'pembinaan', 'pembinaan-detail', 'jadwal', 'users', 'video', 'klinik-medis', 'klinik-berobat', 'klinik-oncall', 'klinik-kontrol', 'klinik-statistik'],
  registrasi: ['dashboard', 'statistik', 'remisi'],
  pembinaan: ['dashboard', 'pembinaan', 'pembinaan-detail', 'jadwal'],
  klinik: ['dashboard', 'klinik-medis', 'klinik-berobat', 'klinik-oncall', 'klinik-kontrol', 'klinik-statistik'],
  dapur: ['dashboard', 'menu'],
  humas: ['dashboard', 'video'],
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

  const besaranRemisi = db
    .prepare('SELECT jenis, nama, besaran FROM besaran_remisi ORDER BY nama COLLATE NOCASE ASC')
    .all();

  const menuMakan = db
    .prepare('SELECT waktu, menu, photo_path AS photoPath FROM menu_makan ORDER BY id')
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
    .prepare(`SELECT no_reg AS noReg, nama_wbp AS namaWbp,
                     tanggal1, tanggal2, tanggal3, tanggal4,
                     total_remisi AS totalRemisi, keterangan
              FROM pentahapan_pembinaan_detail ORDER BY nama_wbp COLLATE NOCASE ASC`)
    .all();

  const jadwalKegiatan = db
    .prepare('SELECT kegiatan, selasa, rabu FROM jadwal_kegiatan ORDER BY id')
    .all();

  const dokumentasiVideoRow = db.prepare('SELECT video_path FROM dokumentasi_video WHERE id = 1').get();

  return {
    totalPenghuni: statistik.total_penghuni,
    kapasitas: statistik.kapasitas,
    bebasHariIni: statistik.bebas_hari_ini,
    tanggal: new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    besaranRemisi,
    menuMakan,
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

function getKalapasData() {
  const umum = getPublicData();
  const klinik = getClinicData();

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
  res.render('klinik', { ...getClinicData(), activePage: 'klinik' });
});

app.get('/kalapas', (req, res) => {
  res.render('kalapas', { ...getKalapasData(), activePage: 'kalapas' });
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
  res.render('admin/remisi', { user: req.session.user, list, edit, active: 'remisi', success: req.query.success });
});

app.post('/admin/remisi/add', requireAccess('remisi'), (req, res) => {
  const { jenis, besaran } = req.body;
  const nama = (req.body.nama || '').toUpperCase();
  db.prepare('INSERT INTO besaran_remisi (jenis, nama, besaran) VALUES (?, ?, ?)').run(jenis, nama, besaran);
  res.redirect('/admin/remisi?success=1');
});

app.post('/admin/remisi/:id/update', requireAccess('remisi'), (req, res) => {
  const { jenis, besaran } = req.body;
  const nama = (req.body.nama || '').toUpperCase();
  db.prepare('UPDATE besaran_remisi SET jenis=?, nama=?, besaran=? WHERE id=?').run(jenis, nama, besaran, Number(req.params.id));
  res.redirect('/admin/remisi?success=1');
});

app.post('/admin/remisi/:id/delete', requireAccess('remisi'), (req, res) => {
  db.prepare('DELETE FROM besaran_remisi WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/remisi');
});

// ── Menu Makan ────────────────────────────────────────────────────
app.get('/admin/menu', requireAccess('menu'), (req, res) => {
  const list = db.prepare('SELECT * FROM menu_makan ORDER BY id').all();
  const edit = req.query.edit ? db.prepare('SELECT * FROM menu_makan WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/menu', {
    user: req.session.user,
    list,
    edit,
    active: 'menu',
    success: req.query.success,
    error: req.query.error
  });
});

app.post('/admin/menu/add', requireAccess('menu'), menuUpload.single('photo'), (req, res) => {
  const { waktu, menu } = req.body;
  const photoPath = req.file ? `/uploads/menu/${req.file.filename}` : null;
  db.prepare('INSERT INTO menu_makan (waktu, menu, photo_path) VALUES (?, ?, ?)').run(waktu, menu, photoPath);
  res.redirect('/admin/menu?success=1');
});

app.post('/admin/menu/:id/update', requireAccess('menu'), menuUpload.single('photo'), (req, res) => {
  const { waktu, menu } = req.body;
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT photo_path FROM menu_makan WHERE id=?').get(id);
  let nextPhotoPath = existing?.photo_path || null;

  if (req.file) {
    if (nextPhotoPath) removeUploadedFile(nextPhotoPath);
    nextPhotoPath = `/uploads/menu/${req.file.filename}`;
  }

  db.prepare('UPDATE menu_makan SET waktu=?, menu=?, photo_path=? WHERE id=?').run(waktu, menu, nextPhotoPath, id);
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
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare(`INSERT INTO pentahapan_pembinaan_detail (no_reg, nama_wbp, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(no_reg, nama_wbp, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan);
  res.redirect('/admin/pembinaan-detail?success=1');
});

app.post('/admin/pembinaan-detail/:id/update', requireAccess('pembinaan-detail'), (req, res) => {
  const { no_reg, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan } = req.body;
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare(`UPDATE pentahapan_pembinaan_detail SET no_reg=?, nama_wbp=?, tanggal1=?, tanggal2=?, tanggal3=?, tanggal4=?, total_remisi=?, keterangan=? WHERE id=?`)
    .run(no_reg, nama_wbp, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan, Number(req.params.id));
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
  const { kegiatan, selasa, rabu } = req.body;
  db.prepare('INSERT INTO jadwal_kegiatan (kegiatan, selasa, rabu) VALUES (?, ?, ?)').run(kegiatan, selasa || '', rabu || '');
  res.redirect('/admin/jadwal?success=1');
});

app.post('/admin/jadwal/:id/update', requireAccess('jadwal'), (req, res) => {
  const { kegiatan, selasa, rabu } = req.body;
  db.prepare('UPDATE jadwal_kegiatan SET kegiatan=?, selasa=?, rabu=? WHERE id=?').run(kegiatan, selasa || '', rabu || '', Number(req.params.id));
  res.redirect('/admin/jadwal?success=1');
});

app.post('/admin/jadwal/:id/delete', requireAccess('jadwal'), (req, res) => {
  db.prepare('DELETE FROM jadwal_kegiatan WHERE id=?').run(Number(req.params.id));
  res.redirect('/admin/jadwal');
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

  return next(err);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
  console.log(`🔐 Admin panel  : http://localhost:${PORT}/admin/login`);
  console.log(`   Default login: admin / admin123`);
});
