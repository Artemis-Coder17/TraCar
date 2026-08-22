'use client';

import { useState } from 'react';
import { Log } from '../hooks/useLogs';

// ─── Service type definitions ─────────────────────────────────────────────────

interface ServiceEntry {
  label: string;
  color: string;
  icon: React.ReactNode;
}

const SERVICE_ITEMS: ServiceEntry[] = [
  {
    label: 'Oil Change', color: '#f97316',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2C9 7.5 6 11 6 15a6 6 0 0012 0c0-4-3-7.5-6-13z"/></svg>,
  },
  {
    label: 'Full Service', color: '#34d399',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="9"/><path d="M7.5 12l3 3 6-6"/></svg>,
  },
  {
    label: 'Interim Service', color: '#6ee7b7',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 3a9 9 0 010 18V3z" fill="currentColor" fillOpacity="0.25" stroke="none"/><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 4-4"/></svg>,
  },
  {
    label: 'Brakes', color: '#f87171',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="5.5" r="1.3" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8"/><circle cx="17.6" cy="8.8" r="1.3" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8"/><circle cx="17.6" cy="15.2" r="1.3" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8"/><circle cx="12" cy="18.5" r="1.3" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8"/><circle cx="6.4" cy="15.2" r="1.3" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8"/><circle cx="6.4" cy="8.8" r="1.3" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8"/></svg>,
  },
  {
    label: 'Tyres', color: '#38bdf8',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><circle cx="12" cy="12" r="9" strokeWidth="2.5"/><circle cx="12" cy="12" r="6.5" strokeWidth="1" strokeOpacity="0.5"/><circle cx="12" cy="12" r="2.5"/><line x1="9.7" y1="9.7" x2="7" y2="7"/><line x1="14.3" y1="9.7" x2="17" y2="7"/><line x1="14.3" y1="14.3" x2="17" y2="17"/><line x1="9.7" y1="14.3" x2="7" y2="17"/></svg>,
  },
  {
    label: 'Battery', color: '#fbbf24',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M20 10v4"/><path d="M7 12h2m2 0h2" strokeWidth="1.5"/></svg>,
  },
  {
    label: 'Wipers', color: '#94a3b8',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><path d="M12 21L6 7"/><path d="M6 7A10 10 0 0 1 18 7"/><path d="M12 21L18 7" strokeOpacity="0.3"/></svg>,
  },
  {
    label: 'Air Filter', color: '#67e8f9',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M11 4v16M15 4v16" strokeWidth="1.2" strokeOpacity="0.55"/><path d="M3 9h18M3 14h18" strokeWidth="1.2" strokeOpacity="0.55"/></svg>,
  },
  {
    label: 'Spark Plugs', color: '#fde68a',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M13 2L4 14h7l-2 8 11-12h-7z"/></svg>,
  },
  {
    label: 'Timing Belt', color: '#a78bfa',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><circle cx="8" cy="12" r="4"/><circle cx="17" cy="12" r="3"/><line x1="8" y1="8" x2="17" y2="9"/><line x1="8" y1="16" x2="17" y2="15"/></svg>,
  },
  {
    label: 'Brake Fluid', color: '#fca5a5',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2C9.5 7 7 10.5 7 14a5 5 0 0010 0c0-3.5-2.5-7-5-12z"/><path d="M9 15h6" strokeWidth="1.5"/></svg>,
  },
  {
    label: 'Coolant', color: '#6ee7b7',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10 15V5a2 2 0 0 1 4 0v10"/><circle cx="12" cy="18.5" r="3"/><line x1="12" y1="9" x2="12" y2="15" strokeWidth="2.5" strokeOpacity="0.45"/></svg>,
  },
  {
    label: 'Cabin Filter', color: '#86efac',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M2 12h20" strokeWidth="1.2" strokeOpacity="0.55"/><path d="M2 9.5h20M2 14.5h20" strokeWidth="0.9" strokeOpacity="0.35"/><path d="M7 7v10M12 7v10M17 7v10" strokeWidth="0.9" strokeOpacity="0.35"/></svg>,
  },
  {
    label: 'Fuel Filter', color: '#fed7aa',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 4h16L14 12v7l-4-2v-5z"/></svg>,
  },
  {
    label: 'Clutch', color: '#f9a8d4',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><line x1="12" y1="5" x2="12" y2="17"/><path d="M7 17h10" strokeWidth="2.4"/><path d="M9 5h6" strokeWidth="1.2" strokeOpacity="0.45"/><circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25"/></svg>,
  },
  {
    label: 'Transmission Fluid', color: '#c4b5fd',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><circle cx="9" cy="11" r="5"/><circle cx="18" cy="15" r="3.5"/><circle cx="9" cy="11" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="15" r="1.2" fill="currentColor" stroke="none"/></svg>,
  },
  {
    label: 'Power Steering Fluid', color: '#a5b4fc',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><line x1="12" y1="3" x2="12" y2="9.5"/><line x1="4.2" y1="16.5" x2="9.7" y2="13.2"/><line x1="19.8" y1="16.5" x2="14.3" y2="13.2"/></svg>,
  },
  {
    label: 'NCT Check', color: '#34d399',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h3"/><path d="M8 15.5l2 2 4-4"/></svg>,
  },
  {
    label: 'Other', color: '#6b7280',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>,
  },
];

const REMINDER_ELIGIBLE = new Set(['Full Service', 'Interim Service', 'Oil Change']);

const REMINDER_OPTIONS = [
  { label: '3 mo',  value: '3m' },
  { label: '6 mo',  value: '6m' },
  { label: '1 yr',  value: '1y' },
  { label: '2 yr',  value: '2y' },
  { label: 'Custom',value: 'custom' },
  { label: 'None',  value: '' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceLogger({ onLog }: { onLog: (log: Omit<Log, 'id'>) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [otherLabel, setOtherLabel] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState('');
  const [garage, setGarage] = useState('');
  const [reminder, setReminder] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const showReminder = selected.some(t => REMINDER_ELIGIBLE.has(t));

  const toggle = (label: string) => {
    setSelected(prev => prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]);
    setError(null);
  };

  const handleSave = () => {
    if (selected.length === 0) { setError('Select at least one service type.'); return; }

    const effectiveTypes = selected.map(t =>
      t === 'Other' && otherLabel.trim() ? otherLabel.trim() : t
    );

    const effectiveInterval = reminder === 'custom'
      ? (customDate || null)
      : (reminder || null);

    onLog({
      type: 'service',
      label: effectiveTypes.join(', '),
      serviceTypes: effectiveTypes,
      reminderInterval: showReminder ? effectiveInterval : null,
      date,
      odo: null,
      cost: cost ? parseFloat(cost) : null,
      garage: garage || null,
    });

    setSelected([]);
    setOtherLabel('');
    setCost('');
    setGarage('');
    setReminder('');
    setCustomDate('');
    setError(null);
  };

  return (
    <div className="space-y-5">

      {/* ── Service type grid ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">What was done?</p>
        <div className="grid grid-cols-3 gap-2">
          {SERVICE_ITEMS.map(({ label, color, icon }) => {
            const isOn = selected.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggle(label)}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all active:scale-95"
                style={{
                  background: isOn ? `${color}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isOn ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
                  color: isOn ? color : 'rgba(255,255,255,0.45)',
                  boxShadow: isOn ? `0 0 12px ${color}22` : 'none',
                }}
              >
                {icon}
                <span className="text-[10px] font-medium leading-tight text-center" style={{ color: isOn ? color : 'rgba(255,255,255,0.5)' }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        {selected.includes('Other') && (
          <input
            type="text"
            placeholder="What was done? e.g. Wheel alignment"
            value={otherLabel}
            onChange={e => setOtherLabel(e.target.value)}
            autoFocus
            className="mt-2 w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-400 focus:outline-none"
          />
        )}
      </div>

      {/* ── Reminder ──────────────────────────────────────────────────── */}
      {showReminder && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Remind me again in</p>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setReminder(opt.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: reminder === opt.value ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${reminder === opt.value ? 'rgba(34,211,238,0.45)' : 'rgba(255,255,255,0.1)'}`,
                  color: reminder === opt.value ? '#22d3ee' : 'rgba(255,255,255,0.5)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {reminder === 'custom' && (
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
              className="mt-2 w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-400 focus:outline-none" />
          )}
        </div>
      )}

      {/* ── Details ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Details</p>
        <div className="space-y-2.5">
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-400 focus:outline-none"
          />
          <div className="grid grid-cols-1 gap-2.5">
            <input
              type="number" inputMode="decimal" placeholder="Cost €"
              value={cost} onChange={e => setCost(e.target.value)}
              className="bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-400 focus:outline-none w-full"
            />
          </div>
          <input
            type="text" placeholder="Garage / mechanic"
            value={garage} onChange={e => setGarage(e.target.value)}
            className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Save ──────────────────────────────────────────────────────── */}
      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        style={{
          background: selected.length > 0
            ? 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(200,220,255,0.82))'
            : 'rgba(255,255,255,0.08)',
          color: selected.length > 0 ? '#000' : 'rgba(255,255,255,0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        Save Service
      </button>

    </div>
  );
}
