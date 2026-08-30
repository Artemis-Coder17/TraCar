import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Log {
  id: string;
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

export function useLogs(vehicleId: string | null) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('logs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (cancelled || !data) return;

      setLogs(data.map(l => ({
        id: l.id,
        type: l.type,
        label: l.label,
        date: l.date ?? undefined,
        odo: l.odo,
        cost: l.cost,
        garage: l.garage,
        litres: l.litres,
        pricePerL: l.price_per_l,
        serviceTypes: l.service_types ?? undefined,
        reminderInterval: l.reminder_interval,
        distanceTraveled: l.distance_traveled,
        consumptionRate: l.consumption_rate,
      })));
    }

    load();
    return () => { cancelled = true; };
  }, [vehicleId]);

  const addLog = async (log: Omit<Log, 'id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !vehicleId) return;

    const { data, error } = await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        vehicle_id: vehicleId,
        type: log.type,
        label: log.label,
        date: log.date ?? null,
        odo: log.odo ?? null,
        cost: log.cost ?? null,
        garage: log.garage ?? null,
        litres: log.litres ?? null,
        price_per_l: log.pricePerL ?? null,
        service_types: log.serviceTypes ?? null,
        reminder_interval: log.reminderInterval ?? null,
        distance_traveled: log.distanceTraveled ?? null,
        consumption_rate: log.consumptionRate ?? null,
      })
      .select()
      .single();

    if (error || !data) return;

    const newLog: Log = {
      id: data.id,
      type: data.type,
      label: data.label,
      date: data.date ?? undefined,
      odo: data.odo,
      cost: data.cost,
      garage: data.garage,
      litres: data.litres,
      pricePerL: data.price_per_l,
      serviceTypes: data.service_types ?? undefined,
      reminderInterval: data.reminder_interval,
      distanceTraveled: data.distance_traveled,
      consumptionRate: data.consumption_rate,
    };

    setLogs(prev => [newLog, ...prev]);
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
