// ============================================================
// FundMate – Utility Functions
// Pure vanilla JS, no dependencies. Indonesian locale.
// ============================================================

// ── Currency Formatting ─────────────────────────────────────

/**
 * Format amount as shortened IDR string.
 *   0         → "Rp0"
 *   1500      → "Rp1,5K"
 *   25000     → "Rp25K"
 *   1500000   → "Rp1,5Jt"
 *   15000000  → "Rp15Jt"
 */
export function formatCurrency(amount) {
  if (amount == null) return 'Rp0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs === 0) return 'Rp0';

  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    return `${sign}Rp${formatShortNumber(val)}M`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    return `${sign}Rp${formatShortNumber(val)}Jt`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    return `${sign}Rp${formatShortNumber(val)}K`;
  }

  return `${sign}Rp${formatShortNumber(abs)}`;
}

/**
 * Helper: format a shortened number using comma as decimal separator.
 *   1.5 → "1,5"   25.0 → "25"   1.25 → "1,25"
 */
function formatShortNumber(n) {
  // Round to 1 decimal
  const rounded = Math.round(n * 10) / 10;
  if (Number.isInteger(rounded)) return rounded.toString();
  return rounded.toString().replace('.', ',');
}

/**
 * Format amount as full IDR string with dot thousand‑separators.
 *   1500000 → "Rp1.500.000"
 */
export function formatCurrencyFull(amount) {
  if (amount == null) return 'Rp0';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}Rp${formatted}`;
}

// ── Date / Time Formatting ──────────────────────────────────

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
];

/** Get Indonesian month name (0‑indexed). */
export function getMonthName(monthIndex) {
  return MONTH_NAMES[monthIndex] || '';
}

/** Get Indonesian day name (0 = Minggu). */
export function getDayName(dayIndex) {
  return DAY_NAMES[dayIndex] || '';
}

/** Normalise any date‑like value to a JS Date. */
function toDate(value) {
  if (!value) return new Date();
  // Firestore Timestamp
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}

/** "27 Mei 2026" */
export function formatDate(date) {
  const d = toDate(date);
  return `${d.getDate()} ${getMonthName(d.getMonth())} ${d.getFullYear()}`;
}

/** "27 Mei" */
export function formatDateShort(date) {
  const d = toDate(date);
  return `${d.getDate()} ${getMonthName(d.getMonth())}`;
}

/** "10:30" */
export function formatTime(date) {
  const d = toDate(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Relative date label in Indonesian.
 *   "Hari ini", "Kemarin", "2 hari lalu", …, "27 Mei 2026"
 */
export function formatRelativeDate(date) {
  const d = toDate(date);
  const now = new Date();

  // Strip time for day‑level comparison
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = today - target;
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} hari lalu`;
  return formatDate(d);
}

// ── Token & Share‑Link Helpers ──────────────────────────────

const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Generate an 8‑char alphanumeric token. */
export function generateToken() {
  let token = '';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    token += TOKEN_CHARS[array[i] % TOKEN_CHARS.length];
  }
  return token;
}

/** Build a shareable URL containing the household ID. */
export function generateShareLink(householdId) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?join=${encodeURIComponent(householdId)}`;
}

/** Extract household ID from a share URL (or current location). */
export function parseShareLink(url) {
  try {
    const u = new URL(url || window.location.href);
    return u.searchParams.get('join') || null;
  } catch {
    return null;
  }
}

// ── PIN Hashing (lightweight, not cryptographic) ────────────

/** Simple hash for PIN storage. */
export function hashPin(pin) {
  return btoa(encodeURIComponent(pin));
}

/** Compare a plain PIN against a stored hash. */
export function verifyPinHash(pin, hash) {
  return hashPin(pin) === hash;
}

// ── Greeting ────────────────────────────────────────────────

/**
 * Time‑based greeting in Indonesian.
 *   04‑10  → Selamat Pagi
 *   10‑15  → Selamat Siang
 *   15‑18  → Selamat Sore
 *   else   → Selamat Malam
 */
export function getGreeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 10) return 'Selamat Pagi';
  if (h >= 10 && h < 15) return 'Selamat Siang';
  if (h >= 15 && h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

// ── Debounce ────────────────────────────────────────────────

/** Standard debounce. Returns a wrapper that delays `fn` by `delay` ms. */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ── Transaction Grouping ────────────────────────────────────

/**
 * Group an array of transaction objects by their date.
 * Each transaction must have a `date` field (Firestore Timestamp, Date, or ISO string).
 *
 * Returns an array of { label, dateKey, transactions } sorted newest‑first.
 *   label     → relative date string ("Hari ini", "Kemarin", "27 Mei 2026")
 *   dateKey   → "YYYY-MM-DD"
 *   transactions → [ … ]
 */
export function groupByDate(transactions) {
  if (!transactions || transactions.length === 0) return [];

  const map = {};

  for (const tx of transactions) {
    const d = toDate(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!map[key]) {
      map[key] = {
        label: formatRelativeDate(d),
        dateKey: key,
        transactions: [],
      };
    }
    map[key].transactions.push(tx);
  }

  // Sort groups newest‑first
  return Object.values(map).sort((a, b) => (b.dateKey > a.dateKey ? 1 : -1));
}
