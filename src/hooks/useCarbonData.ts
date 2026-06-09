import { useEffect, useMemo } from 'react';
import { useAppStore, useUser, useLogs } from '../store';
import { subscribeToRecentLogs } from '../services/firestore';
import {
  computeCarbonScore,
  getCarbonStreak,
  getCategoryMeta,
} from '../utils/carbonCalc';
import type { CategoryType, CategorySummary, WeeklyDataPoint } from '../types';

export function useCarbonData(days = 30) {
  const user = useUser();
  const logs = useLogs();
  const { setLogs, setLogsLoading, profile } = useAppStore();

  useEffect(() => {
    if (!user) return;
    setLogsLoading(true);

    const unsubscribe = subscribeToRecentLogs(user.uid, days, (newLogs) => {
      setLogs(newLogs);
      setLogsLoading(false);
    });

    return unsubscribe;
  }, [user?.uid, days]);

  const score = useMemo(() => {
    if (!logs.length || !profile) return null;
    return computeCarbonScore(
      logs.map((l) => ({ kgCO2e: l.kgCO2e, date: l.date as any })),
      profile.country ?? 'Other'
    );
  }, [logs, profile]);

  const streak = useMemo(() => getCarbonStreak(
    logs.map((l) => ({ kgCO2e: l.kgCO2e, date: l.date as any }))
  ), [logs]);

  const categoryBreakdown = useMemo((): CategorySummary[] => {
    const categories: CategoryType[] = ['transport', 'energy', 'food', 'shopping', 'travel'];
    const totalKg = logs.reduce((s, l) => s + l.kgCO2e, 0);

    return categories.map((cat) => {
      const catLogs = logs.filter((l) => l.category === cat);
      const catKg = catLogs.reduce((s, l) => s + l.kgCO2e, 0);
      const meta = getCategoryMeta(cat);

      // Calculate trend vs previous period
      const half = Math.floor(days / 2);
      const midDate = new Date();
      midDate.setDate(midDate.getDate() - half);

      const getDate = (d: any) => (d instanceof Date ? d : d.toDate?.() ?? new Date());
      const recentKg = catLogs
        .filter((l) => getDate(l.date) >= midDate)
        .reduce((s, l) => s + l.kgCO2e, 0);
      const prevKg = catLogs
        .filter((l) => getDate(l.date) < midDate)
        .reduce((s, l) => s + l.kgCO2e, 0);

      const trendPercent =
        prevKg > 0 ? ((recentKg - prevKg) / prevKg) * 100 : 0;
      const trend = trendPercent < -5 ? 'down' : trendPercent > 5 ? 'up' : 'stable';

      return {
        category: cat,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
        kgCO2e: catKg,
        percentage: totalKg > 0 ? (catKg / totalKg) * 100 : 0,
        trend,
        trendPercent,
      };
    });
  }, [logs, days]);

  const weeklyData = useMemo((): WeeklyDataPoint[] => {
    const result: WeeklyDataPoint[] = [];
    const getDate = (d: any) => (d instanceof Date ? d : d.toDate?.() ?? new Date());

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
      const dayKey = date.toISOString().split('T')[0];

      const dayLogs = logs.filter(
        (l) => getDate(l.date).toISOString().split('T')[0] === dayKey
      );

      const point: WeeklyDataPoint = {
        date: dateStr,
        transport: 0,
        energy: 0,
        food: 0,
        shopping: 0,
        travel: 0,
        total: 0,
      };

      for (const log of dayLogs) {
        point[log.category] += log.kgCO2e;
        point.total += log.kgCO2e;
      }

      // Round all values
      for (const key of Object.keys(point)) {
        if (key !== 'date') {
          (point as any)[key] = Math.round((point as any)[key] * 100) / 100;
        }
      }

      result.push(point);
    }

    return result;
  }, [logs]);

  const topCategory = useMemo((): CategoryType => {
    const top = categoryBreakdown.reduce(
      (max, c) => (c.kgCO2e > max.kgCO2e ? c : max),
      categoryBreakdown[0]
    );
    return top?.category ?? 'transport';
  }, [categoryBreakdown]);

  return { score, streak, categoryBreakdown, weeklyData, topCategory, logs };
}
