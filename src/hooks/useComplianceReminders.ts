import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const LOCAL_POLICY_PREFIX = 'tracar_policy_';

export interface ComplianceReminder {
  id: string;
  docType: 'NCT' | 'INSURANCE' | 'MOTOR_TAX';
  expiryDate: string;
  providerName?: string | null;
  policyNumber?: string | null;
}

export function useComplianceReminders(vehicleId: string | null) {
  const [reminders, setReminders] = useState<ComplianceReminder[]>([]);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('compliance_reminders')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('expiry_date', { ascending: true });

      if (cancelled || !data) return;

      setReminders(data.map(r => ({
        id: r.id,
        docType: r.doc_type,
        expiryDate: r.expiry_date,
        providerName: r.provider_name,
        // Load policy number from localStorage (device-only)
        policyNumber: localStorage.getItem(`${LOCAL_POLICY_PREFIX}${r.id}`) ?? null,
      })));
    }

    load();
    return () => { cancelled = true; };
  }, [vehicleId]);

  const addReminder = async (r: Omit<ComplianceReminder, 'id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !vehicleId) return;

    const { data, error } = await supabase
      .from('compliance_reminders')
      .insert({
        user_id: user.id,
        vehicle_id: vehicleId,
        doc_type: r.docType,
        expiry_date: r.expiryDate,
        provider_name: r.providerName ?? null,
      })
      .select()
      .single();

    if (error || !data) return;

    // Save policy number locally
    if (r.policyNumber) {
      localStorage.setItem(`${LOCAL_POLICY_PREFIX}${data.id}`, r.policyNumber);
    }

    setReminders(prev => [...prev, {
      id: data.id,
      docType: data.doc_type,
      expiryDate: data.expiry_date,
      providerName: data.provider_name,
      policyNumber: r.policyNumber ?? null,
    }]);
  };

  const updateReminder = async (id: string, patch: Partial<Omit<ComplianceReminder, 'id'>>) => {
    const { error } = await supabase
      .from('compliance_reminders')
      .update({
        doc_type: patch.docType,
        expiry_date: patch.expiryDate,
        provider_name: patch.providerName ?? null,
      })
      .eq('id', id);

    if (error) return;

    // Update policy number locally
    if (patch.policyNumber !== undefined) {
      if (patch.policyNumber) {
        localStorage.setItem(`${LOCAL_POLICY_PREFIX}${id}`, patch.policyNumber);
      } else {
        localStorage.removeItem(`${LOCAL_POLICY_PREFIX}${id}`);
      }
    }

    setReminders(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const deleteReminder = async (id: string) => {
    await supabase.from('compliance_reminders').delete().eq('id', id);
    localStorage.removeItem(`${LOCAL_POLICY_PREFIX}${id}`);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  return { reminders, addReminder, updateReminder, deleteReminder };
}
