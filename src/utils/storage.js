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

/** Delete a single run by its battleDate. */
export function deleteLocalRun(battleDate) {
  const runs = getLocalRuns().filter((r) => r.battleDate !== battleDate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  return runs;
}

/** Update a single run's raw data by battleDate. */
export function updateLocalRun(originalBattleDate, updatedRun) {
  const runs = getLocalRuns();
  const idx = runs.findIndex((r) => r.battleDate === originalBattleDate);
  if (idx !== -1) {
    runs[idx] = { ...updatedRun, savedAt: new Date().toISOString() };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  return runs;
}

/** Export all runs as a JSON string. */
export function exportLocalRuns() {
  return JSON.stringify(getLocalRuns(), null, 2);
}

/** Import runs from a JSON string. Deduplicates by battleDate. Returns count of imported runs. */
export function importLocalRuns(jsonString) {
  const incoming = JSON.parse(jsonString);
  if (!Array.isArray(incoming)) throw new Error('Invalid format: expected an array');
  const existing = getLocalRuns();
  const dateSet = new Set(existing.map((r) => r.battleDate));
  let added = 0;
  for (const run of incoming) {
    if (!run.battleDate) continue;
    if (dateSet.has(run.battleDate)) continue;
    existing.push(run);
    dateSet.add(run.battleDate);
    added++;
  }
  existing.sort((a, b) => new Date(b.battleDate) - new Date(a.battleDate));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return added;
}

/** Clear all local runs. */
export function clearLocalRuns() {
  localStorage.removeItem(STORAGE_KEY);
}
