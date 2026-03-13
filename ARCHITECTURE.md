# The Tower Stats — Architecture Guide

A client-side web app for tracking and analyzing runs from **The Tower — Idle Tower Defense**. Players paste in-game battle reports to accumulate stats over time, log upgrade milestones, and visualize progression through charts.

Live at: **https://capdefra.github.io/the-tower-stats/**

---

## Tech Stack

| Layer        | Technology                                     |
| ------------ | ---------------------------------------------- |
| Framework    | React 19 (Vite 7)                              |
| Styling      | Tailwind CSS v4 (dark theme, amber accents)     |
| Charts       | Chart.js 4.5 + react-chartjs-2 5.3             |
| Storage      | Browser `localStorage` (no backend)             |
| Deployment   | GitHub Pages via `gh-pages`                     |

---

## Project Structure

```
the-tower-stats/
├── index.html              # Entry HTML — dark theme, viewport-fit=cover for iOS
├── vite.config.js          # Vite config — base path /the-tower-stats/, React + Tailwind plugins
├── package.json            # Dependencies and scripts
├── src/
│   ├── main.jsx            # React root — renders <App /> into #root
│   ├── App.jsx             # Top-level layout — header, tab navigation, footer
│   ├── index.css           # Tailwind import (@import "tailwindcss")
│   ├── components/
│   │   ├── PasteInput.jsx  # Battle report paste/import + live preview + save
│   │   ├── LocalHistory.jsx# Run history table — view, edit, delete, export/import
│   │   ├── Milestones.jsx  # Milestone tracking — Workshop, Lab, Cards, UW, Bots
│   │   ├── Dashboard.jsx   # Multi-metric chart + data table with dual Y-axis
│   │   └── Stats.jsx       # Aggregated stats (daily/weekly/monthly) + milestone overlay
│   ├── data/
│   │   ├── labResearch.js  # Lab research categories and items
│   │   ├── workshop.js     # Workshop unlock and upgrade lists
│   │   ├── cards.js        # Card tiers (Common, Rare, Epic)
│   │   ├── ultimateWeapons.js # Ultimate Weapon names and upgrade trees
│   │   └── bots.js         # Bot names and upgrade trees
│   └── utils/
│       ├── parser.js       # Battle report text parser + number formatting
│       └── storage.js      # localStorage CRUD for runs and milestones
└── .claude/
    └── launch.json         # Dev server config for Claude preview
```

---

## App Tabs & Navigation

`App.jsx` manages a simple tab-based SPA (no router). Five tabs render their respective components:

| Index | Tab          | Component        | Purpose                                       |
| ----- | ------------ | ---------------- | --------------------------------------------- |
| 0     | **Import**   | `PasteInput`     | Paste or clipboard-import a battle report      |
| 1     | **History**  | `LocalHistory`   | Browse, edit raw JSON, delete, export/import   |
| 2     | **Milestones** | `Milestones`  | Track upgrades (Workshop, Lab, Cards, UW, Bots)|
| 3     | **Dashboard** | `Dashboard`    | Chart any metrics over time with dual Y-axis   |
| 4     | **Stats**    | `Stats`          | Aggregated periods + milestone diamond overlay  |

A `refreshKey` counter is passed down and incremented whenever data changes (save, delete, import), triggering re-reads from localStorage.

---

## Data Flow

### Battle Reports

```
User pastes text → parseBattleReport() → structured object → saveLocalRun() → localStorage
```

1. **Parsing** (`utils/parser.js`): Regex-based extraction of 60+ fields from the game's battle report text. Handles the game's custom number suffixes (K, M, B, T, q, Q, s, S, O, N, D, aa–az for values up to 10^111).

2. **Storage** (`utils/storage.js`): Runs are stored as a JSON array under `localStorage['tower-stats-history']`. Deduplication is by `battleDate` — re-importing the same date overwrites the existing entry.

3. **Export/Import**: Full data export includes both runs and milestones in a versioned JSON format. Import handles both legacy (bare array) and new (`{ version, runs, milestones }`) formats with deduplication.

### Milestones

```
User selects upgrade → saveMilestone() → localStorage['tower-stats-milestones']
```

Each milestone has: `type`, `subtype`, `name`, `date`, and type-specific fields (e.g., `levels`, `level`, `enteredTime`, `multiplier`).

---

## Component Details

### PasteInput (`components/PasteInput.jsx`)

- Textarea for pasting battle report text
- Clipboard API button for one-click import
- Live preview card showing parsed key stats (Tier, Wave, Coins, etc.)
- Auto-parses on paste, saves on button click
- Duplicate detection (same `battleDate` → updates existing entry)

### LocalHistory (`components/LocalHistory.jsx`)

- Responsive layout: card view on mobile, table on desktop
- Per-run dot menu with Edit (raw JSON modal) and Delete
- Bulk actions: Export (JSON download), Import (file upload), Clear All
- Import supports legacy and new data formats

### Milestones (`components/Milestones.jsx`)

Tabbed interface with five milestone types:

| Tab                | Type              | Subtypes                        |
| ------------------ | ----------------- | ------------------------------- |
| **Workshop**       | `workshop`        | `workshop_unlock`, `workshop_upgrade` |
| **Lab Research**   | `lab_research`    | —                               |
| **Cards**          | `cards`           | `new_card_slot`, `card_upgrade` |
| **Ultimate Weapons** | `ultimate_weapons` | `uw_unlock`, `uw_upgrade`    |
| **Bots**           | `bots`            | `bot_unlock`, `bot_upgrade`     |

**Key sub-components:**

- **`ResearchPicker`**: Reusable searchable grouped dropdown. Searches across both category names and item names simultaneously. Category matches highlight the header in amber; item matches highlight the matched text. Used by Lab Research, Workshop Upgrades, Card Upgrades, UW Upgrades, and Bot Upgrades.

- **`CountdownTimer`**: Live countdown to research completion. Accepts entered time + game speed multiplier and calculates a real completion timestamp.

- Each section (e.g., `WorkshopSection`, `LabResearchSection`, `CardsSection`, `UltimateWeaponsSection`, `BotsSection`) follows the same pattern:
  - Mode toggle (unlock vs. upgrade where applicable)
  - Form inputs for the specific milestone type
  - Save button → calls `saveMilestone()`
  - History list below with mobile cards and desktop table

### Dashboard (`components/Dashboard.jsx`)

- **MetricPicker**: Dropdown to select from 60+ metrics organized in sections (Overview, Economy, Combat, Utility, Enemies, Bots, Rewards)
- **Dual Y-axis chart**: Click metric pills to assign Left (amber) or Right (blue) axis
- **TierFilter**: Dropdown to filter runs by game tier
- **TimelineSlider**: Dual-handle range slider to zoom into a date window
- **Data table**: Shows selected metrics for visible runs, color-coded by axis assignment

### Stats (`components/Stats.jsx`)

- **Period aggregation**: Groups runs into Daily, Weekly, or Monthly buckets and computes averages
- **TimelineSlider**: Same dual-handle range slider as Dashboard
- **Metric sections**: Collapsible sections for Coins, Coins/Hour, Cells, Reroll Shards — each with its own line chart
- **Milestone overlay**: Colored diamond markers on charts when a milestone falls within an aggregation period
- **Milestone filters**: Toggle visibility by type/subtype (Lab Research, Workshop Unlock/Upgrade, Card Slot/Upgrade, UW Unlock/Upgrade, Bot Unlock/Upgrade)
- **MilestoneDetailPanel**: Fixed bottom panel that appears when a milestone diamond is selected
  - **Upgrades tab**: Lists all milestones for that date/period, grouped by type with colored badges
  - **Impact tab**: Before/after metric comparison using sliding windows:
    - Daily: 5 days before vs. 5 days after (excluding milestone day)
    - Weekly: 1 week before vs. 1 week after (excluding milestone week)
    - Monthly: 1 month before vs. 1 month after (excluding milestone month)
  - Expandable/collapsible with arrow toggle
  - iOS safe area padding via `env(safe-area-inset-bottom)`

---

## Data Files (`src/data/`)

Static game data used to populate milestone form dropdowns:

| File                 | Exports                           | Content                                                 |
| -------------------- | --------------------------------- | ------------------------------------------------------- |
| `labResearch.js`     | `LAB_RESEARCH` (default)          | 12 categories, 100+ research items                      |
| `workshop.js`        | `WORKSHOP_UNLOCKS`, `WORKSHOP_UPGRADES` | 3 categories each (Attack, Defense, Utility)     |
| `cards.js`           | `CARDS` (default)                 | 3 tiers: Common (12), Rare (8), Epic (8)                |
| `ultimateWeapons.js` | `UW_LIST`, `UW_UPGRADES`          | 9 weapons, 4 upgrades each (incl. UW+ variants)        |
| `bots.js`            | `BOT_LIST`, `BOT_UPGRADES`        | 4 bots, 4 upgrades each                                |

All follow the `{ category, items[] }` grouped structure for use with `ResearchPicker`.

---

## Utils

### `parser.js`

- **`parseNumberWithSuffix(str)`**: Converts game-formatted numbers like `"2.46B"`, `"44.48q"`, `"3.50aa"` into raw floats. Supports single-char suffixes (K through D) and two-char suffixes (aa through az, covering up to 10^111).
- **`formatNumber(num)`**: Reverse operation — formats raw numbers back into human-readable form with the appropriate suffix.
- **`parseTimeToSeconds(str)` / `formatSeconds(sec)`**: Converts between `"22h 42m 35s"` format and total seconds.
- **`parseBattleReport(text)`**: Main parser. Normalizes whitespace, runs 60+ regex patterns to extract fields, computes derived values (game/real time in seconds), generates a unique ID. Returns `null` if fewer than 3 fields match.

### `storage.js`

Two localStorage keys:
- `tower-stats-history` — array of parsed run objects
- `tower-stats-milestones` — array of milestone objects

**Run operations**: `getLocalRuns()`, `saveLocalRun()`, `deleteLocalRun()`, `updateLocalRun()`, `clearLocalRuns()`

**Milestone operations**: `getMilestones()`, `saveMilestone()`, `deleteMilestone()`, `clearMilestones()`

**Export/Import**: `exportLocalRuns()` bundles both runs + milestones into a versioned JSON object. `importLocalRuns()` handles both legacy and new formats with deduplication by `battleDate` (runs) and `id` (milestones).

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npx gh-pages -d dist
```

The Vite config sets `base: '/the-tower-stats/'` so all assets resolve correctly on GitHub Pages.

---

## Key Patterns

- **No backend**: Everything runs client-side. Data lives in `localStorage`.
- **No router**: Tab navigation is managed by a simple `activeTab` state index in `App.jsx`.
- **Responsive design**: All components use mobile-first layouts — card views on small screens, tables on `sm:` breakpoints.
- **Dark theme**: The entire app uses a gray-950 background with amber-400/500 accents. Tailwind v4 dark classes throughout.
- **Grouped dropdowns**: The `ResearchPicker` component is reused across all milestone sections for consistent searchable, grouped selection.
- **Chart.js registration**: Both `Dashboard.jsx` and `Stats.jsx` register Chart.js components at module level.
- **Refresh propagation**: `refreshKey` counter in `App.jsx` propagates data changes to sibling components via props.
