'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useComplianceReminders, ComplianceReminder } from '../../hooks/useComplianceReminders';
import { useLogs } from '../../hooks/useLogs';
import { useVehicleSettings } from '../../hooks/useVehicleSettings';
import { complianceIcs, serviceIcs, downloadIcs, isIOS } from '../../lib/icsGenerator';
import { haptic } from '../../lib/haptic';
import { BottomNav } from '../../components/BottomNav';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<ComplianceReminder['docType'], string> = {
  NCT: 'NCT due',
  INSURANCE: 'Insurance',
  MOTOR_TAX: 'Motor tax',
};

function getDaysRemaining(expiryDate: string): number {
  return Math.ceil((new Date(expiryDate + 'T23:59:59').getTime() - Date.now()) / 86400000);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]} ${y}`;
}

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]} ${y.slice(2)}`;
}

function computeNextDate(dateStr: string, interval: string): Date {
  const d = new Date(dateStr + 'T12:00:00');
  if (interval === '3m') d.setMonth(d.getMonth() + 3);
  else if (interval === '6m') d.setMonth(d.getMonth() + 6);
  else if (interval === '1y') d.setFullYear(d.getFullYear() + 1);
  else if (interval === '2y') d.setFullYear(d.getFullYear() + 2);
  else d.setTime(new Date(interval).getTime());
  return d;
}

// Derive bar start from nextDate so progress is always relative to the interval,
// not to log.date which may be in the future (logged in advance).
function computeBarStart(logDate: string, interval: string, nextDate: Date): Date {
  const d = new Date(nextDate.getTime());
  if (interval === '3m') { d.setMonth(d.getMonth() - 3); return d; }
  if (interval === '6m') { d.setMonth(d.getMonth() - 6); return d; }
  if (interval === '1y') { d.setFullYear(d.getFullYear() - 1); return d; }
  if (interval === '2y') { d.setFullYear(d.getFullYear() - 2); return d; }
  return new Date(logDate + 'T12:00:00');
}

function intervalKm(interval: string): number {
  if (interval === '3m') return 5000;
  if (interval === '6m') return 10000;
  return 15000;
}

function derivedStartDate(docType: ComplianceReminder['docType'], expiryDate: string): Date {
  const d = new Date(expiryDate + 'T12:00:00');
  if (docType === 'NCT') d.setFullYear(d.getFullYear() - 2);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}

const DOC_TYPES: ComplianceReminder['docType'][] = ['NCT', 'INSURANCE', 'MOTOR_TAX'];

// ─── Doc icons ────────────────────────────────────────────────────────────────

function DocIcon({ type }: { type: ComplianceReminder['docType'] }) {
  if (type === 'NCT') return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
  if (type === 'INSURANCE') return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
    </svg>
  );
}

// ─── Segmented progress bar (service km) ──────────────────────────────────────

function KmProgressBar({ kmDone, kmTotal }: { kmDone: number; kmTotal: number }) {
  const BLOCKS = 20;
  const filled = Math.round(Math.min(Math.max(kmDone / kmTotal, 0), 1) * BLOCKS);
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: BLOCKS }, (_, i) => (
        <div
          key={i}
          className="flex-1 h-[6px] rounded-sm"
          style={{
            background: i < filled ? 'var(--emerald)' : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Segmented timeline bar (renewal / service time) ─────────────────────────

function SegmentedTimelineBar({ startDate, expiryDate }: { startDate: Date; expiryDate: Date }) {
  const BLOCKS = 20;
  const now = Date.now();
  const total = expiryDate.getTime() - startDate.getTime();
  const elapsed = now - startDate.getTime();
  const pct = Math.min(Math.max((elapsed / total) * 100, 0), 100);
  const filled = Math.round((pct / 100) * BLOCKS);

  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: BLOCKS }, (_, i) => {
        const blockPct = ((i + 1) / BLOCKS) * 100;
        const color = blockPct > 85 ? 'var(--crimson)' : blockPct > 65 ? 'var(--amber)' : 'var(--emerald)';
        return (
          <div
            key={i}
            className="flex-1 h-[6px] rounded-sm transition-colors"
            style={{ background: i < filled ? color : 'rgba(255,255,255,0.1)' }}
          />
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const { settings, vehicleId } = useVehicleSettings();
  const { reminders, addReminder, updateReminder, deleteReminder } = useComplianceReminders(vehicleId);
  const { logs } = useLogs(vehicleId);
  const reg = settings.vehicleReg || 'Your Car';

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDocType, setFormDocType] = useState<ComplianceReminder['docType']>('NCT');
  const [formExpiry, setFormExpiry] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formPolicy, setFormPolicy] = useState('');
  const [formError, setFormError] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const openAdd = () => {
    setFormDocType('NCT'); setFormExpiry(''); setFormProvider('');
    setFormPolicy(''); setFormError(''); setEditingId(null);
    setModalMode('add');
  };

  const openEdit = (r: ComplianceReminder) => {
    setFormDocType(r.docType); setFormExpiry(r.expiryDate);
    setFormProvider(r.providerName ?? ''); setFormPolicy(r.policyNumber ?? '');
    setFormError(''); setEditingId(r.id);
    setDetailId(null);
    setModalMode('edit');
  };

  const copyPolicy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = () => {
    if (!formExpiry) { setFormError('Please enter an expiry date.'); return; }
    setFormError('');
    haptic(8);
    if (modalMode === 'add') {
      addReminder({ docType: formDocType, expiryDate: formExpiry, providerName: formProvider || null, policyNumber: formPolicy || null });
      toast.success('Reminder added');
    } else if (modalMode === 'edit' && editingId != null) {
      updateReminder(editingId, { docType: formDocType, expiryDate: formExpiry, providerName: formProvider || null, policyNumber: formPolicy || null });
      toast.success('Reminder updated');
    }
    setModalMode(null);
  };

  const handleDelete = (id: string) => { haptic(12); deleteReminder(id); setModalMode(null); toast.success('Reminder removed'); };

  // ── Service reminders ─────────────────────────────────────────────────────
  const latestFuelOdo = Math.max(
    0,
    ...logs.filter(l => l.type === 'fuel' && l.odo != null).map(l => l.odo!)
  );
  const currentOdo = latestFuelOdo || Math.max(
    0,
    ...logs.filter(l => l.type === 'service' && l.odo != null).map(l => l.odo!)
  );

  const allServiceReminders = logs
    .filter(l => l.type === 'service' && l.reminderInterval && l.date)
    .map(l => {
      const nextDate = computeNextDate(l.date!, l.reminderInterval!);
      const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / 86400000);
      const kmInterval = l.odo != null ? intervalKm(l.reminderInterval!) : null;
      const kmDone = (l.odo != null && currentOdo > 0) ? Math.max(0, currentOdo - l.odo) : null;
      return { log: l, nextDate, daysUntil, kmInterval, kmDone };
    })
    .filter(r => r.daysUntil >= -30 && r.daysUntil <= 365)
    .sort((a, b) => a.log.id < b.log.id ? 1 : -1); // newest logged first for dedup

  // Keep only the most recently logged reminder per service label
  const seenLabels = new Set<string>();
  const serviceReminders = allServiceReminders
    .filter(r => {
      const key = (r.log.serviceTypes?.join(',') ?? r.log.label ?? '').toLowerCase();
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // ── Compliance reminders ──────────────────────────────────────────────────
  const sortedReminders = [...reminders].sort(
    (a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate)
  );

  const badgeText = (days: number) => {
    if (days <= 0) return 'Expired';
    if (days <= 90) return `${days} days`;
    return `${Math.round(days / 30)} months`;
  };
  const badgeStyle = (days: number) => {
    if (days <= 6)  return { bg: 'bg-[var(--crimson)]/15', text: 'text-[var(--crimson)]', border: 'border-[var(--crimson)]/30' };
    if (days <= 29) return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  };

  const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white pb-32">
      <main className="max-w-md mx-auto px-4 pt-8 pb-28">

        {/* ── Service Reminders ──────────────────────────────────────────── */}
        {serviceReminders.length > 0 && (
          <section className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Service Reminders</p>
            <div className="space-y-3">
              {serviceReminders.map(({ log, nextDate, daysUntil, kmInterval, kmDone }, i) => {
                const label = log.serviceTypes?.join(', ') || log.label;
                const days = daysUntil;
                const bs = badgeStyle(days);

                return (
                  <div key={log.id} className="glass-liquid rounded-xl p-3" style={{ animation: 'fadeSlideUp 0.3s ease-out both', animationDelay: `${Math.min(i * 70, 350)}ms` }}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-white leading-snug">{label}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${bs.bg} ${bs.text} ${bs.border}`}>
                        {badgeText(days)}
                      </span>
                    </div>

                    {/* Km bar */}
                    {kmInterval != null && kmDone != null ? (
                      <>
                        <KmProgressBar kmDone={kmDone} kmTotal={kmInterval} />
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px] text-zinc-500">{log.odo != null ? `${Number(log.odo).toLocaleString()} km` : ''}</span>
                          <span className="text-[10px] text-zinc-500">
                            {log.odo != null ? `${(log.odo + kmInterval).toLocaleString()} km` : ''}
                          </span>
                        </div>
                      </>
                    ) : (
                      (() => {
                        const isStandard = ['3m', '6m', '1y', '2y'].includes(log.reminderInterval!);
                        const showBar = (isStandard && days <= 180) || (!isStandard && days <= 30);
                        if (!showBar) return (
                          <p className="text-xs text-zinc-600">
                            {days > 180 ? 'Well ahead — ' : ''}Next due {nextDate.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        );
                        const barStart = isStandard
                          ? computeBarStart(log.date!, log.reminderInterval!, nextDate)
                          : (() => { const d = new Date(nextDate.getTime()); d.setDate(d.getDate() - 30); return d; })();
                        return (
                          <>
                            <SegmentedTimelineBar startDate={barStart} expiryDate={nextDate} />
                            <div className="flex justify-between mt-1.5">
                              <span className="text-[10px] text-zinc-500">{formatDateShort(barStart.toISOString().split('T')[0])}</span>
                              <span className="text-[10px] text-zinc-500">{formatDateShort(nextDate.toISOString().split('T')[0])}</span>
                            </div>
                          </>
                        );
                      })()
                    )}
                  {/* Add to Calendar */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      haptic(6);
                      const nextDateStr = nextDate.toISOString().split('T')[0];
                      const lbl = log.serviceTypes?.join(', ') || log.label || 'Service';
                      downloadIcs(serviceIcs(lbl, nextDateStr, reg, isIOS()), `${lbl.toLowerCase().replace(/\s+/g, '-')}.ics`);
                      toast.success('Calendar event downloaded');
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors mt-2 pt-2 border-t border-white/[0.05] w-full"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Add to Calendar
                  </button>
                </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Renewals ───────────────────────────────────────────────────── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Renewals</p>
            <button
              onClick={openAdd}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>

          {sortedReminders.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(255,255,255,0.1)',
            }}>
              <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400">No renewals added yet</p>
              <p className="text-xs text-zinc-600 mt-1">Tap + to track your NCT, Insurance and Motor Tax</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedReminders.map((r, i) => {
                const days = getDaysRemaining(r.expiryDate);
                const bs = badgeStyle(days);
                const startDate = derivedStartDate(r.docType, r.expiryDate);
                const expiryDate = new Date(r.expiryDate + 'T23:59:59');

                return (
                  <div
                    key={r.id}
                    className="glass-liquid rounded-xl p-3 cursor-pointer active:scale-[0.99] transition-transform"
                    style={{ animation: 'fadeSlideUp 0.3s ease-out both', animationDelay: `${Math.min(i * 70, 350)}ms` }}
                    onClick={() => setDetailId(r.id)}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${bs.bg} ${bs.text}`}>
                          <DocIcon type={r.docType} />
                        </div>
                        <p className="text-sm font-semibold text-white">{DOC_LABELS[r.docType]}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${bs.bg} ${bs.text} ${bs.border}`}>
                        {badgeText(days)}
                      </span>
                    </div>

                    {/* Valid until */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-zinc-400">Valid until {formatDate(r.expiryDate)}</p>
                    </div>

                    {/* Timeline bar — only shown when within 6 months */}
                    {days <= 180 ? (
                      <>
                        <SegmentedTimelineBar startDate={startDate} expiryDate={expiryDate} />
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px] text-zinc-600">{formatDateShort(startDate.toISOString().split('T')[0])}</span>
                          <span className="text-[10px] text-zinc-600">{formatDateShort(r.expiryDate)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-zinc-600">Well ahead — renews {formatDate(r.expiryDate)}</p>
                    )}

                    {/* Add to Calendar */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        haptic(6);
                        downloadIcs(
                          complianceIcs(r.docType, r.expiryDate, reg, isIOS()),
                          `${r.docType.toLowerCase().replace(/_/g, '-')}.ics`
                        );
                        toast.success('Calendar event downloaded');
                      }}
                      className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors mt-2 pt-2 border-t border-white/[0.05] w-full"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Add to Calendar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />

      {/* ── Detail Sheet ─────────────────────────────────────────────────────── */}
      {detailId !== null && (() => {
        const r = sortedReminders.find(x => x.id === detailId);
        if (!r) return null;
        const days = getDaysRemaining(r.expiryDate);
        const bs = badgeStyle(days);
        return (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setDetailId(null)}
          >
            <div
              className="w-full max-w-md glass-sheet rounded-t-2xl p-6 pb-10"
              style={{ animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="w-10 h-1 rounded-full bg-zinc-600 mx-auto mb-5" />

              {/* Title row */}
              <div className="flex items-start justify-between gap-2 mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${bs.bg} ${bs.text}`}>
                    <DocIcon type={r.docType} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{DOC_LABELS[r.docType]}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Valid until {formatDate(r.expiryDate)}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${bs.bg} ${bs.text} ${bs.border}`}>
                  {badgeText(days)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-6">
                {r.providerName && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Provider</p>
                      <p className="text-sm font-semibold text-white">{r.providerName}</p>
                    </div>
                  </div>
                )}
                {r.policyNumber && (
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Policy / Ref.</p>
                      <p className="text-sm font-semibold text-white font-mono tracking-wide">{r.policyNumber}</p>
                    </div>
                    <button
                      onClick={() => copyPolicy(r.policyNumber!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)',
                        border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`,
                        color: copied ? '#34d399' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {copied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                {!r.providerName && !r.policyNumber && (
                  <p className="text-sm text-zinc-500 text-center py-2">No provider or policy details saved.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => openEdit(r)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => { handleDelete(r.id); setDetailId(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--crimson)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {modalMode !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setModalMode(null)}>
          <div className="w-full max-w-md glass-sheet rounded-t-2xl p-6 pb-8"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{modalMode === 'add' ? 'Add Renewal' : 'Edit Renewal'}</h2>
              <button onClick={() => setModalMode(null)} className="p-2 hover:bg-zinc-700/50 rounded-full transition-colors">
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Document Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOC_TYPES.map(type => (
                    <button key={type} onClick={() => setFormDocType(type)}
                      className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-colors border ${
                        formDocType === type
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                          : 'bg-zinc-700/50 border-zinc-600/50 text-zinc-400 hover:text-white'
                      }`}>
                      {DOC_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Expiry Date</label>
                <input type="date" value={formExpiry} onChange={e => setFormExpiry(e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Provider <span className="text-zinc-500">(optional)</span></label>
                <input type="text" placeholder="e.g. Zurich Insurance" value={formProvider} onChange={e => setFormProvider(e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Policy / Ref. <span className="text-zinc-500">(optional)</span></label>
                <input type="text" placeholder="e.g. POL-123456" value={formPolicy} onChange={e => setFormPolicy(e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2 text-white focus:border-cyan-400 focus:outline-none" />
              </div>

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <button onClick={handleSave}
                className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
                {modalMode === 'add' ? 'Save' : 'Update'}
              </button>

              {modalMode === 'edit' && editingId != null && (
                <button onClick={() => handleDelete(editingId)}
                  className="w-full py-2 text-sm text-[var(--crimson)] hover:opacity-80 transition-opacity">
                  Delete this reminder
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
