import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const COMPLIANCE_THRESHOLDS: Record<string, number[]> = {
  NCT:        [90, 30, 7],
  INSURANCE:  [21, 7],
  MOTOR_TAX:  [30, 7, 3],
};

function daysUntilDate(isoDate: string): number {
  const target = new Date(isoDate + 'T00:00:00Z');
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target.getTime() - todayUTC) / 86400000);
}

function computeNextDueDate(dateStr: string, interval: string): Date {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (interval === '3m') d.setUTCMonth(d.getUTCMonth() + 3);
  else if (interval === '6m') d.setUTCMonth(d.getUTCMonth() + 6);
  else if (interval === '1y') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else if (interval === '2y') d.setUTCFullYear(d.getUTCFullYear() + 2);
  else d.setTime(new Date(interval).getTime());
  return d;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00Z').toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: reminders }, { data: serviceLogs }, { data: subs }] = await Promise.all([
    supabaseAdmin.from('compliance_reminders').select('user_id, doc_type, expiry_date'),
    supabaseAdmin.from('logs').select('user_id, date, reminder_interval, label, service_types')
      .eq('type', 'service').not('reminder_interval', 'is', null).not('date', 'is', null),
    supabaseAdmin.from('push_subscriptions').select('user_id, endpoint, p256dh, auth'),
  ]);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const subsByUser = new Map<string, typeof subs>();
  for (const sub of subs) {
    if (!subsByUser.has(sub.user_id)) subsByUser.set(sub.user_id, []);
    subsByUser.get(sub.user_id)!.push(sub);
  }

  const notifications: Array<{ userId: string; payload: object }> = [];

  for (const r of reminders ?? []) {
    const days = daysUntilDate(r.expiry_date);
    const thresholds = COMPLIANCE_THRESHOLDS[r.doc_type] ?? [];
    if (!thresholds.includes(days)) continue;
    const label = r.doc_type === 'NCT' ? 'NCT' : r.doc_type === 'INSURANCE' ? 'Insurance' : 'Motor Tax';
    notifications.push({
      userId: r.user_id,
      payload: {
        title: `${label} due in ${days} day${days !== 1 ? 's' : ''}`,
        body: `Expires ${formatDate(r.expiry_date)}`,
        url: '/reminders',
      },
    });
  }

  for (const log of serviceLogs ?? []) {
    const nextDue = computeNextDueDate(log.date!, log.reminder_interval!);
    const days = daysUntilDate(nextDue.toISOString().split('T')[0]);
    if (days !== 0) continue;
    const label = (log.service_types as string[] | null)?.join(', ') || log.label || 'Service';
    notifications.push({
      userId: log.user_id,
      payload: {
        title: `${label} due today`,
        body: 'Your scheduled service reminder is due.',
        url: '/reminders',
      },
    });
  }

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const { userId, payload } of notifications) {
    const userSubs = subsByUser.get(userId);
    if (!userSubs) continue;
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) staleEndpoints.push(sub.endpoint);
      }
    }
  }

  if (staleEndpoints.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
  }

  return NextResponse.json({ sent, stale: staleEndpoints.length });
}
