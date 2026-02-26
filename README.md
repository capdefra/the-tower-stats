# The Tower Stats

A web app for **The Tower - Idle Tower Defense** players to track run statistics. Paste your Battle Report, see parsed stats instantly, save locally, and track progress over time with charts.

**Live site:** [https://capdefra.github.io/the-tower-stats/](https://capdefra.github.io/the-tower-stats/)

## Features

- **Battle Report Parser** — Paste raw text from the game, auto-parsed with support for all unit suffixes (K through D, plus two-letter codes aa, ab, ac...).
- **Live Preview** — Summary card before saving (Tier, Wave, Coins, Cells, Elites, etc.).
- **Import Validation** — Reports missing a battle date/time are blocked from saving.
- **Local Storage** — All data stored in the browser (like 2048/Wordle). No account needed.
- **Duplicate Detection** — Same battle date = overwrites existing entry.
- **History Management** — Edit raw data or delete individual runs via 3-dot menu.
- **Export / Import** — Download your data as JSON, import on another device.
- **Dashboard** — Dual-axis temporal chart (left + right Y-axis) with 70+ metrics organized by section.
- **Mobile Responsive** — Card layout on phones, table layout on desktop.

## Tech Stack

- React (Vite)
- Tailwind CSS v4 (dark theme)
- Chart.js + react-chartjs-2
- LocalStorage for persistence
- GitHub Pages for hosting

## Getting Started

### Install & run locally

```bash
npm install
npm run dev
```

### Deploy to GitHub Pages

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys on every push to `main`.

**To publish a new version:**

```bash
# 1. Make your changes
# 2. Commit and push to main
git add .
git commit -m "your changes"
git push origin main
```

That's it — GitHub Actions will build and deploy automatically. The site updates within ~30 seconds at:
`https://capdefra.github.io/the-tower-stats/`

**First-time setup** (already done for this repo):

1. Go to your repo on GitHub
2. **Settings > Pages**
3. Set Source to **GitHub Actions**

## Unit Suffix Reference

| Suffix | Multiplier | Suffix | Multiplier |
|--------|-----------|--------|-----------|
| K      | 10^3      | O      | 10^27     |
| M      | 10^6      | N      | 10^30     |
| B      | 10^9      | D      | 10^33     |
| T      | 10^12     | aa     | 10^36     |
| q      | 10^15     | ab     | 10^39     |
| Q      | 10^18     | ac     | 10^42     |
| s      | 10^21     | ...    | +3 each   |
| S      | 10^24     |        |           |

Note: Suffixes are **case-sensitive** (`q` and `Q`, `s` and `S` are different values).
