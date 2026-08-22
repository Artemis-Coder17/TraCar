import { useState, useEffect } from 'react';

const KEY = 'tracar_vehicle';

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

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        setSettings({ ...DEFAULTS, ...JSON.parse(saved) });
      } catch {
        setSettings(DEFAULTS);
      }
    }
  }, []);

  const updateSettings = (patch: Partial<VehicleSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  return { settings, updateSettings };
}
