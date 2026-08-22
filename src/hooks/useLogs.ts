import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tracar_logs';

export interface Log {
  id: number;
  type: 'service' | 'fuel';
  label: string;
  date?: string;
  odo?: number | null;
  cost?: number | null;
  garage?: string | null;
  litres?: number | null;
  pricePerL?: number | null;
  serviceTypes?: string[];
  reminderInterval?: string | null;
  distanceTraveled?: number | null;
  consumptionRate?: number | null;
}

export function useLogs() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const savedLogs = localStorage.getItem(STORAGE_KEY);
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error('Failed to parse logs', e);
        setLogs([]);
      }
    }
  }, []);

  const saveLogs = (newLogs: Log[]) => {
    setLogs(newLogs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
  };

  const addLog = (log: Omit<Log, 'id'>) => {
    const newLog: Log = {
      ...log,
      id: Date.now(),
    };
    const newLogs = [newLog, ...logs];
    saveLogs(newLogs);
  };

  return { logs, addLog };
}

export function computeFuelDerived(log: Omit<Log, 'id'>, allLogs: Log[]): Omit<Log, 'id'> {
  if (log.type !== 'fuel') return log;

  const prevOdo = allLogs
    .filter(l => l.type === 'fuel' && l.odo != null)
    .sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())[0]?.odo ?? null;
  const currOdo = log.odo ?? null;

  const distanceTraveled =
    prevOdo != null && currOdo != null && currOdo > prevOdo
      ? currOdo - prevOdo : null;

  const consumptionRate =
    distanceTraveled && log.litres
      ? parseFloat(((log.litres / distanceTraveled) * 100).toFixed(2)) : null;

  const pricePerL =
    log.cost != null && log.litres
      ? parseFloat((log.cost / log.litres).toFixed(4)) : null;

  return { ...log, pricePerL, distanceTraveled, consumptionRate };
}
