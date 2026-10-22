import React from 'react';
import { ActiveTab } from '../types.ts';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { soundSynth } from '../utils/audio.ts';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onRunDiagnostics: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRunDiagnostics,
}) => {
  const [isMuted, setIsMuted] = React.useState(soundSynth.getMuted());

  const handleMuteToggle = () => {
    const next = soundSynth.toggleMute();
    setIsMuted(next);
  };

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'physics', label: 'Physics Canvas' },
    { id: 'pathfinding', label: 'Pathfinding & Mazes' },
    { id: 'sorting', label: 'Sorting Benchmark' },
    { id: 'data-engine', label: 'Realtime Data Stream' },
    { id: 'architecture', label: 'System Architecture' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => {
            soundSynth.playClick();
            setActiveTab('physics');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left hover:text-indigo-600 transition-colors"
        >
          Engineering Benchmark Suite
        </button>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundSynth.playClick();
                  setActiveTab(item.id);
                }}
                className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                  isActive
                    ? 'text-slate-950 font-semibold border-b-2 border-slate-950 -mb-[2px]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action with audio mute secondary utility */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleMuteToggle}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            title={isMuted ? 'Unmute benchmark audio' : 'Mute benchmark audio'}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            onClick={() => {
              soundSynth.playClick();
              onRunDiagnostics();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Run Benchmark Suite</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation tab strip for small viewports */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 border-t border-slate-100 gap-4 text-xs font-medium bg-slate-50/70">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              soundSynth.playClick();
              setActiveTab(item.id);
            }}
            className={`whitespace-nowrap shrink-0 px-2 py-1 ${
              activeTab === item.id ? 'text-indigo-600 font-semibold' : 'text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
