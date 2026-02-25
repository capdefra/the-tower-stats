-- The Tower Stats — Supabase schema
-- Run this in the Supabase SQL Editor to create the 'runs' table.

CREATE TABLE IF NOT EXISTS runs (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT now(),

  -- Meta
  battle_date   TEXT,
  game_time_sec INTEGER,
  real_time_sec INTEGER,
  tier          SMALLINT,
  wave          INTEGER,
  killed_by     TEXT,

  -- Economy (use NUMERIC for arbitrarily large numbers)
  coins_earned        NUMERIC,
  coins_per_hour      NUMERIC,
  cash_earned         NUMERIC,
  interest_earned     NUMERIC,
  gem_blocks_tapped   INTEGER,
  cells_earned        NUMERIC,
  reroll_shards_earned NUMERIC,

  -- Combat
  damage_dealt                NUMERIC,
  damage_taken                NUMERIC,
  damage_taken_wall           NUMERIC,
  damage_taken_while_berserked NUMERIC,
  damage_gain_from_berserk    NUMERIC,
  death_defy                  INTEGER,
  lifesteal                   NUMERIC,

  -- Projectiles
  projectiles_damage NUMERIC,
  projectiles_count  NUMERIC,

  -- Skills
  thorn_damage            NUMERIC,
  orb_damage              NUMERIC,
  enemies_hit_by_orbs     NUMERIC,
  land_mine_damage        NUMERIC,
  land_mines_spawned      INTEGER,
  rend_armor_damage       NUMERIC,
  death_ray_damage        NUMERIC,
  smart_missile_damage    NUMERIC,
  inner_land_mine_damage  NUMERIC,
  chain_lightning_damage  NUMERIC,
  death_wave_damage       NUMERIC,
  tagged_by_deathwave     INTEGER,
  swamp_damage            NUMERIC,
  black_hole_damage       NUMERIC,
  electrons_damage        NUMERIC,

  -- Utility
  waves_skipped           INTEGER,
  recovery_packages       INTEGER,
  free_attack_upgrade     INTEGER,
  free_defense_upgrade    INTEGER,
  free_utility_upgrade    INTEGER,
  hp_from_death_wave      NUMERIC,
  coins_from_death_wave   NUMERIC,
  cash_from_golden_tower  NUMERIC,
  coins_from_golden_tower NUMERIC,
  coins_from_black_hole   NUMERIC,
  coins_from_spotlight    NUMERIC,
  coins_from_orb          NUMERIC,
  coins_from_coin_upgrade NUMERIC,
  coins_from_coin_bonuses NUMERIC,

  -- Enemies
  total_enemies           INTEGER,
  basic_enemies           INTEGER,
  fast_enemies            INTEGER,
  tank_enemies            INTEGER,
  ranged_enemies          INTEGER,
  boss_enemies            INTEGER,
  protector_enemies       INTEGER,
  total_elites            INTEGER,
  vampires                INTEGER,
  rays                    INTEGER,
  scatters                INTEGER,
  saboteur                INTEGER,
  commander               INTEGER,
  overcharge              INTEGER,
  destroyed_by_orbs       INTEGER,
  destroyed_by_thorns     INTEGER,
  destroyed_by_death_ray  INTEGER,
  destroyed_by_land_mine  INTEGER,
  destroyed_in_spotlight  INTEGER,

  -- Bots
  flame_bot_damage        NUMERIC,
  thunder_bot_stuns       INTEGER,
  golden_bot_coins        NUMERIC,
  destroyed_in_golden_bot INTEGER,
  guardian_damage          NUMERIC,
  summoned_enemies         INTEGER
);

-- Enable Row Level Security but allow public reads and inserts (anonymous)
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON runs
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON runs
  FOR INSERT WITH CHECK (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_runs_tier_wave ON runs (tier, wave);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs (created_at DESC);
