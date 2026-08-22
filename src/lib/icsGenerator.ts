type DocType = 'NCT' | 'INSURANCE' | 'MOTOR_TAX';

interface IcsConfig {
  uid: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  alertDaysBefore: number[];
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function fmtDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function buildIcs(cfg: IcsConfig): string {
  const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const dtstart = fmtDate(cfg.date) + 'T100000';
  const dtend   = fmtDate(cfg.date) + 'T110000';

  const alarms = cfg.alertDaysBefore
    .map(d =>
      `BEGIN:VALARM\r\nTRIGGER:-P${d}D\r\nACTION:DISPLAY\r\nDESCRIPTION:${escapeIcs(cfg.title)}\r\nEND:VALARM`
    )
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TraCar//TraCar//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${cfg.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcs(cfg.title)}`,
    `DESCRIPTION:${escapeIcs(cfg.description)}`,
    'SEQUENCE:0',
    alarms,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// Alert schedules per platform
const ALERTS = {
  compliance: {
    NCT:        { ios: [30, 7],       other: [90, 30, 14, 7, 1] },
    INSURANCE:  { ios: [30, 7],       other: [30, 14, 7, 1]     },
    MOTOR_TAX:  { ios: [14, 3],       other: [30, 14, 7, 1]     },
  },
  service:    { ios: [14, 3],       other: [30, 14, 7, 1]     },
};

export function complianceIcs(docType: DocType, expiryDate: string, reg: string, ios = false): string {
  const regUp   = reg.toUpperCase() || 'Your Car';
  const uidSlug = docType.toLowerCase().replace(/_/g, '-');
  const regSlug = regUp.replace(/\s+/g, '');

  const cfgMap = {
    NCT: {
      title:  `🚗 NCT Test: ${regUp}`,
      desc:   'Book your slot: https://www.ncts.ie/',
    },
    INSURANCE: {
      title:  `🛡️ Car Insurance Renewal: ${regUp}`,
      desc:   'Check your renewal documents and shop around for the best deal.',
    },
    MOTOR_TAX: {
      title:  `💶 Motor Tax Due: ${regUp}`,
      desc:   'Renew online: https://www.motortax.ie/',
    },
  };

  const c = cfgMap[docType];
  const alerts = ios ? ALERTS.compliance[docType].ios : ALERTS.compliance[docType].other;

  return buildIcs({
    uid:             `${uidSlug}-${regSlug}@tracar`,
    title:           c.title,
    date:            expiryDate,
    description:     c.desc,
    alertDaysBefore: alerts,
  });
}

export function serviceIcs(serviceLabel: string, dueDate: string, reg: string, ios = false): string {
  const regUp   = reg.toUpperCase() || 'Your Car';
  const regSlug = regUp.replace(/\s+/g, '');
  const slug    = serviceLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const alerts  = ios ? ALERTS.service.ios : ALERTS.service.other;

  return buildIcs({
    uid:             `service-${slug}-${regSlug}@tracar`,
    title:           `🔧 ${serviceLabel}: ${regUp}`,
    date:            dueDate,
    description:     'Service due for your vehicle.',
    alertDaysBefore: alerts,
  });
}

export function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
