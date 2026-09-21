'use client';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OptimizedSet } from '@/lib/ffxi/types';

export function SetChart({ results }: { results: OptimizedSet[] }) {
  const rows: { name: string; Low: number; High: number }[] = [];
  const byBase: Record<string, { Low?: number; High?: number; label: string }> = {};
  for (const r of results ?? []) {
    const k = r?.context?.kind;
    let metric = 0;
    let short = '';
    if (k === 'tp') { metric = r.evaluation?.summary?.dps ?? 0; short = 'TP DPS'; }
    else if (k === 'hybrid') { metric = r.evaluation?.summary?.dps ?? 0; short = 'Hybrid DPS'; }
    else if (k === 'ws') { metric = (r.evaluation?.summary?.wsDamage ?? 0) / 10; short = `${(r.context?.wsName ?? 'WS').split(' ')[0]} ÷10`; }
    else continue;
    const base = r.key?.split(':').slice(0, -1).join(':') ?? short;
    byBase[base] ??= { label: short };
    if (r.tier === 'high') byBase[base].High = Math.round(metric); else byBase[base].Low = Math.round(metric);
  }
  for (const b of Object.values(byBase)) rows.push({ name: b.label, Low: b.Low ?? 0, High: b.High ?? 0 });
  if (!rows.length) return <div className="text-xs text-muted-foreground">Run the optimizer to compare sets.</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
        <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} interval={0} />
        <YAxis tickLine={false} tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(222 36% 12%)', border: 'none', borderRadius: 6 }} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Low" fill="#60B5FF" radius={[3, 3, 0, 0]} isAnimationActive />
        <Bar dataKey="High" fill="#FF9149" radius={[3, 3, 0, 0]} isAnimationActive />
      </BarChart>
    </ResponsiveContainer>
  );
}
