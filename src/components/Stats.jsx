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

const RANGE_THUMB = `
  [&::-webkit-slider-thumb]:pointer-events-auto
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
  [&::-webkit-slider-thumb]:rounded-full
  [&::-webkit-slider-thumb]:bg-amber-400
  [&::-webkit-slider-thumb]:border-2
  [&::-webkit-slider-thumb]:border-gray-950
  [&::-webkit-slider-thumb]:cursor-grab
  [&::-webkit-slider-thumb]:active:cursor-grabbing
  [&::-webkit-slider-thumb]:hover:bg-amber-300
  [&::-moz-range-thumb]:pointer-events-auto
  [&::-moz-range-thumb]:appearance-none
  [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
  [&::-moz-range-thumb]:rounded-full
  [&::-moz-range-thumb]:bg-amber-400
  [&::-moz-range-thumb]:border-2
  [&::-moz-range-thumb]:border-gray-950
  [&::-moz-range-thumb]:cursor-grab
`.trim();

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

/* ─── Trend / stats helpers ─── */

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

function computeBest(aggregated, metricKey, period) {
  let best = null;
  for (const d of aggregated) {
    if (d[metricKey] != null && (best == null || d[metricKey] > best.value)) {
      best = { value: d[metricKey], label: formatLabel(d.groupKey, period) };
    }
  }
  return best;
}

/** Consecutive periods of increase or decrease from the end */
function computeStreak(aggregated, metricKey) {
  const values = aggregated
    .map((d) => d[metricKey])
    .filter((v) => v != null);
  if (values.length < 2) return null;

  const lastDir = values[values.length - 1] >= values[values.length - 2] ? 'up' : 'down';
  let count = 1;
  for (let i = values.length - 2; i > 0; i--) {
    const dir = values[i] >= values[i - 1] ? 'up' : 'down';
    if (dir === lastDir) count++;
    else break;
  }
  if (count < 2) return null;
  return { direction: lastDir, count };
}

/** Coefficient of variation — std dev as % of mean */
function computeConsistency(aggregated, metricKey) {
  const values = aggregated
    .map((d) => d[metricKey])
    .filter((v) => v != null);
  if (values.length < 2) return null;

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return null;

  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const cv = (Math.sqrt(variance) / Math.abs(mean)) * 100;
  return cv;
}

/** Simple linear regression → returns array of y-values for the trend line */
function computeLinearRegression(aggregated, metricKey) {
  const points = [];
  for (let i = 0; i < aggregated.length; i++) {
    const v = aggregated[i][metricKey];
    if (v != null) points.push({ x: i, y: v });
  }
  if (points.length < 2) return null;

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return aggregated.map((_, i) => slope * i + intercept);
}

/* ─── TimelineSlider component ─── */

function TimelineSlider({ length, rangeStart, rangeEnd, onChange, getLabel, periodName }) {
  if (length < 2) return null;

  const max = length - 1;

  function handleMinChange(e) {
    const val = parseInt(e.target.value, 10);
    onChange(Math.min(val, rangeEnd), rangeEnd);
  }

  function handleMaxChange(e) {
    const val = parseInt(e.target.value, 10);
    onChange(rangeStart, Math.max(val, rangeStart));
  }

  const leftPct = max > 0 ? (rangeStart / max) * 100 : 0;
  const rightPct = max > 0 ? ((max - rangeEnd) / max) * 100 : 0;
  const showing = rangeEnd - rangeStart + 1;

  return (
    <div className="space-y-0.5 px-1">
      {/* Date labels */}
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>{getLabel(rangeStart)}</span>
        {rangeStart !== rangeEnd && <span>{getLabel(rangeEnd)}</span>}
      </div>

      {/* Slider track */}
      <div className="relative h-6">
        {/* Full track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-gray-700 rounded-full" />

        {/* Active segment */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-amber-500/50 rounded-full"
          style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
        />

        {/* Min handle */}
        <input
          type="range"
          min={0}
          max={max}
          value={rangeStart}
          onChange={handleMinChange}
          className={`absolute w-full h-6 appearance-none bg-transparent pointer-events-none ${RANGE_THUMB}`}
          style={{ zIndex: rangeStart > max * 0.9 ? 5 : 3 }}
        />

        {/* Max handle */}
        <input
          type="range"
          min={0}
          max={max}
          value={rangeEnd}
          onChange={handleMaxChange}
          className={`absolute w-full h-6 appearance-none bg-transparent pointer-events-none ${RANGE_THUMB}`}
          style={{ zIndex: 4 }}
        />
      </div>

      {/* Period count */}
      {showing < length && (
        <div className="text-center text-[10px] text-gray-500">
          Showing {showing} of {length} {periodName}s
        </div>
      )}
    </div>
  );
}

/* ─── MetricSection component ─── */

function MetricSection({ metric, aggregated, period }) {
  const avg = computeOverallAvg(aggregated, metric.key);
  const trend = computeTrend(aggregated, metric.key);
  const best = computeBest(aggregated, metric.key, period);
  const streak = computeStreak(aggregated, metric.key);
  const consistency = computeConsistency(aggregated, metric.key);
  const trendLine = computeLinearRegression(aggregated, metric.key);
  const hasData = aggregated.some((d) => d[metric.key] != null);

  const periodLabel =
    period === 'Daily' ? 'day' : period === 'Weekly' ? 'week' : 'month';

  const datasets = [
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
  ];

  if (trendLine) {
    datasets.push({
      label: 'Trend',
      data: trendLine,
      borderColor: metric.color + '60',
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      spanGaps: true,
    });
  }

  const chartData = {
    labels: aggregated.map((d) => formatLabel(d.groupKey, period)),
    datasets,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (item) => item.dataset.label !== 'Trend',
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
        min: 0,
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

      {/* Stats rows */}
      <div className="mt-2 space-y-1 text-xs">
        {/* Row 1: trend + previous → current */}
        {trend && (
          <div className="flex items-center gap-1.5">
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

        {/* Row 2: best · streak · consistency */}
        <div className="flex items-center gap-1.5 text-gray-500">
          {best && (
            <span>
              Best: <span className="text-gray-300">{metric.format(best.value)}</span>
              {' '}
              <span className="text-gray-600">({best.label})</span>
            </span>
          )}
          {streak && (
            <>
              {best && <span className="text-gray-700">·</span>}
              <span>
                {streak.direction === 'up' ? (
                  <span className="text-emerald-400">↑</span>
                ) : (
                  <span className="text-red-400">↓</span>
                )}{' '}
                {streak.count} {periodLabel}s in a row
              </span>
            </>
          )}
          {consistency != null && (
            <>
              {(best || streak) && <span className="text-gray-700">·</span>}
              <span>
                ±{consistency.toFixed(0)}% variance
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export default function Stats({ refreshKey }) {
  const [period, setPeriod] = useState('Daily');
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(null);

  const runs = getLocalRuns();

  const allAggregated = useMemo(
    () => aggregateRuns(runs, period),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, period]
  );

  // Reset slider when period changes or data changes
  useMemo(() => {
    setRangeStart(0);
    setRangeEnd(allAggregated.length > 0 ? allAggregated.length - 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAggregated.length, period]);

  const effectiveEnd = rangeEnd != null
    ? Math.min(rangeEnd, allAggregated.length - 1)
    : allAggregated.length - 1;
  const effectiveStart = Math.min(rangeStart, Math.max(effectiveEnd, 0));
  const displayed = allAggregated.slice(effectiveStart, effectiveEnd + 1);

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

      {/* Timeline slider */}
      {allAggregated.length >= 2 && (
        <TimelineSlider
          length={allAggregated.length}
          rangeStart={effectiveStart}
          rangeEnd={effectiveEnd}
          onChange={(s, e) => {
            setRangeStart(s);
            setRangeEnd(e);
          }}
          getLabel={(idx) =>
            formatLabel(allAggregated[idx]?.groupKey ?? '', period)
          }
          periodName={period === 'Daily' ? 'day' : period === 'Weekly' ? 'week' : 'month'}
        />
      )}

      {/* Metric sections */}
      {STAT_METRICS.map((metric) => (
        <MetricSection
          key={metric.key}
          metric={metric}
          aggregated={displayed}
          period={period}
        />
      ))}
    </div>
  );
}
