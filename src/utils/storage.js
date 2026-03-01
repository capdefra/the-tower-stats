const STORAGE_KEY = 'tower-stats-history';
const MILESTONES_KEY = 'tower-stats-milestones';

/* ─── Runs ─── */

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

/** Clear all local runs. */
export function clearLocalRuns() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ─── Milestones ─── */

/** Get all locally saved milestones (newest first by savedAt). */
export function getMilestones() {
  try {
    const raw = localStorage.getItem(MILESTONES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a new milestone to local storage.
 * Shape: { type, category, name, enteredTime, multiplier, completionTimestamp }
 * Adds id + savedAt automatically.
 */
export function saveMilestone(milestone) {
  const milestones = getMilestones();
  const entry = {
    ...milestone,
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
  };
  milestones.unshift(entry);
  localStorage.setItem(MILESTONES_KEY, JSON.stringify(milestones));
  return entry;
}

/** Delete a milestone by its id. */
export function deleteMilestone(id) {
  const milestones = getMilestones().filter((m) => m.id !== id);
  localStorage.setItem(MILESTONES_KEY, JSON.stringify(milestones));
  return milestones;
}

/** Clear all milestones. */
export function clearMilestones() {
  localStorage.removeItem(MILESTONES_KEY);
}

/* ─── Export / Import (runs + milestones) ─── */

/** Export all data (runs + milestones) as a JSON string. */
export function exportLocalRuns() {
  return JSON.stringify(
    {
      version: 1,
      runs: getLocalRuns(),
      milestones: getMilestones(),
    },
    null,
    2
  );
}

/**
 * Import data from a JSON string.
 * Handles both legacy (bare array of runs) and new ({ version, runs, milestones }) formats.
 * Returns { runsAdded, milestonesAdded }.
 */
export function importLocalRuns(jsonString) {
  const parsed = JSON.parse(jsonString);

  let incomingRuns = [];
  let incomingMilestones = [];

  if (Array.isArray(parsed)) {
    // Legacy format: bare array of runs
    incomingRuns = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // New format: { version, runs, milestones }
    incomingRuns = Array.isArray(parsed.runs) ? parsed.runs : [];
    incomingMilestones = Array.isArray(parsed.milestones) ? parsed.milestones : [];
  } else {
    throw new Error('Invalid format: expected an array or an object with runs/milestones');
  }

  // Import runs (dedup by battleDate)
  let runsAdded = 0;
  if (incomingRuns.length > 0) {
    const existing = getLocalRuns();
    const dateSet = new Set(existing.map((r) => r.battleDate));
    for (const run of incomingRuns) {
      if (!run.battleDate) continue;
      if (dateSet.has(run.battleDate)) continue;
      existing.push(run);
      dateSet.add(run.battleDate);
      runsAdded++;
    }
    existing.sort((a, b) => new Date(b.battleDate) - new Date(a.battleDate));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }

  // Import milestones (dedup by id)
  let milestonesAdded = 0;
  if (incomingMilestones.length > 0) {
    const existing = getMilestones();
    const idSet = new Set(existing.map((m) => m.id));
    for (const ms of incomingMilestones) {
      if (!ms.id) continue;
      if (idSet.has(ms.id)) continue;
      existing.push(ms);
      idSet.add(ms.id);
      milestonesAdded++;
    }
    existing.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    localStorage.setItem(MILESTONES_KEY, JSON.stringify(existing));
  }

  return { runsAdded, milestonesAdded };
}
