import { useState } from 'react';
import { parseBattleReport, formatNumber, formatSeconds } from '../utils/parser';
import { saveLocalRun } from '../utils/storage';

export default function PasteInput({ onSaved }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    setError(null);
    setSuccess(false);
    const result = parseBattleReport(val);
    setParsed(result);
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { wasDuplicate } = saveLocalRun(parsed);
      setSuccess(wasDuplicate ? 'duplicate' : 'new');
      setText('');
      setParsed(null);
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="battle-report"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Paste Battle Report
        </label>
        <textarea
          id="battle-report"
          rows={6}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-gray-100 p-3 text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
          placeholder="Paste your full Battle Report text here..."
          value={text}
          onChange={handleChange}
        />
      </div>

      {/* Live Preview Card */}
      {parsed && (
        <div className="rounded-lg bg-gray-800/60 border border-gray-700 p-4 space-y-3">
          <h3 className="text-amber-400 font-semibold text-sm uppercase tracking-wider">
            Preview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Tier" value={parsed.tier} />
            <Stat label="Wave" value={parsed.wave} />
            <Stat label="Killed By" value={parsed.killedBy || '—'} />
            <Stat label="Coins" value={formatNumber(parsed.coinsEarned)} />
            <Stat label="Cells" value={formatNumber(parsed.cellsEarned)} />
            <Stat label="Total Elites" value={parsed.totalElites} />
            <Stat label="Game Time" value={formatSeconds(parsed.gameTimeSeconds)} />
            <Stat label="Real Time" value={formatSeconds(parsed.realTimeSeconds)} />
            <Stat label="Damage Dealt" value={formatNumber(parsed.damageDealt)} />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-2 w-full sm:w-auto cursor-pointer px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
          >
            {saving ? 'Saving...' : 'Save Run'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">Error: {error}</p>
      )}
      {success === 'new' && (
        <p className="text-emerald-400 text-sm">Run saved successfully!</p>
      )}
      {success === 'duplicate' && (
        <p className="text-amber-400 text-sm">Duplicate run detected — existing entry updated.</p>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-gray-100 font-semibold">{value ?? '—'}</p>
    </div>
  );
}
