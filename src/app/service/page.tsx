'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useLogs, Log, computeFuelDerived } from '../../hooks/useLogs';
import { useVehicleSettings } from '../../hooks/useVehicleSettings';
import { ServiceLogger } from '../../components/ServiceLogger';
import { BottomNav } from '../../components/BottomNav';
import { haptic } from '../../lib/haptic';

// ─── Service type colors ───────────────────────────────────────────────────────

const SERVICE_COLORS: Record<string, string> = {
  'Oil Change':            '#f97316',
  'Full Service':          '#34d399',
  'Interim Service':          '#6ee7b7',
  'Brakes':                '#f87171',
  'Tyres':                 '#38bdf8',
  'Battery':               '#fbbf24',
  'Timing Belt':           '#a78bfa',
  'Wipers':                '#94a3b8',
  'NCT Check':             '#34d399',
  'Air Filter':            '#67e8f9',
  'Spark Plugs':           '#fde68a',
  'Brake Fluid':           '#fca5a5',
  'Coolant':               '#6ee7b7',
  'Transmission Fluid':    '#c4b5fd',
  'Power Steering Fluid':  '#a5b4fc',
  'Cabin Filter':          '#86efac',
  'Fuel Filter':           '#fed7aa',
  'Clutch':                '#f9a8d4',
};

function serviceColor(serviceTypes?: string[]): string {
  if (!serviceTypes?.length) return '#94a3b8';
  return SERVICE_COLORS[serviceTypes[0]] ?? '#94a3b8';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtOdo(odo?: number | null) {
  if (odo == null) return null;
  return Number(odo).toLocaleString();
}

export default function ServicePage() {
  const { settings, vehicleId } = useVehicleSettings();
  const { logs, addLog } = useLogs(vehicleId);
  const [yearFilter, setYearFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLog = (log: Omit<Log, 'id'>) => {
    haptic(8);
    addLog(computeFuelDerived(log, logs));
    setIsModalOpen(false);
    toast.success('Service logged');
  };

  const serviceLogs = logs
    .filter(l => l.type === 'service')
    .sort((a, b) => {
      const da = new Date(a.date ?? '').getTime();
      const db = new Date(b.date ?? '').getTime();
      return db !== da ? db - da : 0;
    });

  const fuelLogs = logs.filter(l => l.type === 'fuel' && l.odo != null);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const latestOdo = fuelLogs.length
    ? Math.max(...fuelLogs.map(l => l.odo!))
    : (serviceLogs.find(l => l.odo != null)?.odo ?? null);

  const totalSpent = serviceLogs.reduce((sum, l) => sum + (l.cost ?? 0), 0);
  const avgCons = (() => {
    const rates = logs.filter(l => l.consumptionRate != null).map(l => l.consumptionRate!);
    if (!rates.length) return null;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  })();

  // ── Year filter ────────────────────────────────────────────────────────────
  const years = [...new Set(serviceLogs.map(l => l.date?.slice(0, 4)).filter(Boolean) as string[])]
    .sort((a, b) => Number(b) - Number(a));

  const filtered = yearFilter === 'All'
    ? serviceLogs
    : serviceLogs.filter(l => l.date?.startsWith(yearFilter));

  // ── Vehicle header subtitle ────────────────────────────────────────────────
  const headerTokens = [
    settings.vehicleColour,
    settings.vehicleYear,
    settings.vehicleFuelType,
    latestOdo ? `${Number(latestOdo).toLocaleString()} km` : null,
  ].filter(Boolean);

  const headerTitle = (settings.vehicleMake && settings.vehicleModel)
    ? `${settings.vehicleMake} ${settings.vehicleModel}`
    : settings.vehicleNickname;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white pb-20">
      <main className="max-w-md mx-auto px-4 pt-8 pb-28">

        {/* ── Vehicle Header ─────────────────────────────────────────────── */}
        <div
          className="glass-liquid rounded-2xl p-5 mb-4"
          style={{ borderColor: 'rgba(52,211,153,0.25)' }}
        >

          <h1 className="text-2xl font-black text-white tracking-tight mb-1">{headerTitle}</h1>
          {headerTokens.length > 0 && (
            <p className="text-sm text-zinc-400">{headerTokens.join(' · ')}</p>
          )}
          {settings.vehicleReg && (
            <p className="text-xs font-semibold text-zinc-500 mt-1" style={{ letterSpacing: '0.18em' }}>
              {settings.vehicleReg.toUpperCase()}
            </p>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/[0.07]">
            <div className="text-center">
              <p className="text-base font-bold text-white">
                {latestOdo ? `${Math.round(Number(latestOdo) / 1000)}k` : '—'}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">km</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-white">{serviceLogs.length}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">Services</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-white">
                {totalSpent > 0 ? `€${Math.round(totalSpent).toLocaleString()}` : '—'}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">Spent</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-white">
                {avgCons != null ? avgCons.toFixed(1) : '—'}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">L/100km</p>
            </div>
          </div>
        </div>

        {/* Year filter chips */}
        {years.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
            {['All', ...years].map(y => (
              <button
                key={y}
                onClick={() => setYearFilter(y)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  yearFilter === y
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Service History</p>
        </div>

        {/* Log New Service row */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl text-sm font-semibold text-emerald-400 transition-colors"
          style={{
            background: 'rgba(52,211,153,0.07)',
            border: '1px dashed rgba(52,211,153,0.3)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log New Service
        </button>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">
            No service entries{yearFilter !== 'All' ? ` for ${yearFilter}` : ''}.
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((log, i) => {
              const color = serviceColor(log.serviceTypes);
              const label = log.serviceTypes?.join(', ') || log.label;
              const isLast = i === filtered.length - 1;
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 py-3.5 ${!isLast ? 'border-b border-white/[0.06]' : ''}`}
                  style={{ animation: 'fadeSlideUp 0.3s ease-out both', animationDelay: `${Math.min(i * 60, 350)}ms` }}
                >
                  {/* Colored dot + connector */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                    {!isLast && (
                      <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.06)', minHeight: '20px' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{label}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-zinc-500 flex-shrink-0">{fmtDate(log.date)}</span>
                      {(log.garage || fmtOdo(log.odo)) && (
                        <span className="text-xs text-zinc-600">·</span>
                      )}
                      {(log.garage || fmtOdo(log.odo)) && (
                        <span className="text-xs text-zinc-500 truncate">
                          {[log.garage, fmtOdo(log.odo) ? `${fmtOdo(log.odo)} km` : null]
                            .filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {log.cost != null && (
                        <span className="text-xs font-semibold text-zinc-400 ml-auto flex-shrink-0">
                          €{parseFloat(log.cost.toString()).toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />

      {/* ── Log Modal ────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md glass-sheet rounded-t-2xl p-6 pb-8 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Log a service</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-700/50 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <ServiceLogger onLog={handleLog} />
          </div>
        </div>
      )}
    </div>
  );
}
