import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export interface DbVehicle {
  id: string;
  user_id: string;
  nickname: string;
  owner_name: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
  colour: string | null;
  fuel_type: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface DbComplianceReminder {
  id: string;
  user_id: string;
  vehicle_id: string;
  doc_type: 'NCT' | 'INSURANCE' | 'MOTOR_TAX';
  expiry_date: string;
  provider_name: string | null;
  created_at: string;
}

export interface DbLog {
  id: string;
  user_id: string;
  vehicle_id: string;
  type: 'service' | 'fuel';
  label: string;
  date: string | null;
  odo: number | null;
  cost: number | null;
  garage: string | null;
  litres: number | null;
  price_per_l: number | null;
  service_types: string[] | null;
  reminder_interval: string | null;
  distance_traveled: number | null;
  consumption_rate: number | null;
  created_at: string;
}

export interface DbPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
