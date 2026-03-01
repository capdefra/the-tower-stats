import { useState, useRef } from 'react';
import { formatNumber, formatSeconds, parseBattleReport } from '../utils/parser';
import EnemyIcon from './EnemyIcon';
import {
  getLocalRuns,
  clearLocalRuns,
  deleteLocalRun,
  updateLocalRun,
  exportLocalRuns,
  importLocalRuns,
} from '../utils/storage';

export default function LocalHistory({ refreshKey, onChanged }) {
  const runs = getLocalRuns();
  const [menuOpen, setMenuOpen] = useState(null); // battleDate of open menu
  const [editing, setEditing] = useState(null); // { battleDate, json }
  const [editError, setEditError] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef(null);

  function handleClear() {
    if (!confirm('Delete ALL runs? This cannot be undone.')) return;
    clearLocalRuns();
    onChanged?.();
  }

  function handleDelete(battleDate) {
    deleteLocalRun(battleDate);
    setMenuOpen(null);
    onChanged?.();
  }

  function openEdit(run) {
    setEditing({ battleDate: run.battleDate, json: JSON.stringify(run, null, 2) });
    setEditError(null);
    setMenuOpen(null);
  }

  function saveEdit() {
    try {
      const updated = JSON.parse(editing.json);
      if (!updated.battleDate) {
        setEditError('battleDate is required');
        return;
      }
      updateLocalRun(editing.battleDate, updated);
      setEditing(null);
      onChanged?.();
    } catch (e) {
      setEditError('Invalid JSON: ' + e.message);
    }
  }

  function handleExport() {
    const data = exportLocalRuns();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tower-stats-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = importLocalRuns(ev.target.result);
        // Handle both old (number) and new ({ runsAdded, milestonesAdded }) return formats
        if (typeof result === 'object') {
          let msg = `Imported ${result.runsAdded} new run${result.runsAdded !== 1 ? 's' : ''}`;
          if (result.milestonesAdded > 0) {
            msg += ` and ${result.milestonesAdded} milestone${result.milestonesAdded !== 1 ? 's' : ''}`;
          }
          setImportMsg(msg + '.');
        } else {
          setImportMsg(`Imported ${result} new run${result !== 1 ? 's' : ''}.`);
        }
        onChanged?.();
      } catch (err) {
        setImportMsg('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  if (runs.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500 text-sm italic">
          No local runs yet. Paste a battle report to get started.
        </p>
        {/* Still show import when empty */}
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 transition-colors"
          >
            Import Data
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
        {importMsg && (
          <p className={`text-sm ${importMsg.startsWith('Import failed') ? 'text-red-400' : 'text-emerald-400'}`}>
            {importMsg}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-gray-300">
          History ({runs.length} run{runs.length !== 1 ? 's' : ''})
        </h3>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleExport}
            className="cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 transition-colors"
          >
            Import
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button
            onClick={handleClear}
            className="cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-red-800/50 text-red-400 hover:text-red-300 hover:border-red-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {importMsg && (
        <p className={`text-sm ${importMsg.startsWith('Import failed') ? 'text-red-400' : 'text-emerald-400'}`}>
          {importMsg}
        </p>
      )}

      {/* Mobile: card layout */}
      <div className="space-y-2 sm:hidden">
        {runs.map((run, i) => (
          <div
            key={run.battleDate || i}
            className="rounded-lg bg-gray-800/50 border border-gray-700/50 p-3 space-y-1 relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{run.battleDate || '—'}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{formatSeconds(run.realTimeSeconds)}</span>
                <DotMenu
                  isOpen={menuOpen === run.battleDate}
                  onToggle={() => setMenuOpen(menuOpen === run.battleDate ? null : run.battleDate)}
                  onEdit={() => openEdit(run)}
                  onDelete={() => handleDelete(run.battleDate)}
                />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-amber-400 font-bold text-lg">T{run.tier ?? '?'}</span>
              <span className="text-gray-100 font-semibold">Wave {run.wave ?? '—'}</span>
              {run.killedBy && (
                <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                  by <EnemyIcon name={run.killedBy} size={28} />
                </span>
              )}
            </div>
            <div className="flex gap-4 text-xs text-gray-300">
              <span>Coins: <span className="text-gray-100">{formatNumber(run.coinsEarned)}</span></span>
              <span>Cells: <span className="text-gray-100">{formatNumber(run.cellsEarned)}</span></span>
              <span>Elites: <span className="text-gray-100">{run.totalElites ?? '—'}</span></span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden sm:block">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Tier</th>
              <th className="py-2 pr-3">Wave</th>
              <th className="py-2 pr-3">Coins</th>
              <th className="py-2 pr-3">Cells</th>
              <th className="py-2 pr-3">Elites</th>
              <th className="py-2 pr-3">Real Time</th>
              <th className="py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, i) => (
              <tr
                key={run.battleDate || i}
                className="border-b border-gray-800 hover:bg-gray-800/40"
              >
                <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">
                  {run.battleDate || '—'}
                </td>
                <td className="py-2 pr-3 text-amber-400 font-semibold">
                  {run.tier ?? '—'}
                </td>
                <td className="py-2 pr-3">{run.wave ?? '—'}</td>
                <td className="py-2 pr-3">{formatNumber(run.coinsEarned)}</td>
                <td className="py-2 pr-3">{formatNumber(run.cellsEarned)}</td>
                <td className="py-2 pr-3">{run.totalElites ?? '—'}</td>
                <td className="py-2 pr-3">{formatSeconds(run.realTimeSeconds)}</td>
                <td className="py-2 relative">
                  <DotMenu
                    isOpen={menuOpen === run.battleDate}
                    onToggle={() => setMenuOpen(menuOpen === run.battleDate ? null : run.battleDate)}
                    onEdit={() => openEdit(run)}
                    onDelete={() => handleDelete(run.battleDate)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-100">Edit Raw Data</h3>
              <button
                onClick={() => setEditing(null)}
                className="cursor-pointer text-gray-400 hover:text-gray-200 text-lg"
              >
                ×
              </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col gap-3">
              <textarea
                value={editing.json}
                onChange={(e) => setEditing({ ...editing, json: e.target.value })}
                className="flex-1 min-h-[200px] w-full rounded-lg bg-gray-800 border border-gray-700 text-gray-100 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
              {editError && <p className="text-red-400 text-xs">{editError}</p>}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
              <button
                onClick={() => setEditing(null)}
                className="cursor-pointer px-4 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-300 hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="cursor-pointer px-4 py-1.5 text-sm rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DotMenu({ isOpen, onToggle, onEdit, onDelete }) {
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="cursor-pointer p-1 rounded hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div className="absolute z-20 right-0 mt-1 w-36 rounded-lg bg-gray-800 border border-gray-700 shadow-xl overflow-hidden">
            <button
              onClick={onEdit}
              className="cursor-pointer w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Data
            </button>
            <button
              onClick={onDelete}
              className="cursor-pointer w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
