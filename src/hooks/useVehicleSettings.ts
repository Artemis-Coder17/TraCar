import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const LOCAL_REG_KEY = 'tracar_vehicle_reg';

export interface VehicleSettings {
  ownerName: string;
  vehicleNickname: string;
  vehicleReg: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColour: string;
  vehicleFuelType: string;
}

const DEFAULTS: VehicleSettings = {
  ownerName: '',
  vehicleNickname: 'MY CAR',
  vehicleReg: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  vehicleColour: '',
  vehicleFuelType: '',
};

export function useVehicleSettings() {
  const [settings, setSettings] = useState<VehicleSettings>(DEFAULTS);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Load reg from localStorage (device-only)
      const reg = localStorage.getItem(LOCAL_REG_KEY) ?? '';

      // Try to fetch existing vehicle
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (cancelled) return;

      if (vehicles && vehicles.length > 0) {
        const v = vehicles[0];
        setVehicleId(v.id);
        setSettings({
          ownerName: v.owner_name ?? '',
          vehicleNickname: v.nickname ?? 'MY CAR',
          vehicleReg: reg,
          vehicleMake: v.make ?? '',
          vehicleModel: v.model ?? '',
          vehicleYear: v.year ?? '',
          vehicleColour: v.colour ?? '',
          vehicleFuelType: v.fuel_type ?? '',
        });
      } else {
        // Create a default vehicle for this user
        const { data: created } = await supabase
          .from('vehicles')
          .insert({ user_id: user.id, nickname: 'MY CAR' })
          .select()
          .single();
        if (created && !cancelled) {
          setVehicleId(created.id);
          setSettings({ ...DEFAULTS, vehicleReg: reg });
        }
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const updateSettings = async (patch: Partial<VehicleSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);

    // Save reg locally only
    if (patch.vehicleReg !== undefined) {
      localStorage.setItem(LOCAL_REG_KEY, patch.vehicleReg);
    }

    if (!vehicleId) return;

    await supabase
      .from('vehicles')
      .update({
        nickname: next.vehicleNickname,
        owner_name: next.ownerName || null,
        make: next.vehicleMake || null,
        model: next.vehicleModel || null,
        year: next.vehicleYear || null,
        colour: next.vehicleColour || null,
        fuel_type: next.vehicleFuelType || null,
      })
      .eq('id', vehicleId);
  };

  return { settings, vehicleId, updateSettings, loading };
}
