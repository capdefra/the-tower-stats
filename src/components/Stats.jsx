import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getLocalRuns } from '../utils/storage';
import { formatNumber } from '../utils/parser';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/* ─── Constants ─── */

const PERIODS = ['Daily', 'Weekly', 'Monthly'];

const STAT_METRICS = [
  { key: 'coinsEarned', label: 'Coins', format: formatNumber },
  { key: 'coinsPerHour', label: 'Coins/Hour', format: formatNumber },
  { key: 'cellsEarned', label: 'Cells', format: formatNumber },
  { key: 'rerollShardsEarned', label: 'Reroll Shards', format: formatNumber },
];

const AXIS_COLORS = { left: '#f59e0b', right: '#3b82f6' };

/* ─── Aggregation helpers ─── */

function toDate(dateStr) {
  return new Date(dateStr);
}

function getDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekKey(d) {
  const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNum = tmp.getDay() || 7;
  tmp.setDate(tmp.getDate() + 4 - dayNum);
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMonthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function groupKey(dateStr, period) {
  const d = toDate(dateStr);
  if (period === 'Weekly') return getWeekKey(d);
  if (period === 'Monthly') return getMonthKey(d);
  return getDayKey(d);
}

function formatLabel(key, period) {
  if (period === 'Daily') {
    const [, m, day] = key.split('-');
    const d = new Date(2000, Number(m) - 1, Number(day));
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (period === 'Monthly') {
    const [y, m] = key.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
  return key;
}

function aggregateRuns(runs, period) {
  const valid = runs
    .filter((r) => r.battleDate != null)
    .sort((a, b) => new Date(a.battleDate) - new Date(b.battleDate));

  const groups = new Map();

  for (const run of valid) {
    const key = groupKey(run.battleDate, period);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }

  const result = [];
  for (const [key, groupRuns] of groups) {
    const entry = { groupKey: key };
    for (const metric of STAT_METRICS) {
      const values = groupRuns
        .map((r) => r[metric.key])
        .filter((v) => v != null && !isNaN(v));
      entry[metric.key] =
        values.length > 0
          ? values.reduce((sum, v) => sum + Number(v), 0) / values.length
          : null;
    }
    result.push(entry);
  }

  result.sort((a, b) => a.groupKey.localeCompare(b.groupKey));
  return result;
}

/* ─── Component ─── */

export default function Stats({ refreshKey }) {
  const [period, setPeriod] = useState('Daily');
  const [chartKeys, setChartKeys] = useState(['coinsEarned']);

  const runs = getLocalRuns();

  const aggregated = useMemo(
    () => aggregateRuns(runs, period),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, period]
  );

  function toggleChart(key) {
    setChartKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      if (prev.length < 2) return [...prev, key];
      return [key, prev[1]];
    });
  }

  function axisOf(key) {
    const idx = chartKeys.indexOf(key);
    if (idx === 0) return 'left';
    if (idx === 1) return 'right';
    return null;
  }

  /* ── Chart config ── */

  const leftMetric = STAT_METRICS.find((m) => m.key === chartKeys[0]);
  const rightMetric = chartKeys[1]
    ? STAT_METRICS.find((m) => m.key === chartKeys[1])
    : null;

  const datasets = [];
  if (leftMetric) {
    datasets.push({
      label: leftMetric.label,
      data: aggregated.map((d) =>
        d[leftMetric.key] != null ? Number(d[leftMetric.key]) : null
      ),
      borderColor: AXIS_COLORS.left,
      backgroundColor: AXIS_COLORS.left + '26',
      cubicInterpolationMode: 'monotone',
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: AXIS_COLORS.left,
      yAxisID: 'y',
      spanGaps: true,
    });
  }
  if (rightMetric) {
    datasets.push({
      label: rightMetric.label,
      data: aggregated.map((d) =>
        d[rightMetric.key] != null ? Number(d[rightMetric.key]) : null
      ),
      borderColor: AXIS_COLORS.right,
      backgroundColor: AXIS_COLORS.right + '26',
      cubicInterpolationMode: 'monotone',
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: AXIS_COLORS.right,
      yAxisID: 'y1',
      spanGaps: true,
    });
  }

  const chartData = {
    labels: aggregated.map((d) => formatLabel(d.groupKey, period)),
    datasets,
  };
  const chartMetrics = [leftMetric, rightMetric].filter(Boolean);

  const xLabel =
    period === 'Daily' ? 'Date' : period === 'Weekly' ? 'Week' : 'Month';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const m = chartMetrics[ctx.datasetIndex];
            return m ? `${m.label}: ${m.format(ctx.parsed.y)}` : '';
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: xLabel,
          color: '#9ca3af',
          font: { size: 11 },
        },
        ticks: { color: '#9ca3af', maxRotation: 45, font: { size: 10 } },
        grid: { color: 'rgba(75,85,99,0.3)' },
      },
      y: {
        display: !!leftMetric,
        position: 'left',
        title: {
          display: true,
          text: leftMetric?.label ?? '',
          color: AXIS_COLORS.left,
          font: { size: 11, weight: 'bold' },
        },
        ticks: {
          color: AXIS_COLORS.left,
          callback: (v) => formatNumber(v),
          font: { size: 10 },
        },
        grid: { color: 'rgba(75,85,99,0.3)' },
      },
      y1: {
        display: !!rightMetric,
        position: 'right',
        title: {
          display: true,
          text: rightMetric?.label ?? '',
          color: AXIS_COLORS.right,
          font: { size: 11, weight: 'bold' },
        },
        ticks: {
          color: AXIS_COLORS.right,
          callback: (v) => formatNumber(v),
          font: { size: 10 },
        },
        grid: { drawOnChartArea: false },
      },
    },
  };

  /* ── Render ── */

  if (runs.length === 0) {
    return (
      <p className="text-gray-500 text-sm italic">
        No runs saved yet. Import a battle report first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-700 max-w-xs">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`cursor-pointer flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              period === p
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Metric selector pills */}
      <div className="flex gap-2 flex-wrap">
        {STAT_METRICS.map((m) => {
          const axis = axisOf(m.key);
          const color = axis ? AXIS_COLORS[axis] : null;
          return (
            <span
              key={m.key}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border cursor-pointer transition-colors ${
                axis
                  ? ''
                  : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
              }`}
              style={
                color
                  ? { borderColor: color, color, backgroundColor: color + '20' }
                  : undefined
              }
              onClick={() => toggleChart(m.key)}
            >
              {axis === 'left' && (
                <span className="text-[9px] font-bold opacity-70">L</span>
              )}
              {axis === 'right' && (
                <span className="text-[9px] font-bold opacity-70">R</span>
              )}
              {m.label}
            </span>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-56 sm:h-72 md:h-80">
        {aggregated.length > 1 && chartKeys.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
            {aggregated.length <= 1
              ? 'Need at least 2 data points to draw a chart.'
              : 'Select a metric to display.'}
          </div>
        )}
      </div>

      {/* Data table */}
      <div className="-mx-3 sm:mx-0 overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[500px]">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
              <th className="py-2 px-2">{xLabel}</th>
              {STAT_METRICS.map((m) => {
                const axis = axisOf(m.key);
                const color = axis ? AXIS_COLORS[axis] : '#9ca3af';
                return (
                  <th key={m.key} className="py-2 px-2" style={{ color }}>
                    {m.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[...aggregated].reverse().map((row) => (
              <tr
                key={row.groupKey}
                className="border-b border-gray-800 hover:bg-gray-800/40"
              >
                <td className="py-2 px-2 text-gray-300 whitespace-nowrap text-xs">
                  {formatLabel(row.groupKey, period)}
                </td>
                {STAT_METRICS.map((m) => {
                  const axis = axisOf(m.key);
                  const color = axis ? AXIS_COLORS[axis] : '#d1d5db';
                  return (
                    <td
                      key={m.key}
                      className="py-2 px-2 font-medium whitespace-nowrap"
                      style={{ color }}
                    >
                      {row[m.key] != null ? m.format(row[m.key]) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
