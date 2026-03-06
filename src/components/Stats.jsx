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
  Filler,
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
  Legend,
  Filler
);

/* ─── Constants ─── */

const PERIODS = ['Daily', 'Weekly', 'Monthly'];

const STAT_METRICS = [
  { key: 'coinsEarned', label: 'Coins', color: '#f59e0b', format: formatNumber },
  { key: 'coinsPerHour', label: 'Coins/Hour', color: '#3b82f6', format: formatNumber },
  { key: 'cellsEarned', label: 'Cells', color: '#10b981', format: formatNumber },
  { key: 'rerollShardsEarned', label: 'Reroll Shards', color: '#a855f7', format: formatNumber },
];

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

/* ─── Trend helpers ─── */

function computeTrend(aggregated, metricKey) {
  const values = aggregated
    .map((d) => d[metricKey])
    .filter((v) => v != null);

  if (values.length < 2) return null;

  const current = values[values.length - 1];
  const previous = values[values.length - 2];

  if (previous === 0) return null;

  const pctChange = ((current - previous) / Math.abs(previous)) * 100;
  return { current, previous, pctChange };
}

function computeOverallAvg(aggregated, metricKey) {
  const values = aggregated
    .map((d) => d[metricKey])
    .filter((v) => v != null);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/* ─── MetricSection component ─── */

function MetricSection({ metric, aggregated, period }) {
  const avg = computeOverallAvg(aggregated, metric.key);
  const trend = computeTrend(aggregated, metric.key);
  const hasData = aggregated.some((d) => d[metric.key] != null);

  const periodLabel =
    period === 'Daily' ? 'day' : period === 'Weekly' ? 'week' : 'month';

  const chartData = {
    labels: aggregated.map((d) => formatLabel(d.groupKey, period)),
    datasets: [
      {
        label: metric.label,
        data: aggregated.map((d) =>
          d[metric.key] != null ? Number(d[metric.key]) : null
        ),
        borderColor: metric.color,
        backgroundColor: metric.color + '18',
        fill: true,
        cubicInterpolationMode: 'monotone',
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: metric.color,
        spanGaps: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${metric.label}: ${metric.format(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', maxRotation: 45, font: { size: 10 } },
        grid: { color: 'rgba(75,85,99,0.3)' },
      },
      y: {
        ticks: {
          color: metric.color,
          callback: (v) => formatNumber(v),
          font: { size: 10 },
        },
        grid: { color: 'rgba(75,85,99,0.15)' },
      },
    },
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: metric.color }}
          />
          <h3 className="text-sm font-semibold text-gray-200">
            {metric.label}
          </h3>
        </div>
        {avg != null && (
          <span className="text-xs text-gray-400">
            Avg per {periodLabel}:{' '}
            <span className="font-medium text-gray-200">
              {metric.format(avg)}
            </span>
          </span>
        )}
      </div>

      {/* Chart */}
      {hasData && aggregated.length > 1 ? (
        <div className="h-44 sm:h-52">
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : (
        <div className="h-44 sm:h-52 flex items-center justify-center text-gray-500 text-sm italic">
          {!hasData
            ? 'No data for this metric.'
            : 'Need at least 2 data points to draw a chart.'}
        </div>
      )}

      {/* Trend */}
      {trend && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {trend.pctChange >= 0 ? (
            <span className="text-emerald-400">
              ↑ {Math.abs(trend.pctChange).toFixed(1)}%
            </span>
          ) : (
            <span className="text-red-400">
              ↓ {Math.abs(trend.pctChange).toFixed(1)}%
            </span>
          )}
          <span className="text-gray-500">
            vs previous {periodLabel}
          </span>
          <span className="text-gray-600 ml-auto">
            {metric.format(trend.previous)} → {metric.format(trend.current)}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─── */

export default function Stats({ refreshKey }) {
  const [period, setPeriod] = useState('Daily');

  const runs = getLocalRuns();

  const aggregated = useMemo(
    () => aggregateRuns(runs, period),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, period]
  );

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

      {/* Metric sections */}
      {STAT_METRICS.map((metric) => (
        <MetricSection
          key={metric.key}
          metric={metric}
          aggregated={aggregated}
          period={period}
        />
      ))}
    </div>
  );
}
