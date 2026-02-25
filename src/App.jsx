import { useState } from 'react';
import PasteInput from './components/PasteInput';
import LocalHistory from './components/LocalHistory';
import Dashboard from './components/Dashboard';

const TABS = ['Import', 'History', 'Dashboard'];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSaved() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header + Tabs (sticky together) */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-amber-400 tracking-tight">
            The Tower Stats
          </h1>
          <span className="text-xs text-gray-500 hidden sm:inline">
            Idle Tower Defense Run Tracker
          </span>
        </div>
        <nav className="max-w-4xl mx-auto px-3 sm:px-4">
          <div className="flex border-b border-gray-800 overflow-x-auto">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`cursor-pointer shrink-0 px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  i === activeTab
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === 0 && <PasteInput onSaved={handleSaved} />}
        {activeTab === 1 && <LocalHistory refreshKey={refreshKey} />}
        {activeTab === 2 && <Dashboard refreshKey={refreshKey} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-8">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 text-center text-xs text-gray-600">
          The Tower Stats &mdash; Not affiliated with the game developers.
        </div>
      </footer>
    </div>
  );
}
