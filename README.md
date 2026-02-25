# The Tower Stats

A web application for **The Tower - Idle Tower Defense** players to track their run statistics. Paste your Battle Report text and instantly see parsed stats, save runs locally, and contribute to a global dashboard.

## Features

- **Battle Report Parser** — Paste raw text from the game, auto-parsed with support for all unit suffixes (K, M, B, T, q, Q, s, S).
- **Live Preview** — See a summary card before saving (Tier, Wave, Coins, Cells, Elites, etc.).
- **Local History** — Your last 10 runs are saved in the browser (LocalStorage).
- **Global Dashboard** — Table + Chart.js line graphs (Coins vs Wave, Cells vs Tier, Damage vs Wave) powered by Supabase.

## Tech Stack

- React (Vite)
- Tailwind CSS v4 (dark theme)
- Supabase (PostgreSQL, free tier)
- Chart.js + react-chartjs-2

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase (optional — local history works without it)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the contents of `supabase_schema.sql` to create the `runs` table.
3. Copy your project URL and anon key from **Settings > API**.
4. Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run the dev server

```bash
npm run dev
```

### 4. Deploy to GitHub Pages

```bash
npm run build
# The output is in the dist/ folder.
# Push it to the gh-pages branch or use GitHub Actions.
```

The `vite.config.js` already sets `base: '/the-tower-stats/'` for GitHub Pages compatibility.

## Project Structure

```
├── index.html
├── supabase_schema.sql       # SQL to create the runs table
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── index.css              # Tailwind import
│   ├── App.jsx                # Root component with tab navigation
│   ├── components/
│   │   ├── PasteInput.jsx     # Paste textarea + live preview + save
│   │   ├── LocalHistory.jsx   # Last 10 runs from LocalStorage
│   │   └── Dashboard.jsx      # Global table + Chart.js graphs
│   ├── lib/
│   │   └── supabase.js        # Supabase client + insert/fetch helpers
│   └── utils/
│       ├── parser.js          # Battle report regex parser
│       └── storage.js         # LocalStorage helpers
```

## Unit Suffix Reference

| Suffix | Multiplier |
|--------|-----------|
| K      | 10^3      |
| M      | 10^6      |
| B      | 10^9      |
| T      | 10^12     |
| q      | 10^15     |
| Q      | 10^18     |
| s      | 10^21     |
| S      | 10^24     |

Note: `q` and `Q` (and `s` and `S`) are different orders of magnitude (case-sensitive).
