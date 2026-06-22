export const DEFAULT_PROFILE_ID = 'default';

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeProfileId(profileId) {
  return profileId || DEFAULT_PROFILE_ID;
}

export function scopedDateId(profileId, date = todayKey()) {
  return `${normalizeProfileId(profileId)}:${date}`;
}

export function filterByProfile(records = [], profileId = DEFAULT_PROFILE_ID) {
  const activeProfileId = normalizeProfileId(profileId);
  return (records || []).filter((record) => normalizeProfileId(record.profileId) === activeProfileId);
}

export function sortByDateDesc(records = [], field = 'date') {
  return [...(records || [])].sort((a, b) => String(b?.[field] || '').localeCompare(String(a?.[field] || '')));
}

export async function getProfileRecords(db, storeName, profileId) {
  return filterByProfile(await db.getAll(storeName), profileId);
}

export async function getScopedDailyRecord(db, storeName, profileId, date = todayKey(), defaults = {}) {
  const activeProfileId = normalizeProfileId(profileId);
  const id = scopedDateId(activeProfileId, date);
  return (await db.get(storeName, id)) || {
    id,
    profileId: activeProfileId,
    date,
    ...defaults
  };
}
