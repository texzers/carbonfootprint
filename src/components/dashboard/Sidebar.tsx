import React from 'react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import { useCarbonData } from '../../hooks/useCarbonData';
import { ScoreRing, Badge } from '../shared';
import { getScoreColor, formatCO2 } from '../../utils/carbonCalc';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'logger', label: 'Log Activity', icon: '✏️' },
  { id: 'insights', label: 'AI Insights', icon: '🤖' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'reports', label: 'Reports', icon: '📄' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { profile, activeTab, setActiveTab, sidebarOpen, setSidebarOpen } = useAppStore();
  const { score } = useCarbonData(7);

  const scoreColor = score ? getScoreColor(score.rating) : '#40916C';
  const scorePercent = score
    ? Math.max(0, 100 - (score.daily / 20) * 100)
    : 0;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        aria-label="Main navigation"
        className={clsx(
          'fixed left-0 top-0 h-full w-64 bg-eco-forest text-white flex flex-col z-30',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-eco-mint/20 rounded-xl flex items-center justify-center">
              <span className="text-xl" aria-hidden="true">🌍</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-none">EcoTrack</h1>
              <p className="text-eco-mint text-xs mt-0.5">AI Carbon Coach</p>
            </div>
          </div>
        </div>

        {/* User + Score */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={`${user.displayName ?? 'User'}'s profile`}
                className="w-10 h-10 rounded-full border-2 border-eco-mint/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-eco-leaf flex items-center justify-center text-white font-bold">
                {(user?.displayName ?? 'U')[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {profile?.displayName ?? user?.displayName ?? 'EcoTracker'}
              </p>
              <p className="text-white/50 text-xs truncate">
                {profile?.city ?? ''}{profile?.country ? `, ${profile.country}` : ''}
              </p>
            </div>
          </div>

          {/* Score ring */}
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <ScoreRing
              value={scorePercent}
              color={scoreColor}
              size={52}
              strokeWidth={6}
            />
            <div>
              <p className="text-xs text-white/60">Today's footprint</p>
              <p className="font-mono font-bold text-base text-white">
                {score ? formatCO2(score.daily) : '—'}
              </p>
              {score && (
                <Badge
                  variant={
                    score.rating === 'excellent' || score.rating === 'good'
                      ? 'green'
                      : score.rating === 'average'
                      ? 'amber'
                      : 'red'
                  }
                  size="sm"
                >
                  {score.rating === 'excellent'
                    ? '🌟 Excellent'
                    : score.rating === 'good'
                    ? '✅ Good'
                    : score.rating === 'average'
                    ? '⚡ Average'
                    : '⚠️ High'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <ul className="flex-1 p-3 space-y-1 overflow-y-auto" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-mint',
                  activeTab === item.id
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                <span
                  className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all',
                    activeTab === item.id ? 'bg-eco-mint/20' : ''
                  )}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                {item.label}
                {activeTab === item.id && (
                  <div className="ml-auto w-1.5 h-5 bg-eco-mint rounded-full" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Quick add FAB */}
        <div className="p-4">
          <button
            onClick={() => setActiveTab('logger')}
            className="w-full flex items-center justify-center gap-2 bg-eco-mint text-eco-forest font-bold py-3 rounded-xl hover:bg-eco-mint/90 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
            aria-label="Quick-add a carbon log entry"
          >
            <span className="text-lg" aria-hidden="true">+</span>
            Log Activity
          </button>
        </div>

        {/* Sign out */}
        <div className="p-4 pt-0 border-t border-white/10">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 text-white/50 hover:text-white/80 text-xs py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-mint rounded-lg px-2"
          >
            <span aria-hidden="true">🚪</span>
            Sign out
          </button>
        </div>
      </nav>
    </>
  );
}
