import { useState, useRef } from 'react';
import { parseBattleReport, formatNumber, formatSeconds } from '../utils/parser';
import { saveLocalRun } from '../utils/storage';

export default function PasteInput({ onSaved }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const textareaRef = useRef(null);

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    setError(null);
    setSuccess(false);
    const result = parseBattleReport(val);
    setParsed(result);
  }

  /** Auto-save when the user pastes text directly into the textarea. */
  function handlePaste(e) {
    const pasted = e.clipboardData?.getData('text');
    if (!pasted?.trim()) return;

    e.preventDefault();
    setText(pasted);
    setError(null);
    setSuccess(false);
    const result = parseBattleReport(pasted);
    setParsed(result);
  }

  async function handleSave() {
    if (!parsed) return;
    if (!parsed.battleDate) {
      setError('Battle report is missing a date/time. Cannot import without it.');
      return;
    }
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

  async function handleClipboardImport() {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        setError('Clipboard is empty.');
        return;
      }
      setText(clipText);
      setError(null);
      setSuccess(false);
      const result = parseBattleReport(clipText);
      setParsed(result);
    } catch {
      // Clipboard API not available — focus textarea so user can paste manually
      textareaRef.current?.focus();
      setError(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="battle-report"
            className="block text-sm font-medium text-gray-300"
          >
            Paste Battle Report
          </label>
          <button
            onClick={handleClipboardImport}
            className="cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 transition-colors"
          >
            📋 Import from Clipboard
          </button>
        </div>
        <textarea
          ref={textareaRef}
          id="battle-report"
          rows={6}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-gray-100 p-3 text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
          placeholder="Paste your full Battle Report text here..."
          value={text}
          onChange={handleChange}
          onPaste={handlePaste}
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

          {!parsed.battleDate && (
            <p className="text-red-400 text-xs mt-1">
              ⚠ Missing battle date/time — this report cannot be saved.
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !parsed.battleDate}
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
