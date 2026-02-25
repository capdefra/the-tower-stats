import { formatNumber, formatSeconds } from '../utils/parser';
import { getLocalRuns, clearLocalRuns } from '../utils/storage';

export default function LocalHistory({ refreshKey }) {
  const runs = getLocalRuns();

  if (runs.length === 0) {
    return (
      <p className="text-gray-500 text-sm italic">
        No local runs yet. Paste a battle report to get started.
      </p>
    );
  }

  function handleClear() {
    clearLocalRuns();
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          History ({runs.length} runs)
        </h3>
        <button
          onClick={handleClear}
          className="text-xs text-red-400 hover:text-red-300 cursor-pointer transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Mobile: card layout */}
      <div className="space-y-2 sm:hidden">
        {runs.map((run, i) => (
          <div
            key={run.id || i}
            className="rounded-lg bg-gray-800/50 border border-gray-700/50 p-3 space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{run.battleDate || '—'}</span>
              <span className="text-xs text-gray-500">{formatSeconds(run.realTimeSeconds)}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-amber-400 font-bold text-lg">T{run.tier ?? '?'}</span>
              <span className="text-gray-100 font-semibold">Wave {run.wave ?? '—'}</span>
              {run.killedBy && (
                <span className="text-xs text-gray-500">by {run.killedBy}</span>
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
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Tier</th>
              <th className="py-2 pr-3">Wave</th>
              <th className="py-2 pr-3">Coins</th>
              <th className="py-2 pr-3">Cells</th>
              <th className="py-2 pr-3">Elites</th>
              <th className="py-2">Real Time</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, i) => (
              <tr
                key={run.id || i}
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
                <td className="py-2">{formatSeconds(run.realTimeSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
