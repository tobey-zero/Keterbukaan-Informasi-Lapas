const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('./db');

const app = express();
const PORT = 3000;
const PENGADUAN_PORT = 3001;
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

const PDF_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'pdf');
if (!fs.existsSync(PDF_UPLOAD_DIR)) {
  fs.mkdirSync(PDF_UPLOAD_DIR, { recursive: true });
}

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PDF_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeBase = 'laporan-realisasi';
    cb(null, `${Date.now()}-${safeBase}.pdf`);
  }
});

const pdfUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('File harus berupa PDF.'));
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

const PENGADUAN_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'pengaduan');
if (!fs.existsSync(PENGADUAN_UPLOAD_DIR)) {
  fs.mkdirSync(PENGADUAN_UPLOAD_DIR, { recursive: true });
}

const pengaduanStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PENGADUAN_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'dokumen-pengaduan';
    cb(null, `${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const pengaduanUpload = multer({
  storage: pengaduanStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('File harus berupa gambar atau PDF.'));
  }
});

const remisiExcelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    const isExcelName = name.endsWith('.xlsx') || name.endsWith('.xls');
    const isExcelMime = mime.includes('spreadsheetml') || mime.includes('excel') || mime === 'application/octet-stream';
    if (isExcelName || isExcelMime) return cb(null, true);
    cb(new Error('File harus berupa Excel (.xlsx atau .xls).'));
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

function setAppSetting(settingKey, settingValue) {
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(settingKey, String(settingValue ?? ''));
}

function getActiveRemisiBatch() {
  const activeBatchIdFromSetting = Number(getAppSetting('remisi_active_batch_id', '0')) || 0;
  let batch = null;

  if (activeBatchIdFromSetting > 0) {
    batch = db.prepare(`
      SELECT id, label, periode_bulan AS periodeBulan, periode_tahun AS periodeTahun,
        notes, source_type AS sourceType, is_active AS isActive, created_at AS createdAt
      FROM remisi_batches
      WHERE id = ?
      LIMIT 1
    `).get(activeBatchIdFromSetting);
  }

  if (!batch) {
    batch = db.prepare(`
      SELECT id, label, periode_bulan AS periodeBulan, periode_tahun AS periodeTahun,
        notes, source_type AS sourceType, is_active AS isActive, created_at AS createdAt
      FROM remisi_batches
      WHERE is_active = 1
      ORDER BY id DESC
      LIMIT 1
    `).get();
  }

  if (!batch) {
    batch = db.prepare(`
      SELECT id, label, periode_bulan AS periodeBulan, periode_tahun AS periodeTahun,
        notes, source_type AS sourceType, is_active AS isActive, created_at AS createdAt
      FROM remisi_batches
      ORDER BY id DESC
      LIMIT 1
    `).get();
  }

  return batch || null;
}

function setActiveRemisiBatch(batchId) {
  const normalizedBatchId = Number(batchId) || 0;
  if (!normalizedBatchId) return false;
  const exists = db.prepare('SELECT id FROM remisi_batches WHERE id = ?').get(normalizedBatchId);
  if (!exists) return false;

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE remisi_batches SET is_active = 0').run();
    db.prepare('UPDATE remisi_batches SET is_active = 1 WHERE id = ?').run(normalizedBatchId);
    setAppSetting('remisi_active_batch_id', String(normalizedBatchId));
    db.exec('COMMIT');
    return true;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function normalizeExcelHeaderKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
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

function normalizeDateToYmd(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  const dashMatch = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const day = dashMatch[1].padStart(2, '0');
    const month = dashMatch[2].padStart(2, '0');
    const year = dashMatch[3];
    return `${year}-${month}-${day}`;
  }

  const monthMap = {
    januari: '01',
    februari: '02',
    maret: '03',
    april: '04',
    mei: '05',
    juni: '06',
    juli: '07',
    agustus: '08',
    september: '09',
    oktober: '10',
    november: '11',
    desember: '12',
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    mei: '05',
    jun: '06',
    jul: '07',
    agu: '08',
    aug: '08',
    sep: '09',
    sept: '09',
    okt: '10',
    oct: '10',
    nov: '11',
    des: '12',
    dec: '12',
  };
  const indoMatch = raw.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})$/);
  if (indoMatch) {
    const day = indoMatch[1].padStart(2, '0');
    const monthRaw = indoMatch[2].toLowerCase().replace(/\./g, '');
    const year = indoMatch[3];
    const month = monthMap[monthRaw];
    if (month) return `${year}-${month}-${day}`;
  }

  return null;
}

function ensureDailyOperationalResets() {
  const todayYmd = getTodayYmd();
  const lastResetDate = normalizeDateToYmd(getAppSetting('daily_operational_reset_date', ''));
  if (lastResetDate === todayYmd) return;

  db.exec('BEGIN');
  try {
    db.prepare(`
      UPDATE board_registrasi_hunian
      SET wni_isi=0,
          wni_tambah=0,
          wni_kurang=0,
          wna_isi=0,
          wna_tambah=0,
          wna_kurang=0
    `).run();

    db.prepare('UPDATE statistik SET pengunjung_hari_ini=0 WHERE id=1').run();

    setAppSetting('daily_operational_reset_date', todayYmd);
    setAppSetting('board_registrasi_hunian_last_input_date', '');
    setAppSetting('statistik_kunjungan_last_input_date', '');

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function formatDateIndo(value) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  if (raw === '-') return '-';

  const dateTimeMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(?::\d{2})?$/);
  if (dateTimeMatch) {
    const normalized = normalizeDateToYmd(dateTimeMatch[1]);
    if (!normalized) return raw;
    const dateObj = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(dateObj.getTime())) return raw;
    const label = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
    return `${label} pukul ${dateTimeMatch[2]} WIB`;
  }

  const normalized = normalizeDateToYmd(raw);
  if (!normalized) return raw;
  const dateObj = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(dateObj.getTime())) return raw;

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateObj);
}

function isOnGoingPunishment(selectedYmd, startDateValue, endDateValue) {
  const selected = normalizeDateToYmd(selectedYmd);
  const start = normalizeDateToYmd(startDateValue);
  const end = normalizeDateToYmd(endDateValue);
  if (!selected) return false;

  if (start && end) return selected >= start && selected <= end;
  if (start && !end) return selected >= start;
  if (!start && end) return selected <= end;
  return false;
}

function isEmptyIntegrationStatus(value) {
  const normalized = String(value || '').trim();
  return !normalized || normalized === '-';
}

function isIntegrationOverdue(tanggalDuaPerTiga, statusIntegrasi) {
  const dueDate = normalizeDateToYmd(tanggalDuaPerTiga);
  if (!dueDate) return false;
  if (!isEmptyIntegrationStatus(statusIntegrasi)) return false;
  return dueDate < getTodayYmd();
}

function parseMoneyNumber(value) {
  let cleaned = String(value ?? '').trim();
  if (!cleaned) return 0;

  cleaned = cleaned
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '');

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount > 1) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      const parts = cleaned.split(',');
      if ((parts[1] || '').length === 3) {
        cleaned = parts.join('');
      } else {
        cleaned = `${parts[0] || '0'}.${parts[1] || '0'}`;
      }
    }
  } else if (hasDot) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      const parts = cleaned.split('.');
      if ((parts[1] || '').length === 3) {
        cleaned = parts.join('');
      }
    }
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value) || 0);
}

function normalizePnbpPeriod(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeNominalString(value) {
  const parsed = parseMoneyNumber(value);
  return String(Math.round(parsed));
}

function computePnbpPeriodTotal(tahun, periodePnbp) {
  const period = normalizePnbpPeriod(periodePnbp);
  const year = String(tahun || '').trim();
  if (!year || !period) return 0;

  const rows = db.prepare(`
    SELECT jumlah
    FROM giiatja_pnbp_pendapatan
    WHERE tahun = ?
      AND UPPER(TRIM(periode_pnbp)) = ?
  `).all(year, period);

  return rows.reduce((sum, item) => sum + parseMoneyNumber(item?.jumlah), 0);
}

function recalculateAndPersistPnbpByPeriod(tahun, periodePnbp) {
  const period = normalizePnbpPeriod(periodePnbp);
  const year = String(tahun || '').trim();
  if (!year || !period) return;

  const total = computePnbpPeriodTotal(year, period);
  const targetRow = db.prepare(`
    SELECT id, target_realisasi
    FROM giiatja_pnbp
    WHERE tahun = ?
      AND UPPER(TRIM(periode_pnbp)) = ?
    ORDER BY id ASC
  `).get(year, period);
  if (!targetRow?.id) return;

  const target = parseMoneyNumber(targetRow.target_realisasi);
  const percentValue = target > 0 ? (total / target) * 100 : 0;
  const roundedPercent = Number.isFinite(percentValue)
    ? (Math.abs(percentValue - Math.round(percentValue)) < 0.001 ? String(Math.round(percentValue)) : percentValue.toFixed(2).replace(/\.00$/, ''))
    : '0';
  const keterangan = target > 0
    ? (percentValue >= 100 ? 'TERCAPAI' : 'BELUM TERCAPAI')
    : '';

  db.prepare(`
    UPDATE giiatja_pnbp
    SET jumlah_pnbp = ?, persentase = ?, keterangan = ?
    WHERE id = ?
  `).run(String(Math.round(total)), `${roundedPercent}%`, keterangan, Number(targetRow.id));
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
  const pdfPath = getAppSetting('keuangan_pdf_path', '');
  const chartTotal = Math.max(totalPagu, realisasiBelanja + sisaPagu);
  const realisasiPercent = chartTotal > 0 ? ((realisasiBelanja / chartTotal) * 100) : 0;
  const sisaPercent = chartTotal > 0 ? ((sisaPagu / chartTotal) * 100) : 0;

  return {
    totalPagu,
    realisasiBelanja,
    sisaPagu,
    updatedAtRaw,
    pdfPath,
    updatedAtLabel: formatFinanceUpdatedAt(updatedAtRaw),
    realisasiPercent: Number(realisasiPercent.toFixed(1)),
    sisaPercent: Number(sisaPercent.toFixed(1)),
    totalPaguLabel: `Rp ${formatRupiah(totalPagu)}`,
    realisasiBelanjaLabel: `Rp ${formatRupiah(realisasiBelanja)}`,
    sisaPaguLabel: `Rp ${formatRupiah(sisaPagu)}`,
  };
}

function getFinanceIndicatorSummary() {
  const defaults = {
    no: '1',
    periode: '04 April',
    kodeKppn: '004',
    kodeBa: '137',
    kodeSatker: '692260',
    uraianSatker: 'LAPAS KELAS I MEDAN',
    keterangan: 'NILAI BOBOT NILAI AKHIR',
    revisiDipa: '100,00',
    deviasiHalamanIiiDipa: '94,58',
    nilaiAspekPerencanaan: '97,29',
    penyerapanAnggaran: '83,07',
    belanjaKontraktual: '100,00',
    penyelesaianTagihan: '90,00',
    pengelolaanUpDanTup: '0,00',
    nilaiAspekPelaksanaan: '91,02',
    capaianOutput: '0,00',
    nilaiAspekHasil: '0,00',
    nilaiTotal: '59,80',
    konversiBobot: '90,00%',
    dispensasiSpm: '0,00',
    nilaiAkhir: '66,45'
  };

  const raw = getAppSetting('keuangan_indikator_data', '');
  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;
    return {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, String(value ?? '').trim()])
      )
    };
  } catch {
    return defaults;
  }
}

function getMonthOptions() {
  return [
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
}

function getPiketJagaNotes() {
  return [
    'P = Bertugas sejak pukul 07.00 WIB s/d 13.00 WIB',
    'S = Bertugas sejak pukul 13.00 WIB s/d 19.00 WIB',
    'M = Bertugas sejak pukul 19.00 WIB s/d 07.00 WIB',
    'Hadir 15 menit sebelum jam melaksanakan tugas',
    'Pakaian dinas lapangan',
    'Melaksanakan tugas dengan penuh pengabdian, kesadaran dan tanggung jawab',
    'Tidak diperkenankan meninggalkan tugas tanpa seizin KA.KPLP atau Ka.Rupam',
  ];
}

function getPiketJagaData(filter = {}) {
  const [defaultYear, defaultMonth] = getTodayYmd().split('-');
  const selectedYear = /^\d{4}$/.test(String(filter.year || '')) ? String(filter.year) : defaultYear;
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(String(filter.month || '')) ? String(filter.month) : defaultMonth;
  const daysInMonth = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
  const dayCodeMap = ['MG', 'SN', 'SL', 'RB', 'KM', 'JM', 'SB'];

  const row = db.prepare(`
    SELECT
      regu1_name AS regu1Name,
      regu2_name AS regu2Name,
      regu3_name AS regu3Name,
      regu4_name AS regu4Name,
      regu1_schedule AS regu1Schedule,
      regu2_schedule AS regu2Schedule,
      regu3_schedule AS regu3Schedule,
      regu4_schedule AS regu4Schedule,
      regu_names_json AS reguNamesJson,
      regu_schedules_json AS reguSchedulesJson,
      regu_members_json AS reguMembersJson,
      keterangan
    FROM kamtib_piket_jaga
    WHERE year = ? AND month = ?
    LIMIT 1
  `).get(selectedYear, selectedMonth);

  const parseSchedule = (rawValue) => {
    try {
      const parsed = JSON.parse(String(rawValue || '[]'));
      if (!Array.isArray(parsed)) return Array.from({ length: daysInMonth }, () => '');
      return Array.from({ length: daysInMonth }, (_item, index) => String(parsed[index] || '').trim().toUpperCase());
    } catch {
      return Array.from({ length: daysInMonth }, () => '');
    }
  };

  const legacyReguNames = [
    row?.regu1Name || 'REGU I',
    row?.regu2Name || 'REGU II',
    row?.regu3Name || 'REGU III',
    row?.regu4Name || 'REGU IV',
  ];

  const legacySchedules = [
    parseSchedule(row?.regu1Schedule),
    parseSchedule(row?.regu2Schedule),
    parseSchedule(row?.regu3Schedule),
    parseSchedule(row?.regu4Schedule),
  ];

  let reguNames = [];
  try {
    const parsedNames = JSON.parse(String(row?.reguNamesJson || '[]'));
    if (Array.isArray(parsedNames)) {
      reguNames = parsedNames
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 20);
    }
  } catch (_err) {
    reguNames = [];
  }
  if (!reguNames.length) {
    reguNames = legacyReguNames;
  }

  let schedules = [];
  try {
    const parsedSchedules = JSON.parse(String(row?.reguSchedulesJson || '[]'));
    if (Array.isArray(parsedSchedules)) {
      schedules = reguNames.map((_name, reguIndex) => {
        const source = Array.isArray(parsedSchedules[reguIndex]) ? parsedSchedules[reguIndex] : [];
        return Array.from({ length: daysInMonth }, (_item, index) => String(source[index] || '').trim().toUpperCase());
      });
    }
  } catch (_err) {
    schedules = [];
  }
  if (!schedules.length) {
    schedules = reguNames.map((_name, reguIndex) => legacySchedules[reguIndex] || Array.from({ length: daysInMonth }, () => ''));
  }

  let reguMembers = [];
  try {
    const parsedMembers = JSON.parse(String(row?.reguMembersJson || '[]'));
    if (Array.isArray(parsedMembers)) {
      reguMembers = reguNames.map((_name, reguIndex) => {
        const source = parsedMembers[reguIndex];
        if (!Array.isArray(source)) return [];
        return source
          .map(item => {
            if (item && typeof item === 'object') {
              const nama = String(item.nama || item.name || '').trim();
              const gol = String(item.gol || item.golongan || '-').trim() || '-';
              const jabatan = String(item.jabatan || 'ANGGOTA').trim() || 'ANGGOTA';
              return { nama, gol, jabatan };
            }
            const raw = String(item || '').trim();
            if (!raw) return null;
            const parts = raw.split('|').map(part => part.trim());
            return {
              nama: parts[0] || '',
              gol: parts[1] || '-',
              jabatan: parts[2] || 'ANGGOTA',
            };
          })
          .filter(Boolean)
          .filter(item => item.nama)
          .filter(Boolean)
          .slice(0, 100);
      });
    }
  } catch (_err) {
    reguMembers = [];
  }
  if (!reguMembers.length) {
    reguMembers = reguNames.map(() => []);
  }

  const reguMemberLines = reguMembers.map(list => list.map(item => `${item.nama}|${item.gol}|${item.jabatan}`));

  const days = Array.from({ length: daysInMonth }, (_item, index) => {
    const day = index + 1;
    const dateObj = new Date(Number(selectedYear), Number(selectedMonth) - 1, day);
    return {
      day,
      dayCode: dayCodeMap[dateObj.getDay()] || '-',
      isWeekend: dateObj.getDay() === 0,
    };
  });

  const yearRows = db.prepare('SELECT DISTINCT year FROM kamtib_piket_jaga ORDER BY year DESC').all();
  const yearOptions = Array.from(new Set([selectedYear, ...yearRows.map(item => String(item.year || '').trim()).filter(Boolean)])).sort((a, b) => Number(b) - Number(a));

  return {
    selectedYear,
    selectedMonth,
    monthOptions: getMonthOptions(),
    yearOptions,
    days,
    daysInMonth,
    reguNames,
    schedules,
    reguMembers,
    reguMemberLines,
    piketNotes: getPiketJagaNotes(),
  };
}

function getKamtibPengaduanData(filter = {}) {
  const [defaultYear, defaultMonth] = getTodayYmd().split('-');
  const selectedYear = /^\d{4}$/.test(String(filter.year || '')) ? String(filter.year) : defaultYear;
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(String(filter.month || '')) ? String(filter.month) : defaultMonth;
  const searchKeyword = String(filter.search || '').trim();

  const normalizeSearchText = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const pengaduanRows = db.prepare(`
    SELECT
      no_pengaduan AS noPengaduan,
      nik,
      nama,
      no_whatsapp AS noWhatsapp,
      jenis_pengaduan AS jenisPengaduan,
      materi_pengaduan AS materiPengaduan,
      dokumentasi_path AS dokumentasiPath,
      status,
      alasan_penolakan AS alasanPenolakan,
      lampiran_admin_path AS lampiranAdminPath,
      tanggal_pengaduan AS tanggalPengaduan
    FROM pengaduan_masyarakat
    ORDER BY tanggal_pengaduan DESC, id DESC
  `).all();

  const statusPengecualian = new Set(['DITERIMA', 'DIPROSES', 'DITOLAK']);
  const list = pengaduanRows.filter((item) => {
    const status = String(item.status || '').trim().toUpperCase();
    const tanggalYmd = normalizeDateToYmd(item.tanggalPengaduan);
    const isSameMonth = Boolean(tanggalYmd)
      && tanggalYmd.slice(0, 4) === selectedYear
      && tanggalYmd.slice(5, 7) === selectedMonth;
    const passMonthRule = isSameMonth || statusPengecualian.has(status);
    if (!passMonthRule) return false;

    if (!searchKeyword) return true;

    const dateSlash = tanggalYmd
      ? `${tanggalYmd.slice(8, 10)}/${tanggalYmd.slice(5, 7)}/${tanggalYmd.slice(0, 4)}`
      : '';
    const dateDash = tanggalYmd
      ? `${tanggalYmd.slice(8, 10)}-${tanggalYmd.slice(5, 7)}-${tanggalYmd.slice(0, 4)}`
      : '';
    const searchBlob = normalizeSearchText([
      item.noPengaduan,
      item.nik,
      item.nama,
      item.noWhatsapp,
      item.jenisPengaduan,
      item.materiPengaduan,
      item.status,
      item.alasanPenolakan,
      item.tanggalPengaduan,
      tanggalYmd,
      dateSlash,
      dateDash,
    ].join(' '));
    return searchBlob.includes(normalizeSearchText(searchKeyword));
  });

  const monthOptions = getMonthOptions();
  const yearRows = db.prepare(`
    SELECT DISTINCT SUBSTR(COALESCE(tanggal_pengaduan, ''), 1, 4) AS year
    FROM pengaduan_masyarakat
    WHERE LENGTH(COALESCE(tanggal_pengaduan, '')) >= 7
    ORDER BY year DESC
  `).all();
  const yearOptions = Array.from(new Set([
    ...yearRows.map((item) => String(item.year || '')).filter((item) => /^\d{4}$/.test(item)),
    defaultYear,
  ])).sort((a, b) => Number(b) - Number(a));

  return {
    list,
    selectedYear,
    selectedMonth,
    searchKeyword,
    monthOptions,
    yearOptions,
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

app.use((req, res, next) => {
  ensureDailyOperationalResets();
  next();
});

app.use((req, res, next) => {
  res.locals.formatDateIndo = formatDateIndo;
  next();
});

// ─── Role Access Map ─────────────────────────────────────────────────────────
const ROLES = ['superadmin', 'registrasi', 'pembinaan', 'klinik', 'dapur', 'humas', 'kamtib', 'tata_usaha', 'pengamanan', 'giiatja'];

const roleAccess = {
  superadmin: ['dashboard', 'statistik', 'remisi', 'kata-bijak', 'menu', 'jadwal', 'pembinaan-detail', 'razia', 'pengawalan', 'register-f', 'strapsel', 'piket-jaga', 'tu-umum', 'kamar-blok', 'papan-isi', 'luar-tembok', 'giiatja', 'users', 'video', 'klinik-medis', 'klinik-berobat', 'klinik-oncall', 'klinik-kontrol', 'klinik-statistik', 'pengaduan'],
  registrasi: ['dashboard', 'statistik', 'remisi', 'papan-isi'],
  pembinaan: ['dashboard', 'jadwal', 'pembinaan-detail'],
  klinik: ['dashboard', 'klinik-medis', 'klinik-berobat', 'klinik-oncall', 'klinik-kontrol', 'klinik-statistik'],
  dapur: ['dashboard', 'menu'],
  humas: ['dashboard', 'video', 'kata-bijak'],
  kamtib: ['dashboard',  'razia', 'pengawalan', 'register-f', 'strapsel', 'piket-jaga', 'pengaduan'],
  tata_usaha: ['dashboard', 'tu-umum'],
  pengamanan: ['dashboard', 'kamar-blok', 'luar-tembok'],
  giiatja: ['dashboard', 'giiatja'],
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

  const activeRemisiBatch = getActiveRemisiBatch();

  const besaranRemisi = db
    .prepare(`
      SELECT jenis, nama, besaran, remisi_total AS remisiTotal
      FROM besaran_remisi
      WHERE (? = 0 OR batch_id = ?)
      ORDER BY nama COLLATE NOCASE ASC
    `)
    .all(Number(activeRemisiBatch?.id || 0), Number(activeRemisiBatch?.id || 0));

  const menuMakan = db
    .prepare(`SELECT
      s.tanggal,
      m.waktu,
      m.menu,
      m.photo_path AS photoPath
    FROM menu_harian_set s
    INNER JOIN menu_harian_list_item li ON li.list_id = s.list_id
    INNER JOIN menu_master m ON m.id = li.menu_master_id
    WHERE s.tanggal = ?
    ORDER BY li.sort_order ASC,
      CASE m.waktu
        WHEN 'MAKAN PAGI' THEN 1
        WHEN 'SNACK' THEN 2
        WHEN 'MAKAN SIANG' THEN 3
        WHEN 'MAKAN SORE' THEN 4
        ELSE 5
      END ASC,
      m.id ASC`)
    .all(todayYmd);

  const menuMakanHistory = db
    .prepare(`SELECT
      s.tanggal,
      m.waktu,
      m.menu,
      m.photo_path AS photoPath
    FROM menu_harian_set s
    INNER JOIN menu_harian_list_item li ON li.list_id = s.list_id
    INNER JOIN menu_master m ON m.id = li.menu_master_id
    ORDER BY s.tanggal DESC, li.sort_order ASC, m.id ASC`)
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
        d.jenis_kejahatan AS jenisKejahatan,
        d.blok_kamar AS blokKamar,
        d.tanggal1,
        d.tanggal2,
        d.tanggal3,
        d.tanggal4,
        d.total_remisi AS totalRemisi,
        d.keterangan,
        COALESCE(NULLIF(TRIM(d.status_integrasi), ''), p.status_integrasi, '-') AS statusIntegrasi
      FROM pentahapan_pembinaan_detail d
      LEFT JOIN pentahapan_pembinaan p ON UPPER(TRIM(p.nama_wbp)) = UPPER(TRIM(d.nama_wbp))
      ORDER BY d.nama_wbp COLLATE NOCASE ASC`)
    .all()
    .map((item) => ({
      ...item,
      isStatusOverdue: isIntegrationOverdue(item.tanggal2, item.statusIntegrasi),
    }));

  const jadwalKegiatan = db
    .prepare(`SELECT
      hari,
      waktu,
      kegiatan,
      lokasi,
      penanggung_jawab AS penanggungJawab
    FROM jadwal_kegiatan
    ORDER BY
      CASE UPPER(TRIM(hari))
        WHEN 'SENIN' THEN 1
        WHEN 'SELASA' THEN 2
        WHEN 'RABU' THEN 3
        WHEN 'KAMIS' THEN 4
        WHEN 'JUMAT' THEN 5
        WHEN 'JUM''AT' THEN 5
        WHEN 'SABTU' THEN 6
        WHEN 'MINGGU' THEN 7
        ELSE 99
      END ASC,
      UPPER(TRIM(penanggung_jawab)) ASC,
      UPPER(TRIM(waktu)) ASC,
      id ASC`)
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
    pengunjungHariIni: statistik.pengunjung_hari_ini,
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

function getSecurityData(filter = {}) {
  const selectedTanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(filter.tanggal || ''))
    ? String(filter.tanggal)
    : getTodayYmd();
  const searchKeyword = String(filter.search || '').trim();

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
    .all()
    .filter(item => {
      if (searchKeyword) {
        const haystack = [
          item.namaWbp,
          item.blokHunian,
          item.tanggalMasukStrapsel,
          item.ekspirasi,
          item.permasalahan,
          item.barangBukti,
        ].map(v => String(v || '').toLowerCase()).join(' ');
        return haystack.includes(searchKeyword.toLowerCase());
      }

      return isOnGoingPunishment(selectedTanggal, item.tanggalMasukStrapsel, item.ekspirasi);
    });

  const registerFBase = db
    .prepare(`SELECT
      id,
      no_register AS noRegister,
      nama_wbp AS namaWbp,
      jenis_pelanggaran AS jenisPelanggaran,
      tanggal_pelanggaran AS tanggalPelanggaran,
      lama_hukuman AS lamaHukuman,
      hukuman_mulai AS hukumanMulai,
      hukuman_selesai AS hukumanSelesai,
      keterangan
    FROM register_f ORDER BY id DESC`)
    .all();

  const registerFList = registerFBase.filter(item => {
    if (searchKeyword) {
      const haystack = [
        item.noRegister,
        item.namaWbp,
        item.jenisPelanggaran,
        item.tanggalPelanggaran,
        item.lamaHukuman,
        item.hukumanMulai,
        item.hukumanSelesai,
        item.keterangan,
      ].map(v => String(v || '').toLowerCase()).join(' ');
      return haystack.includes(searchKeyword.toLowerCase());
    }

    return isOnGoingPunishment(selectedTanggal, item.hukumanMulai, item.hukumanSelesai);
  });

  return {
    strapselList,
    registerFList,
    selectedTanggal,
    searchKeyword,
    securitySummary: {
      totalStrapsel: strapselList.length,
      totalRegisterF: registerFList.length,
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
      tahun_perolehan AS tahunPerolehan,
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

function getGiiatjaData(options = {}) {
  const pelatihanSearch = String(options.pelatihanSearch || '').trim();
  const pnbpYearFilter = String(options.pnbpYear || '').trim();
  const pnbpDetailYearFilter = String(options.pnbpDetailYear || '').trim();
  const pnbpDetailPeriodFilter = String(options.pnbpDetailPeriod || '').trim();
  const premiSearch = String(options.premiSearch || '').trim();
  const premiMonthFilter = String(options.premiMonth || '').trim().toUpperCase();
  const premiYearFilter = String(options.premiYear || '').trim();

  const parseNominal = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    const parsed = Number(digits);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, parsed);
  };

  const normalizeSearchText = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const monthOrderSql = `
    CASE UPPER(TRIM(periode_bulan))
      WHEN 'JANUARI' THEN 1
      WHEN 'FEBRUARI' THEN 2
      WHEN 'MARET' THEN 3
      WHEN 'APRIL' THEN 4
      WHEN 'MEI' THEN 5
      WHEN 'JUNI' THEN 6
      WHEN 'JULI' THEN 7
      WHEN 'AGUSTUS' THEN 8
      WHEN 'SEPTEMBER' THEN 9
      WHEN 'OKTOBER' THEN 10
      WHEN 'NOVEMBER' THEN 11
      WHEN 'DESEMBER' THEN 12
      ELSE 99
    END
  `;

  const buildPelatihanSearchBlob = (item) => {
    const rawTanggal = String(item.tanggalPelaksanaan || '').trim();
    const normalizedTanggal = normalizeDateToYmd(rawTanggal) || '';
    const monthLabel = normalizedTanggal
      ? new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        month: 'long',
        year: 'numeric'
      }).format(new Date(`${normalizedTanggal}T00:00:00`))
      : '';

    const dateTokens = [];
    if (normalizedTanggal) {
      const [year, month, day] = normalizedTanggal.split('-');
      dateTokens.push(
        normalizedTanggal,
        `${day}/${month}/${year}`,
        `${day}-${month}-${year}`,
        formatDateIndo(normalizedTanggal),
        monthLabel
      );
    }

    return normalizeSearchText([
      item.noRegistrasi,
      item.namaWbp,
      item.jenisPelatihan,
      item.instruktur,
      item.keterangan,
      rawTanggal,
      ...dateTokens
    ].join(' '));
  };

  const kegiatanCategories = db
    .prepare(`SELECT
      id,
      kategori,
      sort_order AS sortOrder
    FROM giiatja_kegiatan
    ORDER BY sort_order ASC, id ASC`)
    .all();

  const kegiatanDetails = db
    .prepare(`SELECT
      d.id,
      d.kegiatan_id AS kegiatanId,
      c.kategori,
      d.jenis_kegiatan AS jenisKegiatan,
      d.peserta_kegiatan AS pesertaKegiatan,
      d.pengawas,
      d.dokumentasi_path AS dokumentasiPath,
      d.sort_order AS sortOrder
    FROM giiatja_kegiatan_detail d
    INNER JOIN giiatja_kegiatan c ON c.id = d.kegiatan_id
    ORDER BY c.sort_order ASC, c.id ASC, d.sort_order ASC, d.id ASC`)
    .all();

  const kegiatanGrouped = kegiatanCategories.map((category) => {
    const details = kegiatanDetails.filter((detail) => detail.kegiatanId === category.id);
    return {
      ...category,
      details,
    };
  });

  const pelatihanRawList = db
    .prepare(`SELECT
      id,
      no_registrasi AS noRegistrasi,
      nama_wbp AS namaWbp,
      jenis_pelatihan AS jenisPelatihan,
      tanggal_pelaksanaan AS tanggalPelaksanaan,
      instruktur,
      poto_sertifikat_path AS potoSertifikatPath,
      keterangan
    FROM giiatja_pelatihan_sertifikat
    ORDER BY id ASC`)
    .all();

  const normalizedSearchKeyword = normalizeSearchText(pelatihanSearch);
  const normalizedSearchDate = normalizeDateToYmd(pelatihanSearch) || '';

  const pelatihanList = !normalizedSearchKeyword
    ? pelatihanRawList
    : pelatihanRawList.filter((item) => {
      const blob = buildPelatihanSearchBlob(item);
      if (blob.includes(normalizedSearchKeyword)) return true;
      if (!normalizedSearchDate) return false;
      const itemDate = normalizeDateToYmd(item.tanggalPelaksanaan || '');
      return Boolean(itemDate && itemDate === normalizedSearchDate);
    });

  const groupedPelatihanMap = new Map();
  pelatihanList.forEach((item) => {
    const normalizedTanggal = normalizeDateToYmd(item.tanggalPelaksanaan || '');
    const monthKey = normalizedTanggal ? normalizedTanggal.slice(0, 7) : 'unknown';
    const monthLabel = normalizedTanggal
      ? new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        month: 'long',
        year: 'numeric'
      }).format(new Date(`${normalizedTanggal}T00:00:00`))
      : 'Tanggal tidak valid / belum diisi';

    if (!groupedPelatihanMap.has(monthKey)) {
      groupedPelatihanMap.set(monthKey, {
        monthKey,
        monthLabel,
        items: [],
      });
    }
    groupedPelatihanMap.get(monthKey).items.push(item);
  });

  const pelatihanGroupedByMonth = Array.from(groupedPelatihanMap.values())
    .sort((a, b) => {
      if (a.monthKey === 'unknown') return 1;
      if (b.monthKey === 'unknown') return -1;
      return b.monthKey.localeCompare(a.monthKey);
    });

  const pnbpRawList = db
    .prepare(`SELECT
      id,
      tahun,
      periode_pnbp AS periodePnbp,
      target_realisasi AS targetRealisasi,
      persentase,
      keterangan,
      sort_order AS sortOrder
    FROM giiatja_pnbp
    ORDER BY tahun DESC,
      CASE UPPER(TRIM(periode_pnbp))
        WHEN 'JANUARI' THEN 1
        WHEN 'FEBRUARI' THEN 2
        WHEN 'MARET' THEN 3
        WHEN 'APRIL' THEN 4
        WHEN 'MEI' THEN 5
        WHEN 'JUNI' THEN 6
        WHEN 'JULI' THEN 7
        WHEN 'AGUSTUS' THEN 8
        WHEN 'SEPTEMBER' THEN 9
        WHEN 'OKTOBER' THEN 10
        WHEN 'NOVEMBER' THEN 11
        WHEN 'DESEMBER' THEN 12
        ELSE 99
      END ASC,
      id ASC`)
    .all();

  const pnbpComputedList = pnbpRawList.map((item) => {
    const jumlahPnbp = computePnbpPeriodTotal(item.tahun, item.periodePnbp);
    const targetNominal = parseNominal(item.targetRealisasi);
    const percentValue = targetNominal > 0 ? (jumlahPnbp / targetNominal) * 100 : 0;
    const persentaseCalc = targetNominal > 0
      ? (Math.abs(percentValue - Math.round(percentValue)) < 0.001
        ? `${Math.round(percentValue)}%`
        : `${percentValue.toFixed(2).replace(/\.00$/, '')}%`)
      : '0%';
    const keteranganCalc = targetNominal > 0
      ? (percentValue >= 100 ? 'TERCAPAI' : 'BELUM TERCAPAI')
      : '-';

    return {
      ...item,
      jumlahPnbp,
      targetRealisasiNominal: targetNominal,
      persentaseCalc,
      keteranganCalc,
    };
  });

  const premiRawList = db
    .prepare(`SELECT
      id,
      no_registrasi AS noRegistrasi,
      nama_wbp AS namaWbp,
      periode_bulan AS periodeBulan,
      periode_tahun AS periodeTahun,
      jenis_kegiatan AS jenisKegiatan,
      premi_didapat AS premiDidapat,
      keterangan,
      sort_order AS sortOrder
    FROM giiatja_premi_wbp
    ORDER BY periode_tahun DESC,
      ${monthOrderSql} ASC,
      sort_order ASC,
      id ASC`)
    .all();

  const defaultPnbpYear = String(new Date().getFullYear());
  const pnbpYears = Array.from(new Set(
    pnbpRawList
      .map(item => String(item.tahun || '').trim())
      .filter(Boolean)
  )).sort((a, b) => String(b).localeCompare(String(a), undefined, { numeric: true }));

  const requestedYear = pnbpYearFilter || defaultPnbpYear;
  const wantsAllYears = /^(semua|all)$/i.test(requestedYear);
  const pnbpSelectedYear = wantsAllYears
    ? 'SEMUA'
    : (pnbpYears.includes(requestedYear) ? requestedYear : (pnbpYears[0] || defaultPnbpYear));

  const pnbpList = wantsAllYears
    ? pnbpComputedList
    : pnbpComputedList.filter(item => String(item.tahun || '').trim() === pnbpSelectedYear);

  const pnbpDetailYear = String(pnbpDetailYearFilter || '').trim();
  const pnbpDetailPeriod = normalizePnbpPeriod(pnbpDetailPeriodFilter || '');
  const hasPnbpDetailSelection = Boolean(pnbpDetailYear && pnbpDetailPeriod);
  const pnbpPendapatanAll = db.prepare(`
    SELECT
      id,
      tahun,
      periode_pnbp AS periodePnbp,
      kegiatan,
      peserta,
      jumlah
    FROM giiatja_pnbp_pendapatan
    ORDER BY tahun DESC,
      CASE UPPER(TRIM(periode_pnbp))
        WHEN 'JANUARI' THEN 1
        WHEN 'FEBRUARI' THEN 2
        WHEN 'MARET' THEN 3
        WHEN 'APRIL' THEN 4
        WHEN 'MEI' THEN 5
        WHEN 'JUNI' THEN 6
        WHEN 'JULI' THEN 7
        WHEN 'AGUSTUS' THEN 8
        WHEN 'SEPTEMBER' THEN 9
        WHEN 'OKTOBER' THEN 10
        WHEN 'NOVEMBER' THEN 11
        WHEN 'DESEMBER' THEN 12
        ELSE 99
      END ASC,
      sort_order ASC,
      id ASC
  `).all();
  const pnbpDetailPendapatanList = hasPnbpDetailSelection
    ? pnbpPendapatanAll.filter((item) => {
      return String(item.tahun || '').trim() === pnbpDetailYear
        && normalizePnbpPeriod(item.periodePnbp || '') === pnbpDetailPeriod;
    })
    : [];
  const pnbpDetailPendapatanTotal = pnbpDetailPendapatanList
    .reduce((sum, item) => sum + parseMoneyNumber(item.jumlah), 0);

  const pnbpTahun = pnbpSelectedYear;
  const premiMonths = Array.from(new Set(
    premiRawList.map(item => String(item.periodeBulan || '').trim().toUpperCase()).filter(Boolean)
  )).sort((a, b) => {
    const orders = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
    const ia = orders.indexOf(a);
    const ib = orders.indexOf(b);
    const va = ia === -1 ? 99 : ia;
    const vb = ib === -1 ? 99 : ib;
    return va - vb;
  });
  const premiYears = Array.from(new Set(
    premiRawList.map(item => String(item.periodeTahun || '').trim()).filter(Boolean)
  )).sort((a, b) => String(b).localeCompare(String(a), undefined, { numeric: true }));

  const premiSelectedMonth = premiMonthFilter && premiMonthFilter !== 'SEMUA'
    ? premiMonthFilter
    : 'SEMUA';
  const premiSelectedYear = premiYearFilter && premiYearFilter !== 'SEMUA'
    ? premiYearFilter
    : 'SEMUA';
  const normalizedPremiSearch = normalizeSearchText(premiSearch);

  const premiList = premiRawList.filter((item) => {
    const month = String(item.periodeBulan || '').trim().toUpperCase();
    const year = String(item.periodeTahun || '').trim();
    if (premiSelectedMonth !== 'SEMUA' && month !== premiSelectedMonth) return false;
    if (premiSelectedYear !== 'SEMUA' && year !== premiSelectedYear) return false;
    if (!normalizedPremiSearch) return true;
    const blob = normalizeSearchText([
      item.noRegistrasi,
      item.namaWbp,
      item.jenisKegiatan,
      item.premiDidapat,
      item.keterangan,
      item.periodeBulan,
      item.periodeTahun,
      `${item.periodeBulan || ''} ${item.periodeTahun || ''}`
    ].join(' '));
    return blob.includes(normalizedPremiSearch);
  });

  const premiPeriodeBulan = premiSelectedMonth === 'SEMUA'
    ? (premiSelectedYear === 'SEMUA' ? 'SEMUA PERIODE' : `SEMUA BULAN ${premiSelectedYear}`)
    : `${premiSelectedMonth}${premiSelectedYear === 'SEMUA' ? '' : ` ${premiSelectedYear}`}`;

  const totalJumlahPnbp = pnbpList.reduce((sum, item) => sum + parseNominal(item.jumlahPnbp), 0);
  const totalTargetRealisasi = pnbpList.reduce((sum, item) => sum + parseNominal(item.targetRealisasi), 0);
  const sisaTargetPnbp = Math.max(totalTargetRealisasi - totalJumlahPnbp, 0);
  const progressPercent = totalTargetRealisasi > 0
    ? Math.max(0, Math.min(100, (totalJumlahPnbp / totalTargetRealisasi) * 100))
    : 0;

  return {
    kegiatanList: kegiatanDetails,
    kegiatanCategories,
    kegiatanDetails,
    kegiatanGrouped,
    pelatihanList,
    pelatihanGroupedByMonth,
    pelatihanSearch,
    pnbpYears,
    pnbpSelectedYear,
    pnbpList,
    pnbpDetailYear,
    pnbpDetailPeriod,
    hasPnbpDetailSelection,
    pnbpDetailPendapatanList,
    pnbpDetailPendapatanTotal,
    premiMonths,
    premiYears,
    premiSelectedMonth,
    premiSelectedYear,
    premiSearch,
    premiList,
    pnbpTahun,
    premiPeriodeBulan,
    giiatjaSummary: {
      kegiatan: kegiatanDetails.length,
      pelatihan: pelatihanList.length,
      pnbp: pnbpList.length,
      premi: premiList.length,
      total: kegiatanDetails.length + pelatihanList.length + pnbpList.length + premiList.length,
      pnbpChart: {
        totalJumlahPnbp,
        totalTargetRealisasi,
        sisaTargetPnbp,
        progressPercent,
      }
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
  const normalizePidanaJenis = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const rawPidana = db
    .prepare('SELECT id, kategori, jenis, jumlah FROM board_pidana ORDER BY id DESC')
    .all();

  const dedupePidanaByKategori = (kategori) => {
    const map = new Map();
    rawPidana
      .filter(item => item.kategori === kategori)
      .forEach((item) => {
        const jenis = normalizePidanaJenis(item.jenis);
        const key = jenis.toLowerCase();
        if (!key || map.has(key)) return;
        map.set(key, {
          ...item,
          jenis,
        });
      });
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  };

  const pidanaKhusus = dedupePidanaByKategori('khusus');
  const pidanaUmum = dedupePidanaByKategori('umum');

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
  const todayYmd = getTodayYmd();
  const currentYear = todayYmd.slice(0, 4);
  const currentMonth = todayYmd.slice(5, 7);
  const currentMonthLabel = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    month: 'long'
  }).format(new Date(`${todayYmd}T00:00:00`)).toUpperCase();
  const umum = getPublicData();
  const klinik = getClinicData({ tanggal: todayYmd });
  const razia = getRaziaData();
  const security = getSecurityData();
  const pengawalan = getPengawalanData();
  const tuUmum = getTuUmumData();
  const giiatja = getGiiatjaData();
  const housing = getHousingData();
  const board = getBoardData();

  const okupansi = umum.kapasitas > 0
    ? ((umum.totalPenghuni / umum.kapasitas) * 100).toFixed(1)
    : '0.0';
  const statistikInputDate = normalizeDateToYmd(getAppSetting('statistik_kunjungan_last_input_date', ''));
  const statistikTanggalYmd = normalizeDateToYmd(umum.tanggal);
  const hasStatistikKunjunganTodayUpdate = statistikInputDate === todayYmd
    || (!statistikInputDate && statistikTanggalYmd === todayYmd);
  const hasLuarTembokToday = (board.luarTembokDetail || []).some((item) => {
    return normalizeDateToYmd(item.tanggal) === todayYmd;
  });
  const papanIsiInputDate = normalizeDateToYmd(getAppSetting('board_registrasi_hunian_last_input_date', ''));
  const hasPapanIsiTodayUpdate = papanIsiInputDate === todayYmd;
  const hasDapurTodayUpdate = Number(db.prepare(`
    SELECT COUNT(*) AS c
    FROM menu_harian_set
    WHERE tanggal = ?
  `).get(todayYmd)?.c || 0) > 0;
  const hasKamtibMonthlyPengawalanUpdate = Number(db.prepare(`
    SELECT COUNT(*) AS c
    FROM giat_pengawalan
    WHERE substr(tanggal, 1, 4) = ?
      AND substr(tanggal, 6, 2) = ?
  `).get(currentYear, currentMonth)?.c || 0) > 0;

  const hasGiiatjaPelatihanThisMonth = db.prepare(`
    SELECT tanggal_pelaksanaan AS tanggalPelaksanaan
    FROM giiatja_pelatihan_sertifikat
  `).all().some((item) => {
    const normalized = normalizeDateToYmd(item.tanggalPelaksanaan);
    return Boolean(normalized && normalized.startsWith(`${currentYear}-${currentMonth}`));
  });
  const hasGiiatjaPnbpThisMonth = Number(db.prepare(`
    SELECT COUNT(*) AS c
    FROM giiatja_pnbp
    WHERE TRIM(tahun) = ?
      AND UPPER(TRIM(periode_pnbp)) = ?
  `).get(currentYear, currentMonthLabel)?.c || 0) > 0;
  const hasGiiatjaPremiThisMonth = Number(db.prepare(`
    SELECT COUNT(*) AS c
    FROM giiatja_premi_wbp
    WHERE TRIM(periode_tahun) = ?
      AND UPPER(TRIM(periode_bulan)) = ?
  `).get(currentYear, currentMonthLabel)?.c || 0) > 0;
  const hasGiiatjaMonthlyUpdate = hasGiiatjaPelatihanThisMonth || hasGiiatjaPnbpThisMonth || hasGiiatjaPremiThisMonth;

  const pengaduanDiterimaCount = Number(db.prepare(`
    SELECT COUNT(*) AS c
    FROM pengaduan_masyarakat
    WHERE UPPER(TRIM(status)) = 'DITERIMA'
  `).get()?.c || 0);
  const totalPengaduanMasyarakat = Number(db.prepare(`
    SELECT COUNT(*) AS c
    FROM pengaduan_masyarakat
  `).get()?.c || 0);

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
    registerFList: security.registerFList,
    securitySummary: security.securitySummary,
    pengawalanList: pengawalan.list,
    pengawalanSummary: {
      totalPengawalan: pengawalan.list.length,
    },
    tuUmumList: tuUmum.tuUmumList,
    pegawaiList: tuUmum.pegawaiList,
    financeSummary: tuUmum.financeSummary,
    tuUmumSummary: tuUmum.tuUmumSummary,
    giiatjaSummary: giiatja.giiatjaSummary,
    giiatjaPnbpChart: giiatja.giiatjaSummary.pnbpChart,
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
    hasStatistikKunjunganTodayUpdate,
    hasLuarTembokToday,
    hasPapanIsiTodayUpdate,
    hasDapurTodayUpdate,
    hasKamtibMonthlyPengawalanUpdate,
    hasGiiatjaMonthlyUpdate,
    pengaduanDiterimaCount,
    totalPengaduanMasyarakat,
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

app.get('/pengaduan-masyarakat', (req, res) => {
  const nik = String(req.query.nik || '').replace(/\D/g, '').slice(0, 16);
  const pengaduanList = nik
    ? db.prepare(`
      SELECT no_pengaduan AS noPengaduan, nik, nama, no_whatsapp AS noWhatsapp, jenis_pengaduan AS jenisPengaduan, tanggal_pengaduan AS tanggalPengaduan, materi_pengaduan AS materiPengaduan, dokumentasi_path AS dokumentasiPath, status, alasan_penolakan AS alasanPenolakan, lampiran_admin_path AS lampiranAdminPath
      FROM pengaduan_masyarakat
      WHERE nik = ?
      ORDER BY id DESC
    `).all(nik)
    : [];

  res.render('pengaduan', {
    activePage: 'pengaduan',
    nik,
    pengaduanList,
    success: req.query.success,
    error: req.query.error,
    noPengaduan: req.query.no_pengaduan || '',
  });
});

app.post('/pengaduan-masyarakat/add', pengaduanUpload.single('dokumentasi'), (req, res) => {
  const nik = String(req.body.nik || '').replace(/\D/g, '').slice(0, 16);
  const nama = String(req.body.nama || '').trim().toUpperCase();
  const noWhatsapp = String(req.body.no_whatsapp || '').replace(/\D/g, '').slice(0, 15);
  const allowedJenisPengaduan = [
    'NARKOBA',
    'PENYALAHGUNAAN WEWENANG',
    'DISKRIMINASI',
    'PEMERASAN',
    'PERSELINGKUHAN',
    'PENGANIAYAAN',
    'PENGGUNAAN HP',
    'MAL ADMINISTRASI',
    'PENGELUARAN NAPI/TAHANAN',
    'ASUSILA',
    'LAIN-LAIN',
  ];
  const jenisRaw = Array.isArray(req.body.jenis_pengaduan)
    ? req.body.jenis_pengaduan
    : [req.body.jenis_pengaduan];
  const jenisList = jenisRaw
    .map((item) => String(item || '').trim().toUpperCase())
    .filter(Boolean)
    .filter((item) => allowedJenisPengaduan.includes(item));
  const jenisPengaduan = Array.from(new Set(jenisList)).join(', ');
  const materiPengaduan = String(req.body.materi_pengaduan || '').trim();
  if (nik.length !== 16 || !nama || noWhatsapp.length < 10 || !jenisPengaduan || !materiPengaduan) {
    return res.redirect('/pengaduan-masyarakat?error=Data+pengaduan+belum+lengkap+(NIK+16+digit+dan+No+Whatsapp+valid)');
  }

  const dokumentasiPath = req.file ? `/uploads/pengaduan/${req.file.filename}` : null;
  const tanggalPengaduan = getTodayYmd();
  const result = db.prepare(`
    INSERT INTO pengaduan_masyarakat
      (nik, nama, no_whatsapp, jenis_pengaduan, materi_pengaduan, dokumentasi_path, status, tanggal_pengaduan)
    VALUES (?, ?, ?, ?, ?, ?, 'DITERIMA', ?)
  `).run(nik, nama, noWhatsapp, jenisPengaduan, materiPengaduan, dokumentasiPath, tanggalPengaduan);

  const insertedId = Number(result.lastInsertRowid || 0);
  const noPengaduan = `PGD-${tanggalPengaduan.replace(/-/g, '')}-${String(insertedId).padStart(4, '0')}`;
  db.prepare('UPDATE pengaduan_masyarakat SET no_pengaduan=? WHERE id=?').run(noPengaduan, insertedId);

  return res.redirect(`/pengaduan-masyarakat?success=1&no_pengaduan=${encodeURIComponent(noPengaduan)}`);
});

app.get('/kalapas', (req, res) => {
  res.render('kalapas', { ...getKalapasData(), activePage: 'kalapas' });
});

app.get('/kalapas/table/dapur', (req, res) => {
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.tanggal || ''))
    ? String(req.query.tanggal)
    : getTodayYmd();

  const menuTitle = getAppSetting('menu_title', 'DAFTAR MENU MAKAN HARI INI');
  const selectedDateLabel = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${selectedDate}T00:00:00`));

  const menuList = db.prepare(`SELECT
    s.tanggal,
    m.waktu,
    m.menu,
    m.photo_path AS photoPath
  FROM menu_harian_set s
  INNER JOIN menu_harian_list_item li ON li.list_id = s.list_id
  INNER JOIN menu_master m ON m.id = li.menu_master_id
  WHERE s.tanggal = ?
  ORDER BY li.sort_order ASC,
    CASE m.waktu
      WHEN 'MAKAN PAGI' THEN 1
      WHEN 'SNACK' THEN 2
      WHEN 'MAKAN SIANG' THEN 3
      WHEN 'MAKAN SORE' THEN 4
      ELSE 5
    END ASC,
    m.id ASC`).all(selectedDate);

  const historyDates = db.prepare(`
    SELECT tanggal
    FROM menu_harian_set
    ORDER BY tanggal DESC
  `).all().map((item) => String(item.tanggal));

  res.render('kalapas-dapur', {
    activePage: 'kalapas',
    menuTitle,
    selectedDate,
    selectedDateLabel,
    menuList,
    historyDates,
    totalHistory: historyDates.length,
    backUrl: '/kalapas',
  });
});

app.get('/kalapas/table/pengamanan', (req, res) => {
  const todayYmd = getTodayYmd();
  const board = getBoardData();
  const hasLuarTembokToday = (board.luarTembokDetail || []).some((item) => {
    return normalizeDateToYmd(item.tanggal) === todayYmd;
  });

  res.render('kalapas-pengamanan', {
    activePage: 'kalapas',
    hasLuarTembokToday,
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
  const activeBatch = getActiveRemisiBatch();
  const batchOptions = db.prepare(`
    SELECT
      id,
      label,
      is_active AS isActive,
      created_at AS createdAt
    FROM remisi_batches
    ORDER BY created_at DESC, id DESC
  `).all();

  const requestedBatch = String(req.query.batch || '').trim();
  const selectedBatchId = Number(requestedBatch || 0);
  const searchKeyword = String(req.query.search || '').trim();
  const isSearchMode = Boolean(searchKeyword);

  const effectiveBatchId = requestedBatch.toUpperCase() === 'ALL'
    ? 0
    : (selectedBatchId > 0
      ? selectedBatchId
      : Number(activeBatch?.id || batchOptions[0]?.id || 0));

  const whereClauses = [];
  const params = [];

  if (!isSearchMode && effectiveBatchId > 0) {
    whereClauses.push('r.batch_id = ?');
    params.push(effectiveBatchId);
  }

  if (isSearchMode) {
    const likeValue = `%${searchKeyword.toLowerCase()}%`;
    whereClauses.push(`(
      LOWER(COALESCE(r.nama, '')) LIKE ?
      OR LOWER(COALESCE(r.jenis, '')) LIKE ?
      OR LOWER(COALESCE(r.besaran, '')) LIKE ?
      OR LOWER(COALESCE(r.remisi_total, '')) LIKE ?
      OR LOWER(COALESCE(b.label, '')) LIKE ?
    )`);
    params.push(likeValue, likeValue, likeValue, likeValue, likeValue);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const list = db.prepare(`
    SELECT
      r.id,
      r.nama,
      r.besaran,
      r.remisi_total AS remisiTotal,
      r.jenis,
      r.batch_id AS batchId,
      COALESCE(b.label, 'BATCH TIDAK DIKETAHUI') AS batchLabel,
      COALESCE(b.is_active, 0) AS batchIsActive
    FROM besaran_remisi r
    LEFT JOIN remisi_batches b ON b.id = r.batch_id
    ${whereSql}
    ORDER BY UPPER(TRIM(r.nama)) ASC, r.id ASC
  `).all(...params);

  const selectedBatch = batchOptions.find((batch) => Number(batch.id) === Number(effectiveBatchId)) || null;

  res.render('kalapas-remisi', {
    pageTitle: umum.remisiTitle,
    sectionTitle: umum.remisiTitle,
    backUrl: '/kalapas',
    list,
    batchOptions,
    selectedBatchId: effectiveBatchId,
    selectedBatch,
    searchKeyword,
    isSearchMode,
  });
});

app.get('/kalapas/table/pembinaan', (req, res) => {
  const umum = getPublicData();
  const rows = umum.pentahapanPembinaanDetail.map(item => [
    item.noReg || '-',
    item.namaWbp || '-',
    item.jenisKejahatan || '-',
    item.blokKamar || '-',
    item.tanggal1 || '-',
    item.tanggal3 || '-',
    item.tanggal2 || '-',
    item.tanggal4 || '-',
    item.totalRemisi || '-',
    item.keterangan || '-',
    {
      value: item.statusIntegrasi || '-',
      className: item.isStatusOverdue ? 'status-overdue' : ''
    }
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Pentahapan Pembinaan',
    sectionTitle: 'DETAIL PENTAHAPAN PEMBINAAN',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NO REG', 'NAMA WARGA BINAAN', 'JENIS KEJAHATAN', 'BLOK/KAMAR', 'TANGGAL 1/3', 'TANGGAL 1/2', 'TANGGAL 2/3', 'TANGGAL EKSPIRASI', 'TOTAL REMISI', 'KETERANGAN PROGRAM PEMBINAAN', 'STATUS INTEGRASI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/jadwal-kegiatan', (req, res) => {
  const selectedHari = String(req.query.hari || '').trim();
  const selectedPenanggungJawab = String(req.query.penanggung_jawab || '').trim();
  const dayOrderSql = `
    CASE UPPER(TRIM(hari))
      WHEN 'SENIN' THEN 1
      WHEN 'SELASA' THEN 2
      WHEN 'RABU' THEN 3
      WHEN 'KAMIS' THEN 4
      WHEN 'JUMAT' THEN 5
      WHEN 'JUM''AT' THEN 5
      WHEN 'SABTU' THEN 6
      WHEN 'MINGGU' THEN 7
      ELSE 99
    END
  `;

  const jadwalList = db.prepare(`
    SELECT
      id,
      hari,
      waktu,
      kegiatan,
      lokasi,
      penanggung_jawab AS penanggungJawab
    FROM jadwal_kegiatan
    ORDER BY ${dayOrderSql} ASC,
      UPPER(TRIM(penanggung_jawab)) ASC,
      UPPER(TRIM(waktu)) ASC,
      id ASC
  `).all();

  const hariOptions = Array.from(new Set(
    jadwalList.map((item) => String(item.hari || '').trim()).filter(Boolean)
  ));
  const penanggungJawabOptions = Array.from(new Set(
    jadwalList.map((item) => String(item.penanggungJawab || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));

  const filteredList = jadwalList.filter((item) => {
    const hari = String(item.hari || '').trim();
    const penanggungJawab = String(item.penanggungJawab || '').trim();
    if (selectedHari && hari !== selectedHari) return false;
    if (selectedPenanggungJawab && penanggungJawab !== selectedPenanggungJawab) return false;
    return true;
  });

  const mergedRows = [];
  let index = 0;
  while (index < filteredList.length) {
    const hariValue = String(filteredList[index].hari || '').trim() || '-';
    let hariEnd = index;
    while (hariEnd < filteredList.length) {
      const nextHari = String(filteredList[hariEnd].hari || '').trim() || '-';
      if (nextHari !== hariValue) break;
      hariEnd += 1;
    }

    let pjStart = index;
    while (pjStart < hariEnd) {
      const pjValue = String(filteredList[pjStart].penanggungJawab || '').trim() || '-';
      let pjEnd = pjStart;
      while (pjEnd < hariEnd) {
        const nextPj = String(filteredList[pjEnd].penanggungJawab || '').trim() || '-';
        if (nextPj !== pjValue) break;
        pjEnd += 1;
      }

      for (let rowIndex = pjStart; rowIndex < pjEnd; rowIndex += 1) {
        const row = filteredList[rowIndex];
        mergedRows.push({
          hari: hariValue,
          waktu: row.waktu || '-',
          kegiatan: row.kegiatan || '-',
          lokasi: row.lokasi || '-',
          penanggungJawab: pjValue,
          showHari: rowIndex === index,
          hariRowspan: rowIndex === index ? (hariEnd - index) : 0,
          showPenanggungJawab: rowIndex === pjStart,
          penanggungJawabRowspan: rowIndex === pjStart ? (pjEnd - pjStart) : 0,
        });
      }

      pjStart = pjEnd;
    }

    index = hariEnd;
  }

  res.render('kalapas-jadwal-kegiatan', {
    pageTitle: 'Jadwal Kegiatan Pembinaan',
    sectionTitle: 'JADWAL KEGIATAN PEMBINAAN',
    subtitle: `Total data: ${mergedRows.length}`,
    backUrl: '/kalapas',
    selectedHari,
    selectedPenanggungJawab,
    hariOptions,
    penanggungJawabOptions,
    rows: mergedRows,
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
      : `Tanggal: ${formatDateIndo(selectedTanggal)} | Total data: ${rows.length}`,
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
  const searchKeyword = String(req.query.search || '').trim();
  const security = getSecurityData({ search: searchKeyword });
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
    subtitle: searchKeyword
      ? `Pencarian: "${searchKeyword}" | Total riwayat ditemukan: ${rows.length}`
      : `Sedang menjalani hukuman: ${rows.length}`,
    dateFilter: {
      action: '/kalapas/table/strapsel',
      dateEnabled: false,
      resetUrl: '/kalapas/table/strapsel',
      searchEnabled: true,
      searchLabel: 'Pencarian riwayat strapsel',
      searchPlaceholder: 'Cari nama, blok, permasalahan, barang bukti, tanggal...',
      searchValue: searchKeyword
    },
    columns: ['NAMA WBP', 'BLOK HUNIAN', 'TANGGAL MASUK STRAPSEL', 'TANGGAL KELUAR', 'PERMASALAHAN', 'BARANG BUKTI', 'DOKUMENTASI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/register-f', (req, res) => {
  const searchKeyword = String(req.query.search || '').trim();
  const security = getSecurityData({ search: searchKeyword });
  const rows = security.registerFList.map(item => [
    item.noRegister || '-',
    item.namaWbp || '-',
    item.jenisPelanggaran || '-',
    item.tanggalPelanggaran || '-',
    item.lamaHukuman || '-',
    item.hukumanMulai || '-',
    item.hukumanSelesai || '-',
    item.keterangan || '-',
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Register F',
    sectionTitle: 'REGISTER F',
    subtitle: searchKeyword
      ? `Pencarian: "${searchKeyword}" | Total riwayat ditemukan: ${rows.length}`
      : `Sedang menjalani hukuman: ${rows.length}`,
    dateFilter: {
      action: '/kalapas/table/register-f',
      dateEnabled: false,
      resetUrl: '/kalapas/table/register-f',
      searchEnabled: true,
      searchLabel: 'Pencarian riwayat Register F',
      searchPlaceholder: 'Cari no register, nama, pelanggaran, hukuman, keterangan...',
      searchValue: searchKeyword
    },
    columns: ['NO REGISTER', 'NAMA WBP', 'JENIS PELANGGARAN', 'TANGGAL MELAKUKAN PELANGGARAN', 'LAMA HUKUMAN YANG DIJATUHKAN', 'HUKUMAN MULAI DARI', 'HUKUMAN S.D', 'KETERANGAN'],
    headerRows: [
      [
        { label: 'NO REGISTER', rowspan: 2 },
        { label: 'NAMA WBP', rowspan: 2 },
        { label: 'JENIS PELANGGARAN', rowspan: 2 },
        { label: 'TANGGAL MELAKUKAN PELANGGARAN', rowspan: 2 },
        { label: 'LAMA HUKUMAN YANG DIJATUHKAN', rowspan: 2 },
        { label: 'HUKUMAN TATA TERTIB', colspan: 2 },
        { label: 'KETERANGAN', rowspan: 2 },
      ],
      [
        { label: 'MULAI DARI' },
        { label: 'SAMPAI DENGAN' },
      ]
    ],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/kamtib', (req, res) => {
  const razia = getRaziaData();
  const strapselSearch = String(req.query.strapselSearch || '').trim();
  const registerFSearch = String(req.query.registerFSearch || '').trim();
  const strapselSecurity = getSecurityData({ search: strapselSearch });
  const registerFSecurity = getSecurityData({ search: registerFSearch });
  const [defaultYear, defaultMonth] = getTodayYmd().split('-');
  const selectedYear = /^\d{4}$/.test(String(req.query.year || '')) ? String(req.query.year) : defaultYear;
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(String(req.query.month || '')) ? String(req.query.month) : defaultMonth;
  const pengawalan = getPengawalanData({ month: selectedMonth, year: selectedYear });
  const pengaduanDiterimaCount = Number(db.prepare(`
    SELECT COUNT(*) AS c
    FROM pengaduan_masyarakat
    WHERE UPPER(TRIM(status)) = 'DITERIMA'
  `).get()?.c || 0);

  const monthOptions = getMonthOptions();
  const activeMonthLabel = monthOptions.find(item => item.value === selectedMonth)?.label || '-';
  const piketJaga = getPiketJagaData({ year: selectedYear, month: selectedMonth });
  const yearOptions = pengawalan.years.length ? pengawalan.years : [defaultYear];

  res.render('kalapas-kamtib', {
    pageTitle: 'Kamtib',
    subtitle: `Jadwal Razia: ${razia.jadwalRazia.length} | Barang Bukti: ${razia.barangBuktiRazia.length} | Giat Pengawalan: ${pengawalan.list.length} (${activeMonthLabel} ${selectedYear}) | Piket Jaga: ${piketJaga.daysInMonth} hari | Strapsel: ${strapselSecurity.strapselList.length} | Register F: ${registerFSecurity.registerFList.length}`,
    jadwalRazia: razia.jadwalRazia,
    barangBuktiRazia: razia.barangBuktiRazia,
    pengawalanList: pengawalan.list,
    selectedMonth,
    selectedYear,
    strapselSearch,
    registerFSearch,
    monthOptions,
    yearOptions,
    strapselList: strapselSecurity.strapselList,
    registerFList: registerFSecurity.registerFList,
    pengaduanDiterimaCount,
    piketHref: `/kalapas/table/piket-jaga?month=${selectedMonth}&year=${selectedYear}`,
    pengaduanHref: `/kalapas/table/pengaduan?month=${selectedMonth}&year=${selectedYear}`,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/piket-jaga', (req, res) => {
  const piket = getPiketJagaData({ year: req.query.year, month: req.query.month });
  const activeMonthLabel = piket.monthOptions.find(item => item.value === piket.selectedMonth)?.label || '-';

  res.render('kalapas-piket-jaga', {
    pageTitle: 'Piket Jaga Kamtib',
    subtitle: `${activeMonthLabel} ${piket.selectedYear}`,
    backUrl: '/kalapas/table/kamtib',
    ...piket,
  });
});

app.get('/kalapas/table/pengaduan', (req, res) => {
  const data = getKamtibPengaduanData({
    month: req.query.month,
    year: req.query.year,
    search: req.query.search,
  });
  const activeMonthLabel = data.monthOptions.find(item => item.value === data.selectedMonth)?.label || '-';

  res.render('kalapas-pengaduan', {
    pageTitle: 'Pengaduan Kamtib',
    subtitle: `${activeMonthLabel} ${data.selectedYear} | Total data: ${data.list.length}`,
    backUrl: '/kalapas/table/kamtib',
    ...data,
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

app.get('/kalapas/table/giiatja', (req, res) => {
  const searchKeyword = String(req.query.search || '').trim();
  const pnbpYear = String(req.query.tahun || '').trim();
  const premiSearch = String(req.query.premi_search || '').trim();
  const premiMonth = String(req.query.premi_bulan || '').trim();
  const premiYear = String(req.query.premi_tahun || '').trim();
  const data = getGiiatjaData({
    pelatihanSearch: searchKeyword,
    pnbpYear,
    premiSearch,
    premiMonth,
    premiYear,
  });
  res.render('kalapas-giiatja', {
    pageTitle: 'GIIATJA',
    subtitle: `Kegiatan: ${data.kegiatanList.length} | Pelatihan Bersertifikat: ${data.pelatihanList.length} | PNBP: ${data.pnbpList.length} | Premi: ${data.premiList.length}`,
    backUrl: '/kalapas',
    searchKeyword,
    pnbpYear,
    premiSearch,
    premiMonth,
    premiYear,
    ...data,
  });
});

app.get('/kalapas/table/giiatja/pnbp-detail', (req, res) => {
  const tahun = String(req.query.tahun || '').trim();
  const periode = String(req.query.periode || '').trim();
  const searchKeyword = String(req.query.search || '').trim();
  const pnbpYear = String(req.query.ref_tahun || tahun || '').trim();
  const premiSearch = String(req.query.premi_search || '').trim();
  const premiMonth = String(req.query.premi_bulan || '').trim();
  const premiYear = String(req.query.premi_tahun || '').trim();

  if (!tahun || !periode) {
    const fallbackQuery = new URLSearchParams();
    if (searchKeyword) fallbackQuery.set('search', searchKeyword);
    if (pnbpYear) fallbackQuery.set('tahun', pnbpYear);
    if (premiSearch) fallbackQuery.set('premi_search', premiSearch);
    if (premiMonth) fallbackQuery.set('premi_bulan', premiMonth);
    if (premiYear) fallbackQuery.set('premi_tahun', premiYear);
    const fallbackSuffix = fallbackQuery.toString();
    return res.redirect(`/kalapas/table/giiatja${fallbackSuffix ? `?${fallbackSuffix}` : ''}`);
  }

  const data = getGiiatjaData({
    pnbpDetailYear: tahun,
    pnbpDetailPeriod: periode,
  });

  res.render('kalapas-giiatja-pnbp-detail', {
    pageTitle: 'Detail Pendapatan PNBP',
    subtitle: `Periode: ${data.pnbpDetailPeriod || '-'} ${data.pnbpDetailYear || '-'} | Total: Rp ${formatRupiah(data.pnbpDetailPendapatanTotal || 0)}`,
    backUrl: '/kalapas/table/giiatja',
    searchKeyword,
    pnbpYear,
    premiSearch,
    premiMonth,
    premiYear,
    pnbpDetailYear: data.pnbpDetailYear,
    pnbpDetailPeriod: data.pnbpDetailPeriod,
    pnbpDetailPendapatanList: data.pnbpDetailPendapatanList,
    pnbpDetailPendapatanTotal: data.pnbpDetailPendapatanTotal,
  });
});

app.get('/kalapas/table/giiatja-kegiatan', (req, res) => {
  const data = getGiiatjaData();
  const normalizeMultiline = (value) => String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' | ');

  const rows = data.kegiatanList.map((item, index) => [
    String(index + 1),
    item.kategori || '-',
    item.jenisKegiatan || '-',
    normalizeMultiline(item.pesertaKegiatan) || '-',
    normalizeMultiline(item.pengawas) || '-',
    item.dokumentasiPath || '-',
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Kegiatan GIIATJA',
    sectionTitle: 'KEGIATAN GIIATJA',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NO', 'KATEGORI', 'JENIS KEGIATAN', 'PESERTA KEGIATAN', 'PENGAWAS', 'DOKUMENTASI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/giiatja-pelatihan', (req, res) => {
  const data = getGiiatjaData();
  const rows = data.pelatihanList.map((item, index) => [
    String(index + 1),
    item.noRegistrasi || '-',
    item.namaWbp || '-',
    item.jenisPelatihan || '-',
    item.tanggalPelaksanaan || '-',
    item.instruktur || '-',
    item.potoSertifikatPath || '-',
    item.keterangan || '-',
  ]);

  res.render('kalapas-table', {
    pageTitle: 'WBP yang Mendapatkan Pelatihan',
    sectionTitle: 'WBP YANG MENDAPATKAN PELATIHAN BERSERTIFIKAT',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NO', 'NO REGISTRASI', 'NAMA WBP', 'JENIS PELATIHAN', 'TANGGAL PELAKSANAAN', 'INSTRUKTUR', 'FOTO SERTIFIKAT', 'KETERANGAN'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/giiatja-premi', (req, res) => {
  const data = getGiiatjaData();
  const rows = data.premiList.map((item, index) => [
    String(index + 1),
    item.noRegistrasi || '-',
    item.namaWbp || '-',
    `${item.periodeBulan || '-'} ${item.periodeTahun || '-'}`.trim(),
    item.jenisKegiatan || '-',
    item.premiDidapat || '-',
    item.keterangan || '-',
  ]);

  res.render('kalapas-table', {
    pageTitle: 'WBP yang Mendapatkan Premi',
    sectionTitle: 'WBP YANG MENDAPATKAN PREMI',
    subtitle: `Total data: ${rows.length}`,
    columns: ['NO', 'NO REGISTRASI', 'NAMA WBP', 'PERIODE', 'JENIS KEGIATAN', 'PREMI', 'KETERANGAN'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/pnbp-giiatja', (req, res) => {
  const pnbpYear = String(req.query.tahun || '').trim();
  const data = getGiiatjaData({ pnbpYear });
  const rows = data.pnbpList.map((item, index) => [
    String(index + 1),
    item.tahun || '-',
    item.periodePnbp || '-',
    `Rp ${formatRupiah(item.jumlahPnbp)}`,
    `Rp ${formatRupiah(item.targetRealisasi)}`,
    item.persentaseCalc || '0%',
    item.keteranganCalc || '-',
    {
      value: 'Detail',
      href: `/kalapas/table/giiatja/pnbp-detail?tahun=${encodeURIComponent(item.tahun || '')}&periode=${encodeURIComponent(item.periodePnbp || '')}&ref_tahun=${encodeURIComponent(data.pnbpSelectedYear || '')}`,
    },
  ]);

  res.render('kalapas-table', {
    pageTitle: 'Grafik Pendapatan negara bukan pajak',
    sectionTitle: 'PENDAPATAN NEGARA BUKAN PAJAK',
    subtitle: `Tahun: ${data.pnbpSelectedYear || '-'} | Total data: ${rows.length}`,
    columns: ['NO', 'TAHUN', 'PERIODE PNBP', 'JUMLAH PNBP', 'TARGET REALISASI', 'PERSENTASE', 'KETERANGAN', 'AKSI'],
    rows,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/tu-realisasi', (req, res) => {
  const financeSummary = getFinanceSummary();
  const financeIndicator = getFinanceIndicatorSummary();

  res.render('kalapas-tu-realisasi', {
    pageTitle: 'Realisasi Keuangan Tata Usaha',
    sectionTitle: 'REALISASI KEUANGAN - TATA USAHA',
    subtitle: 'Ringkasan data realisasi belanja',
    financeSummary,
    financeIndicator,
    backUrl: '/kalapas'
  });
});

app.get('/kalapas/table/tu-umum', (req, res) => {
  const data = getTuUmumData();
  const rows = data.tuUmumList.map(item => [
    item.kode || '-',
    item.uraian || '-',
    item.satuan || '-',
    item.tahunPerolehan || '-',
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
    headerTitle: 'TATA USAHA',
    panelTitle: 'BAGIAN UMUM',
    sectionTitle: 'TATA USAHA',
    subtitle: `Total data: ${rows.length}`,
    financeSummary: data.financeSummary,
    columns: ['KODE', 'URAIAN', 'SATUAN', 'TAHUN PEROLEHAN', 'SALDO AWAL QTY', 'SALDO AWAL NILAI', 'BERTAMBAH QTY', 'BERTAMBAH NILAI', 'BERKURANG QTY', 'BERKURANG NILAI', 'SALDO AKHIR QTY', 'SALDO AKHIR NILAI'],
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
    item.tahunPerolehan || '-',
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
    columns: ['KODE', 'URAIAN', 'SATUAN', 'TAHUN PEROLEHAN', 'SALDO AWAL QTY', 'SALDO AWAL NILAI', 'BERTAMBAH QTY', 'BERTAMBAH NILAI', 'BERKURANG QTY', 'BERKURANG NILAI', 'SALDO AKHIR QTY', 'SALDO AKHIR NILAI'],
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
  const todayYmd = getTodayYmd();
  const searchKeyword = String(req.query.search || '').trim();
  const normalizeSearchText = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const board = getBoardData();
  const filtered = board.luarTembokDetail.filter((item) => {
    if (searchKeyword) {
      const normalizedDate = normalizeDateToYmd(item.tanggal);
      const dateSlash = normalizedDate
        ? `${normalizedDate.slice(8, 10)}/${normalizedDate.slice(5, 7)}/${normalizedDate.slice(0, 4)}`
        : '';
      const dateDash = normalizedDate
        ? `${normalizedDate.slice(8, 10)}-${normalizedDate.slice(5, 7)}-${normalizedDate.slice(0, 4)}`
        : '';
      const searchBlob = normalizeSearchText([
        item.noRegistrasi,
        item.nama,
        item.tanggal,
        normalizedDate,
        dateSlash,
        dateDash,
        formatDateIndo(item.tanggal),
        item.pendamping,
        item.keterangan,
      ].join(' '));
      return searchBlob.includes(normalizeSearchText(searchKeyword));
    }

    return normalizeDateToYmd(item.tanggal) === todayYmd;
  });

  const rows = filtered.map(item => [
    item.noRegistrasi || '-',
    item.nama || '-',
    formatDateIndo(item.tanggal || '-'),
    item.pendamping || '-',
    item.keterangan || '-'
  ]);

  res.render('kalapas-table', {
    pageTitle: 'WBP di Luar Tembok',
    sectionTitle: 'WBP DI LUAR TEMBOK',
    subtitle: searchKeyword
      ? `Pencarian: "${searchKeyword}" | Total riwayat ditemukan: ${rows.length}`
      : `Data tanggal hari ini: ${rows.length}`,
    dateFilter: {
      action: '/kalapas/table/luar-tembok',
      dateEnabled: false,
      resetUrl: '/kalapas/table/luar-tembok',
      searchEnabled: true,
      searchLabel: 'Pencarian riwayat WBP luar tembok',
      searchPlaceholder: 'Cari no registrasi, nama, tanggal, pendamping, keterangan...',
      searchValue: searchKeyword,
    },
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
    menu: db.prepare('SELECT COUNT(*) AS c FROM menu_harian_set').get().c,
    pembinaan: db.prepare('SELECT COUNT(*) AS c FROM pentahapan_pembinaan').get().c,
    detail: db.prepare('SELECT COUNT(*) AS c FROM pentahapan_pembinaan_detail').get().c,
    jadwal: db.prepare('SELECT COUNT(*) AS c FROM jadwal_kegiatan').get().c,
    raziaJadwal: db.prepare('SELECT COUNT(*) AS c FROM razia_jadwal').get().c,
    raziaBarangBukti: db.prepare('SELECT COUNT(*) AS c FROM razia_barang_bukti').get().c,
    pengawalan: db.prepare('SELECT COUNT(*) AS c FROM giat_pengawalan').get().c,
    strapsel: db.prepare('SELECT COUNT(*) AS c FROM strapsel_data').get().c,
    tuUmum: db.prepare('SELECT COUNT(*) AS c FROM tu_umum_barang').get().c,
    giiatja: db.prepare('SELECT COUNT(*) AS c FROM giiatja_kegiatan').get().c
      + db.prepare('SELECT COUNT(*) AS c FROM giiatja_pelatihan_sertifikat').get().c
      + db.prepare('SELECT COUNT(*) AS c FROM giiatja_pnbp').get().c
      + db.prepare('SELECT COUNT(*) AS c FROM giiatja_premi_wbp').get().c,
    kamarBlok: db.prepare('SELECT COUNT(*) AS c FROM housing_blocks').get().c,
    papanIsi: db.prepare('SELECT COUNT(*) AS c FROM board_pidana').get().c + db.prepare('SELECT COUNT(*) AS c FROM board_luar_tembok').get().c + db.prepare('SELECT COUNT(*) AS c FROM board_agama').get().c,
    users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
    pengaduan: db.prepare('SELECT COUNT(*) AS c FROM pengaduan_masyarakat').get().c,
  };
  const allowed = roleAccess[req.session.user.role] || [];
  res.render('admin/dashboard', { user: req.session.user, stats, active: 'dashboard', allowed });
});

app.get('/admin/pengaduan', requireAccess('pengaduan'), (req, res) => {
  const nik = String(req.query.nik || '').replace(/\D/g, '').slice(0, 16);
  const list = nik
    ? db.prepare(`
      SELECT *
      FROM pengaduan_masyarakat
      WHERE nik = ?
      ORDER BY id DESC
    `).all(nik)
    : db.prepare('SELECT * FROM pengaduan_masyarakat ORDER BY id DESC').all();

  res.render('admin/pengaduan', {
    user: req.session.user,
    list,
    nik,
    active: 'pengaduan',
    success: req.query.success,
    error: req.query.error,
  });
});

app.post('/admin/pengaduan/:id/status', requireAccess('pengaduan'), pengaduanUpload.single('lampiran_admin'), (req, res) => {
  const id = Number(req.params.id);
  const nik = String(req.body.nik || '').replace(/\D/g, '').slice(0, 16);
  const statusRaw = String(req.body.status || '').trim().toUpperCase();
  const alasanPenolakan = String(req.body.alasan_penolakan || '').trim();
  const allowedStatus = ['DITERIMA', 'DIPROSES', 'SELESAI', 'DITOLAK'];
  const status = allowedStatus.includes(statusRaw) ? statusRaw : 'DITERIMA';
  const uploadedLampiranPath = req.file ? `/uploads/pengaduan/${req.file.filename}` : null;

  const existing = db.prepare(`
    SELECT lampiran_admin_path AS lampiranAdminPath
    FROM pengaduan_masyarakat
    WHERE id=?
    LIMIT 1
  `).get(id);

  if (!existing) {
    if (uploadedLampiranPath) removeUploadedFile(uploadedLampiranPath);
    const queryMissing = new URLSearchParams({ error: 'Data+pengaduan+tidak+ditemukan' });
    if (nik) queryMissing.set('nik', nik);
    return res.redirect(`/admin/pengaduan?${queryMissing.toString()}`);
  }

  const existingLampiranPath = existing.lampiranAdminPath || null;
  const lampiranCandidatePath = uploadedLampiranPath || existingLampiranPath;

  if (status === 'DITOLAK' && !alasanPenolakan) {
    if (uploadedLampiranPath) removeUploadedFile(uploadedLampiranPath);
    const queryRejected = new URLSearchParams({ error: 'Alasan+penolakan+wajib+diisi+saat+status+DITOLAK' });
    if (nik) queryRejected.set('nik', nik);
    return res.redirect(`/admin/pengaduan?${queryRejected.toString()}`);
  }

  if ((status === 'DIPROSES' || status === 'SELESAI') && !lampiranCandidatePath) {
    if (uploadedLampiranPath) removeUploadedFile(uploadedLampiranPath);
    const queryLampiran = new URLSearchParams({ error: 'Lampiran+berkas+admin+wajib+diisi+saat+status+DIPROSES+atau+SELESAI' });
    if (nik) queryLampiran.set('nik', nik);
    return res.redirect(`/admin/pengaduan?${queryLampiran.toString()}`);
  }

  let finalAlasanPenolakan = '';
  let finalLampiranAdminPath = lampiranCandidatePath;

  if (status === 'DITOLAK') {
    finalAlasanPenolakan = alasanPenolakan;
    finalLampiranAdminPath = null;
    if (uploadedLampiranPath) removeUploadedFile(uploadedLampiranPath);
    if (existingLampiranPath) removeUploadedFile(existingLampiranPath);
  } else if (uploadedLampiranPath && existingLampiranPath && uploadedLampiranPath !== existingLampiranPath) {
    removeUploadedFile(existingLampiranPath);
  }

  db.prepare('UPDATE pengaduan_masyarakat SET status=?, alasan_penolakan=?, lampiran_admin_path=? WHERE id=?')
    .run(status, finalAlasanPenolakan, finalLampiranAdminPath, id);
  const query = new URLSearchParams({ success: '1' });
  if (nik) query.set('nik', nik);
  return res.redirect(`/admin/pengaduan?${query.toString()}`);
});

// ── Statistik ────────────────────────────────────────────────────
app.get('/admin/statistik', requireAccess('statistik'), (req, res) => {
  const todayYmd = getTodayYmd();
  const statistikInputDate = normalizeDateToYmd(getAppSetting('statistik_kunjungan_last_input_date', ''));
  const hasStatistikKunjunganTodayUpdate = statistikInputDate === todayYmd;
  const data = db.prepare('SELECT * FROM statistik WHERE id = 1').get();
  res.render('admin/statistik', {
    user: req.session.user,
    data,
    active: 'statistik',
    success: req.query.success,
    hasStatistikKunjunganTodayUpdate,
  });
});

app.post('/admin/statistik/update', requireAccess('statistik'), (req, res) => {
  const { total_penghuni, kapasitas, bebas_hari_ini, pengunjung_hari_ini, tanggal } = req.body;
  db.prepare(`UPDATE statistik SET total_penghuni=?, kapasitas=?, bebas_hari_ini=?, pengunjung_hari_ini=?, tanggal=? WHERE id=1`)
    .run(Number(total_penghuni), Number(kapasitas), Number(bebas_hari_ini), Number(pengunjung_hari_ini), tanggal);
  setAppSetting('statistik_kunjungan_last_input_date', getTodayYmd());
  res.redirect('/admin/statistik?success=1');
});

// ── Besaran Remisi ────────────────────────────────────────────────
app.get('/admin/remisi', requireAccess('remisi'), (req, res) => {
  const remisiTitle = getAppSetting('remisi_title', 'BESARAN REMISI');
  const activeBatch = getActiveRemisiBatch();
  const batches = db.prepare(`
    SELECT
      b.id,
      b.label,
      b.periode_bulan AS periodeBulan,
      b.periode_tahun AS periodeTahun,
      b.notes,
      b.source_type AS sourceType,
      b.is_active AS isActive,
      b.created_at AS createdAt,
      COUNT(r.id) AS totalData
    FROM remisi_batches b
    LEFT JOIN besaran_remisi r ON r.batch_id = b.id
    GROUP BY b.id, b.label, b.periode_bulan, b.periode_tahun, b.notes, b.source_type, b.is_active, b.created_at
    ORDER BY b.created_at DESC, b.id DESC
  `).all();

  const selectedBatchIdParam = Number(req.query.batch || 0);
  const selectedBatchId = selectedBatchIdParam > 0
    ? selectedBatchIdParam
    : Number(activeBatch?.id || batches[0]?.id || 0);

  const list = db.prepare(`
    SELECT *
    FROM besaran_remisi
    WHERE (? = 0 OR batch_id = ?)
    ORDER BY id ASC
  `).all(selectedBatchId, selectedBatchId);

  const editId = Number(req.query.edit || 0);
  const edit = editId
    ? db.prepare('SELECT * FROM besaran_remisi WHERE id = ?').get(editId)
    : null;

  const selectedBatch = batches.find((item) => Number(item.id) === Number(selectedBatchId)) || null;

  res.render('admin/remisi', {
    user: req.session.user,
    list,
    edit,
    remisiTitle,
    batches,
    selectedBatch,
    selectedBatchId,
    activeBatchId: Number(activeBatch?.id || 0),
    active: 'remisi',
    success: req.query.success,
    titleSuccess: req.query.titleSuccess,
    batchSuccess: req.query.batchSuccess,
    batchDeleteSuccess: req.query.batchDeleteSuccess,
    importSuccess: req.query.importSuccess,
    error: req.query.error,
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

app.get('/admin/remisi/template.xlsx', requireAccess('remisi'), (_req, res) => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['KETERANGAN', 'NAMA WBP', 'BESARAN REMISI', 'REMISI TOTAL'],
    ['REMISI UMUM', 'NAMA WBP CONTOH', '4 BULAN', '12 BULAN'],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Remisi');
  const fileBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader('Content-Disposition', 'attachment; filename="template-remisi.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(fileBuffer);
});

app.post('/admin/remisi/import-excel', requireAccess('remisi'), remisiExcelUpload.single('excel_file'), (req, res) => {
  if (!req.file?.buffer) {
    return res.redirect('/admin/remisi?error=File+Excel+belum+dipilih');
  }

  const batchLabel = (req.body.batch_label || '').trim() || `Batch Remisi ${new Date().toISOString().slice(0, 10)}`;
  const periodeBulan = (req.body.periode_bulan || '').trim().toUpperCase();
  const periodeTahun = (req.body.periode_tahun || '').trim();
  const notes = (req.body.batch_notes || '').trim();
  const setActive = String(req.body.set_active || '') === '1';

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (_err) {
    return res.redirect('/admin/remisi?error=File+Excel+tidak+valid');
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return res.redirect('/admin/remisi?error=Sheet+Excel+tidak+ditemukan');
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '' });
  if (!rows.length) {
    return res.redirect('/admin/remisi?error=Data+Excel+kosong');
  }

  const normalizeRowValue = (row, aliases) => {
    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeExcelHeaderKey(key);
      if (aliases.includes(normalizedKey)) return String(row[key] || '').trim();
    }
    return '';
  };

  const parsedRows = rows.map((row) => {
    const jenis = normalizeRowValue(row, ['keterangan', 'jenis', 'jenisremisi']).toUpperCase();
    const nama = normalizeRowValue(row, ['namawbp', 'nama']).toUpperCase();
    const besaran = normalizeRowValue(row, ['besaranremisi', 'besaran']);
    const remisiTotal = normalizeRowValue(row, ['remisitotal', 'totalremisi', 'remisitot']) || besaran;
    return {
      jenis: jenis || 'REMISI UMUM',
      nama,
      besaran,
      remisiTotal,
    };
  }).filter((row) => row.nama && row.besaran);

  if (!parsedRows.length) {
    return res.redirect('/admin/remisi?error=Tidak+ada+baris+valid+di+Excel.+Pastikan+kolom+NAMA+WBP+dan+BESARAN+REMISI+terisi');
  }

  db.exec('BEGIN');
  try {
    const batchInsert = db.prepare(`
      INSERT INTO remisi_batches (label, periode_bulan, periode_tahun, notes, source_type, is_active)
      VALUES (?, ?, ?, ?, 'excel', 0)
    `).run(batchLabel, periodeBulan, periodeTahun, notes);
    const batchId = Number(batchInsert.lastInsertRowid);

    const insertRemisi = db.prepare(`
      INSERT INTO besaran_remisi (jenis, nama, besaran, remisi_total, batch_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    parsedRows.forEach((row) => {
      insertRemisi.run(row.jenis, row.nama, row.besaran, row.remisiTotal, batchId);
    });

    if (setActive || !getActiveRemisiBatch()) {
      db.prepare('UPDATE remisi_batches SET is_active = 0').run();
      db.prepare('UPDATE remisi_batches SET is_active = 1 WHERE id = ?').run(batchId);
      setAppSetting('remisi_active_batch_id', String(batchId));
    }

    db.exec('COMMIT');
    return res.redirect(`/admin/remisi?batch=${batchId}&importSuccess=1`);
  } catch (_err) {
    db.exec('ROLLBACK');
    return res.redirect('/admin/remisi?error=Gagal+import+data+remisi+dari+Excel');
  }
});

app.post('/admin/remisi/batch/:id/activate', requireAccess('remisi'), (req, res) => {
  const batchId = Number(req.params.id || 0);
  if (!batchId) return res.redirect('/admin/remisi?error=Batch+tidak+valid');
  const ok = setActiveRemisiBatch(batchId);
  if (!ok) return res.redirect('/admin/remisi?error=Batch+tidak+ditemukan');
  return res.redirect(`/admin/remisi?batch=${batchId}&batchSuccess=1`);
});

app.post('/admin/remisi/batch/:id/delete', requireAccess('remisi'), (req, res) => {
  const batchId = Number(req.params.id || 0);
  if (!batchId) return res.redirect('/admin/remisi?error=Batch+tidak+valid');

  const batch = db.prepare(`
    SELECT id, label, is_active AS isActive
    FROM remisi_batches
    WHERE id = ?
    LIMIT 1
  `).get(batchId);
  if (!batch) return res.redirect('/admin/remisi?error=Batch+tidak+ditemukan');

  const normalizeStrict = (value) => String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const expectedText = `hapus ${String(batch.label || '').trim()}`;
  const verifyInput = String(req.body.verification_text || '');
  if (normalizeStrict(verifyInput) !== normalizeStrict(expectedText)) {
    return res.redirect(`/admin/remisi?batch=${batchId}&error=${encodeURIComponent(`Verifikasi salah. Ketik tepat: ${expectedText}`)}`);
  }

  const totalBatch = Number(db.prepare('SELECT COUNT(*) AS c FROM remisi_batches').get()?.c || 0);
  if (totalBatch <= 1) {
    return res.redirect('/admin/remisi?error=Minimal+harus+ada+1+batch.+Batch+terakhir+tidak+bisa+dihapus');
  }

  const fallbackBatch = db.prepare(`
    SELECT id
    FROM remisi_batches
    WHERE id <> ?
    ORDER BY is_active DESC, created_at DESC, id DESC
    LIMIT 1
  `).get(batchId);

  if (!fallbackBatch?.id) {
    return res.redirect('/admin/remisi?error=Tidak+ada+batch+pengganti+untuk+menjadi+aktif');
  }

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM besaran_remisi WHERE batch_id = ?').run(batchId);
    db.prepare('DELETE FROM remisi_batches WHERE id = ?').run(batchId);

    if (Number(batch.isActive) === 1) {
      db.prepare('UPDATE remisi_batches SET is_active = 0').run();
      db.prepare('UPDATE remisi_batches SET is_active = 1 WHERE id = ?').run(Number(fallbackBatch.id));
      setAppSetting('remisi_active_batch_id', String(fallbackBatch.id));
    }

    db.exec('COMMIT');
    return res.redirect(`/admin/remisi?batch=${Number(fallbackBatch.id)}&batchDeleteSuccess=1`);
  } catch (_err) {
    db.exec('ROLLBACK');
    return res.redirect('/admin/remisi?error=Gagal+menghapus+batch+remisi');
  }
});

app.post('/admin/remisi/add', requireAccess('remisi'), (req, res) => {
  const batchId = Number(req.body.batch_id || 0);
  if (!batchId) return res.redirect('/admin/remisi?error=Pilih+batch+remisi+terlebih+dahulu');

  const { jenis, besaran, remisi_total } = req.body;
  const nama = (req.body.nama || '').toUpperCase();
  db.prepare('INSERT INTO besaran_remisi (jenis, nama, besaran, remisi_total, batch_id) VALUES (?, ?, ?, ?, ?)')
    .run(jenis, nama, besaran, remisi_total || besaran || '', batchId);
  res.redirect(`/admin/remisi?success=1&batch=${batchId}`);
});

app.post('/admin/remisi/:id/update', requireAccess('remisi'), (req, res) => {
  const batchId = Number(req.body.batch_id || 0);
  if (!batchId) return res.redirect('/admin/remisi?error=Batch+remisi+tidak+valid');
  const { jenis, besaran, remisi_total } = req.body;
  const nama = (req.body.nama || '').toUpperCase();
  db.prepare('UPDATE besaran_remisi SET jenis=?, nama=?, besaran=?, remisi_total=?, batch_id=? WHERE id=?')
    .run(jenis, nama, besaran, remisi_total || besaran || '', batchId, Number(req.params.id));
  res.redirect(`/admin/remisi?success=1${batchId ? `&batch=${batchId}` : ''}`);
});

app.post('/admin/remisi/:id/delete', requireAccess('remisi'), (req, res) => {
  const batchId = Number(req.body.batch_id || 0);
  db.prepare('DELETE FROM besaran_remisi WHERE id=?').run(Number(req.params.id));
  res.redirect(`/admin/remisi${batchId ? `?batch=${batchId}` : ''}`);
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
function renderAdminMenuPage(req, res, menuSection) {
  const selectedTanggal = (req.query.tanggal || '').trim() || getTodayYmd();
  const masterList = db.prepare(`SELECT
    id,
    waktu,
    menu,
    photo_path,
    sort_order AS sortOrder
  FROM menu_master
  ORDER BY sort_order ASC,
    CASE waktu
      WHEN 'MAKAN PAGI' THEN 1
      WHEN 'SNACK' THEN 2
      WHEN 'MAKAN SIANG' THEN 3
      WHEN 'MAKAN SORE' THEN 4
      ELSE 5
    END ASC,
    id ASC`).all();

  const dayLists = db.prepare(`SELECT
    l.id,
    l.nama_list AS namaList,
    l.sort_order AS sortOrder,
    COUNT(li.id) AS totalItem
  FROM menu_harian_list l
  LEFT JOIN menu_harian_list_item li ON li.list_id = l.id
  GROUP BY l.id, l.nama_list, l.sort_order
  ORDER BY l.sort_order ASC, l.id ASC`).all();

  const selectedSet = db.prepare(`SELECT
    s.id,
    s.tanggal,
    s.list_id AS listId,
    l.nama_list AS namaList
  FROM menu_harian_set s
  INNER JOIN menu_harian_list l ON l.id = s.list_id
  WHERE s.tanggal = ?
  LIMIT 1`).get(selectedTanggal);

  const selectedListId = req.query.previewList
    ? Number(req.query.previewList)
    : Number(selectedSet?.listId || dayLists[0]?.id || 0);

  const dailyList = selectedListId
    ? db.prepare(`SELECT
    li.id,
    ? AS tanggal,
    li.menu_master_id AS menuMasterId,
    li.sort_order AS sortOrder,
    m.waktu,
    m.menu,
    m.photo_path
  FROM menu_harian_list_item li
  INNER JOIN menu_master m ON m.id = li.menu_master_id
  WHERE li.list_id = ?
  ORDER BY li.sort_order ASC,
    CASE m.waktu
      WHEN 'MAKAN PAGI' THEN 1
      WHEN 'SNACK' THEN 2
      WHEN 'MAKAN SIANG' THEN 3
      WHEN 'MAKAN SORE' THEN 4
      ELSE 5
    END ASC,
    li.id ASC`).all(selectedTanggal, selectedListId)
    : [];

  const totalHistory = db.prepare('SELECT COUNT(*) AS c FROM menu_harian_set').get().c;
  const editMaster = req.query.editMaster
    ? db.prepare('SELECT id, waktu, menu, photo_path FROM menu_master WHERE id=?').get(Number(req.query.editMaster))
    : null;
  const editDayList = req.query.editList
    ? db.prepare('SELECT id, nama_list AS namaList FROM menu_harian_list WHERE id=?').get(Number(req.query.editList))
    : null;
  const selectedMasterIds = editDayList
    ? db.prepare('SELECT menu_master_id AS menuMasterId FROM menu_harian_list_item WHERE list_id=? ORDER BY sort_order ASC, id ASC').all(editDayList.id).map(item => Number(item.menuMasterId))
    : [];
  const menuTitle = getAppSetting('menu_title', 'DAFTAR MENU MAKAN HARI INI');

  const activeMap = {
    master: 'menu-master',
    template: 'menu-template',
    makanan: 'menu-makanan',
  };

  res.render('admin/menu', {
    user: req.session.user,
    menuSection,
    masterList,
    dayLists,
    selectedSet,
    selectedListId,
    dailyList,
    editMaster,
    editDayList,
    selectedMasterIds,
    menuTitle,
    todayYmd: getTodayYmd(),
    selectedTanggal,
    totalHistory,
    active: activeMap[menuSection] || 'menu-makanan',
    success: req.query.success,
    titleSuccess: req.query.titleSuccess,
    error: req.query.error
  });
}

app.get('/admin/menu', requireAccess('menu'), (req, res) => {
  return res.redirect('/admin/menu/makanan');
});

app.get('/admin/menu/master', requireAccess('menu'), (req, res) => {
  return renderAdminMenuPage(req, res, 'master');
});

app.get('/admin/menu/template', requireAccess('menu'), (req, res) => {
  return renderAdminMenuPage(req, res, 'template');
});

app.get('/admin/menu/makanan', requireAccess('menu'), (req, res) => {
  return renderAdminMenuPage(req, res, 'makanan');
});

app.post('/admin/menu/title/update', requireAccess('menu'), (req, res) => {
  const nextTitle = (req.body.menu_title || '').trim() || 'DAFTAR MENU MAKAN HARI INI';
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run('menu_title', nextTitle);
  res.redirect('/admin/menu/makanan?titleSuccess=1');
});

app.post('/admin/menu/add', requireAccess('menu'), menuUpload.single('photo'), (req, res) => {
  const { waktu, menu } = req.body;
  const photoPath = req.file ? `/uploads/menu/${req.file.filename}` : null;
  const sortOrder = Number(db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM menu_master').get().n || 1);
  db.prepare('INSERT INTO menu_master (waktu, menu, photo_path, sort_order) VALUES (?, ?, ?, ?)').run(waktu, menu, photoPath, sortOrder);
  res.redirect('/admin/menu/master?success=1');
});

app.post('/admin/menu/:id/update', requireAccess('menu'), menuUpload.single('photo'), (req, res) => {
  const { waktu, menu } = req.body;
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT photo_path FROM menu_master WHERE id=?').get(id);
  let nextPhotoPath = existing?.photo_path || null;

  if (req.file) {
    if (nextPhotoPath) removeUploadedFile(nextPhotoPath);
    nextPhotoPath = `/uploads/menu/${req.file.filename}`;
  }

  db.prepare('UPDATE menu_master SET waktu=?, menu=?, photo_path=? WHERE id=?').run(waktu, menu, nextPhotoPath, id);
  res.redirect('/admin/menu/master?success=1');
});

app.post('/admin/menu/:id/delete', requireAccess('menu'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT photo_path FROM menu_master WHERE id=?').get(id);
  if (existing?.photo_path) removeUploadedFile(existing.photo_path);
  db.prepare('DELETE FROM menu_harian_list_item WHERE menu_master_id=?').run(id);
  db.prepare('DELETE FROM menu_harian WHERE menu_master_id=?').run(id);
  db.prepare('DELETE FROM menu_master WHERE id=?').run(id);
  res.redirect('/admin/menu/master');
});

app.post('/admin/menu/list/add', requireAccess('menu'), (req, res) => {
  const namaList = (req.body.nama_list || '').trim();
  const incoming = req.body.menu_ids;
  const selectedIdsRaw = Array.isArray(incoming) ? incoming : (incoming ? [incoming] : []);
  const selectedIds = Array.from(new Set(selectedIdsRaw
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && value > 0)));

  if (!namaList) return res.redirect('/admin/menu/template?error=Nama+list+harus+diisi.');
  if (!selectedIds.length) return res.redirect('/admin/menu/template?error=Pilih+minimal+1+menu+master+untuk+list+hari.');

  const sortOrder = Number(db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM menu_harian_list').get().n || 1);
  const insertList = db.prepare('INSERT INTO menu_harian_list (nama_list, sort_order) VALUES (?, ?)');
  const result = insertList.run(namaList, sortOrder);
  const listId = Number(result.lastInsertRowid);

  const insertItem = db.prepare('INSERT INTO menu_harian_list_item (list_id, menu_master_id, sort_order) VALUES (?, ?, ?)');
  selectedIds.forEach((menuMasterId, index) => {
    insertItem.run(listId, menuMasterId, index + 1);
  });

  return res.redirect('/admin/menu/template?success=1');
});

app.post('/admin/menu/list/:id/update', requireAccess('menu'), (req, res) => {
  const listId = Number(req.params.id);
  const namaList = (req.body.nama_list || '').trim();
  const incoming = req.body.menu_ids;
  const selectedIdsRaw = Array.isArray(incoming) ? incoming : (incoming ? [incoming] : []);
  const selectedIds = Array.from(new Set(selectedIdsRaw
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && value > 0)));

  if (!namaList) return res.redirect(`/admin/menu/template?editList=${listId}&error=Nama+list+harus+diisi.`);
  if (!selectedIds.length) return res.redirect(`/admin/menu/template?editList=${listId}&error=Pilih+minimal+1+menu+master+untuk+list+hari.`);

  db.prepare('UPDATE menu_harian_list SET nama_list=? WHERE id=?').run(namaList, listId);
  db.prepare('DELETE FROM menu_harian_list_item WHERE list_id=?').run(listId);
  const insertItem = db.prepare('INSERT INTO menu_harian_list_item (list_id, menu_master_id, sort_order) VALUES (?, ?, ?)');
  selectedIds.forEach((menuMasterId, index) => {
    insertItem.run(listId, menuMasterId, index + 1);
  });

  return res.redirect('/admin/menu/template?success=1');
});

app.post('/admin/menu/list/:id/delete', requireAccess('menu'), (req, res) => {
  const listId = Number(req.params.id);
  const usedCount = db.prepare('SELECT COUNT(*) AS c FROM menu_harian_set WHERE list_id=?').get(listId).c;
  if (Number(usedCount) > 0) {
    return res.redirect('/admin/menu/template?error=List+hari+masih+dipakai+di+menu+harian.+Ubah+penetapan+tanggal+dulu.');
  }
  db.prepare('DELETE FROM menu_harian_list_item WHERE list_id=?').run(listId);
  db.prepare('DELETE FROM menu_harian_list WHERE id=?').run(listId);
  return res.redirect('/admin/menu/template');
});

app.post('/admin/menu/harian/set', requireAccess('menu'), (req, res) => {
  const tanggal = (req.body.tanggal || '').trim() || getTodayYmd();
  const listId = Number(req.body.list_id || 0);
  if (!Number.isInteger(listId) || listId <= 0) {
    const params = new URLSearchParams({ tanggal, error: 'Pilih list hari terlebih dahulu.' });
    return res.redirect(`/admin/menu/makanan?${params.toString()}`);
  }

  db.prepare(`
    INSERT INTO menu_harian_set (tanggal, list_id)
    VALUES (?, ?)
    ON CONFLICT(tanggal) DO UPDATE SET list_id=excluded.list_id
  `).run(tanggal, listId);

  const params = new URLSearchParams({ tanggal, success: '1' });
  return res.redirect(`/admin/menu/makanan?${params.toString()}`);
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
  const list = db.prepare('SELECT * FROM pentahapan_pembinaan_detail ORDER BY id').all().map((item) => ({
    ...item,
    is_status_overdue: isIntegrationOverdue(item.tanggal2, item.status_integrasi),
  }));
  const edit = req.query.edit ? db.prepare('SELECT * FROM pentahapan_pembinaan_detail WHERE id=?').get(Number(req.query.edit)) : null;
  res.render('admin/pembinaan-detail', { user: req.session.user, list, edit, active: 'pembinaan-detail', success: req.query.success });
});

app.post('/admin/pembinaan-detail/add', requireAccess('pembinaan-detail'), (req, res) => {
  const { no_reg, jenis_kejahatan, blok_kamar, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan } = req.body;
  const statusIntegrasi = (req.body.status_integrasi || '').trim();
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare(`INSERT INTO pentahapan_pembinaan_detail (no_reg, nama_wbp, jenis_kejahatan, blok_kamar, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan, status_integrasi)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(no_reg, nama_wbp, jenis_kejahatan, blok_kamar, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan, statusIntegrasi);
  syncPembinaanMasterByName(nama_wbp, statusIntegrasi);
  res.redirect('/admin/pembinaan-detail?success=1');
});

app.post('/admin/pembinaan-detail/:id/update', requireAccess('pembinaan-detail'), (req, res) => {
  const { no_reg, jenis_kejahatan, blok_kamar, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan } = req.body;
  const statusIntegrasi = (req.body.status_integrasi || '').trim();
  const nama_wbp = (req.body.nama_wbp || '').toUpperCase();
  db.prepare(`UPDATE pentahapan_pembinaan_detail SET no_reg=?, nama_wbp=?, jenis_kejahatan=?, blok_kamar=?, tanggal1=?, tanggal2=?, tanggal3=?, tanggal4=?, total_remisi=?, keterangan=?, status_integrasi=? WHERE id=?`)
    .run(no_reg, nama_wbp, jenis_kejahatan, blok_kamar, tanggal1, tanggal2, tanggal3, tanggal4, total_remisi, keterangan, statusIntegrasi, Number(req.params.id));
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
  const searchKeyword = String(req.query.search || '').trim();
  const list = db.prepare('SELECT * FROM strapsel_data ORDER BY id DESC').all().filter(item => {
    if (searchKeyword) {
      const haystack = [
        item.nama_wbp,
        item.blok_hunian,
        item.tanggal_masuk_strapsel,
        item.ekspirasi,
        item.permasalahan,
        item.barang_bukti,
      ].map(v => String(v || '').toLowerCase()).join(' ');
      return haystack.includes(searchKeyword.toLowerCase());
    }

    return isOnGoingPunishment(getTodayYmd(), item.tanggal_masuk_strapsel, item.ekspirasi);
  });
  const edit = req.query.edit ? db.prepare('SELECT * FROM strapsel_data WHERE id=?').get(Number(req.query.edit)) : null;
  const filterParams = new URLSearchParams();
  if (searchKeyword) filterParams.set('search', searchKeyword);
  res.render('admin/strapsel', {
    user: req.session.user,
    list,
    edit,
    searchKeyword,
    filterQuery: filterParams.toString() ? `?${filterParams.toString()}` : '',
    filterQueryWithAmp: filterParams.toString() ? `&${filterParams.toString()}` : '',
    active: 'strapsel',
    success: req.query.success,
    error: req.query.error
  });
});

app.get('/admin/piket-jaga', requireAccess('piket-jaga'), (req, res) => {
  const piket = getPiketJagaData({ year: req.query.year, month: req.query.month });
  res.render('admin/piket-jaga', {
    user: req.session.user,
    active: 'piket-jaga',
    success: req.query.success,
    ...piket,
  });
});

app.post('/admin/piket-jaga/update', requireAccess('piket-jaga'), (req, res) => {
  const selectedYear = /^\d{4}$/.test(String(req.body.year || '')) ? String(req.body.year) : getTodayYmd().split('-')[0];
  const selectedMonth = /^(0[1-9]|1[0-2])$/.test(String(req.body.month || '')) ? String(req.body.month) : getTodayYmd().split('-')[1];
  const daysInMonth = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
  const defaultReguNames = ['REGU I', 'REGU II', 'REGU III', 'REGU IV'];

  const readSchedule = (reguIndex) => Array.from({ length: daysInMonth }, (_item, index) => {
    const fieldName = `shift_r${reguIndex}_d${index + 1}`;
    return String(req.body[fieldName] || '').trim().toUpperCase().slice(0, 6);
  });

  const requestedReguCount = Number(req.body.regu_count || 0);
  const reguCount = Number.isFinite(requestedReguCount) ? Math.max(1, Math.min(20, requestedReguCount)) : 4;
  const rawReguNames = Array.isArray(req.body.regu_names)
    ? req.body.regu_names
    : (typeof req.body.regu_names === 'string' ? [req.body.regu_names] : []);
  const rawReguMembers = Array.isArray(req.body.regu_members)
    ? req.body.regu_members
    : (typeof req.body.regu_members === 'string' ? [req.body.regu_members] : []);
  const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  };

  const reguNames = Array.from({ length: reguCount }, (_item, index) => {
    const submitted = String(rawReguNames[index] || '').trim();
    return submitted || defaultReguNames[index] || `REGU ${index + 1}`;
  });

  const schedules = reguNames.map((_name, index) => readSchedule(index + 1));
  const reguMembers = reguNames.map((_name, index) => {
    const reguIndex = index + 1;
    const namaList = toArray(req.body[`member_nama_r${reguIndex}`]);
    const golList = toArray(req.body[`member_gol_r${reguIndex}`]);
    const jabatanList = toArray(req.body[`member_jabatan_r${reguIndex}`]);
    const maxLength = Math.max(namaList.length, golList.length, jabatanList.length);

    const structured = Array.from({ length: maxLength }, (_item, memberIndex) => {
      const nama = String(namaList[memberIndex] || '').trim();
      if (!nama) return null;
      const gol = String(golList[memberIndex] || '').trim() || '-';
      const jabatan = String(jabatanList[memberIndex] || '').trim() || 'ANGGOTA';
      return { nama, gol, jabatan };
    }).filter(Boolean);

    if (structured.length) return structured.slice(0, 100);

    const rawText = String(rawReguMembers[index] || '');
    return rawText
      .split(/\r?\n/)
      .map(item => {
        const line = item.trim();
        if (!line) return null;
        const parts = line.split('|').map(part => part.trim());
        const nama = parts[0] || '';
        if (!nama) return null;
        return {
          nama,
          gol: parts[1] || '-',
          jabatan: parts[2] || 'ANGGOTA',
        };
      })
      .filter(Boolean)
      .slice(0, 100);
  });
  const regu1Name = reguNames[0] || defaultReguNames[0];
  const regu2Name = reguNames[1] || defaultReguNames[1];
  const regu3Name = reguNames[2] || defaultReguNames[2];
  const regu4Name = reguNames[3] || defaultReguNames[3];

  db.prepare(`
    INSERT INTO kamtib_piket_jaga (
      year, month,
      regu1_name, regu2_name, regu3_name, regu4_name,
      regu1_schedule, regu2_schedule, regu3_schedule, regu4_schedule,
      regu_names_json, regu_schedules_json, regu_members_json, keterangan, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(year, month) DO UPDATE SET
      regu1_name=excluded.regu1_name,
      regu2_name=excluded.regu2_name,
      regu3_name=excluded.regu3_name,
      regu4_name=excluded.regu4_name,
      regu1_schedule=excluded.regu1_schedule,
      regu2_schedule=excluded.regu2_schedule,
      regu3_schedule=excluded.regu3_schedule,
      regu4_schedule=excluded.regu4_schedule,
      regu_names_json=excluded.regu_names_json,
      regu_schedules_json=excluded.regu_schedules_json,
      regu_members_json=excluded.regu_members_json,
      keterangan=excluded.keterangan,
      updated_at=datetime('now','localtime')
  `).run(
    selectedYear,
    selectedMonth,
    regu1Name,
    regu2Name,
    regu3Name,
    regu4Name,
    JSON.stringify(schedules[0] || Array.from({ length: daysInMonth }, () => '')),
    JSON.stringify(schedules[1] || Array.from({ length: daysInMonth }, () => '')),
    JSON.stringify(schedules[2] || Array.from({ length: daysInMonth }, () => '')),
    JSON.stringify(schedules[3] || Array.from({ length: daysInMonth }, () => '')),
    JSON.stringify(reguNames),
    JSON.stringify(schedules),
    JSON.stringify(reguMembers),
    ''
  );

  res.redirect(`/admin/piket-jaga?year=${selectedYear}&month=${selectedMonth}&success=1`);
});

app.post('/admin/strapsel/add', requireAccess('strapsel'), raziaUpload.single('dokumentasi'), (req, res) => {
  const searchKeyword = String(req.query.search || '').trim();
  const { nama_wbp, blok_hunian, tanggal_masuk_strapsel, ekspirasi, permasalahan, barang_bukti } = req.body;
  const dokumentasiPath = req.file ? `/uploads/razia/${req.file.filename}` : null;
  db.prepare(`
    INSERT INTO strapsel_data
      (nama_wbp, blok_hunian, tanggal_masuk_strapsel, ekspirasi, permasalahan, barang_bukti, dokumentasi_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nama_wbp, blok_hunian, tanggal_masuk_strapsel, ekspirasi || '', permasalahan || '', barang_bukti || '', dokumentasiPath);
  const redirectParams = new URLSearchParams({ success: '1' });
  if (searchKeyword) redirectParams.set('search', searchKeyword);
  res.redirect(`/admin/strapsel?${redirectParams.toString()}`);
});

app.post('/admin/strapsel/:id/update', requireAccess('strapsel'), raziaUpload.single('dokumentasi'), (req, res) => {
  const searchKeyword = String(req.query.search || '').trim();
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
  const redirectParams = new URLSearchParams({ success: '1' });
  if (searchKeyword) redirectParams.set('search', searchKeyword);
  res.redirect(`/admin/strapsel?${redirectParams.toString()}`);
});

app.post('/admin/strapsel/:id/delete', requireAccess('strapsel'), (req, res) => {
  const searchKeyword = String(req.query.search || '').trim();
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT dokumentasi_path FROM strapsel_data WHERE id=?').get(id);
  if (existing?.dokumentasi_path) removeUploadedFile(existing.dokumentasi_path);
  db.prepare('DELETE FROM strapsel_data WHERE id=?').run(id);
  const redirectParams = new URLSearchParams({ success: '1' });
  if (searchKeyword) redirectParams.set('search', searchKeyword);
  res.redirect(`/admin/strapsel?${redirectParams.toString()}`);
});

app.get('/admin/register-f', requireAccess('register-f'), (req, res) => {
  const searchKeyword = String(req.query.search || '').trim();
  const list = db.prepare('SELECT * FROM register_f ORDER BY id DESC').all().filter(item => {
    if (searchKeyword) {
      const haystack = [
        item.no_register,
        item.nama_wbp,
        item.jenis_pelanggaran,
        item.tanggal_pelanggaran,
        item.lama_hukuman,
        item.hukuman_mulai,
        item.hukuman_selesai,
        item.keterangan,
      ].map(v => String(v || '').toLowerCase()).join(' ');
      return haystack.includes(searchKeyword.toLowerCase());
    }

    return isOnGoingPunishment(getTodayYmd(), item.hukuman_mulai, item.hukuman_selesai);
  });
  const edit = req.query.edit ? db.prepare('SELECT * FROM register_f WHERE id=?').get(Number(req.query.edit)) : null;
  const filterParams = new URLSearchParams();
  if (searchKeyword) filterParams.set('search', searchKeyword);
  res.render('admin/register-f', {
    user: req.session.user,
    list,
    edit,
    searchKeyword,
    filterQuery: filterParams.toString() ? `?${filterParams.toString()}` : '',
    filterQueryWithAmp: filterParams.toString() ? `&${filterParams.toString()}` : '',
    active: 'register-f',
    success: req.query.success,
  });
});

app.post('/admin/register-f/add', requireAccess('register-f'), (req, res) => {
  const searchKeyword = String(req.query.search || '').trim();
  const noRegister = (req.body.no_register || '').trim().toUpperCase();
  const namaWbp = (req.body.nama_wbp || '').trim().toUpperCase();
  const jenisPelanggaran = (req.body.jenis_pelanggaran || '').trim();
  const tanggalPelanggaran = (req.body.tanggal_pelanggaran || '').trim();
  const lamaHukuman = (req.body.lama_hukuman || '').trim().toUpperCase();
  const hukumanMulai = (req.body.hukuman_mulai || '').trim();
  const hukumanSelesai = (req.body.hukuman_selesai || '').trim();
  const keterangan = (req.body.keterangan || '').trim();

  if (!noRegister || !namaWbp || !jenisPelanggaran || !tanggalPelanggaran) {
    return res.redirect('/admin/register-f');
  }

  db.prepare(`
    INSERT INTO register_f
      (no_register, nama_wbp, jenis_pelanggaran, tanggal_pelanggaran, lama_hukuman, hukuman_mulai, hukuman_selesai, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(noRegister, namaWbp, jenisPelanggaran, tanggalPelanggaran, lamaHukuman, hukumanMulai, hukumanSelesai, keterangan);

  const redirectParams = new URLSearchParams({ success: '1' });
  if (searchKeyword) redirectParams.set('search', searchKeyword);
  res.redirect(`/admin/register-f?${redirectParams.toString()}`);
});

app.post('/admin/register-f/:id/update', requireAccess('register-f'), (req, res) => {
  const searchKeyword = String(req.query.search || '').trim();
  const id = Number(req.params.id);
  const noRegister = (req.body.no_register || '').trim().toUpperCase();
  const namaWbp = (req.body.nama_wbp || '').trim().toUpperCase();
  const jenisPelanggaran = (req.body.jenis_pelanggaran || '').trim();
  const tanggalPelanggaran = (req.body.tanggal_pelanggaran || '').trim();
  const lamaHukuman = (req.body.lama_hukuman || '').trim().toUpperCase();
  const hukumanMulai = (req.body.hukuman_mulai || '').trim();
  const hukumanSelesai = (req.body.hukuman_selesai || '').trim();
  const keterangan = (req.body.keterangan || '').trim();

  if (!noRegister || !namaWbp || !jenisPelanggaran || !tanggalPelanggaran) {
    return res.redirect('/admin/register-f');
  }

  db.prepare(`
    UPDATE register_f
    SET no_register=?, nama_wbp=?, jenis_pelanggaran=?, tanggal_pelanggaran=?, lama_hukuman=?, hukuman_mulai=?, hukuman_selesai=?, keterangan=?
    WHERE id=?
  `).run(noRegister, namaWbp, jenisPelanggaran, tanggalPelanggaran, lamaHukuman, hukumanMulai, hukumanSelesai, keterangan, id);

  const redirectParams = new URLSearchParams({ success: '1' });
  if (searchKeyword) redirectParams.set('search', searchKeyword);
  res.redirect(`/admin/register-f?${redirectParams.toString()}`);
});

app.post('/admin/register-f/:id/delete', requireAccess('register-f'), (req, res) => {
  const searchKeyword = String(req.query.search || '').trim();
  db.prepare('DELETE FROM register_f WHERE id=?').run(Number(req.params.id));
  const redirectParams = new URLSearchParams({ success: '1' });
  if (searchKeyword) redirectParams.set('search', searchKeyword);
  res.redirect(`/admin/register-f?${redirectParams.toString()}`);
});

// ── GIIATJA (Kegiatan Kerja) ─────────────────────────────────────
app.get('/admin/giiatja', requireAccess('giiatja'), (req, res) => {
  const requestedMenu = String(req.query.menu || '').trim().toLowerCase();
  const validMenus = ['kegiatan', 'pelatihan', 'pnbp', 'premi'];
  const selectedPnbpYear = String(req.query.pnbp_tahun || '').trim();
  const pendapatanPeriodQuery = normalizePnbpPeriod(req.query.pendapatan_periode || '');
  const pendapatanYearQuery = String(req.query.pendapatan_tahun || '').trim();
  const premiSearch = String(req.query.premi_search || '').trim();
  const selectedPremiMonth = String(req.query.premi_bulan || '').trim().toUpperCase();
  const selectedPremiYear = String(req.query.premi_tahun || '').trim();
  const kegiatanCategories = db.prepare('SELECT * FROM giiatja_kegiatan ORDER BY sort_order ASC, id ASC').all();
  const kegiatanDetails = db.prepare(`
    SELECT
      d.*,
      c.kategori AS kategori
    FROM giiatja_kegiatan_detail d
    INNER JOIN giiatja_kegiatan c ON c.id = d.kegiatan_id
    ORDER BY c.sort_order ASC, c.id ASC, d.sort_order ASC, d.id ASC
  `).all();
  const pelatihanList = db.prepare('SELECT * FROM giiatja_pelatihan_sertifikat ORDER BY id ASC').all();
  const pnbpAll = db.prepare(`
    SELECT *
    FROM giiatja_pnbp
    ORDER BY tahun DESC,
      CASE UPPER(TRIM(periode_pnbp))
        WHEN 'JANUARI' THEN 1
        WHEN 'FEBRUARI' THEN 2
        WHEN 'MARET' THEN 3
        WHEN 'APRIL' THEN 4
        WHEN 'MEI' THEN 5
        WHEN 'JUNI' THEN 6
        WHEN 'JULI' THEN 7
        WHEN 'AGUSTUS' THEN 8
        WHEN 'SEPTEMBER' THEN 9
        WHEN 'OKTOBER' THEN 10
        WHEN 'NOVEMBER' THEN 11
        WHEN 'DESEMBER' THEN 12
        ELSE 99
      END ASC,
      id ASC
  `).all();
  const pnbpWithComputed = pnbpAll.map((item) => {
    const computedJumlah = computePnbpPeriodTotal(item.tahun, item.periode_pnbp);
    return {
      ...item,
      jumlah_pnbp: formatRupiah(computedJumlah),
    };
  });
  const pnbpYearOptions = Array.from(new Set(
    pnbpAll.map(item => String(item.tahun || '').trim()).filter(Boolean)
  )).sort((a, b) => String(b).localeCompare(String(a), undefined, { numeric: true }));
  const fallbackAdminPnbpYear = String(new Date().getFullYear());
  const activePnbpYear = selectedPnbpYear && selectedPnbpYear !== 'SEMUA'
    ? selectedPnbpYear
    : (pnbpYearOptions[0] || fallbackAdminPnbpYear);
  const pnbpList = selectedPnbpYear === 'SEMUA'
    ? pnbpWithComputed
    : pnbpWithComputed.filter(item => String(item.tahun || '').trim() === activePnbpYear);

  const pnbpPendapatanAll = db.prepare(`
    SELECT
      id,
      tahun,
      periode_pnbp,
      kegiatan,
      peserta,
      jumlah,
      sort_order
    FROM giiatja_pnbp_pendapatan
    ORDER BY tahun DESC,
      CASE UPPER(TRIM(periode_pnbp))
        WHEN 'JANUARI' THEN 1
        WHEN 'FEBRUARI' THEN 2
        WHEN 'MARET' THEN 3
        WHEN 'APRIL' THEN 4
        WHEN 'MEI' THEN 5
        WHEN 'JUNI' THEN 6
        WHEN 'JULI' THEN 7
        WHEN 'AGUSTUS' THEN 8
        WHEN 'SEPTEMBER' THEN 9
        WHEN 'OKTOBER' THEN 10
        WHEN 'NOVEMBER' THEN 11
        WHEN 'DESEMBER' THEN 12
        ELSE 99
      END ASC,
      sort_order ASC,
      id ASC
  `).all();

  const selectedPendapatanYear = pendapatanYearQuery || (selectedPnbpYear === 'SEMUA' ? '' : activePnbpYear);
  const selectedPendapatanPeriod = pendapatanPeriodQuery;
  const pnbpPendapatanList = pnbpPendapatanAll.filter((item) => {
    if (selectedPendapatanYear && String(item.tahun || '').trim() !== selectedPendapatanYear) return false;
    if (selectedPendapatanPeriod && normalizePnbpPeriod(item.periode_pnbp) !== selectedPendapatanPeriod) return false;
    return true;
  });
  const pnbpPendapatanTotal = pnbpPendapatanList.reduce((sum, item) => sum + parseMoneyNumber(item.jumlah), 0);
  const pnbpPendapatanTotals = pnbpPendapatanAll.reduce((acc, item) => {
    const key = `${String(item.tahun || '').trim()}|${normalizePnbpPeriod(item.periode_pnbp || '')}`;
    acc[key] = (acc[key] || 0) + parseMoneyNumber(item.jumlah);
    return acc;
  }, {});
  const premiAll = db.prepare(`
    SELECT *
    FROM giiatja_premi_wbp
    ORDER BY periode_tahun DESC,
      CASE UPPER(TRIM(periode_bulan))
        WHEN 'JANUARI' THEN 1
        WHEN 'FEBRUARI' THEN 2
        WHEN 'MARET' THEN 3
        WHEN 'APRIL' THEN 4
        WHEN 'MEI' THEN 5
        WHEN 'JUNI' THEN 6
        WHEN 'JULI' THEN 7
        WHEN 'AGUSTUS' THEN 8
        WHEN 'SEPTEMBER' THEN 9
        WHEN 'OKTOBER' THEN 10
        WHEN 'NOVEMBER' THEN 11
        WHEN 'DESEMBER' THEN 12
        ELSE 99
      END ASC,
      sort_order ASC,
      id ASC
  `).all();
  const premiMonthOptions = Array.from(new Set(
    premiAll.map(item => String(item.periode_bulan || '').trim().toUpperCase()).filter(Boolean)
  )).sort((a, b) => {
    const orders = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
    const ia = orders.indexOf(a);
    const ib = orders.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const premiYearOptions = Array.from(new Set(
    premiAll.map(item => String(item.periode_tahun || '').trim()).filter(Boolean)
  )).sort((a, b) => String(b).localeCompare(String(a), undefined, { numeric: true }));
  const activePremiMonth = selectedPremiMonth && selectedPremiMonth !== 'SEMUA' ? selectedPremiMonth : 'SEMUA';
  const activePremiYear = selectedPremiYear && selectedPremiYear !== 'SEMUA' ? selectedPremiYear : 'SEMUA';
  const normalizedPremiSearch = premiSearch
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const premiList = premiAll.filter((item) => {
    const month = String(item.periode_bulan || '').trim().toUpperCase();
    const year = String(item.periode_tahun || '').trim();
    if (activePremiMonth !== 'SEMUA' && month !== activePremiMonth) return false;
    if (activePremiYear !== 'SEMUA' && year !== activePremiYear) return false;
    if (!normalizedPremiSearch) return true;
    const blob = [
      item.no_registrasi,
      item.nama_wbp,
      item.jenis_kegiatan,
      item.premi_didapat,
      item.keterangan,
      item.periode_bulan,
      item.periode_tahun,
      `${item.periode_bulan || ''} ${item.periode_tahun || ''}`,
    ].join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return blob.includes(normalizedPremiSearch);
  });

  const editKategori = req.query.editKategori
    ? db.prepare('SELECT * FROM giiatja_kegiatan WHERE id=?').get(Number(req.query.editKategori))
    : null;
  const editKegiatan = req.query.editKegiatan
    ? db.prepare('SELECT * FROM giiatja_kegiatan_detail WHERE id=?').get(Number(req.query.editKegiatan))
    : null;
  const editPelatihan = req.query.editPelatihan
    ? db.prepare('SELECT * FROM giiatja_pelatihan_sertifikat WHERE id=?').get(Number(req.query.editPelatihan))
    : null;
  const editPnbp = req.query.editPnbp
    ? db.prepare('SELECT * FROM giiatja_pnbp WHERE id=?').get(Number(req.query.editPnbp))
    : null;
  if (editPnbp) {
    editPnbp.jumlah_pnbp = formatRupiah(computePnbpPeriodTotal(editPnbp.tahun, editPnbp.periode_pnbp));
  }
  const editPnbpPendapatan = req.query.editPendapatan
    ? db.prepare('SELECT * FROM giiatja_pnbp_pendapatan WHERE id=?').get(Number(req.query.editPendapatan))
    : null;
  const editPremi = req.query.editPremi
    ? db.prepare('SELECT * FROM giiatja_premi_wbp WHERE id=?').get(Number(req.query.editPremi))
    : null;

  let giiatjaMenu = validMenus.includes(requestedMenu) ? requestedMenu : '';
  if (!giiatjaMenu) {
    if (editKategori || editKegiatan) giiatjaMenu = 'kegiatan';
    else if (editPelatihan) giiatjaMenu = 'pelatihan';
    else if (editPnbp || editPnbpPendapatan || selectedPnbpYear || selectedPendapatanYear || selectedPendapatanPeriod) giiatjaMenu = 'pnbp';
    else if (editPremi || premiSearch || (selectedPremiMonth && selectedPremiMonth !== 'SEMUA') || (selectedPremiYear && selectedPremiYear !== 'SEMUA')) giiatjaMenu = 'premi';
    else giiatjaMenu = 'kegiatan';
  }

  res.render('admin/giiatja', {
    user: req.session.user,
    kegiatanCategories,
    kegiatanList: kegiatanDetails,
    pelatihanList,
    pnbpList,
    premiList,
    editKategori,
    editKegiatan,
    editPelatihan,
    editPnbp,
    editPnbpPendapatan,
    editPremi,
    pnbpYearOptions,
    selectedPnbpYear: selectedPnbpYear === 'SEMUA' ? 'SEMUA' : activePnbpYear,
    premiMonthOptions,
    premiYearOptions,
    selectedPremiMonth: activePremiMonth,
    selectedPremiYear: activePremiYear,
    premiSearch,
    selectedPendapatanYear,
    selectedPendapatanPeriod,
    pnbpPendapatanList,
    pnbpPendapatanTotal,
    pnbpPendapatanTotals,
    pnbpTahun: fallbackAdminPnbpYear,
    giiatjaMenu,
    active: `giiatja-${giiatjaMenu}`,
    success: req.query.success,
    error: req.query.error,
  });
});

app.post('/admin/giiatja/kategori/add', requireAccess('giiatja'), (req, res) => {
  const kategori = String(req.body.kategori || '').trim().toUpperCase();
  const sortOrder = Number(req.body.sort_order || 0) || 1;
  if (!kategori) return res.redirect('/admin/giiatja?menu=kegiatan');

  db.prepare(`
    INSERT INTO giiatja_kegiatan
      (kategori, sort_order)
    VALUES (?, ?)
  `).run(kategori, sortOrder);

  res.redirect('/admin/giiatja?menu=kegiatan&success=1');
});

app.post('/admin/giiatja/kategori/:id/update', requireAccess('giiatja'), (req, res) => {
  const id = Number(req.params.id);
  const kategori = String(req.body.kategori || '').trim().toUpperCase();
  const sortOrder = Number(req.body.sort_order || 0) || 1;
  if (!kategori) return res.redirect('/admin/giiatja?menu=kegiatan');

  db.prepare('UPDATE giiatja_kegiatan SET kategori=?, sort_order=? WHERE id=?')
    .run(kategori, sortOrder, id);

  res.redirect('/admin/giiatja?menu=kegiatan&success=1');
});

app.post('/admin/giiatja/kategori/:id/delete', requireAccess('giiatja'), (req, res) => {
  const id = Number(req.params.id);
  const details = db.prepare('SELECT dokumentasi_path FROM giiatja_kegiatan_detail WHERE kegiatan_id=?').all(id);
  details.forEach((item) => {
    if (item?.dokumentasi_path) removeUploadedFile(item.dokumentasi_path);
  });
  db.prepare('DELETE FROM giiatja_kegiatan_detail WHERE kegiatan_id=?').run(id);
  db.prepare('DELETE FROM giiatja_kegiatan WHERE id=?').run(id);
  res.redirect('/admin/giiatja?menu=kegiatan&success=1');
});

app.post('/admin/giiatja/kegiatan/add', requireAccess('giiatja'), raziaUpload.single('dokumentasi'), (req, res) => {
  const kegiatanId = Number(req.body.kegiatan_id || 0);
  const jenisKegiatan = String(req.body.jenis_kegiatan || '').trim().toUpperCase();
  const pesertaKegiatan = String(req.body.peserta_kegiatan || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .toUpperCase();
  const pengawas = String(req.body.pengawas || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .toUpperCase();
  const sortOrder = Number(req.body.sort_order || 0) || 1;
  if (!kegiatanId || !jenisKegiatan || !pesertaKegiatan) return res.redirect('/admin/giiatja?menu=kegiatan');
  const dokumentasiPath = req.file ? `/uploads/razia/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO giiatja_kegiatan_detail
      (kegiatan_id, jenis_kegiatan, peserta_kegiatan, pengawas, dokumentasi_path, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(kegiatanId, jenisKegiatan, pesertaKegiatan, pengawas, dokumentasiPath, sortOrder);

  res.redirect('/admin/giiatja?menu=kegiatan&success=1');
});

app.post('/admin/giiatja/kegiatan/:id/update', requireAccess('giiatja'), raziaUpload.single('dokumentasi'), (req, res) => {
  const id = Number(req.params.id);
  const kegiatanId = Number(req.body.kegiatan_id || 0);
  const jenisKegiatan = String(req.body.jenis_kegiatan || '').trim().toUpperCase();
  const pesertaKegiatan = String(req.body.peserta_kegiatan || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .toUpperCase();
  const pengawas = String(req.body.pengawas || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .toUpperCase();
  const sortOrder = Number(req.body.sort_order || 0) || 1;
  if (!kegiatanId || !jenisKegiatan || !pesertaKegiatan) return res.redirect('/admin/giiatja?menu=kegiatan');

  const existing = db.prepare('SELECT dokumentasi_path FROM giiatja_kegiatan_detail WHERE id=?').get(id);
  let nextDokumentasiPath = existing?.dokumentasi_path || null;
  if (req.file) {
    if (nextDokumentasiPath) removeUploadedFile(nextDokumentasiPath);
    nextDokumentasiPath = `/uploads/razia/${req.file.filename}`;
  }

  db.prepare(`
    UPDATE giiatja_kegiatan_detail
    SET kegiatan_id=?, jenis_kegiatan=?, peserta_kegiatan=?, pengawas=?, dokumentasi_path=?, sort_order=?
    WHERE id=?
  `).run(kegiatanId, jenisKegiatan, pesertaKegiatan, pengawas, nextDokumentasiPath, sortOrder, id);

  res.redirect('/admin/giiatja?menu=kegiatan&success=1');
});

app.post('/admin/giiatja/kegiatan/:id/delete', requireAccess('giiatja'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT dokumentasi_path FROM giiatja_kegiatan_detail WHERE id=?').get(id);
  if (existing?.dokumentasi_path) removeUploadedFile(existing.dokumentasi_path);
  db.prepare('DELETE FROM giiatja_kegiatan_detail WHERE id=?').run(id);
  res.redirect('/admin/giiatja?menu=kegiatan&success=1');
});

app.post('/admin/giiatja/pelatihan/add', requireAccess('giiatja'), raziaUpload.single('poto_sertifikat'), (req, res) => {
  const noRegistrasi = String(req.body.no_registrasi || '').trim().toUpperCase();
  const namaWbp = String(req.body.nama_wbp || '').trim().toUpperCase();
  const jenisPelatihan = String(req.body.jenis_pelatihan || '').trim().toUpperCase();
  const tanggalPelaksanaan = String(req.body.tanggal_pelaksanaan || '').trim();
  const instruktur = String(req.body.instruktur || '').trim();
  const keterangan = String(req.body.keterangan || '').trim();
  if (!namaWbp) return res.redirect('/admin/giiatja?menu=pelatihan');
  const potoSertifikatPath = req.file ? `/uploads/razia/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO giiatja_pelatihan_sertifikat
      (no_registrasi, nama_wbp, jenis_pelatihan, tanggal_pelaksanaan, instruktur, poto_sertifikat_path, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(noRegistrasi, namaWbp, jenisPelatihan, tanggalPelaksanaan, instruktur, potoSertifikatPath, keterangan);

  res.redirect('/admin/giiatja?menu=pelatihan&success=1');
});

app.post('/admin/giiatja/pelatihan/:id/update', requireAccess('giiatja'), raziaUpload.single('poto_sertifikat'), (req, res) => {
  const id = Number(req.params.id);
  const noRegistrasi = String(req.body.no_registrasi || '').trim().toUpperCase();
  const namaWbp = String(req.body.nama_wbp || '').trim().toUpperCase();
  const jenisPelatihan = String(req.body.jenis_pelatihan || '').trim().toUpperCase();
  const tanggalPelaksanaan = String(req.body.tanggal_pelaksanaan || '').trim();
  const instruktur = String(req.body.instruktur || '').trim();
  const keterangan = String(req.body.keterangan || '').trim();
  if (!namaWbp) return res.redirect('/admin/giiatja?menu=pelatihan');

  const existing = db.prepare('SELECT poto_sertifikat_path FROM giiatja_pelatihan_sertifikat WHERE id=?').get(id);
  let nextPotoSertifikatPath = existing?.poto_sertifikat_path || null;
  if (req.file) {
    if (nextPotoSertifikatPath) removeUploadedFile(nextPotoSertifikatPath);
    nextPotoSertifikatPath = `/uploads/razia/${req.file.filename}`;
  }

  db.prepare(`
    UPDATE giiatja_pelatihan_sertifikat
    SET no_registrasi=?, nama_wbp=?, jenis_pelatihan=?, tanggal_pelaksanaan=?, instruktur=?, poto_sertifikat_path=?, keterangan=?
    WHERE id=?
  `).run(noRegistrasi, namaWbp, jenisPelatihan, tanggalPelaksanaan, instruktur, nextPotoSertifikatPath, keterangan, id);

  res.redirect('/admin/giiatja?menu=pelatihan&success=1');
});

app.post('/admin/giiatja/pelatihan/:id/delete', requireAccess('giiatja'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT poto_sertifikat_path FROM giiatja_pelatihan_sertifikat WHERE id=?').get(id);
  if (existing?.poto_sertifikat_path) removeUploadedFile(existing.poto_sertifikat_path);
  db.prepare('DELETE FROM giiatja_pelatihan_sertifikat WHERE id=?').run(id);
  res.redirect('/admin/giiatja?menu=pelatihan&success=1');
});

app.post('/admin/giiatja/pnbp/add', requireAccess('giiatja'), (req, res) => {
  const tahun = String(req.body.tahun || '').trim() || String(new Date().getFullYear());
  const periodePnbp = normalizePnbpPeriod(req.body.periode_pnbp || '');
  const targetRealisasi = String(req.body.target_realisasi || '').trim();
  const jumlahPnbp = String(Math.round(computePnbpPeriodTotal(tahun, periodePnbp)));

  const targetValue = parseMoneyNumber(targetRealisasi);
  const currentAmount = parseMoneyNumber(jumlahPnbp);
  const currentPercent = targetValue > 0 ? (currentAmount / targetValue) * 100 : 0;
  const percentLabel = Number.isFinite(currentPercent)
    ? (Math.abs(currentPercent - Math.round(currentPercent)) < 0.001
      ? `${Math.round(currentPercent)}%`
      : `${currentPercent.toFixed(2).replace(/\.00$/, '')}%`)
    : '0%';
  const keterangan = targetValue > 0
    ? (currentPercent >= 100 ? 'TERCAPAI' : 'BELUM TERCAPAI')
    : '';
  if (!periodePnbp || !tahun) return res.redirect('/admin/giiatja?menu=pnbp');

  const duplicate = db.prepare(`
    SELECT id
    FROM giiatja_pnbp
    WHERE tahun = ?
      AND UPPER(TRIM(periode_pnbp)) = ?
    LIMIT 1
  `).get(tahun, periodePnbp);

  if (duplicate?.id) {
    const query = new URLSearchParams({
      pnbp_tahun: tahun,
      error: `Data PNBP ${periodePnbp} tahun ${tahun} sudah ada.`
    });
    query.set('menu', 'pnbp');
    return res.redirect(`/admin/giiatja?${query.toString()}`);
  }

  db.prepare(`
    INSERT INTO giiatja_pnbp
      (tahun, periode_pnbp, jumlah_pnbp, target_realisasi, persentase, keterangan)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tahun, periodePnbp, jumlahPnbp, targetRealisasi, percentLabel, keterangan);

  recalculateAndPersistPnbpByPeriod(tahun, periodePnbp);

  res.redirect(`/admin/giiatja?menu=pnbp&success=1&pnbp_tahun=${encodeURIComponent(tahun)}`);
});

app.post('/admin/giiatja/pnbp/:id/update', requireAccess('giiatja'), (req, res) => {
  const id = Number(req.params.id);
  const tahun = String(req.body.tahun || '').trim() || String(new Date().getFullYear());
  const periodePnbp = normalizePnbpPeriod(req.body.periode_pnbp || '');
  const targetRealisasi = String(req.body.target_realisasi || '').trim();
  const jumlahPnbp = String(Math.round(computePnbpPeriodTotal(tahun, periodePnbp)));

  const targetValue = parseMoneyNumber(targetRealisasi);
  const currentAmount = parseMoneyNumber(jumlahPnbp);
  const currentPercent = targetValue > 0 ? (currentAmount / targetValue) * 100 : 0;
  const percentLabel = Number.isFinite(currentPercent)
    ? (Math.abs(currentPercent - Math.round(currentPercent)) < 0.001
      ? `${Math.round(currentPercent)}%`
      : `${currentPercent.toFixed(2).replace(/\.00$/, '')}%`)
    : '0%';
  const keterangan = targetValue > 0
    ? (currentPercent >= 100 ? 'TERCAPAI' : 'BELUM TERCAPAI')
    : '';
  if (!periodePnbp || !tahun) return res.redirect('/admin/giiatja?menu=pnbp');

  const previous = db.prepare('SELECT tahun, periode_pnbp FROM giiatja_pnbp WHERE id=?').get(id);

  const duplicate = db.prepare(`
    SELECT id
    FROM giiatja_pnbp
    WHERE tahun = ?
      AND UPPER(TRIM(periode_pnbp)) = ?
      AND id <> ?
    LIMIT 1
  `).get(tahun, periodePnbp, id);

  if (duplicate?.id) {
    const query = new URLSearchParams({
      pnbp_tahun: tahun,
      editPnbp: String(id),
      error: `Data PNBP ${periodePnbp} tahun ${tahun} sudah ada.`
    });
    query.set('menu', 'pnbp');
    return res.redirect(`/admin/giiatja?${query.toString()}`);
  }

  db.prepare(`
    UPDATE giiatja_pnbp
    SET tahun=?, periode_pnbp=?, jumlah_pnbp=?, target_realisasi=?, persentase=?, keterangan=?
    WHERE id=?
  `).run(tahun, periodePnbp, jumlahPnbp, targetRealisasi, percentLabel, keterangan, id);

  recalculateAndPersistPnbpByPeriod(tahun, periodePnbp);
  if (previous?.tahun && previous?.periode_pnbp) {
    const prevYear = String(previous.tahun || '').trim();
    const prevPeriod = normalizePnbpPeriod(previous.periode_pnbp || '');
    if (prevYear && prevPeriod && (prevYear !== tahun || prevPeriod !== periodePnbp)) {
      recalculateAndPersistPnbpByPeriod(prevYear, prevPeriod);
    }
  }

  res.redirect(`/admin/giiatja?menu=pnbp&success=1&pnbp_tahun=${encodeURIComponent(tahun)}`);
});

app.post('/admin/giiatja/pnbp/:id/delete', requireAccess('giiatja'), (req, res) => {
  const pnbpTahun = String(req.body.pnbp_tahun || '').trim();
  db.prepare('DELETE FROM giiatja_pnbp WHERE id=?').run(Number(req.params.id));
  const query = new URLSearchParams({ success: '1', menu: 'pnbp' });
  if (pnbpTahun) query.set('pnbp_tahun', pnbpTahun);
  res.redirect(`/admin/giiatja?${query.toString()}`);
});

app.post('/admin/giiatja/pnbp-pendapatan/add', requireAccess('giiatja'), (req, res) => {
  const tahun = String(req.body.tahun || '').trim() || String(new Date().getFullYear());
  const periodePnbp = normalizePnbpPeriod(req.body.periode_pnbp || '');
  const kegiatan = String(req.body.kegiatan || '').trim().toUpperCase();
  const peserta = String(req.body.peserta || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
  const jumlah = normalizeNominalString(req.body.jumlah || '0');
  if (!tahun || !periodePnbp || !kegiatan) return res.redirect('/admin/giiatja?menu=pnbp');

  const nextSort = Number(db.prepare(`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS n
    FROM giiatja_pnbp_pendapatan
    WHERE tahun = ?
      AND UPPER(TRIM(periode_pnbp)) = ?
  `).get(tahun, periodePnbp)?.n || 1);

  db.prepare(`
    INSERT INTO giiatja_pnbp_pendapatan
      (tahun, periode_pnbp, kegiatan, peserta, jumlah, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tahun, periodePnbp, kegiatan, peserta, jumlah, nextSort);

  recalculateAndPersistPnbpByPeriod(tahun, periodePnbp);

  const query = new URLSearchParams({
    success: '1',
    menu: 'pnbp',
    pnbp_tahun: tahun,
    pendapatan_tahun: tahun,
    pendapatan_periode: periodePnbp,
  });
  return res.redirect(`/admin/giiatja?${query.toString()}#pendapatan-pnbp`);
});

app.post('/admin/giiatja/pnbp-pendapatan/:id/update', requireAccess('giiatja'), (req, res) => {
  const id = Number(req.params.id);
  const tahun = String(req.body.tahun || '').trim() || String(new Date().getFullYear());
  const periodePnbp = normalizePnbpPeriod(req.body.periode_pnbp || '');
  const kegiatan = String(req.body.kegiatan || '').trim().toUpperCase();
  const peserta = String(req.body.peserta || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
  const jumlah = normalizeNominalString(req.body.jumlah || '0');
  if (!tahun || !periodePnbp || !kegiatan) return res.redirect('/admin/giiatja?menu=pnbp');

  const existing = db.prepare('SELECT tahun, periode_pnbp FROM giiatja_pnbp_pendapatan WHERE id=?').get(id);
  db.prepare(`
    UPDATE giiatja_pnbp_pendapatan
    SET tahun=?, periode_pnbp=?, kegiatan=?, peserta=?, jumlah=?
    WHERE id=?
  `).run(tahun, periodePnbp, kegiatan, peserta, jumlah, id);

  recalculateAndPersistPnbpByPeriod(tahun, periodePnbp);
  if (existing?.tahun && existing?.periode_pnbp) {
    const prevYear = String(existing.tahun || '').trim();
    const prevPeriod = normalizePnbpPeriod(existing.periode_pnbp || '');
    if (prevYear && prevPeriod && (prevYear !== tahun || prevPeriod !== periodePnbp)) {
      recalculateAndPersistPnbpByPeriod(prevYear, prevPeriod);
    }
  }

  const query = new URLSearchParams({
    success: '1',
    menu: 'pnbp',
    pnbp_tahun: tahun,
    pendapatan_tahun: tahun,
    pendapatan_periode: periodePnbp,
  });
  return res.redirect(`/admin/giiatja?${query.toString()}#pendapatan-pnbp`);
});

app.post('/admin/giiatja/pnbp-pendapatan/:id/delete', requireAccess('giiatja'), (req, res) => {
  const id = Number(req.params.id);
  const tahun = String(req.body.tahun || '').trim();
  const periodePnbp = normalizePnbpPeriod(req.body.periode_pnbp || '');
  const existing = db.prepare('SELECT tahun, periode_pnbp FROM giiatja_pnbp_pendapatan WHERE id=?').get(id);
  db.prepare('DELETE FROM giiatja_pnbp_pendapatan WHERE id=?').run(id);

  const targetYear = tahun || String(existing?.tahun || '').trim();
  const targetPeriod = periodePnbp || normalizePnbpPeriod(existing?.periode_pnbp || '');
  if (targetYear && targetPeriod) {
    recalculateAndPersistPnbpByPeriod(targetYear, targetPeriod);
  }

  const query = new URLSearchParams({ success: '1', menu: 'pnbp' });
  if (targetYear) query.set('pnbp_tahun', targetYear);
  if (targetYear) query.set('pendapatan_tahun', targetYear);
  if (targetPeriod) query.set('pendapatan_periode', targetPeriod);
  return res.redirect(`/admin/giiatja?${query.toString()}#pendapatan-pnbp`);
});

app.post('/admin/giiatja/premi/add', requireAccess('giiatja'), (req, res) => {
  const noRegistrasi = String(req.body.no_registrasi || '').trim().toUpperCase();
  const namaWbp = String(req.body.nama_wbp || '').trim().toUpperCase();
  const periodeBulan = String(req.body.periode_bulan || '').trim().toUpperCase();
  const periodeTahun = String(req.body.periode_tahun || '').trim() || String(new Date().getFullYear());
  const jenisKegiatan = String(req.body.jenis_kegiatan || '').trim().toUpperCase();
  const premiDidapat = String(req.body.premi_didapat || '').trim();
  const keterangan = String(req.body.keterangan || '').trim().toUpperCase();
  const sortOrder = Number(req.body.sort_order || 0) || 1;
  if (!namaWbp || !periodeBulan || !periodeTahun) return res.redirect('/admin/giiatja?menu=premi');

  db.prepare(`
    INSERT INTO giiatja_premi_wbp
      (no_registrasi, nama_wbp, periode_bulan, periode_tahun, jenis_kegiatan, premi_didapat, keterangan, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(noRegistrasi, namaWbp, periodeBulan, periodeTahun, jenisKegiatan, premiDidapat, keterangan, sortOrder);

  res.redirect('/admin/giiatja?menu=premi&success=1');
});

app.post('/admin/giiatja/premi/:id/update', requireAccess('giiatja'), (req, res) => {
  const id = Number(req.params.id);
  const noRegistrasi = String(req.body.no_registrasi || '').trim().toUpperCase();
  const namaWbp = String(req.body.nama_wbp || '').trim().toUpperCase();
  const periodeBulan = String(req.body.periode_bulan || '').trim().toUpperCase();
  const periodeTahun = String(req.body.periode_tahun || '').trim() || String(new Date().getFullYear());
  const jenisKegiatan = String(req.body.jenis_kegiatan || '').trim().toUpperCase();
  const premiDidapat = String(req.body.premi_didapat || '').trim();
  const keterangan = String(req.body.keterangan || '').trim().toUpperCase();
  const sortOrder = Number(req.body.sort_order || 0) || 1;
  if (!namaWbp || !periodeBulan || !periodeTahun) return res.redirect('/admin/giiatja?menu=premi');

  db.prepare(`
    UPDATE giiatja_premi_wbp
    SET no_registrasi=?, nama_wbp=?, periode_bulan=?, periode_tahun=?, jenis_kegiatan=?, premi_didapat=?, keterangan=?, sort_order=?
    WHERE id=?
  `).run(noRegistrasi, namaWbp, periodeBulan, periodeTahun, jenisKegiatan, premiDidapat, keterangan, sortOrder, id);

  res.redirect('/admin/giiatja?menu=premi&success=1');
});

app.post('/admin/giiatja/premi/:id/delete', requireAccess('giiatja'), (req, res) => {
  const premiSearch = String(req.body.premi_search || '').trim();
  const premiMonth = String(req.body.premi_bulan || '').trim();
  const premiYear = String(req.body.premi_tahun || '').trim();
  const pnbpYear = String(req.body.pnbp_tahun || '').trim();
  db.prepare('DELETE FROM giiatja_premi_wbp WHERE id=?').run(Number(req.params.id));
  const query = new URLSearchParams({ success: '1', menu: 'premi' });
  if (premiSearch) query.set('premi_search', premiSearch);
  if (premiMonth) query.set('premi_bulan', premiMonth);
  if (premiYear) query.set('premi_tahun', premiYear);
  if (pnbpYear) query.set('pnbp_tahun', pnbpYear);
  res.redirect(`/admin/giiatja?${query.toString()}`);
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
    financeIndicator: getFinanceIndicatorSummary(),
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

app.post('/admin/tu-umum/keuangan/update', pdfUpload.single('keuangan_pdf'), requireAccess('tu-umum'), (req, res) => {
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

  if (req.file) {
    const pdfPath = `/uploads/pdf/${req.file.filename}`;
    db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `).run('keuangan_pdf_path', pdfPath);
  }

  res.redirect('/admin/tu-umum/realisasi?success=1');
});

app.post('/admin/tu-umum/keuangan/pdf/update', pdfUpload.single('keuangan_pdf'), requireAccess('tu-umum'), (req, res) => {
  if (req.file) {
    const pdfPath = `/uploads/pdf/${req.file.filename}`;
    db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `).run('keuangan_pdf_path', pdfPath);
  }

  res.redirect('/admin/tu-umum/realisasi?success=1');
});

app.post('/admin/tu-umum/indikator/update', requireAccess('tu-umum'), (req, res) => {
  const financeIndicator = {
    no: String(req.body.no || '').trim(),
    periode: String(req.body.periode || '').trim(),
    kodeKppn: String(req.body.kode_kppn || '').trim(),
    kodeBa: String(req.body.kode_ba || '').trim(),
    kodeSatker: String(req.body.kode_satker || '').trim(),
    uraianSatker: String(req.body.uraian_satker || '').trim(),
    keterangan: String(req.body.keterangan || '').trim(),
    revisiDipa: String(req.body.revisi_dipa || '').trim(),
    deviasiHalamanIiiDipa: String(req.body.deviasi_halaman_iii_dipa || '').trim(),
    nilaiAspekPerencanaan: String(req.body.nilai_aspek_perencanaan || '').trim(),
    penyerapanAnggaran: String(req.body.penyerapan_anggaran || '').trim(),
    belanjaKontraktual: String(req.body.belanja_kontraktual || '').trim(),
    penyelesaianTagihan: String(req.body.penyelesaian_tagihan || '').trim(),
    pengelolaanUpDanTup: String(req.body.pengelolaan_up_dan_tup || '').trim(),
    nilaiAspekPelaksanaan: String(req.body.nilai_aspek_pelaksanaan || '').trim(),
    capaianOutput: String(req.body.capaian_output || '').trim(),
    nilaiAspekHasil: String(req.body.nilai_aspek_hasil || '').trim(),
    nilaiTotal: String(req.body.nilai_total || '').trim(),
    konversiBobot: String(req.body.konversi_bobot || '').trim(),
    dispensasiSpm: String(req.body.dispensasi_spm || '').trim(),
    nilaiAkhir: String(req.body.nilai_akhir || '').trim(),
  };

  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run('keuangan_indikator_data', JSON.stringify(financeIndicator));

  res.redirect('/admin/tu-umum/realisasi?success=1');
});

app.post('/admin/tu-umum/add', requireAccess('tu-umum'), (req, res) => {
  const {
    kode, uraian, satuan, tahun_perolehan,
    saldo_awal_kuantitas, saldo_awal_nilai,
    bertambah_kuantitas, bertambah_nilai,
    berkurang_kuantitas, berkurang_nilai,
    saldo_akhir_kuantitas, saldo_akhir_nilai,
  } = req.body;

  db.prepare(`
    INSERT INTO tu_umum_barang
      (kode, uraian, satuan, tahun_perolehan, saldo_awal_kuantitas, saldo_awal_nilai, bertambah_kuantitas, bertambah_nilai, berkurang_kuantitas, berkurang_nilai, saldo_akhir_kuantitas, saldo_akhir_nilai)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    kode, uraian, satuan, String(tahun_perolehan || '').trim(),
    saldo_awal_kuantitas || '0', saldo_awal_nilai || '0',
    bertambah_kuantitas || '0', bertambah_nilai || '0',
    berkurang_kuantitas || '0', berkurang_nilai || '0',
    saldo_akhir_kuantitas || '0', saldo_akhir_nilai || '0'
  );

  res.redirect('/admin/tu-umum/barang?success=1');
});

app.post('/admin/tu-umum/:id/update', requireAccess('tu-umum'), (req, res) => {
  const {
    kode, uraian, satuan, tahun_perolehan,
    saldo_awal_kuantitas, saldo_awal_nilai,
    bertambah_kuantitas, bertambah_nilai,
    berkurang_kuantitas, berkurang_nilai,
    saldo_akhir_kuantitas, saldo_akhir_nilai,
  } = req.body;

  db.prepare(`
    UPDATE tu_umum_barang
    SET kode=?, uraian=?, satuan=?, tahun_perolehan=?, saldo_awal_kuantitas=?, saldo_awal_nilai=?, bertambah_kuantitas=?, bertambah_nilai=?, berkurang_kuantitas=?, berkurang_nilai=?, saldo_akhir_kuantitas=?, saldo_akhir_nilai=?
    WHERE id=?
  `).run(
    kode, uraian, satuan, String(tahun_perolehan || '').trim(),
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
  const todayYmd = getTodayYmd();
  const papanIsiInputDate = normalizeDateToYmd(getAppSetting('board_registrasi_hunian_last_input_date', ''));
  const hasPapanIsiTodayUpdate = papanIsiInputDate === todayYmd;
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
    hasPapanIsiTodayUpdate,
  });
});

app.post('/admin/papan-isi/pidana/add', requireAccess('papan-isi'), (req, res) => {
  const kategori = req.body.kategori === 'umum' ? 'umum' : 'khusus';
  const jenis = String(req.body.jenis || '').replace(/\s+/g, ' ').trim();
  const jumlah = Number(req.body.jumlah || 0);
  if (!jenis) return res.redirect('/admin/papan-isi');

  const existing = db.prepare(`
    SELECT id
    FROM board_pidana
    WHERE kategori = ?
      AND LOWER(TRIM(jenis)) = LOWER(TRIM(?))
    ORDER BY id DESC
    LIMIT 1
  `).get(kategori, jenis);

  if (existing?.id) {
    db.prepare('UPDATE board_pidana SET jenis=?, jumlah=? WHERE id=?')
      .run(jenis, jumlah, Number(existing.id));
    db.prepare(`
      DELETE FROM board_pidana
      WHERE kategori = ?
        AND LOWER(TRIM(jenis)) = LOWER(TRIM(?))
        AND id <> ?
    `).run(kategori, jenis, Number(existing.id));
  } else {
    db.prepare('INSERT INTO board_pidana (kategori, jenis, jumlah) VALUES (?, ?, ?)').run(kategori, jenis, jumlah);
  }

  res.redirect('/admin/papan-isi?success=1');
});

app.post('/admin/papan-isi/pidana/:id/update', requireAccess('papan-isi'), (req, res) => {
  const id = Number(req.params.id);
  const kategori = req.body.kategori === 'umum' ? 'umum' : 'khusus';
  const jenis = String(req.body.jenis || '').replace(/\s+/g, ' ').trim();
  const jumlah = Number(req.body.jumlah || 0);
  if (!jenis) return res.redirect('/admin/papan-isi');

  const duplicate = db.prepare(`
    SELECT id
    FROM board_pidana
    WHERE kategori = ?
      AND LOWER(TRIM(jenis)) = LOWER(TRIM(?))
      AND id <> ?
    ORDER BY id DESC
    LIMIT 1
  `).get(kategori, jenis, id);

  if (duplicate?.id) {
    db.prepare('UPDATE board_pidana SET kategori=?, jenis=?, jumlah=? WHERE id=?')
      .run(kategori, jenis, jumlah, Number(duplicate.id));
    db.prepare('DELETE FROM board_pidana WHERE id=?').run(id);
    db.prepare(`
      DELETE FROM board_pidana
      WHERE kategori = ?
        AND LOWER(TRIM(jenis)) = LOWER(TRIM(?))
        AND id <> ?
    `).run(kategori, jenis, Number(duplicate.id));
  } else {
    db.prepare('UPDATE board_pidana SET kategori=?, jenis=?, jumlah=? WHERE id=?').run(kategori, jenis, jumlah, id);
  }

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
  setAppSetting('board_registrasi_hunian_last_input_date', getTodayYmd());
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
  setAppSetting('board_registrasi_hunian_last_input_date', getTodayYmd());
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

  if (req.path.startsWith('/pengaduan-masyarakat')) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.redirect('/pengaduan-masyarakat?error=Ukuran+dokumentasi+maksimal+8MB');
    }
    if (err.message && err.message.includes('File harus berupa gambar atau PDF')) {
      return res.redirect('/pengaduan-masyarakat?error=Dokumentasi+harus+berupa+gambar+atau+PDF');
    }
    return res.redirect('/pengaduan-masyarakat?error=Gagal+upload+dokumentasi');
  }

  if (req.path.startsWith('/admin/pengaduan')) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.redirect('/admin/pengaduan?error=Ukuran+dokumentasi+maksimal+8MB');
    }
    if (err.message && err.message.includes('File harus berupa gambar atau PDF')) {
      return res.redirect('/admin/pengaduan?error=Dokumentasi+harus+berupa+gambar+atau+PDF');
    }
    return res.redirect('/admin/pengaduan?error=Gagal+proses+data+pengaduan');
  }

  if (req.path.startsWith('/admin/remisi')) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.redirect('/admin/remisi?error=Ukuran+file+Excel+maksimal+5MB');
    }
    if (err.message && err.message.includes('File harus berupa Excel')) {
      return res.redirect('/admin/remisi?error=File+harus+berupa+Excel');
    }
    return res.redirect('/admin/remisi?error=Gagal+memproses+import+remisi');
  }

  return next(err);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
  console.log(`🔐 Admin panel  : http://localhost:${PORT}/admin/login`);
  console.log(`   Default login: admin / admin123`);
});

const pengaduanOnlyApp = express();
pengaduanOnlyApp.use(express.static(path.join(__dirname, 'public')));
pengaduanOnlyApp.use((req, res, next) => {
  if (req.path === '/' || req.path === '') {
    return res.redirect('/pengaduan-masyarakat');
  }
  if (req.path.startsWith('/pengaduan-masyarakat')) {
    return app(req, res, next);
  }
  return res.status(404).send('Halaman tidak tersedia pada port pengaduan.');
});

pengaduanOnlyApp.listen(PENGADUAN_PORT, () => {
  console.log(`📢 Port pengaduan aktif di http://localhost:${PENGADUAN_PORT}/pengaduan-masyarakat`);
});
