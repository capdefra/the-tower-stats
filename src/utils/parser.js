/**
 * Battle Report Parser for "The Tower - Idle Tower Defense"
 *
 * Unit suffixes (case-sensitive):
 *   K=10^3  M=10^6  B=10^9  T=10^12  q=10^15  Q=10^18
 *   s=10^21  S=10^24  O=10^27  N=10^30  D=10^33
 *   aa=10^36  ab=10^39  ac=10^42  ad=10^45  ae=10^48
 *   af=10^51  ag=10^54  ah=10^57  ai=10^60  ...
 */

// Single-char suffixes
const SINGLE_SUFFIXES = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
  q: 1e15,
  Q: 1e18,
  s: 1e21,
  S: 1e24,
  O: 1e27,
  N: 1e30,
  D: 1e33,
};

// Two-char suffixes (aa, ab, ac, ..., az, ba, bb, ...)
// Each step is 10^3. aa starts at 10^36.
const TWO_CHAR_BASE = 36; // aa = 10^36

function twoCharToExponent(suffix) {
  const first = suffix.charCodeAt(0) - 97; // 'a' = 0
  const second = suffix.charCodeAt(1) - 97; // 'a' = 0
  return TWO_CHAR_BASE + (first * 26 + second) * 3;
}

/**
 * Get the multiplier for a suffix string (1 or 2 chars).
 * Returns undefined if not a valid suffix.
 */
function getMultiplier(suffix) {
  if (suffix.length === 1) {
    return SINGLE_SUFFIXES[suffix];
  }
  if (suffix.length === 2 && /^[a-z]{2}$/.test(suffix)) {
    return Math.pow(10, twoCharToExponent(suffix));
  }
  return undefined;
}

// Ordered list for formatting (highest first)
const FORMAT_TIERS = [];

// Build two-char tiers first (highest). Go up to 'az' (10^111) for safety.
for (let i = 25; i >= 0; i--) {
  const suffix = 'a' + String.fromCharCode(97 + i);
  FORMAT_TIERS.push({ suffix, threshold: Math.pow(10, TWO_CHAR_BASE + i * 3) });
}
// Then single-char tiers (highest first)
const SINGLE_ORDER = ['D', 'N', 'O', 'S', 's', 'Q', 'q', 'T', 'B', 'M', 'K'];
for (const suffix of SINGLE_ORDER) {
  FORMAT_TIERS.push({ suffix, threshold: SINGLE_SUFFIXES[suffix] });
}

// Regex fragment that matches any valid number suffix in the game
// Matches: single char (K,M,B,T,q,Q,s,S,O,N,D) or two lowercase letters (aa,ab,...)
const NUM_SUFFIX = '(?:[KMBTqQsSONDa-z]|[a-z]{2})';
// Regex for a number value with optional suffix
const NUM_RE_STR = `([\\d.]+${NUM_SUFFIX}?)`;
// Same but with $ prefix for cash values
const CASH_RE_STR = `\\$?([\\d.]+${NUM_SUFFIX}?)`;

/**
 * Parse a number string like "2.46B", "1.18K", "44.48q", "3.50aa", "365", "$978.55M"
 * Returns a raw number (float).
 */
export function parseNumberWithSuffix(str) {
  if (str == null) return null;
  let cleaned = str.replace(/[$,]/g, '').trim();
  if (cleaned === '') return null;

  // Try two-char suffix first (e.g., "aa", "ab")
  if (cleaned.length >= 3) {
    const lastTwo = cleaned.slice(-2);
    if (/^[a-z]{2}$/.test(lastTwo)) {
      const mult = getMultiplier(lastTwo);
      if (mult !== undefined) {
        const numPart = parseFloat(cleaned.slice(0, -2));
        if (!isNaN(numPart)) return numPart * mult;
      }
    }
  }

  // Try single-char suffix
  const lastChar = cleaned[cleaned.length - 1];
  const mult = SINGLE_SUFFIXES[lastChar];
  if (mult !== undefined) {
    const numPart = parseFloat(cleaned.slice(0, -1));
    if (!isNaN(numPart)) return numPart * mult;
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse a time string like "22h 42m 35s" into total seconds.
 */
export function parseTimeToSeconds(str) {
  if (!str) return null;
  let total = 0;
  const hours = str.match(/(\d+)h/);
  const minutes = str.match(/(\d+)m/);
  const seconds = str.match(/(\d+)s/);
  if (hours) total += parseInt(hours[1]) * 3600;
  if (minutes) total += parseInt(minutes[1]) * 60;
  if (seconds) total += parseInt(seconds[1]);
  return total || null;
}

/**
 * Format seconds back into "Xh Ym Zs".
 */
export function formatSeconds(totalSec) {
  if (totalSec == null) return '—';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
}

/**
 * Format large numbers for display (e.g., 2460000000 -> "2.46B").
 */
export function formatNumber(num) {
  if (num == null) return '—';
  if (num === 0) return '0';

  const absNum = Math.abs(num);
  for (const tier of FORMAT_TIERS) {
    if (absNum >= tier.threshold) {
      return (num / tier.threshold).toFixed(2) + tier.suffix;
    }
  }
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
}

// Build regex from string helpers
function numRe(prefix) {
  return new RegExp(`${prefix}\\s+${NUM_RE_STR}`);
}
function cashRe(prefix) {
  return new RegExp(`${prefix}\\s+${CASH_RE_STR}`);
}

// Field definitions: label in the report -> key in our data object
// Order matters: more specific patterns must come before more general ones.
const FIELD_PATTERNS = [
  // Meta
  { key: 'battleDate', pattern: /Battle Date\s+(.+?)(?=\s+Game Time)/ },
  { key: 'gameTimeRaw', pattern: /Game Time\s+(\d+h\s*\d+m\s*\d+s)/ },
  { key: 'realTimeRaw', pattern: /Real Time\s+(\d+h\s*\d+m\s*\d+s)/ },
  { key: 'tier', pattern: /Tier\s+(\d+)/ },
  { key: 'wave', pattern: /Wave\s+(\d+)/ },
  { key: 'killedBy', pattern: /Killed By\s+(\S+)/ },

  // Coins / Cash / Gems
  { key: 'coinsEarned', pattern: numRe('Coins earned') },
  { key: 'coinsPerHour', pattern: numRe('Coins per hour') },
  { key: 'cashEarned', pattern: cashRe('Cash earned') },
  { key: 'interestEarned', pattern: cashRe('Interest earned') },
  { key: 'gemBlocksTapped', pattern: /Gem Blocks Tapped\s+(\d+)/ },

  // Cells & Shards
  { key: 'cellsEarned', pattern: numRe('Cells Earned') },
  { key: 'rerollShardsEarned', pattern: numRe('Reroll Shards Earned') },

  // Combat
  { key: 'damageDealt', pattern: new RegExp(`(?:Combat )?Damage dealt\\s+${NUM_RE_STR}`) },
  { key: 'damageTaken', pattern: new RegExp(`Damage Taken\\s+${NUM_RE_STR}(?!\\s*W)`) },
  { key: 'damageTakenWall', pattern: numRe('Damage Taken Wall') },
  { key: 'damageTakenWhileBerserked', pattern: numRe('Damage Taken While Berserked') },
  { key: 'damageGainFromBerserk', pattern: /Damage Gain From Berserk\s+x?([\d.]+)/ },
  { key: 'deathDefy', pattern: /Death Defy\s+(\d+)/ },
  { key: 'lifesteal', pattern: numRe('Lifesteal') },

  // Projectiles
  { key: 'projectilesDamage', pattern: numRe('Projectiles Damage') },
  { key: 'projectilesCount', pattern: numRe('Projectiles Count') },

  // Skills / Abilities
  { key: 'thornDamage', pattern: numRe('Thorn damage') },
  { key: 'orbDamage', pattern: numRe('Orb Damage') },
  { key: 'enemiesHitByOrbs', pattern: numRe('Enemies Hit by Orbs') },
  { key: 'landMineDamage', pattern: new RegExp(`(?<!Inner )Land Mine Damage\\s+${NUM_RE_STR}`) },
  { key: 'landMinesSpawned', pattern: numRe('Land Mines Spawned') },
  { key: 'rendArmorDamage', pattern: numRe('Rend Armor Damage') },
  { key: 'deathRayDamage', pattern: numRe('Death Ray Damage') },
  { key: 'smartMissileDamage', pattern: numRe('Smart Missile Damage') },
  { key: 'innerLandMineDamage', pattern: numRe('Inner Land Mine Damage') },
  { key: 'chainLightningDamage', pattern: numRe('Chain Lightning Damage') },
  { key: 'deathWaveDamage', pattern: numRe('Death Wave Damage') },
  { key: 'taggedByDeathwave', pattern: /Tagged by Deathwave\s+(\d+)/ },
  { key: 'swampDamage', pattern: numRe('Swamp Damage') },
  { key: 'blackHoleDamage', pattern: numRe('Black Hole Damage') },
  { key: 'electronsDamage', pattern: numRe('Electrons Damage') },

  // Utility
  { key: 'wavesSkipped', pattern: /Waves Skipped\s+(\d+)/ },
  { key: 'recoveryPackages', pattern: /Recovery Packages\s+(\d+)/ },
  { key: 'freeAttackUpgrade', pattern: /Free Attack Upgrade\s+(\d+)/ },
  { key: 'freeDefenseUpgrade', pattern: /Free Defense Upgrade\s+(\d+)/ },
  { key: 'freeUtilityUpgrade', pattern: /Free Utility Upgrade\s+(\d+)/ },
  { key: 'hpFromDeathWave', pattern: numRe('HP From Death Wave') },
  { key: 'coinsFromDeathWave', pattern: numRe('Coins From Death Wave') },
  { key: 'cashFromGoldenTower', pattern: cashRe('Cash From Golden Tower') },
  { key: 'coinsFromGoldenTower', pattern: numRe('Coins From Golden Tower') },
  { key: 'coinsFromBlackHole', pattern: numRe('Coins From Black Hole') },
  { key: 'coinsFromSpotlight', pattern: numRe('Coins From Spotlight') },
  { key: 'coinsFromOrb', pattern: numRe('Coins From Orb') },
  { key: 'coinsFromCoinUpgrade', pattern: numRe('Coins from Coin Upgrade') },
  { key: 'coinsFromCoinBonuses', pattern: numRe('Coins from Coin Bonuses') },

  // Enemies Destroyed
  { key: 'totalEnemies', pattern: /Total Enemies\s+(\d+)/ },
  { key: 'basicEnemies', pattern: /Basic\s+(\d+)/ },
  { key: 'fastEnemies', pattern: /Fast\s+(\d+)/ },
  { key: 'tankEnemies', pattern: /Tank\s+(\d+)/ },
  { key: 'rangedEnemies', pattern: /Ranged\s+(\d+)/ },
  { key: 'bossEnemies', pattern: /Boss\s+(\d+)/ },
  { key: 'protectorEnemies', pattern: /Protector\s+(\d+)/ },
  { key: 'totalElites', pattern: /Total Elites\s+(\d+)/ },
  { key: 'vampires', pattern: /Vampires\s+(\d+)/ },
  { key: 'rays', pattern: /Rays\s+(\d+)/ },
  { key: 'scatters', pattern: /Scatters\s+(\d+)/ },
  { key: 'saboteur', pattern: /Saboteur\s+(\d+)/ },
  { key: 'commander', pattern: /Commander\s+(\d+)/ },
  { key: 'overcharge', pattern: /Overcharge\s+(\d+)/ },
  { key: 'destroyedByOrbs', pattern: /Destroyed By Orbs\s+(\d+)/ },
  { key: 'destroyedByThorns', pattern: /Destroyed by Thorns\s+(\d+)/ },
  { key: 'destroyedByDeathRay', pattern: /Destroyed by Death Ray\s+(\d+)/ },
  { key: 'destroyedByLandMine', pattern: /Destroyed by Land Mine\s+(\d+)/ },
  { key: 'destroyedInSpotlight', pattern: /Destroyed in Spotlight\s+(\d+)/ },

  // Bots
  { key: 'flameBotDamage', pattern: numRe('Flame Bot Damage') },
  { key: 'thunderBotStuns', pattern: /Thunder Bot Stuns\s+(\d+)/ },
  { key: 'goldenBotCoins', pattern: numRe('Golden Bot Coins Earned') },
  { key: 'destroyedInGoldenBot', pattern: /Destroyed in Golden Bot\s+(\d+)/ },
  { key: 'guardianDamage', pattern: numRe('Guardian Damage') },
  { key: 'summonedEnemies', pattern: /Summoned enemies\s+(\d+)/ },
  { key: 'guardianCoinsStolen', pattern: numRe('Guardian coins stolen') },
  { key: 'coinsFetched', pattern: numRe('Coins Fetched') },
  { key: 'gems', pattern: /(?:^|\s)Gems\s+(\d+)/ },
  { key: 'medals', pattern: /Medals\s+(\d+)/ },
  { key: 'rerollShards', pattern: /(?:^|\s)Reroll Shards\s+(\d+)(?!\s*Earned)/ },
  { key: 'cannonShards', pattern: /Cannon Shards\s+(\d+)/ },
  { key: 'armorShards', pattern: /Armor Shards\s+(\d+)/ },
  { key: 'generatorShards', pattern: /Generator Shards\s+(\d+)/ },
  { key: 'coreShards', pattern: /Core Shards\s+(\d+)/ },
  { key: 'commonModules', pattern: /Common Modules\s+(\d+)/ },
  { key: 'rareModules', pattern: /Rare Modules\s+(\d+)/ },
];

// Fields that are text values, not numbers
const TEXT_FIELDS = new Set(['battleDate', 'killedBy', 'gameTimeRaw', 'realTimeRaw']);

/**
 * Parse a full battle report text into a structured object.
 * Returns null if the text doesn't look like a valid report.
 */
export function parseBattleReport(text) {
  if (!text || typeof text !== 'string') return null;

  // Normalize whitespace (but preserve case)
  const normalized = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  // Quick sanity check — must contain "Battle" and "Wave"
  if (!normalized.includes('Battle') || !normalized.includes('Wave')) return null;

  const result = {};
  let matchCount = 0;

  for (const { key, pattern } of FIELD_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      matchCount++;
      if (TEXT_FIELDS.has(key)) {
        result[key] = match[1].trim();
      } else {
        result[key] = parseNumberWithSuffix(match[1]);
      }
    }
  }

  // Need at least a few fields to consider it valid
  if (matchCount < 3) return null;

  // Compute derived fields
  result.gameTimeSeconds = parseTimeToSeconds(result.gameTimeRaw);
  result.realTimeSeconds = parseTimeToSeconds(result.realTimeRaw);

  // Generate a unique ID based on battle date + wave + tier
  result.id = `${result.battleDate || ''}_${result.tier || ''}_${result.wave || ''}_${Date.now()}`;

  return result;
}
