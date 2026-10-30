// Dummy data for Notifications / broadcast (SOW M-19).
import { useShared } from '../store';

export type ChannelKey = 'SMS' | 'WhatsApp' | 'Email' | 'Push';

export type Channel = {
  key: ChannelKey;
  name: string;
  provider: string;
  status: 'Connected' | 'Error';
  enabled: boolean;
};

export const CHANNELS: Channel[] = [
  { key: 'SMS', name: 'SMS gateway', provider: 'Jazz Business SMS · mask BFSCHOOL', status: 'Connected', enabled: true },
  { key: 'WhatsApp', name: 'WhatsApp Business', provider: 'Cloud API · +92 300 1112233', status: 'Connected', enabled: true },
  { key: 'Email', name: 'Email', provider: 'SMTP · noreply@bfs.edu.pk', status: 'Connected', enabled: true },
  { key: 'Push', name: 'Push notifications', provider: 'Firebase Cloud Messaging · 3 apps', status: 'Connected', enabled: true },
];

export function useChannels() {
  return useShared<Channel[]>('admin.msg.channels', CHANNELS);
}

export const AUTO_ALERTS: Array<{ key: string; label: string; sub: string }> = [
  { key: 'absent', label: 'Absent alert', sub: 'Parents of absent students at 10:30 AM' },
  { key: 'voucher', label: 'Voucher issued', sub: 'When a fee voucher is generated' },
  { key: 'due', label: 'Due reminder', sub: '3 days before the due date' },
  { key: 'payment', label: 'Payment received', sub: 'Receipt number and amount' },
  { key: 'result', label: 'Result published', sub: 'When results are published' },
  { key: 'diary', label: 'Diary posted', sub: 'Push to parents when the diary is posted' },
  { key: 'leave', label: 'Leave status', sub: 'Approved or rejected leave' },
  { key: 'notice', label: 'Notices', sub: 'New school notices' },
];

export function useAutoAlerts() {
  return useShared<Record<string, boolean>>(
    'admin.msg.auto',
    Object.fromEntries(AUTO_ALERTS.map(a => [a.key, true])),
  );
}

export type Template = { id: string; name: string; lang: 'English' | 'Urdu'; text: string };

export const TEMPLATES: Template[] = [
  { id: 'tp1', name: 'Fee due reminder', lang: 'English', text: 'Dear parent, the fee of {student_name} is {amount}, due on {due_date}. Please pay to avoid a late fine. Bright Future School' },
  { id: 'tp2', name: 'Fee due reminder', lang: 'Urdu', text: 'محترم والدین، {student_name} کی فیس {amount} ہے جو {due_date} تک واجب الادا ہے۔ لیٹ فائن سے بچنے کے لیے بروقت ادائیگی کریں۔ برائٹ فیوچر اسکول' },
  { id: 'tp3', name: 'Absent alert', lang: 'English', text: '{student_name} is absent today. Please reply if your child is on leave.' },
  { id: 'tp4', name: 'Absent alert', lang: 'Urdu', text: '{student_name} آج غیر حاضر ہے۔ اگر چھٹی پر ہے تو براہ کرم جواب دیں۔' },
  { id: 'tp5', name: 'PTM invitation', lang: 'English', text: 'Dear parent, PTM for {student_name} is on Saturday 31 October, 9:00 AM to 12:00 PM.' },
  { id: 'tp6', name: 'School closed', lang: 'English', text: 'The school will remain closed tomorrow due to weather. Classes resume on Monday.' },
];

export function useTemplates() {
  return useShared<Template[]>('admin.msg.templates', TEMPLATES);
}

export const SAMPLE_VARS: Record<string, string> = {
  '{student_name}': 'Ayesha Khan',
  '{amount}': 'Rs. 9,375',
  '{due_date}': '10 Nov',
};

export function fillTemplate(text: string) {
  return Object.entries(SAMPLE_VARS).reduce((t, [k, v]) => t.split(k).join(v), text);
}

export type Delivery = {
  id: string;
  title: string;
  to: string;
  channel: ChannelKey;
  when: string;
  recipients: number;
  delivered: number;
  failed: number;
  status: 'Delivered' | 'Partly failed' | 'Failed' | 'Pending' | 'Scheduled';
};

export const DELIVERY_LOG: Delivery[] = [
  { id: 'dl1', title: 'Absent alert', to: '42 parents', channel: 'SMS', when: 'Today 10:30', recipients: 42, delivered: 40, failed: 2, status: 'Partly failed' },
  { id: 'dl2', title: 'Absent alert', to: '42 parents', channel: 'Push', when: 'Today 10:30', recipients: 42, delivered: 42, failed: 0, status: 'Delivered' },
  { id: 'dl3', title: 'Diary posted', to: 'Class 5 parents', channel: 'Push', when: 'Today 8:40', recipients: 180, delivered: 180, failed: 0, status: 'Delivered' },
  { id: 'dl4', title: 'Fee due reminder', to: 'Defaulters', channel: 'WhatsApp', when: 'Yesterday 11:00', recipients: 312, delivered: 297, failed: 15, status: 'Partly failed' },
  { id: 'dl5', title: 'PTM invitation', to: 'All parents', channel: 'Email', when: 'Mon 9:00', recipients: 2245, delivered: 2201, failed: 44, status: 'Partly failed' },
  { id: 'dl6', title: 'Voucher issued', to: 'All parents', channel: 'SMS', when: '1 Oct 9:00', recipients: 2245, delivered: 2245, failed: 0, status: 'Delivered' },
];

export function useDeliveryLog() {
  return useShared<Delivery[]>('admin.msg.log', DELIVERY_LOG);
}

export function useSmsCredit() {
  return useShared<number>('admin.msg.credit', 12450);
}

// Recipient counts by audience (dummy school-wide figures).
export const AUDIENCES = ['A class', 'A section', 'All parents', 'All staff', 'Defaulters'];

export function recipientCount(audience: string) {
  switch (audience) {
    case 'A class':
      return 180;
    case 'A section':
      return 60;
    case 'All parents':
      return 2245;
    case 'All staff':
      return 124;
    case 'Defaulters':
      return 312;
    default:
      return 0;
  }
}

// Time like "9:30 PM" -> minutes after midnight.
export function toMinutes(t: string) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) {
    return NaN;
  }
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') {
    h += 12;
  }
  return h * 60 + Number(m[2]);
}

// Quiet hours like "9:00 PM – 7:00 AM" (may wrap past midnight).
export function inQuietHours(time: string, quiet: string) {
  const [a, b] = quiet.split(/[–-]/).map(x => x.trim());
  const t = toMinutes(time);
  const start = toMinutes(a ?? '');
  const end = toMinutes(b ?? '');
  if ([t, start, end].some(Number.isNaN)) {
    return false;
  }
  return start > end ? t >= start || t < end : t >= start && t < end;
}

export function quietEnd(quiet: string) {
  return (quiet.split(/[–-]/)[1] ?? '7:00 AM').trim();
}

let seq = 900;
export const msgId = (p: string) => `${p}${++seq}`;
