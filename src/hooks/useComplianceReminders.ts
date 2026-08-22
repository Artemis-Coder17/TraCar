import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tracar_compliance';

export interface ComplianceReminder {
  id: number;
  docType: 'NCT' | 'INSURANCE' | 'MOTOR_TAX';
  expiryDate: string;
  providerName?: string | null;
  policyNumber?: string | null;
}

export function useComplianceReminders() {
  const [reminders, setReminders] = useState<ComplianceReminder[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setReminders(JSON.parse(saved));
      } catch {
        setReminders([]);
      }
    }
  }, []);

  const save = (next: ComplianceReminder[]) => {
    setReminders(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addReminder = (r: Omit<ComplianceReminder, 'id'>) =>
    save([{ ...r, id: Date.now() }, ...reminders]);

  const updateReminder = (id: number, patch: Partial<Omit<ComplianceReminder, 'id'>>) =>
    save(reminders.map(r => r.id === id ? { ...r, ...patch } : r));

  const deleteReminder = (id: number) =>
    save(reminders.filter(r => r.id !== id));

  return { reminders, addReminder, updateReminder, deleteReminder };
}
