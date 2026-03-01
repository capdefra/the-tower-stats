import { useState } from 'react';
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
import { formatNumber, formatSeconds } from '../utils/parser';
import EnemyIcon from './EnemyIcon';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const fmt = formatNumber;
const fmtInt = (v) => v?.toLocaleString() ?? '—';

const METRIC_SECTIONS = [
  {
    section: 'Overview',
    metrics: [
      { key: 'wave', label: 'Wave', format: fmtInt },
      { key: 'realTimeSeconds', label: 'Real Time', format: formatSeconds },
      { key: 'gameTimeSeconds', label: 'Game Time', format: formatSeconds },
    ],
  },
  {
    section: 'Economy',
    metrics: [
      { key: 'coinsEarned', label: 'Coins Earned', format: fmt },
      { key: 'coinsPerHour', label: 'Coins/Hour', format: fmt },
      { key: 'cashEarned', label: 'Cash Earned', format: fmt },
      { key: 'interestEarned', label: 'Interest Earned', format: fmt },
      { key: 'cellsEarned', label: 'Cells Earned', format: fmt },
      { key: 'rerollShardsEarned', label: 'Reroll Shards Earned', format: fmt },
      { key: 'gemBlocksTapped', label: 'Gem Blocks Tapped', format: fmtInt },
    ],
  },
  {
    section: 'Combat',
    metrics: [
      { key: 'damageDealt', label: 'Damage Dealt', format: fmt },
      { key: 'damageTaken', label: 'Damage Taken', format: fmt },
      { key: 'damageTakenWall', label: 'Damage Taken Wall', format: fmt },
      { key: 'damageTakenWhileBerserked', label: 'Dmg While Berserked', format: fmt },
      { key: 'damageGainFromBerserk', label: 'Berserk Multiplier', format: (v) => v != null ? `x${v}` : '—' },
      { key: 'deathDefy', label: 'Death Defy', format: fmtInt },
      { key: 'lifesteal', label: 'Lifesteal', format: fmt },
      { key: 'projectilesDamage', label: 'Projectiles Dmg', format: fmt },
      { key: 'projectilesCount', label: 'Projectiles Count', format: fmt },
      { key: 'thornDamage', label: 'Thorn Damage', format: fmt },
      { key: 'orbDamage', label: 'Orb Damage', format: fmt },
      { key: 'enemiesHitByOrbs', label: 'Enemies Hit by Orbs', format: fmt },
      { key: 'landMineDamage', label: 'Land Mine Dmg', format: fmt },
      { key: 'landMinesSpawned', label: 'Land Mines Spawned', format: fmtInt },
      { key: 'rendArmorDamage', label: 'Rend Armor Dmg', format: fmt },
      { key: 'deathRayDamage', label: 'Death Ray Dmg', format: fmt },
      { key: 'smartMissileDamage', label: 'Smart Missile Dmg', format: fmt },
      { key: 'innerLandMineDamage', label: 'Inner Land Mine Dmg', format: fmt },
      { key: 'chainLightningDamage', label: 'Chain Lightning Dmg', format: fmt },
      { key: 'deathWaveDamage', label: 'Death Wave Dmg', format: fmt },
      { key: 'taggedByDeathwave', label: 'Tagged by Deathwave', format: fmtInt },
      { key: 'swampDamage', label: 'Swamp Damage', format: fmt },
      { key: 'blackHoleDamage', label: 'Black Hole Dmg', format: fmt },
      { key: 'electronsDamage', label: 'Electrons Dmg', format: fmt },
    ],
  },
  {
    section: 'Utility',
    metrics: [
      { key: 'wavesSkipped', label: 'Waves Skipped', format: fmtInt },
      { key: 'recoveryPackages', label: 'Recovery Packages', format: fmtInt },
      { key: 'freeAttackUpgrade', label: 'Free Attack Upgrades', format: fmtInt },
      { key: 'freeDefenseUpgrade', label: 'Free Defense Upgrades', format: fmtInt },
      { key: 'freeUtilityUpgrade', label: 'Free Utility Upgrades', format: fmtInt },
      { key: 'hpFromDeathWave', label: 'HP From Death Wave', format: fmt },
      { key: 'coinsFromDeathWave', label: 'Coins From Death Wave', format: fmt },
      { key: 'cashFromGoldenTower', label: 'Cash From Golden Tower', format: fmt },
      { key: 'coinsFromGoldenTower', label: 'Coins From Golden Tower', format: fmt },
      { key: 'coinsFromBlackHole', label: 'Coins From Black Hole', format: fmt },
      { key: 'coinsFromSpotlight', label: 'Coins From Spotlight', format: fmt },
      { key: 'coinsFromOrb', label: 'Coins From Orb', format: fmt },
      { key: 'coinsFromCoinUpgrade', label: 'Coins From Upgrade', format: fmt },
      { key: 'coinsFromCoinBonuses', label: 'Coins From Bonuses', format: fmt },
    ],
  },
  {
    section: 'Enemies',
    metrics: [
      { key: 'totalEnemies', label: 'Total Enemies', format: fmtInt },
      { key: 'basicEnemies', label: 'Basic', format: fmtInt },
      { key: 'fastEnemies', label: 'Fast', format: fmtInt },
      { key: 'tankEnemies', label: 'Tank', format: fmtInt },
      { key: 'rangedEnemies', label: 'Ranged', format: fmtInt },
      { key: 'bossEnemies', label: 'Boss', format: fmtInt },
      { key: 'protectorEnemies', label: 'Protector', format: fmtInt },
      { key: 'totalElites', label: 'Total Elites', format: fmtInt },
      { key: 'vampires', label: 'Vampires', format: fmtInt },
      { key: 'rays', label: 'Rays', format: fmtInt },
      { key: 'scatters', label: 'Scatters', format: fmtInt },
      { key: 'saboteur', label: 'Saboteur', format: fmtInt },
      { key: 'commander', label: 'Commander', format: fmtInt },
      { key: 'overcharge', label: 'Overcharge', format: fmtInt },
      { key: 'destroyedByOrbs', label: 'Destroyed by Orbs', format: fmtInt },
      { key: 'destroyedByThorns', label: 'Destroyed by Thorns', format: fmtInt },
      { key: 'destroyedByDeathRay', label: 'Destroyed by Death Ray', format: fmtInt },
      { key: 'destroyedByLandMine', label: 'Destroyed by Land Mine', format: fmtInt },
      { key: 'destroyedInSpotlight', label: 'Destroyed in Spotlight', format: fmtInt },
    ],
  },
  {
    section: 'Bots',
    metrics: [
      { key: 'flameBotDamage', label: 'Flame Bot Dmg', format: fmt },
      { key: 'thunderBotStuns', label: 'Thunder Bot Stuns', format: fmtInt },
      { key: 'goldenBotCoins', label: 'Golden Bot Coins', format: fmt },
      { key: 'destroyedInGoldenBot', label: 'Destroyed in Golden Bot', format: fmtInt },
      { key: 'guardianDamage', label: 'Guardian Dmg', format: fmt },
      { key: 'summonedEnemies', label: 'Summoned Enemies', format: fmtInt },
      { key: 'guardianCoinsStolen', label: 'Guardian Coins Stolen', format: fmt },
      { key: 'coinsFetched', label: 'Coins Fetched', format: fmt },
    ],
  },
  {
    section: 'Rewards',
    metrics: [
      { key: 'gems', label: 'Gems', format: fmtInt },
      { key: 'medals', label: 'Medals', format: fmtInt },
      { key: 'rerollShards', label: 'Reroll Shards', format: fmtInt },
      { key: 'cannonShards', label: 'Cannon Shards', format: fmtInt },
      { key: 'armorShards', label: 'Armor Shards', format: fmtInt },
      { key: 'generatorShards', label: 'Generator Shards', format: fmtInt },
      { key: 'coreShards', label: 'Core Shards', format: fmtInt },
      { key: 'commonModules', label: 'Common Modules', format: fmtInt },
      { key: 'rareModules', label: 'Rare Modules', format: fmtInt },
    ],
  },
];

const METRIC_MAP = Object.fromEntries(
  METRIC_SECTIONS.flatMap((s) => s.metrics).map((m) => [m.key, m])
);

const AXIS_COLORS = { left: '#f59e0b', right: '#3b82f6' };

/* ─── Sub-components ─── */

function MetricPicker({ selectedKeys, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer flex items-center gap-1.5 rounded-lg border bg-gray-800 border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 px-3 py-1.5 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Metric
        {selectedKeys.length > 0 && (
          <span className="bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
            {selectedKeys.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-60 max-h-80 overflow-y-auto rounded-lg bg-gray-800 border border-gray-700 shadow-xl left-0">
            {METRIC_SECTIONS.map((group) => (
              <div key={group.section}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-800/80 sticky top-0">
                  {group.section}
                </div>
                {group.metrics.map((m) => {
                  const active = selectedKeys.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() => onToggle(m.key)}
                      className={`cursor-pointer w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                        active
                          ? 'bg-amber-600/20 text-amber-300'
                          : 'text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center text-[10px] ${
                          active ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-600'
                        }`}
                      >
                        {active && '✓'}
                      </span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TierFilter({ tiers, value, onChange }) {
  if (tiers.length <= 1) return null;

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className="cursor-pointer rounded-lg border bg-gray-800 border-gray-700 text-gray-300 hover:text-gray-100 hover:border-gray-500 px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
    >
      <option value="">All Tiers</option>
      {tiers.map((t) => (
        <option key={t} value={t}>Tier {t}</option>
      ))}
    </select>
  );
}

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

function TimelineSlider({ length, rangeStart, rangeEnd, onChange, getLabel }) {
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

      {/* Run count */}
      {showing < length && (
        <div className="text-center text-[10px] text-gray-500">
          Showing {showing} of {length} runs
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─── */

export default function Dashboard({ refreshKey }) {
  const [selectedKeys, setSelectedKeys] = useState(['wave']);
  const [chartKeys, setChartKeys] = useState(['wave']);
  const [tierFilter, setTierFilter] = useState(null);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(null); // null = end of array

  const runs = getLocalRuns();

  function toggleMetric(key) {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        const next = prev.filter((k) => k !== key);
        setChartKeys((ck) => ck.filter((k) => k !== key));
        return next;
      }
      return [...prev, key];
    });
  }

  function toggleChart(key) {
    setChartKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      if (prev.length < 2) {
        return [...prev, key];
      }
      return [key, prev[1]];
    });
  }

  function handleTierChange(tier) {
    setTierFilter(tier);
    setRangeStart(0);
    setRangeEnd(null);
  }

  function axisOf(key) {
    const idx = chartKeys.indexOf(key);
    if (idx === 0) return 'left';
    if (idx === 1) return 'right';
    return null;
  }

  const selectedMetrics = selectedKeys.map((k) => METRIC_MAP[k]).filter(Boolean);
  const leftMetric = METRIC_MAP[chartKeys[0]];
  const rightMetric = chartKeys[1] ? METRIC_MAP[chartKeys[1]] : null;

  /* ── Data pipeline ── */

  // Step 1: all runs sorted by date
  const sorted = [...runs]
    .filter((r) => r.battleDate != null)
    .sort((a, b) => new Date(a.battleDate) - new Date(b.battleDate));

  // Step 2: unique tiers (from full dataset)
  const uniqueTiers = [...new Set(sorted.map((r) => r.tier).filter((t) => t != null))].sort(
    (a, b) => a - b
  );

  // Step 3: tier filter
  const tierFiltered = tierFilter != null
    ? sorted.filter((r) => r.tier === tierFilter)
    : sorted;

  // Step 4: date range
  const effectiveEnd = rangeEnd != null
    ? Math.min(rangeEnd, tierFiltered.length - 1)
    : tierFiltered.length - 1;
  const effectiveStart = Math.min(rangeStart, Math.max(effectiveEnd, 0));
  const displayed = tierFiltered.slice(effectiveStart, effectiveEnd + 1);

  /* ── Chart config ── */

  const datasets = [];
  if (leftMetric) {
    datasets.push({
      label: leftMetric.label,
      data: displayed.map((r) => (r[leftMetric.key] != null ? Number(r[leftMetric.key]) : null)),
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
      data: displayed.map((r) => (r[rightMetric.key] != null ? Number(r[rightMetric.key]) : null)),
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

  const chartData = { labels: displayed.map((r) => r.battleDate), datasets };
  const chartMetrics = [leftMetric, rightMetric].filter(Boolean);

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
        title: { display: true, text: 'Battle Date', color: '#9ca3af', font: { size: 11 } },
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
      {/* Controls row: tier filter + metric picker + pills */}
      <div className="flex gap-2 flex-wrap items-center">
        <TierFilter tiers={uniqueTiers} value={tierFilter} onChange={handleTierChange} />
        <MetricPicker selectedKeys={selectedKeys} onToggle={toggleMetric} />
        {selectedMetrics.map((m) => {
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
              {axis === 'left' && <span className="text-[9px] font-bold opacity-70">L</span>}
              {axis === 'right' && <span className="text-[9px] font-bold opacity-70">R</span>}
              {m.label}
              {selectedKeys.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMetric(m.key);
                  }}
                  className="cursor-pointer hover:opacity-70 ml-0.5"
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-56 sm:h-72 md:h-80">
        {displayed.length > 1 && chartKeys.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
            {chartKeys.length === 0
              ? 'Click a pill to plot it on the chart.'
              : 'Need at least 2 runs to draw a line. Keep importing!'}
          </div>
        )}
      </div>

      {/* Timeline range slider */}
      <TimelineSlider
        length={tierFiltered.length}
        rangeStart={effectiveStart}
        rangeEnd={effectiveEnd}
        onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
        getLabel={(i) => tierFiltered[i]?.battleDate ?? ''}
      />

      {/* Data table */}
      <div className="-mx-3 sm:mx-0 overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[600px]">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
              <th className="py-2 px-2">Date</th>
              <th className="py-2 px-2">T</th>
              <th className="py-2 px-2">Wave</th>
              <th className="py-2 px-2">Coins</th>
              <th className="py-2 px-2">Cells</th>
              <th className="py-2 px-2">Killed By</th>
              {selectedMetrics.map((m) => {
                const axis = axisOf(m.key);
                const color = axis ? AXIS_COLORS[axis] : '#9ca3af';
                return (
                  <th key={m.key} className="py-2 px-2" style={{ color }}>{m.label}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayed.map((run, i) => (
              <tr
                key={run.id || i}
                className="border-b border-gray-800 hover:bg-gray-800/40"
              >
                <td className="py-2 px-2 text-gray-300 whitespace-nowrap text-xs">
                  {run.battleDate || '—'}
                </td>
                <td className="py-2 px-2 text-amber-400 font-semibold">
                  {run.tier ?? '—'}
                </td>
                <td className="py-2 px-2">{run.wave ?? '—'}</td>
                <td className="py-2 px-2">{formatNumber(run.coinsEarned)}</td>
                <td className="py-2 px-2">{formatNumber(run.cellsEarned)}</td>
                <td className="py-2 px-2 text-gray-400"><EnemyIcon name={run.killedBy} size={18} /></td>
                {selectedMetrics.map((m) => {
                  const axis = axisOf(m.key);
                  const color = axis ? AXIS_COLORS[axis] : '#d1d5db';
                  return (
                    <td
                      key={m.key}
                      className="py-2 px-2 font-medium whitespace-nowrap"
                      style={{ color }}
                    >
                      {m.format(run[m.key])}
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
