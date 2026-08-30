'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useComplianceReminders, ComplianceReminder } from '../hooks/useComplianceReminders';
import { useLogs } from '../hooks/useLogs';
import { useVehicleSettings } from '../hooks/useVehicleSettings';
import { BottomNav } from '../components/BottomNav';
import { haptic } from '../lib/haptic';
import { signOut } from '../lib/auth';

const PHOTO_KEY = 'tracar_vehicle_photo';

function resizeImage(file: File, cb: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1000;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = ev.target?.result as string;
  };
  reader.readAsDataURL(file);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

function getDaysRemaining(expiryDate: string) {
  return Math.ceil((new Date(expiryDate + 'T23:59:59').getTime() - Date.now()) / 86400000);
}

const DOC_LABELS: Record<string, string> = {
  NCT: 'NCT',
  INSURANCE: 'Insurance',
  MOTOR_TAX: 'Motor Tax',
};

const DOC_ORDER: ComplianceReminder['docType'][] = ['NCT', 'INSURANCE', 'MOTOR_TAX'];

type StatusLevel = 'none' | 'good' | 'warning' | 'urgent';

function getStatusLevel(reminders: ComplianceReminder[]): StatusLevel {
  if (!reminders.length) return 'none';
  const min = Math.min(...reminders.map(r => getDaysRemaining(r.expiryDate)));
  if (min <= 6)  return 'urgent';
  if (min <= 29) return 'warning';
  return 'good';
}

function docStatusLevel(days: number): StatusLevel {
  if (days <= 6)  return 'urgent';
  if (days <= 29) return 'warning';
  return 'good';
}

const STATUS_COLORS: Record<StatusLevel, { stroke: string; glow: string }> = {
  none:    { stroke: 'rgba(255,255,255,0.30)', glow: 'rgba(255,255,255,0.12)' },
  good:    { stroke: '#34d399',                glow: '#34d399'                },
  warning: { stroke: '#fbbf24',                glow: '#fbbf24'                },
  urgent:  { stroke: '#f87171',                glow: '#f87171'                },
};

const DOC_LEVEL_COLOR: Record<StatusLevel, string> = {
  none:    'rgba(255,255,255,0.20)',
  good:    '#34d399',
  warning: '#fbbf24',
  urgent:  '#f87171',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { settings, vehicleId, updateSettings } = useVehicleSettings();
  const { reminders } = useComplianceReminders(vehicleId);
  const { logs } = useLogs(vehicleId);

  const currentYear = new Date().getFullYear().toString();
  const ytdFuelCost = logs.filter(l => l.type === 'fuel' && l.date?.startsWith(currentYear)).reduce((s, l) => s + (l.cost ?? 0), 0);
  const ytdServiceCost = logs.filter(l => l.type === 'service' && l.date?.startsWith(currentYear)).reduce((s, l) => s + (l.cost ?? 0), 0);
  const ytdTotal = ytdFuelCost + ytdServiceCost;
  const fuelPct = ytdTotal > 0 ? (ytdFuelCost / ytdTotal) * 100 : 0;
  const servicePct = ytdTotal > 0 ? (ytdServiceCost / ytdTotal) * 100 : 0;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftNickname, setDraftNickname] = useState('');
  const [draftReg, setDraftReg] = useState('');
  const [draftMake, setDraftMake] = useState('');
  const [draftModel, setDraftModel] = useState('');
  const [draftYear, setDraftYear] = useState('');
  const [draftColour, setDraftColour] = useState('');
  const [draftFuelType, setDraftFuelType] = useState('');

  const [vehiclePhoto, setVehiclePhoto] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [clearPhrase, setClearPhrase] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(PHOTO_KEY);
    if (saved) setVehiclePhoto(saved);
  }, []);

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    resizeImage(file, dataUrl => {
      setVehiclePhoto(dataUrl);
      localStorage.setItem(PHOTO_KEY, dataUrl);
    });
    e.target.value = '';
  };

  const removePhoto = () => {
    setVehiclePhoto('');
    localStorage.removeItem(PHOTO_KEY);
  };

  const openSettings = () => {
    setDraftName(settings.ownerName);
    setDraftNickname(settings.vehicleNickname);
    setDraftReg(settings.vehicleReg);
    setDraftMake(settings.vehicleMake);
    setDraftModel(settings.vehicleModel);
    setDraftYear(settings.vehicleYear);
    setDraftColour(settings.vehicleColour);
    setDraftFuelType(settings.vehicleFuelType);
    setIsSettingsOpen(true);
  };

  const saveSettings = () => {
    haptic(8);
    updateSettings({
      ownerName: draftName,
      vehicleNickname: draftNickname || 'MY CAR',
      vehicleReg: draftReg,
      vehicleMake: draftMake,
      vehicleModel: draftModel,
      vehicleYear: draftYear,
      vehicleColour: draftColour,
      vehicleFuelType: draftFuelType,
    });
    setIsSettingsOpen(false);
  };

  const overallStatus = getStatusLevel(reminders);
  const { stroke, glow } = STATUS_COLORS[overallStatus];

  const frameGlowClass =
    overallStatus === 'urgent'  ? 'frame-glow-urgent'  :
    overallStatus === 'warning' ? 'frame-glow-warning' : '';

  const frameStyle: React.CSSProperties = frameGlowClass
    ? { border: `2px solid ${stroke}90` }
    : {
        border: overallStatus === 'none'
          ? '1.5px solid rgba(255,255,255,0.10)'
          : `2px solid ${stroke}90`,
        boxShadow: overallStatus === 'none'
          ? undefined
          : `0 0 16px ${glow}45, 0 0 36px ${glow}20`,
      };

  return (
    <div className="min-h-screen text-white pb-20">
      <main className="max-w-md mx-auto px-4 pt-12 pb-28">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm font-light text-zinc-400 mb-0.5">
              {getGreeting()}{settings.ownerName ? `, ${settings.ownerName}` : ''}
            </p>
            <h1
              className="text-4xl font-black tracking-tight text-white leading-none mb-2 cursor-pointer"
              style={{ letterSpacing: '-0.02em' }}
              onClick={openSettings}
            >
              {settings.vehicleNickname}
            </h1>
            {settings.vehicleReg && (
              <p className="text-sm font-semibold text-zinc-400 cursor-pointer" style={{ letterSpacing: '0.18em' }} onClick={openSettings}>
                {settings.vehicleReg.toUpperCase()}
              </p>
            )}
            {!settings.vehicleReg && (
              <button onClick={openSettings} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors" style={{ letterSpacing: '0.05em' }}>
                + Add vehicle details
              </button>
            )}
          </div>

          <button
            onClick={openSettings}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* ── Car Photo Frame ─────────────────────────────────────────────── */}
        <div className="mb-5" style={{ animation: 'fadeSlideUp 0.35s ease-out both' }}>
          {/* Photo frame — tap to upload */}
          <div
            className={`relative rounded-2xl overflow-hidden ${!vehiclePhoto ? 'cursor-pointer' : ''} ${frameGlowClass}`}
            style={{ aspectRatio: '16/9', ...frameStyle }}
            onClick={() => { if (!vehiclePhoto) photoInputRef.current?.click(); }}
          >
            {vehiclePhoto ? (
              <>
                <img src={vehiclePhoto} alt="Your car" className="w-full h-full object-cover" />
                {/* Bottom fade */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(5,12,24,0.72) 100%)' }} />
              </>
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2.5"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-9 h-9 text-zinc-600" strokeWidth={1.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                <p className="text-xs text-zinc-600">Tap to add your car photo</p>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoFile}
          />

          {/* Compliance dots — links to reminders */}
          <Link href="/reminders" className="block">
            <div className="flex gap-5 mt-3.5 flex-wrap justify-center">
              {DOC_ORDER.map(type => {
                const r = reminders.find(rem => rem.docType === type);
                const days = r ? getDaysRemaining(r.expiryDate) : null;
                const level: StatusLevel = days != null ? docStatusLevel(days) : 'none';
                const color = DOC_LEVEL_COLOR[level];
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
                    <span className="text-xs text-zinc-400">{DOC_LABELS[type]}</span>
                    {days != null ? (
                      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
                        {days <= 0 ? 'Expired' : days <= 90 ? `${days}d` : `${Math.round(days / 30)}mo`}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </div>
                );
              })}
            </div>

            {reminders.length === 0 && (
              <p className="text-xs text-zinc-600 mt-2 text-center">Tap to add NCT, Insurance &amp; Motor Tax</p>
            )}
          </Link>
        </div>

        {/* ── YTD Spend Card ──────────────────────────────────────────────── */}
        {ytdTotal > 0 && (
          <div className="glass-liquid rounded-2xl p-4" style={{ animation: 'fadeSlideUp 0.3s ease-out both', animationDelay: '70ms' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">This Year's Spend</p>
                <p className="text-2xl font-black text-white">€{Math.round(ytdTotal).toLocaleString()}</p>
              </div>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{currentYear}</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-1.5 mb-3 gap-px">
              {fuelPct > 0 && <div style={{ width: `${fuelPct}%`, background: '#22d3ee' }} />}
              {servicePct > 0 && <div style={{ width: `${servicePct}%`, background: '#34d399' }} />}
            </div>
            <div className="flex gap-5">
              {ytdFuelCost > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                  <span className="text-xs text-zinc-500">Fuel</span>
                  <span className="text-xs font-semibold text-white">€{Math.round(ytdFuelCost).toLocaleString()}</span>
                </div>
              )}
              {ytdServiceCost > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-zinc-500">Service</span>
                  <span className="text-xs font-semibold text-white">€{Math.round(ytdServiceCost).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      <BottomNav />

      {/* ── Settings Modal ───────────────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setIsSettingsOpen(false)}>
          <div className="w-full max-w-md glass-sheet rounded-t-2xl p-6 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Vehicle Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-zinc-700/50 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Owner</p>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Your Name</label>
                <input type="text" placeholder="e.g. Ciarán" value={draftName} onChange={e => setDraftName(e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none" />
              </div>

              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pt-2">Vehicle Identity</p>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Nickname</label>
                <input type="text" placeholder="e.g. THE BEAST" value={draftNickname} onChange={e => setDraftNickname(e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Registration</label>
                <input type="text" placeholder="e.g. 121-D-4567" value={draftReg} onChange={e => setDraftReg(e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none" style={{ letterSpacing: '0.1em' }} />
              </div>

              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pt-2">Vehicle Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Make</label>
                  <input type="text" placeholder="e.g. VW" value={draftMake} onChange={e => setDraftMake(e.target.value)}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Year</label>
                  <input type="number" placeholder="e.g. 2018" value={draftYear} onChange={e => setDraftYear(e.target.value)}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Model &amp; Trim</label>
                <input type="text" placeholder="e.g. Golf 1.6 TDI" value={draftModel} onChange={e => setDraftModel(e.target.value)}
                  className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Colour</label>
                  <input type="text" placeholder="e.g. Grey" value={draftColour} onChange={e => setDraftColour(e.target.value)}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Fuel Type</label>
                  <input type="text" placeholder="e.g. Diesel" value={draftFuelType} onChange={e => setDraftFuelType(e.target.value)}
                    className="w-full bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-400 focus:outline-none" />
                </div>
              </div>

              <button onClick={saveSettings} className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors mt-2">
                Save
              </button>

              {/* ── Car Photo ──────────────────────────────────────── */}
              <button
                onClick={() => setPhotoOpen(o => !o)}
                className="w-full flex items-center justify-between pt-2"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Car Photo</p>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-zinc-600 transition-transform" style={{ transform: photoOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {photoOpen && (
                <div style={{ animation: 'fadeSlideDown 0.18s ease-out' }}>
                  {vehiclePhoto ? (
                    <div className="flex items-center gap-3">
                      <img src={vehiclePhoto} alt="Your car" className="w-16 h-10 object-cover rounded-lg flex-shrink-0"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                      <div className="flex gap-2 flex-1">
                        <button
                          onClick={() => photoInputRef.current?.click()}
                          className="flex-1 py-2 text-xs font-semibold rounded-lg transition-colors"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                        >
                          Change Photo
                        </button>
                        <button
                          onClick={removePhoto}
                          className="flex-1 py-2 text-xs font-semibold rounded-lg transition-colors"
                          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full py-2.5 text-xs font-semibold rounded-lg transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.18)', color: '#a1a1aa' }}
                    >
                      + Add Car Photo
                    </button>
                  )}
                </div>
              )}

              {/* ── About ─────────────────────────────────────────── */}
              <button
                onClick={() => setAboutOpen(o => !o)}
                className="w-full flex items-center justify-between pt-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">About</p>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-zinc-600 transition-transform" style={{ transform: aboutOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {aboutOpen && (
                <div className="text-sm text-zinc-400 leading-relaxed space-y-2 pb-1" style={{ animation: 'fadeSlideDown 0.18s ease-out' }}>
                  <p>TraCar is a simple tool to keep your car's documents, services, and fuel all in one place.</p>
                  <p>
                    Made by{' '}
                    <a
                      href="https://github.com/Artemis-Coder17"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 underline underline-offset-2"
                    >
                      Artemis Coder
                    </a>
                  </p>
                </div>
              )}

              {/* ── Help ──────────────────────────────────────────── */}
              <button
                onClick={() => setHelpOpen(o => !o)}
                className="w-full flex items-center justify-between pt-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Help</p>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-zinc-600 transition-transform" style={{ transform: helpOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {helpOpen && (
                <div className="space-y-3.5 pb-1" style={{ animation: 'fadeSlideDown 0.18s ease-out' }}>
                  {[
                    {
                      title: 'Reminders',
                      body: 'An expired document or service reminder stays visible for 30 days after its expiry date, then disappears automatically.',
                    },
                    {
                      title: 'Calendar reminders',
                      body: 'Tap "Add to Calendar" on any reminder to save it with automatic alerts. Google Calendar is recommended — it supports up to 5 alerts per event. On iPhone, Apple Calendar is used automatically with 2 key alerts closest to the due date.',
                    },
                    {
                      title: 'Your data',
                      body: 'Everything is saved locally in your browser. If you clear your browsing data, your TraCar data goes with it.',
                    },
                    {
                      title: 'Add to home screen',
                      body: 'Open TraCar in your browser, tap Share → "Add to Home Screen" for quick access like a native app. Use the same browser each time to keep your data.',
                    },
                    {
                      title: 'Export fuel logs',
                      body: 'On the Fuel page, tap the export button to download your fuel history as a CSV. You can share it with an AI for deeper insights.',
                    },
                  ].map(item => (
                    <div key={item.title}>
                      <p className="text-xs font-semibold text-white mb-0.5">{item.title}</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Delete Data ────────────────────────────────────── */}
              <button
                onClick={() => { setDeleteOpen(o => !o); if (deleteOpen) { setShowClearConfirm(false); setClearPhrase(''); } }}
                className="w-full flex items-center justify-between pt-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/70">Delete Data</p>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-zinc-600 transition-transform" style={{ transform: deleteOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {deleteOpen && (
                <div style={{ animation: 'fadeSlideDown 0.18s ease-out' }}>
                  {!showClearConfirm ? (
                    <button
                      onClick={() => { setShowClearConfirm(true); setClearPhrase(''); }}
                      className="w-full py-2.5 text-xs font-semibold rounded-lg transition-colors"
                      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.22)', color: '#f87171' }}
                    >
                      Clear All Data
                    </button>
                  ) : (
                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.20)' }}>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        This will permanently delete all your logs, reminders, vehicle settings, and photo. This cannot be undone.
                      </p>
                      <p className="text-xs text-zinc-500">
                        Type <span className="font-mono font-bold text-zinc-300">DELETE MY DATA</span> to confirm
                      </p>
                      <input
                        type="text"
                        value={clearPhrase}
                        onChange={e => setClearPhrase(e.target.value)}
                        placeholder="DELETE MY DATA"
                        className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-red-500/60 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowClearConfirm(false); setClearPhrase(''); }}
                          className="flex-1 py-2 text-xs font-semibold rounded-lg transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#a1a1aa' }}
                        >
                          Cancel
                        </button>
                        <button
                          disabled={clearPhrase !== 'DELETE MY DATA'}
                          onClick={() => {
                            if (!window.confirm('Are you absolutely sure? All your data will be permanently deleted.')) return;
                            haptic(20);
                            localStorage.clear();
                            window.location.reload();
                          }}
                          className="flex-1 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.40)', color: '#f87171' }}
                        >
                          Delete Everything
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* ── Sign Out ───────────────────────────────────────── */}
              <button
                onClick={() => signOut()}
                className="w-full py-2.5 text-xs font-semibold rounded-lg transition-colors mt-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#a1a1aa' }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
