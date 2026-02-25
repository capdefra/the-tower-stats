const STORAGE_KEY = 'tower-stats-history';

/** Get all locally saved runs (newest first). */
export function getLocalRuns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a parsed run to local storage.
 * Deduplicates by battleDate — if a run with the same date exists, it gets overwritten.
 * Returns { runs, wasDuplicate }.
 */
export function saveLocalRun(parsed) {
  const runs = getLocalRuns();
  const existingIdx = parsed.battleDate
    ? runs.findIndex((r) => r.battleDate === parsed.battleDate)
    : -1;

  const entry = { ...parsed, savedAt: new Date().toISOString() };
  let wasDuplicate = false;

  if (existingIdx !== -1) {
    // Overwrite the existing run in place
    runs[existingIdx] = entry;
    wasDuplicate = true;
  } else {
    // Add new run at the top
    runs.unshift(entry);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  return { runs, wasDuplicate };
}

/** Clear all local runs. */
export function clearLocalRuns() {
  localStorage.removeItem(STORAGE_KEY);
}
