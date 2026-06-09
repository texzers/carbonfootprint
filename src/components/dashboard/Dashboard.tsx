import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { useCarbonData } from '../../hooks/useCarbonData';
import { deleteCarbonLog } from '../../services/firestore';
import {
  Card, SectionHeader, MetricCard, ScoreRing, Badge, Button, EmptyState, ProgressBar,
} from '../shared';
import { WeeklyBarChart, CategoryDonutChart, TrendLineChart } from '../charts';
import { EcoCoachPanel } from '../insights/EcoCoachPanel';
import { getScoreColor, formatCO2, kgToTrees, getNationalAverage } from '../../utils/carbonCalc';
import { TARGET_1_5C_KG_YEAR } from '../../constants/emissionFactors';
import type { CarbonLog, CategoryType } from '../../types';
import { format } from 'date-fns';

function getDate(d: any): Date {
  return d instanceof Date ? d : d?.toDate?.() ?? new Date();
}

export function Dashboard() {
  const { user, profile, addNotification } = useAppStore();
  const { score, streak, categoryBreakdown, weeklyData, topCategory, logs } = useCarbonData(30);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nationalAvg = profile ? getNationalAverage(profile.country) : 7000;
  const annualProjection = score?.annualProjection ?? 0;
  const vsNational = nationalAvg > 0 ? ((annualProjection - nationalAvg) / nationalAvg) * 100 : 0;
  const vs1_5C = ((annualProjection - TARGET_1_5C_KG_YEAR) / TARGET_1_5C_KG_YEAR) * 100;

  const handleDeleteLog = async (logId: string) => {
    if (!user || !logId) return;
    setDeletingId(logId);
    try {
      await deleteCarbonLog(user.uid, logId);
      addNotification({ type: 'success', message: 'Activity log deleted.' });
    } catch {
      addNotification({ type: 'error', message: 'Failed to delete. Please try again.' });
    } finally {
      setDeletingId(null);
    }
  };

  const recentLogs = logs.slice(0, 10);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-2xl text-eco-ink">
                Good {getTimeGreeting()},{' '}
                <span className="text-eco-leaf">
                  {profile?.displayName?.split(' ')[0] ?? 'EcoTracker'}
                </span>{' '}
                👋
              </h1>
              <p className="text-eco-slate text-sm mt-1">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {streak > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                <span className="text-xl" aria-hidden="true">🔥</span>
                <div>
                  <p className="font-bold text-amber-700 text-sm">{streak}-day streak!</p>
                  <p className="text-amber-600 text-xs">Low-carbon days in a row</p>
                </div>
              </div>
            )}
          </div>

          {/* Score metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon="📅"
              label="Today"
              value={score ? formatCO2(score.daily) : '—'}
              subvalue="kg CO₂e emitted"
              color="#40916C"
            />
            <MetricCard
              icon="📆"
              label="This week"
              value={score ? formatCO2(score.weekly) : '—'}
              subvalue="7-day total"
              trend={score?.trend === 'improving' ? 'down' : score?.trend === 'worsening' ? 'up' : 'stable'}
              trendLabel={
                score
                  ? `${score.trend === 'improving' ? 'Improving' : score.trend === 'worsening' ? 'Increasing' : 'Stable'}`
                  : undefined
              }
              color="#4895EF"
            />
            <MetricCard
              icon="📊"
              label="Annual projection"
              value={score ? formatCO2(score.annualProjection) : '—'}
              subvalue={`vs ${formatCO2(TARGET_1_5C_KG_YEAR)} target`}
              color="#F4A261"
            />
            <MetricCard
              icon="🌳"
              label="Trees equivalent"
              value={score ? `${kgToTrees(Math.max(0, nationalAvg - annualProjection))}` : '—'}
              subvalue="trees saved vs avg"
              color="#74C69D"
            />
          </div>

          {/* Comparison widget */}
          <Card className="p-5">
            <SectionHeader
              title="How you compare"
              subtitle={`Your annual projection vs benchmarks`}
            />
            <div className="space-y-3">
              <ComparisonBar
                label="You"
                value={annualProjection}
                max={nationalAvg * 2}
                color={getScoreColor(score?.rating ?? 'average')}
              />
              <ComparisonBar
                label={`${profile?.country ?? 'National'} average`}
                value={nationalAvg}
                max={nationalAvg * 2}
                color="#6C757D"
              />
              <ComparisonBar
                label="1.5°C target"
                value={TARGET_1_5C_KG_YEAR}
                max={nationalAvg * 2}
                color="#40916C"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className={`p-3 rounded-xl text-sm ${vs1_5C <= 0 ? 'bg-eco-mist' : 'bg-amber-50'}`}>
                <p className="font-medium text-eco-ink">vs 1.5°C target</p>
                <p className={`font-bold text-lg font-mono ${vs1_5C <= 0 ? 'text-eco-leaf' : 'text-amber-600'}`}>
                  {vs1_5C <= 0 ? '✅ Under target' : `+${vs1_5C.toFixed(0)}% over`}
                </p>
              </div>
              <div className={`p-3 rounded-xl text-sm ${vsNational <= 0 ? 'bg-eco-mist' : 'bg-blue-50'}`}>
                <p className="font-medium text-eco-ink">vs national average</p>
                <p className={`font-bold text-lg font-mono ${vsNational <= 0 ? 'text-eco-leaf' : 'text-blue-600'}`}>
                  {vsNational <= 0 ? `${Math.abs(vsNational).toFixed(0)}% below` : `${vsNational.toFixed(0)}% above`}
                </p>
              </div>
            </div>
          </Card>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <SectionHeader title="Weekly emissions" subtitle="Last 7 days by category" />
              {weeklyData.length > 0 ? (
                <WeeklyBarChart data={weeklyData} />
              ) : (
                <EmptyState
                  icon="📊"
                  title="No data yet"
                  description="Log your first activity to see your weekly chart."
                />
              )}
            </Card>

            <Card className="p-5">
              <SectionHeader title="Category breakdown" subtitle="This month" />
              <CategoryDonutChart categories={categoryBreakdown} />
            </Card>
          </div>

          {/* Trend chart */}
          <Card className="p-5">
            <SectionHeader title="Monthly trend" subtitle="With 3-day forecast" />
            {weeklyData.length > 0 ? (
              <TrendLineChart data={weeklyData} />
            ) : (
              <EmptyState icon="📈" title="Build your trend" description="Track for a few days to see your trend line." />
            )}
          </Card>

          {/* Recent activity */}
          <Card className="p-5">
            <SectionHeader
              title="Recent activity"
              subtitle="Your last 10 logged entries"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => useAppStore.getState().setActiveTab('logger')}
                >
                  + Add entry
                </Button>
              }
            />
            {recentLogs.length === 0 ? (
              <EmptyState
                icon="✏️"
                title="Nothing logged yet"
                description="Start tracking your carbon footprint with your first activity."
                action={
                  <Button onClick={() => useAppStore.getState().setActiveTab('logger')}>
                    Log first activity
                  </Button>
                }
              />
            ) : (
              <ul role="list" className="space-y-2">
                {recentLogs.map((log) => (
                  <ActivityLogItem
                    key={log.id}
                    log={log}
                    onDelete={handleDeleteLog}
                    isDeleting={deletingId === log.id}
                  />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Right AI panel */}
      <div className="hidden xl:block w-80 border-l border-gray-100 overflow-hidden shrink-0">
        <EcoCoachPanel compact />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function ComparisonBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-eco-ink font-medium">{label}</span>
        <span className="font-mono text-eco-slate">{formatCO2(value)}/yr</span>
      </div>
      <div className="h-2 bg-eco-mist rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ActivityLogItem({
  log,
  onDelete,
  isDeleting,
}: {
  log: CarbonLog;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const CATEGORY_ICONS: Record<string, string> = {
    transport: '🚗', energy: '🏠', food: '🍔', shopping: '🛍️', travel: '✈️',
  };
  const CATEGORY_COLORS: Record<string, string> = {
    transport: 'bg-blue-50 text-blue-600',
    energy: 'bg-amber-50 text-amber-600',
    food: 'bg-eco-mist text-eco-forest',
    shopping: 'bg-purple-50 text-purple-600',
    travel: 'bg-orange-50 text-orange-700',
  };

  const date = getDate(log.date);
  const colorClass = CATEGORY_COLORS[log.category] ?? 'bg-gray-50 text-gray-600';

  return (
    <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-eco-mist/50 group transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${colorClass}`} aria-hidden="true">
        {CATEGORY_ICONS[log.category]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-eco-ink truncate">{log.activity}</p>
        <p className="text-xs text-eco-slate">
          {format(date, 'MMM d')} · {log.category}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-mono font-bold text-sm text-eco-ink">
          {log.kgCO2e.toFixed(2)} kg
        </p>
        <button
          onClick={() => log.id && onDelete(log.id)}
          disabled={isDeleting}
          className="text-xs text-eco-slate hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:text-red-500"
          aria-label={`Delete log: ${log.activity}`}
        >
          {isDeleting ? '…' : 'Delete'}
        </button>
      </div>
    </li>
  );
}
