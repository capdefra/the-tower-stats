import { useState, useEffect } from 'react';
import LAB_RESEARCH from '../data/labResearch';
import { getMilestones, saveMilestone, deleteMilestone } from '../utils/storage';

const SPEED_MULTIPLIERS = [1, 1.5, 2, 3, 4, 5, 6, 7, 8];

/* ─── Helpers ─── */

function formatCountdown(completionTimestamp) {
  const now = Date.now();
  const target = new Date(completionTimestamp).getTime();
  const diff = target - now;

  if (diff <= 0) return { text: 'Completed', completed: true };

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);

  return { text: parts.join(' '), completed: false };
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/* ─── Searchable Research Picker ─── */

function ResearchPicker({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered =
    search.trim() === ''
      ? LAB_RESEARCH
      : LAB_RESEARCH.map((group) => ({
          category: group.category,
          items: group.items.filter((item) =>
            item.toLowerCase().includes(search.toLowerCase())
          ),
        })).filter((group) => group.items.length > 0);

  function handleSelect(category, item) {
    onSelect({ category, name: item });
    setOpen(false);
    setSearch('');
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer w-full flex items-center justify-between rounded-lg border bg-gray-800 border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 px-3 py-2 text-sm transition-colors"
      >
        <span className={selected ? 'text-gray-100' : 'text-gray-500'}>
          {selected ? selected.name : 'Select a research...'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg bg-gray-800 border border-gray-700 shadow-xl left-0">
            {/* Search input */}
            <div className="sticky top-0 z-10 bg-gray-800 p-2 border-b border-gray-700">
              <input
                type="text"
                placeholder="Search research..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md bg-gray-900 border border-gray-600 text-gray-100 px-2.5 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
            </div>

            {/* Grouped items */}
            {filtered.map((group) => (
              <div key={group.category}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-800/90 sticky top-[41px] z-[5]">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  const isActive =
                    selected?.name === item && selected?.category === group.category;
                  return (
                    <button
                      key={`${group.category}-${item}`}
                      onClick={() => handleSelect(group.category, item)}
                      className={`cursor-pointer w-full text-left px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-amber-600/20 text-amber-300'
                          : 'text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-gray-500 italic text-center">No results found</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Lab Research Section ─── */

function LabResearchSection({ onSaved }) {
  const [selected, setSelected] = useState(null);
  const [days, setDays] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [multiplier, setMultiplier] = useState(1);
  const [milestones, setMilestones] = useState(() => getMilestones());
  const [, setTick] = useState(0);

  // Refresh milestones list
  function refresh() {
    setMilestones(getMilestones());
    onSaved?.();
  }

  // Live countdown ticker — every 60s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const hasTime = !!(parseInt(days) || parseInt(hours) || parseInt(minutes));
  const canSave = selected && hasTime;

  function handleSave() {
    if (!canSave) return;

    const d = parseInt(days) || 0;
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const totalMs = ((d * 24 * 60) + (h * 60) + m) * 60 * 1000;
    const adjustedMs = totalMs / multiplier;
    const completionTimestamp = new Date(Date.now() + adjustedMs).toISOString();

    saveMilestone({
      type: 'lab_research',
      category: selected.category,
      name: selected.name,
      enteredTime: { days: d, hours: h, minutes: m },
      multiplier,
      completionTimestamp,
    });

    // Reset form
    setSelected(null);
    setDays('');
    setHours('');
    setMinutes('');
    setMultiplier(1);
    refresh();
  }

  function handleDelete(id) {
    deleteMilestone(id);
    refresh();
  }

  const labMilestones = milestones.filter((m) => m.type === 'lab_research');

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="rounded-lg bg-gray-800/60 border border-gray-700 p-4 space-y-3">
        {/* Research picker */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Research</label>
          <ResearchPicker selected={selected} onSelect={setSelected} />
        </div>

        {/* Time inputs + multiplier */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Days</label>
            <input
              type="number"
              min="0"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-gray-100 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hours</label>
            <input
              type="number"
              min="0"
              max="23"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-gray-100 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Minutes</label>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-gray-100 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Speed</label>
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="cursor-pointer w-full rounded-lg border bg-gray-800 border-gray-700 text-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              {SPEED_MULTIPLIERS.map((m) => (
                <option key={m} value={m}>
                  {m}x
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="cursor-pointer w-full sm:w-auto px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
        >
          Save Milestone
        </button>
      </div>

      {/* Milestone history */}
      {labMilestones.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            History
          </h3>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {labMilestones.map((ms) => {
              const countdown = formatCountdown(ms.completionTimestamp);
              return (
                <div
                  key={ms.id}
                  className="rounded-lg bg-gray-800/50 border border-gray-700/50 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {ms.category}
                    </span>
                    <button
                      onClick={() => handleDelete(ms.id)}
                      className="cursor-pointer text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-gray-100 font-semibold text-sm">{ms.name}</div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">{ms.multiplier}x speed</span>
                    <span
                      className={
                        countdown.completed
                          ? 'text-emerald-400 font-semibold'
                          : 'text-amber-400'
                      }
                    >
                      {countdown.completed ? '✓ ' : '⏳ '}
                      {countdown.text}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {countdown.completed ? 'Completed' : 'ETA'}:{' '}
                    {formatDate(ms.completionTimestamp)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
                  <th className="py-2 pr-3">Research</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Speed</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">ETA</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {labMilestones.map((ms) => {
                  const countdown = formatCountdown(ms.completionTimestamp);
                  return (
                    <tr
                      key={ms.id}
                      className="border-b border-gray-800 hover:bg-gray-800/40"
                    >
                      <td className="py-2 pr-3 text-gray-100 font-medium">{ms.name}</td>
                      <td className="py-2 pr-3 text-gray-400 text-xs">{ms.category}</td>
                      <td className="py-2 pr-3 text-gray-300">{ms.multiplier}x</td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            countdown.completed
                              ? 'text-emerald-400 font-semibold'
                              : 'text-amber-400'
                          }
                        >
                          {countdown.completed ? '✓ Completed' : `⏳ ${countdown.text}`}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs whitespace-nowrap">
                        <span className={countdown.completed ? 'text-emerald-400' : 'text-gray-400'}>
                          {formatDate(ms.completionTimestamp)}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDelete(ms.id)}
                          className="cursor-pointer text-xs text-gray-500 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Coming Soon ─── */

function ComingSoonPlaceholder() {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-gray-500 italic">Coming Soon</p>
    </div>
  );
}

/* ─── Sub-tab definitions ─── */

const MILESTONE_TABS = [
  { key: 'lab_research', label: 'Lab Research' },
  { key: 'workshop', label: 'Workshop' },
  { key: 'ultimate_weapons', label: 'Ultimate Weapons' },
  { key: 'cards', label: 'Cards' },
];

/* ─── Main Component ─── */

export default function Milestones({ refreshKey, onChanged }) {
  const [activeTab, setActiveTab] = useState('lab_research');

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {MILESTONE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer shrink-0 px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'lab_research' && <LabResearchSection onSaved={onChanged} />}
      {activeTab === 'workshop' && <ComingSoonPlaceholder />}
      {activeTab === 'ultimate_weapons' && <ComingSoonPlaceholder />}
      {activeTab === 'cards' && <ComingSoonPlaceholder />}
    </div>
  );
}
