import { useState, useMemo, useRef, useEffect } from 'react';
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
import { getLocalRuns, getMilestones } from '../utils/storage';
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

const MILESTONE_COLORS = {
  lab_research: '#8b5cf6',
  workshop: '#f59e0b',
  cards: '#ec4899',
  ultimate_weapons: '#06b6d4',
};

const MILESTONE_FILTERS = [
  { key: 'lab_research', label: 'Lab Research', type: 'lab_research', subtype: null },
  { key: 'workshop:workshop_unlock', label: 'Workshop Unlock', type: 'workshop', subtype: 'workshop_unlock' },
  { key: 'workshop:workshop_upgrade', label: 'Workshop Upgrade', type: 'workshop', subtype: 'workshop_upgrade' },
  { key: 'cards:new_card_slot', label: 'New Card Slot', type: 'cards', subtype: 'new_card_slot' },
  { key: 'cards:card_upgrade', label: 'Card Upgrade', type: 'cards', subtype: 'card_upgrade' },
  { key: 'ultimate_weapons:uw_unlock', label: 'UW Unlock', type: 'ultimate_weapons', subtype: 'uw_unlock' },
  { key: 'ultimate_weapons:uw_upgrade', label: 'UW Upgrade', type: 'ultimate_weapons', subtype: 'uw_upgrade' },
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

/* ─── Milestone helpers ─── */

function getMilestoneFilterKey(ms) {
  if (ms.type === 'lab_research') return 'lab_research';
  return `${ms.type}:${ms.subtype}`;
}

function formatMilestoneLabel(ms) {
  switch (ms.type) {
    case 'lab_research':
      return `Lab Research: ${ms.name}`;
    case 'workshop':
      if (ms.subtype === 'workshop_unlock') return `Workshop Unlock: ${ms.name}`;
      return `Workshop Upgrade: ${ms.name} (+${ms.levels} lvl)`;
    case 'cards':
      if (ms.subtype === 'new_card_slot') return 'New Card Slot';
      return `Card Upgrade: ${ms.name} (${'★'.repeat(Math.min(ms.level || 0, 7))})`;
    case 'ultimate_weapons':
      if (ms.subtype === 'uw_unlock') return `UW Unlock: ${ms.name}`;
      return `UW Upgrade: ${ms.name} (+${ms.levels} lvl)`;
    default:
      return ms.name || 'Milestone';
  }
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

/* ─── MilestoneFilter component ─── */

function MilestoneFilter({ allMilestones, enabledKeys, onChange }) {
  // Count milestones per filter key
  const counts = useMemo(() => {
    const map = {};
    for (const ms of allMilestones) {
      const key = getMilestoneFilterKey(ms);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [allMilestones]);

  const totalCount = allMilestones.length;
  if (totalCount === 0) return null;

  const allEnabled = enabledKeys === null;
  const enabledSet = enabledKeys ?? new Set();

  function toggleAll() {
    if (allEnabled) {
      // Turn all off
      onChange(new Set());
    } else {
      // Turn all on
      onChange(null);
    }
  }

  function toggleKey(key) {
    let next;
    if (allEnabled) {
      // Switching from "all on" → keep only this one
      next = new Set([key]);
    } else {
      next = new Set(enabledSet);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      // If all with counts are now enabled, go back to null (all on)
      const allWithCounts = MILESTONE_FILTERS.filter((f) => counts[f.key] > 0);
      if (allWithCounts.every((f) => next.has(f.key))) {
        onChange(null);
        return;
      }
    }
    onChange(next);
  }

  function isKeyEnabled(key) {
    return allEnabled || enabledSet.has(key);
  }

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {/* Master toggle */}
      <button
        onClick={toggleAll}
        className={`cursor-pointer inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
          allEnabled || enabledSet.size > 0
            ? 'border-gray-500 text-gray-200 bg-gray-800'
            : 'border-gray-700 text-gray-500 bg-gray-900'
        }`}
      >
        ◆ Milestones
        <span className="text-gray-500 text-[10px]">({totalCount})</span>
      </button>

      {/* Type/subtype pills */}
      {MILESTONE_FILTERS.map((filter) => {
        const count = counts[filter.key] || 0;
        if (count === 0) return null;
        const color = MILESTONE_COLORS[filter.type];
        const active = isKeyEnabled(filter.key);
        return (
          <button
            key={filter.key}
            onClick={() => toggleKey(filter.key)}
            className="cursor-pointer inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors"
            style={
              active
                ? { borderColor: color, color, backgroundColor: color + '20' }
                : { borderColor: '#374151', color: '#6b7280', backgroundColor: 'transparent' }
            }
          >
            {filter.label}
            <span style={{ opacity: 0.6 }}>({count})</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── MetricSection component ─── */

function MetricSection({ metric, aggregated, period, milestones, selectedMilestoneIdx, onSelectMilestone }) {
  const chartRef = useRef(null);
  const selectedIdxRef = useRef(selectedMilestoneIdx);
  selectedIdxRef.current = selectedMilestoneIdx;
  const [chartLayout, setChartLayout] = useState(null);

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

  // Milestone lane data (separate from chart)
  const milestonesByIndex = useMemo(() => {
    if (!milestones || milestones.length === 0) return null;
    const groupMap = new Map();
    for (const ms of milestones) {
      const dateStr = ms.savedAt;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      let key;
      if (period === 'Weekly') key = getWeekKey(d);
      else if (period === 'Monthly') key = getMonthKey(d);
      else key = getDayKey(d);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key).push(ms);
    }
    const result = new Array(aggregated.length).fill(null);
    let hasAny = false;
    for (let i = 0; i < aggregated.length; i++) {
      if (groupMap.has(aggregated[i].groupKey)) {
        result[i] = groupMap.get(aggregated[i].groupKey);
        hasAny = true;
      }
    }
    return hasAny ? result : null;
  }, [aggregated, period, milestones]);

  // Capture chart area dimensions for milestone lane alignment
  useEffect(() => {
    function capture() {
      const chart = chartRef.current;
      if (!chart || !chart.chartArea) return;
      const { left, right } = chart.chartArea;
      if (right > left) {
        setChartLayout((prev) => {
          if (prev && prev.left === left && prev.chartWidth === right - left) return prev;
          return { left, chartWidth: right - left };
        });
      }
    }

    const frame = requestAnimationFrame(capture);

    const chart = chartRef.current;
    let ro;
    if (chart?.canvas) {
      ro = new ResizeObserver(() => requestAnimationFrame(capture));
      ro.observe(chart.canvas);
    }

    return () => {
      cancelAnimationFrame(frame);
      if (ro) ro.disconnect();
    };
  }, [aggregated, period]);

  // Chart.js plugin: draw vertical highlight line at selected milestone
  // Uses a ref so the plugin closure always reads the latest value
  const milestoneHighlightPlugin = useMemo(
    () => ({
      id: 'milestoneHighlight',
      afterDraw(chart) {
        const idx = selectedIdxRef.current;
        if (idx == null) return;
        const meta = chart.getDatasetMeta(0);
        if (!meta?.data[idx]) return;

        const { ctx, chartArea } = chart;
        const x = meta.data[idx].x;

        ctx.save();
        // Subtle highlight band
        ctx.fillStyle = 'rgba(251, 191, 36, 0.07)';
        ctx.fillRect(
          x - 8,
          chartArea.top,
          16,
          chartArea.bottom - chartArea.top
        );
        // Dashed amber vertical line
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.restore();
      },
    }),
    [] // stable — reads from selectedIdxRef
  );

  // Force chart redraw when selection changes
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) chart.update('none');
  }, [selectedMilestoneIdx]);

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
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4" onClick={() => onSelectMilestone(null)}>
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

      {/* Chart + milestone lane */}
      {hasData && aggregated.length > 1 ? (
        <div>
          <div className="h-44 sm:h-52">
            <Line ref={chartRef} data={chartData} options={chartOptions} plugins={[milestoneHighlightPlugin]} />
          </div>
          {/* Milestone lane below x-axis */}
          {milestonesByIndex && chartLayout && (
            <div
              className="relative h-4"
              style={{
                marginLeft: `${chartLayout.left}px`,
                width: `${chartLayout.chartWidth}px`,
              }}
            >
              {milestonesByIndex.map((group, idx) => {
                if (!group) return null;
                const n = milestonesByIndex.length;
                const pct = n <= 1 ? 50 : (idx / (n - 1)) * 100;
                const types = [...new Set(group.map((ms) => ms.type))];
                const primaryColor =
                  types.length === 1
                    ? MILESTONE_COLORS[types[0]]
                    : '#e5e7eb';
                const isSelected = selectedMilestoneIdx === idx;

                // Edge-aware tooltip positioning
                const tooltipAlign =
                  pct > 75
                    ? 'right-0'
                    : pct < 25
                      ? 'left-0'
                      : 'left-1/2 -translate-x-1/2';

                return (
                  <div
                    key={idx}
                    className="absolute group/ms cursor-pointer p-1"
                    style={{
                      left: `${pct}%`,
                      transform: 'translateX(-50%)',
                      top: '-2px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMilestone(isSelected ? null : idx);
                    }}
                  >
                    {/* Diamond marker */}
                    <div
                      className={`w-2 h-2 rotate-45 transition-all ${
                        isSelected
                          ? 'scale-125'
                          : 'hover:scale-150'
                      }`}
                      style={{
                        backgroundColor: primaryColor,
                        boxShadow: isSelected
                          ? `0 0 4px ${primaryColor}90`
                          : 'none',
                      }}
                    />
                    {/* Hover tooltip */}
                    <div
                      className={`hidden group-hover/ms:block pointer-events-none absolute bottom-full mb-2 ${tooltipAlign} bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-[11px] whitespace-nowrap z-50 shadow-lg max-h-48 overflow-y-auto`}
                    >
                      {group.map((ms, j) => (
                        <div key={j} className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                            style={{
                              backgroundColor: MILESTONE_COLORS[ms.type],
                            }}
                          />
                          <span className="text-gray-200">
                            {formatMilestoneLabel(ms)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

/* ─── Sticky Milestone Detail Panel ─── */

function MilestoneDetailPanel({ milestones, dateLabel, metricDeltas }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('milestones');
  const prevDateRef = useRef(dateLabel);

  // Auto-collapse when selection changes to a different date
  useEffect(() => {
    if (dateLabel !== prevDateRef.current) {
      setExpanded(false);
      prevDateRef.current = dateLabel;
    }
  }, [dateLabel]);

  // Group milestones by filter key for organized display
  // Must be before early return to respect rules of hooks
  const grouped = useMemo(() => {
    if (!milestones || milestones.length === 0) return [];
    const map = new Map();
    for (const ms of milestones) {
      const filterKey = getMilestoneFilterKey(ms);
      const filter = MILESTONE_FILTERS.find((f) => f.key === filterKey);
      const label = filter?.label ?? ms.type;
      if (!map.has(label)) map.set(label, { type: ms.type, items: [] });
      map.get(label).items.push(ms);
    }
    return [...map.entries()]; // [[label, { type, items }], ...]
  }, [milestones]);

  if (!milestones || milestones.length === 0) return null;

  const hasMetrics = metricDeltas && metricDeltas.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 shadow-2xl transition-all">
      {/* Header bar — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="cursor-pointer w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rotate-45 bg-amber-400" />
            <span className="text-sm font-medium text-gray-200">{dateLabel}</span>
          </div>
          <span className="text-xs text-gray-500">
            {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
          </span>
          {/* Type summary dots */}
          <div className="flex items-center gap-1">
            {grouped.map(([label, { type }]) => (
              <span
                key={label}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: MILESTONE_COLORS[type] }}
              />
            ))}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Expanded content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? 'max-h-80' : 'max-h-0'
        }`}
      >
        {/* Tabs — only show if metrics are available */}
        {hasMetrics && (
          <div className="flex border-b border-gray-800 px-4 gap-4">
            <button
              onClick={() => setActiveTab('milestones')}
              className={`cursor-pointer text-xs font-medium pb-2 border-b-2 transition-colors ${
                activeTab === 'milestones'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Upgrades
            </button>
            <button
              onClick={() => setActiveTab('impact')}
              className={`cursor-pointer text-xs font-medium pb-2 border-b-2 transition-colors ${
                activeTab === 'impact'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Impact
            </button>
          </div>
        )}

        <div className="px-4 py-3 overflow-y-auto max-h-64">
          {/* Milestones tab (or only content when no metrics) */}
          {(activeTab === 'milestones' || !hasMetrics) && (
            <div className="space-y-2">
              {grouped.map(([label, { type, items }]) => (
                <div key={label}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: MILESTONE_COLORS[type] }}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {label} ({items.length})
                    </span>
                  </div>
                  <div className="pl-3 space-y-0.5">
                    {items.map((ms, j) => (
                      <div key={j} className="text-xs text-gray-300">
                        {formatMilestoneLabel(ms)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Impact tab */}
          {activeTab === 'impact' && hasMetrics && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-600">
                Avg {metricDeltas[0].beforeCount}d before → avg {metricDeltas[0].afterCount}d after
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {metricDeltas.map((d) => (
                  <div
                    key={d.label}
                    className="rounded-lg bg-gray-800/60 border border-gray-700/50 px-2.5 py-2"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        {d.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-300">
                      {d.format(d.before)}{' '}
                      <span className="text-gray-600">→</span>{' '}
                      {d.format(d.after)}
                    </div>
                    <div className={`text-[11px] font-medium ${
                      d.pctChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {d.pctChange >= 0 ? '↑' : '↓'}{' '}
                      {Math.abs(d.pctChange).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
  const [enabledMilestoneKeys, setEnabledMilestoneKeys] = useState(null); // null = all enabled
  const [selectedMilestoneIdx, setSelectedMilestoneIdx] = useState(null);

  const runs = getLocalRuns();

  const allAggregated = useMemo(
    () => aggregateRuns(runs, period),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey, period]
  );

  const allMilestones = useMemo(
    () => getMilestones(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey]
  );

  // Filter milestones by enabled types
  const filteredMilestones = useMemo(() => {
    if (enabledMilestoneKeys === null) return allMilestones; // all enabled
    return allMilestones.filter((ms) => enabledMilestoneKeys.has(getMilestoneFilterKey(ms)));
  }, [allMilestones, enabledMilestoneKeys]);

  // Reset slider + selection when period changes or data changes
  useMemo(() => {
    setRangeStart(0);
    setRangeEnd(allAggregated.length > 0 ? allAggregated.length - 1 : 0);
    setSelectedMilestoneIdx(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAggregated.length, period]);

  const effectiveEnd = rangeEnd != null
    ? Math.min(rangeEnd, allAggregated.length - 1)
    : allAggregated.length - 1;
  const effectiveStart = Math.min(rangeStart, Math.max(effectiveEnd, 0));
  const displayed = allAggregated.slice(effectiveStart, effectiveEnd + 1);

  // Milestones for the currently selected date (for the sticky detail panel)
  const selectedGroupKey =
    selectedMilestoneIdx != null
      ? allAggregated[effectiveStart + selectedMilestoneIdx]?.groupKey ?? null
      : null;

  const selectedMilestones = useMemo(() => {
    if (!selectedGroupKey) return null;
    const matches = filteredMilestones.filter((ms) => {
      const d = new Date(ms.savedAt);
      if (isNaN(d.getTime())) return false;
      let key;
      if (period === 'Weekly') key = getWeekKey(d);
      else if (period === 'Monthly') key = getMonthKey(d);
      else key = getDayKey(d);
      return key === selectedGroupKey;
    });
    return matches.length > 0 ? matches : null;
  }, [selectedGroupKey, filteredMilestones, period]);

  const selectedDateLabel = selectedGroupKey
    ? formatLabel(selectedGroupKey, period)
    : '';

  // Before/after metric deltas: average of up to 7 periods before vs 7 periods after
  const metricDeltas = useMemo(() => {
    if (selectedMilestoneIdx == null) return null;
    // Use the index in allAggregated (not displayed) for full range access
    const globalIdx = effectiveStart + selectedMilestoneIdx;
    if (globalIdx < 0 || globalIdx >= allAggregated.length) return null;

    const WINDOW = 7;

    function avgWindow(startIdx, endIdx, metricKey) {
      const values = [];
      for (let i = startIdx; i <= endIdx; i++) {
        if (i >= 0 && i < allAggregated.length) {
          const v = allAggregated[i][metricKey];
          if (v != null && !isNaN(v)) values.push(v);
        }
      }
      return values.length > 0
        ? { avg: values.reduce((s, v) => s + v, 0) / values.length, count: values.length }
        : null;
    }

    // Before: up to 7 periods ending the day before the milestone
    // After: up to 7 periods starting the day after the milestone
    // The milestone day itself is excluded (upgrades can happen mid-day)
    const beforeEnd = globalIdx - 1;
    const beforeStart = globalIdx - WINDOW;
    const afterStart = globalIdx + 1;
    const afterEnd = globalIdx + WINDOW;

    if (beforeEnd < 0 || afterStart >= allAggregated.length) return null;

    const deltas = STAT_METRICS.map((m) => {
      const bw = avgWindow(beforeStart, beforeEnd, m.key);
      const aw = avgWindow(afterStart, afterEnd, m.key);
      if (!bw || !aw || bw.avg === 0) return null;
      return {
        label: m.label,
        color: m.color,
        format: m.format,
        before: bw.avg,
        after: aw.avg,
        beforeCount: bw.count,
        afterCount: aw.count,
        pctChange: ((aw.avg - bw.avg) / Math.abs(bw.avg)) * 100,
      };
    }).filter(Boolean);
    return deltas.length > 0 ? deltas : null;
  }, [selectedMilestoneIdx, effectiveStart, allAggregated]);

  /* ── Render ── */

  if (runs.length === 0) {
    return (
      <p className="text-gray-500 text-sm italic">
        No runs saved yet. Import a battle report first.
      </p>
    );
  }

  const hasPanelVisible = selectedMilestones != null && selectedMilestones.length > 0;

  return (
    <div className={`space-y-4 ${hasPanelVisible ? 'pb-14' : ''}`}>
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
            setSelectedMilestoneIdx(null);
          }}
          getLabel={(idx) =>
            formatLabel(allAggregated[idx]?.groupKey ?? '', period)
          }
          periodName={period === 'Daily' ? 'day' : period === 'Weekly' ? 'week' : 'month'}
        />
      )}

      {/* Milestone filter */}
      {allMilestones.length > 0 && (
        <MilestoneFilter
          allMilestones={allMilestones}
          enabledKeys={enabledMilestoneKeys}
          onChange={(keys) => {
            setEnabledMilestoneKeys(keys);
            setSelectedMilestoneIdx(null);
          }}
        />
      )}

      {/* Metric sections */}
      {STAT_METRICS.map((metric) => (
        <MetricSection
          key={metric.key}
          metric={metric}
          aggregated={displayed}
          period={period}
          milestones={filteredMilestones}
          selectedMilestoneIdx={selectedMilestoneIdx}
          onSelectMilestone={setSelectedMilestoneIdx}
        />
      ))}

      {/* Sticky milestone detail panel */}
      <MilestoneDetailPanel
        milestones={selectedMilestones}
        dateLabel={selectedDateLabel}
        metricDeltas={metricDeltas}
      />
    </div>
  );
}
