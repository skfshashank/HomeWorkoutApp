/**
 * Date utilities used across the app.
 */
export function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateStr(dateStr) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function today() {
  return getLocalDateStr();
}

export function daysBetween(date1, date2) {
  const d1 = typeof date1 === 'string' ? parseDateStr(date1) : new Date(date1);
  const d2 = typeof date2 === 'string' ? parseDateStr(date2) : new Date(date2);
  return Math.floor((d2 - d1) / 86400000);
}

export function dateSeed(date = new Date()) {
  // Deterministic seed from date for daily variety
  const str = getLocalDateStr(date);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function seededShuffle(array, seed) {
  const arr = [...array];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getWeekDates() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return getLocalDateStr(d);
  });
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
