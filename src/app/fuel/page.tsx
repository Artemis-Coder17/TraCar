'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useLogs, Log, computeFuelDerived } from '../../hooks/useLogs';
import { useVehicleSettings } from '../../hooks/useVehicleSettings';
import { ActivityList } from '../../components/ActivityList';
import { BottomNav } from '../../components/BottomNav';
import { haptic } from '../../lib/haptic';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

type Period = '3m' | '1yr' | 'All';
const PERIOD_LABELS: Period[] = ['3m', '1yr', 'All'];

function getWindowLogs(logs: Log[], period: Period): Log[] {
  const now = Date.now();
  if (period === 'All') return logs;
  const cutoff = period === '3m' ? now - 90 * 86400000 : now - 365 * 86400000;
  return logs.filter(l => l.date && new Date(l.date).getTime() >= cutoff);
}

function fmtFillDate(d?: string) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-IE', { day: '2-digit', month: 'short' });
}

function fmtChartDate(d: string, period: Period): string {
  const date = new Date(d + 'T12:00:00');
  if (period === '3m') return date.toLocaleDateString('en-IE', { day: '2-digit', month: 'short' });
  return date.toLocaleDateString('en-IE', { month: 'short', year: '2-digit' });
}

// Physically valid ranges — filter these out so outliers don't skew metrics
const VALID_CONS = [3, 30] as const;   // L/100km: below 3 or above 30 is a data error
const VALID_PRICE = [0.5, 5] as const; // €/litre: outside this window is implausible

function validCons(r: number) { return r >= VALID_CONS[0] && r <= VALID_CONS[1]; }
function validPrice(p: number) { return p >= VALID_PRICE[0] && p <= VALID_PRICE[1]; }

// ─── Chart info toggle ────────────────────────────────────────────────────────

function ChartInfoButton({ info }: { info: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors flex-shrink-0 ${open ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
      >ℹ</button>
      {open && (
        <div
          className="absolute right-0 top-7 w-56 rounded-xl p-3 z-10 text-[11px] text-zinc-300 leading-relaxed"
          style={{
            background: 'rgba(8,14,26,0.96)', border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)', animation: 'fadeSlideDown 0.18s ease',
          }}
        >{info}</div>
      )}
    </div>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ value, label, sub, subUp, info }: {
  value: string; label: string; sub?: string; subUp?: boolean | null; info?: string;
}) {
  const [open, setOpen] = useState(false);
  const subColor = subUp == null
    ? 'rgba(255,255,255,0.38)'
    : subUp ? 'var(--crimson)' : 'var(--emerald)';
  return (
    <div
      className={`glass-liquid rounded-xl p-4 min-h-[96px] transition-all ${info ? 'cursor-pointer select-none active:scale-[0.98]' : ''}`}
      onClick={() => info && setOpen(o => !o)}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
        {info && (
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-colors ${open ? 'bg-zinc-600 text-white' : 'bg-zinc-700/80 text-zinc-400'}`}
          >ℹ</span>
        )}
      </div>
      <p className="text-xl font-black text-white tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[10px] mt-2 font-semibold" style={{ color: subColor }}>{sub}</p>}
      {info && open && (
        <p
          className="text-[11px] text-zinc-400 mt-3 pt-3 border-t border-white/[0.08] leading-relaxed"
          style={{ animation: 'fadeSlideDown 0.2s ease' }}
        >{info}</p>
      )}
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function GlassTooltip({ active, payload, label, prefix = '', suffix = '' }: {
  active?: boolean; payload?: { value: number }[]; label?: string; prefix?: string; suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(8,14,26,0.96)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10, padding: '6px 12px',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 2 }}>{label}</p>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
        {prefix}{Number(payload[0].value).toFixed(2)}{suffix}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FuelPage() {
  const { vehicleId } = useVehicleSettings();
  const { logs, addLog } = useLogs(vehicleId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('1yr');
  const [dismissConsumption, setDismissConsumption] = useState(false);
  const [dismissSpend, setDismissSpend] = useState(false);

  const [fuelDate, setFuelDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fuelLitres, setFuelLitres] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelOdo, setFuelOdo] = useState('');
  const [fuelError, setFuelError] = useState<string | null>(null);

  const allFuelLogs = logs
    .filter(l => l.type === 'fuel')
    .sort((a, b) => {
      const da = new Date(a.date ?? '').getTime();
      const db = new Date(b.date ?? '').getTime();
      return da !== db ? da - db : 0;
    });

  const windowLogs = getWindowLogs(allFuelLogs, period);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalSpend = windowLogs.reduce((s, l) => s + (l.cost ?? 0), 0);

  const avgRate = (() => {
    const rates = windowLogs
      .filter(l => l.consumptionRate != null && validCons(l.consumptionRate!))
      .map(l => l.consumptionRate!);
    return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  })();

  const avgPricePerL = (() => {
    const prices = windowLogs
      .filter(l => l.pricePerL != null && validPrice(l.pricePerL!))
      .map(l => l.pricePerL!);
    return prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  })();

  const avgKmPerFill = (() => {
    const withOdo = windowLogs.filter(l => l.odo != null);
    if (withOdo.length < 2) return null;
    const span = Math.max(...withOdo.map(l => l.odo!)) - Math.min(...withOdo.map(l => l.odo!));
    return Math.round(span / (withOdo.length - 1));
  })();

  const priorSpend = (() => {
    const now = Date.now();
    const prior = period === '3m'
      ? allFuelLogs.filter(l => { const t = new Date(l.date ?? '').getTime(); return t >= now - 180*86400000 && t < now - 90*86400000; })
      : period === '1yr'
      ? allFuelLogs.filter(l => { const t = new Date(l.date ?? '').getTime(); return t >= now - 730*86400000 && t < now - 365*86400000; })
      : [];
    return prior.reduce((s, l) => s + (l.cost ?? 0), 0) || null;
  })();

  const spendSub = priorSpend
    ? `${((totalSpend - priorSpend) / priorSpend * 100 >= 0 ? '+' : '')}${((totalSpend - priorSpend) / priorSpend * 100).toFixed(0)}% vs prior`
    : undefined;
  const spendUp = priorSpend ? (totalSpend - priorSpend) / priorSpend > 0.01 : null;

  // Best / worst efficiency fills (outliers excluded)
  const withRates = windowLogs.filter(l => l.consumptionRate != null && validCons(l.consumptionRate!) && l.date);
  const bestFill = withRates.length >= 2
    ? withRates.reduce((a, b) => a.consumptionRate! < b.consumptionRate! ? a : b) : null;
  const worstFill = withRates.length >= 2
    ? withRates.reduce((a, b) => a.consumptionRate! > b.consumptionRate! ? a : b) : null;

  // Chart data (period-filtered, outliers excluded)
  const consumptionChartData = windowLogs
    .filter(l => l.consumptionRate != null && validCons(l.consumptionRate!) && l.date)
    .map(l => ({ date: fmtChartDate(l.date!, period), rate: parseFloat(l.consumptionRate!.toFixed(2)) }));

  const priceChartData = windowLogs
    .filter(l => l.pricePerL != null && validPrice(l.pricePerL!) && l.date)
    .map(l => ({ date: fmtChartDate(l.date!, period), price: parseFloat(l.pricePerL!.toFixed(3)) }));

  // L/100km trend direction
  const consumptionColor = (() => {
    if (consumptionChartData.length < 4) return '#34d399';
    const half = Math.floor(consumptionChartData.length / 2);
    const first = consumptionChartData.slice(0, half);
    const last  = consumptionChartData.slice(-half);
    const avg = (arr: typeof consumptionChartData) => arr.reduce((s, d) => s + d.rate, 0) / arr.length;
    return avg(last) <= avg(first) ? '#34d399' : '#fbbf24';
  })();

  // Nudges
  const showConsumptionNudge = (() => {
    if (dismissConsumption) return false;
    const withRate = allFuelLogs.filter(l => l.consumptionRate != null && validCons(l.consumptionRate!));
    if (withRate.length < 8) return false;
    const last = withRate[withRate.length - 1].consumptionRate!;
    const prior7 = withRate.slice(-8, -1).map(l => l.consumptionRate!);
    return last > (prior7.reduce((a, b) => a + b, 0) / prior7.length) * 1.1;
  })();

  const showSpendNudge = (() => {
    if (dismissSpend) return false;
    const now = Date.now();
    const recent = allFuelLogs.filter(l => l.cost && l.date && now - new Date(l.date).getTime() < 30 * 86400000).map(l => l.cost!);
    const prior  = allFuelLogs.filter(l => l.cost && l.date && now - new Date(l.date).getTime() >= 30*86400000 && now - new Date(l.date).getTime() < 60*86400000).map(l => l.cost!);
    if (!recent.length || !prior.length) return false;
    return recent.reduce((a, b) => a + b, 0) / recent.length > prior.reduce((a, b) => a + b, 0) / prior.length * 1.1;
  })();

  const handleSaveFuel = () => {
    const litres = parseFloat(fuelLitres);
    const cost = parseFloat(fuelCost);
    if (!litres || isNaN(litres)) { setFuelError('Enter a valid litres value.'); return; }
    if (!cost || isNaN(cost)) { setFuelError('Enter a valid cost value.'); return; }
    setFuelError(null);
    haptic(8);
    addLog(computeFuelDerived({
      type: 'fuel', label: 'Fuel Fill Up',
      date: fuelDate, litres, cost,
      odo: fuelOdo ? parseInt(fuelOdo) : null,
    }, logs));
    setFuelLitres(''); setFuelCost(''); setFuelOdo('');
    setIsModalOpen(false);
    toast.success('Fuel fill logged');
  };

  const openModal = () => {
    setFuelDate(new Date().toISOString().split('T')[0]);
    setFuelLitres(''); setFuelCost(''); setFuelOdo(''); setFuelError(null);
    setIsModalOpen(true);
  };

  const exportCSV = () => {
    haptic(6);
    const headers = ['Date', 'Litres', 'Cost (€)', '€/Litre', 'Odometer (km)', 'Distance (km)', 'L/100km'];
    const rows = allFuelLogs.map(l => [
      l.date ?? '',
      l.litres ?? '',
      l.cost?.toFixed(2) ?? '',
      l.pricePerL?.toFixed(3) ?? '',
      l.odo ?? '',
      l.distanceTraveled ?? '',
      l.consumptionRate?.toFixed(2) ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracar-fuel-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported! Share with an AI for deeper insights.', { duration: 4000 });
  };

  const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white pb-20">
      <main className="max-w-md mx-auto px-4 pt-8 pb-28">

        <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 mb-5">Fuel Insights</h1>

        {/* ── Nudges ─────────────────────────────────────────────────────── */}
        {showConsumptionNudge && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-200 flex-1">Consumption up recently — check tyre pressure or service schedule.</p>
            <button onClick={() => setDismissConsumption(true)} className="text-zinc-400 hover:text-white flex-shrink-0 mt-0.5"><XIcon /></button>
          </div>
        )}
        {showSpendNudge && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.077 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.077-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-200 flex-1">Fuel spend higher than usual this month.</p>
            <button onClick={() => setDismissSpend(true)} className="text-zinc-400 hover:text-white flex-shrink-0 mt-0.5"><XIcon /></button>
          </div>
        )}

        {/* ── Period tabs ─────────────────────────────────────────────────── */}
        <div className="glass flex gap-1 mb-1 p-1 rounded-xl">
          {PERIOD_LABELS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === p ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              {p}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 text-right mb-4">
          {windowLogs.length} fill{windowLogs.length !== 1 ? 's' : ''}
        </p>

        {/* ── Stat grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-4 items-start">
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out both', animationDelay: '0ms' }}>
          <StatTile
            value={totalSpend > 0 ? `€${Math.round(totalSpend).toLocaleString()}` : '—'}
            label="Spend"
            sub={spendSub ?? 'this period'}
            subUp={spendUp}
            info="Total fuel spend this period. The ± badge compares to the same-length window before it — up means you spent more than last period."
          />
          </div>
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out both', animationDelay: '70ms' }}>
          <StatTile
            value={avgRate != null ? avgRate.toFixed(1) : '—'}
            label="Avg L/100km"
            sub={avgRate != null ? (avgRate <= 7.5 ? 'Good efficiency' : 'High consumption') : undefined}
            subUp={avgRate != null ? avgRate > 7.5 : null}
            info={avgRate != null
              ? avgRate <= 6 ? 'Excellent efficiency — typical of a diesel or hybrid. Keep it up with steady driving and regular servicing.'
              : avgRate <= 8 ? 'Good efficiency for a petrol car. Motorway driving and smooth acceleration help keep this low.'
              : avgRate <= 10 ? 'Average for a petrol car in mixed driving. Check tyre pressure and consider a service if it\'s rising.'
              : 'High consumption. Common causes: city driving, low tyre pressure, a due service, or aggressive acceleration.'
              : 'How many litres your car burns per 100 km — lower is better.'}
          />
          </div>
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out both', animationDelay: '140ms' }}>
          <StatTile
            value={avgPricePerL != null ? `€${avgPricePerL.toFixed(3)}` : '—'}
            label="Avg €/Litre"
            sub={avgPricePerL != null ? 'period average' : undefined}
            info="The average price you paid at the pump across all fills this period. Useful for tracking fuel price trends — if it's rising, filling up earlier can save money."
          />
          </div>
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out both', animationDelay: '210ms' }}>
          <StatTile
            value={avgKmPerFill != null ? avgKmPerFill.toLocaleString() : '—'}
            label="Avg km/fill"
            sub={avgKmPerFill != null ? 'between fills' : undefined}
            info="Average distance driven between fuel stops. Higher values suggest longer motorway trips; lower values indicate city use, which typically increases fuel consumption."
          />
          </div>
        </div>

        {/* ── L/100km trend ───────────────────────────────────────────────── */}
        {consumptionChartData.length >= 1 && (
          <div className="glass-liquid rounded-xl p-4 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">L/100km Trend</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">lower is better</p>
              </div>
              <div className="flex items-center gap-3">
                {bestFill && (
                  <p className="text-[10px] text-zinc-500 text-right">
                    Best <span className="text-emerald-400 font-bold">{bestFill.consumptionRate!.toFixed(1)}</span>
                    <br /><span className="text-zinc-600">{fmtFillDate(bestFill.date)}</span>
                  </p>
                )}
                <ChartInfoButton info={consumptionColor === '#34d399'
                  ? `Each point is the L/100km for that fill (litres ÷ km since last fill × 100). The line is green — your efficiency is trending in the right direction. Keep it up with smooth acceleration and regular tyre checks.`
                  : `Each point is the L/100km for that fill (litres ÷ km since last fill × 100). The line is amber — consumption is trending upward. Common causes: more city driving, low tyre pressure, or a service due soon.`
                } />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={consumptionChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="consGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={consumptionColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={consumptionColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} tickLine={false} axisLine={false} tickCount={3} />
                <Tooltip content={<GlassTooltip suffix=" L/100km" />} />
                <Area type="monotone" dataKey="rate" stroke={consumptionColor} strokeWidth={2}
                  fill="url(#consGrad)"
                  dot={consumptionChartData.length === 1 ? { r: 4, fill: consumptionColor, strokeWidth: 0 } : false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: consumptionColor }} />
              </AreaChart>
            </ResponsiveContainer>
            {consumptionChartData.length === 1 && (
              <p className="text-[10px] text-zinc-600 text-center mt-1">Add more fills to see the trend</p>
            )}
          </div>
        )}

        {/* ── Price per litre trend ───────────────────────────────────────── */}
        {priceChartData.length >= 2 && (
          <div className="glass-liquid rounded-xl p-4 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fuel Price Trend</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">€ per litre at each fill</p>
              </div>
              <ChartInfoButton info="Shows the pump price (€/litre) at each fill. Use this to spot patterns — prices often rise before bank holidays. Filling up when the line dips can save you money over time." />
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={priceChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} tickLine={false} axisLine={false} tickCount={3} />
                <Tooltip content={<GlassTooltip prefix="€" />} />
                <Area type="monotone" dataKey="price" stroke="#22d3ee" strokeWidth={2}
                  fill="url(#priceGrad)" dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#22d3ee' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Best / Worst fills ──────────────────────────────────────────── */}
        {bestFill && worstFill && bestFill.id !== worstFill.id && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="glass-liquid rounded-xl p-4" style={{ borderColor: 'rgba(52,211,153,0.3)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Best Fill</p>
              <p className="text-2xl font-black text-emerald-400">{bestFill.consumptionRate!.toFixed(1)}</p>
              <p className="text-[10px] text-emerald-600 font-semibold">L/100KM</p>
              <p className="text-xs text-zinc-500 mt-1">{fmtFillDate(bestFill.date)}</p>
            </div>
            <div className="glass-liquid rounded-xl p-4" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--crimson)', opacity: 0.8 }}>Worst Fill</p>
              <p className="text-2xl font-black" style={{ color: 'var(--crimson)' }}>{worstFill.consumptionRate!.toFixed(1)}</p>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--crimson)', opacity: 0.6 }}>L/100KM</p>
              <p className="text-xs text-zinc-500 mt-1">{fmtFillDate(worstFill.date)}</p>
            </div>
          </div>
        )}

        {/* ── Fill history ────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fill History</p>
            {allFuelLogs.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            )}
          </div>
          <ActivityList activities={[...allFuelLogs].reverse()} />
        </section>

      </main>

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform z-40"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(200,220,255,0.82))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.65)',
          boxShadow: '0 8px 32px rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.85)',
        }}
        onClick={openModal}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>

      <BottomNav />

      {/* ── Log fuel modal ───────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setIsModalOpen(false)}>
          <div className="w-full max-w-md glass-sheet rounded-t-2xl p-6 pb-8"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Log Fuel Fill</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-700/50 rounded-full transition-colors">
                <XIcon />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Date</label>
                <input type="date" value={fuelDate} onChange={e => setFuelDate(e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Litres</label>
                  <input type="number" inputMode="decimal" placeholder="e.g. 40" value={fuelLitres} onChange={e => setFuelLitres(e.target.value)}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Total (€)</label>
                  <input type="number" inputMode="decimal" placeholder="e.g. 70.00" value={fuelCost} onChange={e => setFuelCost(e.target.value)}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" />
                </div>
              </div>
              {(() => {
                const l = parseFloat(fuelLitres), c = parseFloat(fuelCost);
                if (!l || !c || isNaN(l) || isNaN(c) || l <= 0) return null;
                const ppl = c / l;
                if (ppl >= 0.5 && ppl <= 5) return null;
                return (
                  <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    €{ppl.toFixed(3)}/L looks unusual — this fill will be excluded from stats.
                  </p>
                );
              })()}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Odometer (km)</label>
                <div className="relative flex items-center justify-center rounded-xl px-5 py-3"
                  style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  <input
                    type="number" inputMode="numeric" placeholder="00000"
                    value={fuelOdo} onChange={e => setFuelOdo(e.target.value)}
                    className="w-full bg-transparent text-white text-2xl font-bold text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ fontFamily: "'SF Mono','Fira Code','Courier New',monospace", letterSpacing: '0.45em' }}
                  />
                  <span className="absolute right-5 text-xs font-bold tracking-widest flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>KM</span>
                </div>
              </div>
              {fuelError && <p className="text-red-400 text-sm">{fuelError}</p>}
              <button onClick={handleSaveFuel}
                className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
                Save Fuel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
