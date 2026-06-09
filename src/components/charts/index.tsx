import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart,
} from 'recharts';
import type { WeeklyDataPoint, CategorySummary } from '../../types';

const CATEGORY_COLORS = {
  transport: '#4895EF',
  energy: '#F4A261',
  food: '#74C69D',
  shopping: '#9D4EDD',
  travel: '#774936',
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);

  return (
    <div className="bg-eco-ink text-white text-xs rounded-xl p-3 shadow-xl min-w-36">
      <p className="font-semibold mb-2 text-eco-mint">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono">{entry.value?.toFixed(2)} kg</span>
        </div>
      ))}
      <div className="border-t border-white/20 mt-2 pt-2 flex justify-between">
        <span className="text-white/60">Total</span>
        <span className="font-mono font-bold">{total.toFixed(2)} kg</span>
      </div>
    </div>
  );
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────

interface WeeklyChartProps {
  data: WeeklyDataPoint[];
}

export const WeeklyBarChart = React.memo(function WeeklyBarChart({ data }: WeeklyChartProps) {
  return (
    <div
      role="img"
      aria-label="Weekly carbon emissions bar chart showing daily breakdown by category"
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6C757D' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6C757D' }}
            tickLine={false}
            axisLine={false}
            unit=" kg"
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="transport" name="Transport" stackId="a" fill={CATEGORY_COLORS.transport} radius={[0,0,0,0]} />
          <Bar dataKey="energy" name="Energy" stackId="a" fill={CATEGORY_COLORS.energy} />
          <Bar dataKey="food" name="Food" stackId="a" fill={CATEGORY_COLORS.food} />
          <Bar dataKey="shopping" name="Shopping" stackId="a" fill={CATEGORY_COLORS.shopping} />
          <Bar dataKey="travel" name="Travel" stackId="a" fill={CATEGORY_COLORS.travel} radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
      {/* Accessible data table */}
      <table className="sr-only">
        <caption>Weekly carbon emissions by category</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Transport (kg)</th>
            <th>Energy (kg)</th>
            <th>Food (kg)</th>
            <th>Shopping (kg)</th>
            <th>Travel (kg)</th>
            <th>Total (kg)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td>{row.transport}</td>
              <td>{row.energy}</td>
              <td>{row.food}</td>
              <td>{row.shopping}</td>
              <td>{row.travel}</td>
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// ─── Category Donut Chart ─────────────────────────────────────────────────────

interface DonutChartProps {
  categories: CategorySummary[];
}

export const CategoryDonutChart = React.memo(function CategoryDonutChart({ categories }: DonutChartProps) {
  const data = categories.filter((c) => c.kgCO2e > 0);
  const total = data.reduce((s, c) => s + c.kgCO2e, 0);

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-eco-slate text-sm">
        No data yet — log some activities!
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Carbon emissions breakdown: ${data.map((c) => `${c.label} ${c.percentage.toFixed(0)}%`).join(', ')}`}
    >
      <div className="flex items-center gap-6">
        <div className="relative" style={{ width: 160, height: 160 }}>
          <PieChart width={160} height={160}>
            <Pie
              data={data}
              cx={75}
              cy={75}
              innerRadius={52}
              outerRadius={72}
              dataKey="kgCO2e"
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
            >
              {data.map((cat) => (
                <Cell key={cat.category} fill={cat.color} />
              ))}
            </Pie>
          </PieChart>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono font-bold text-lg text-eco-ink">
              {total.toFixed(1)}
            </span>
            <span className="text-eco-slate text-xs">kg CO₂e</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((cat) => (
            <div key={cat.category} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-eco-ink flex-1">{cat.icon} {cat.label}</span>
              <span className="text-xs font-mono text-eco-slate">{cat.kgCO2e.toFixed(1)} kg</span>
              <span className="text-xs font-medium w-10 text-right" style={{ color: cat.color }}>
                {cat.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── Trend Line Chart ─────────────────────────────────────────────────────────

interface TrendChartProps {
  data: WeeklyDataPoint[];
}

export const TrendLineChart = React.memo(function TrendLineChart({ data }: TrendChartProps) {
  // Generate a simple linear forecast for the next 3 days
  const forecast = useMemo(() => {
    if (data.length < 3) return [];
    const vals = data.slice(-3).map((d) => d.total);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    const trend = (vals[vals.length - 1] - vals[0]) / 3;

    return [1, 2, 3].map((i) => ({
      date: `+${i}d`,
      total: Math.max(0, avg + trend * i),
      forecast: Math.max(0, avg + trend * i),
    }));
  }, [data]);

  const combined = [
    ...data.map((d) => ({ ...d, forecast: undefined })),
    ...forecast,
  ];

  return (
    <div role="img" aria-label="Carbon trend line chart with 3-day forecast">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={combined} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#40916C" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#40916C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#74C69D" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#74C69D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6C757D' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6C757D' }} tickLine={false} axisLine={false} unit=" kg" width={42} />
          <Tooltip formatter={(v: any) => [`${Number(v || 0).toFixed(2)} kg CO₂e`, '']} />
          <Area type="monotone" dataKey="total" stroke="#40916C" strokeWidth={2} fill="url(#totalGrad)" dot={false} name="Actual" />
          <Area type="monotone" dataKey="forecast" stroke="#74C69D" strokeWidth={2} strokeDasharray="4 4" fill="url(#forecastGrad)" dot={false} name="Forecast" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
