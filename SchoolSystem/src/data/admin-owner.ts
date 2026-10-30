// Dummy data for the Owner / Super Admin panel (SOW 3.2 A, S-02, S-13).
import { StaffRole } from './admin';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  campuses: string[];
  active: boolean;
  lastLogin: string;
};

export const USERS: AdminUser[] = [
  { id: 'u1', name: 'Nadeem Akhtar', email: 'owner@bfs.edu.pk', roles: ['Owner / Super Admin'], campuses: ['main', 'girls', 'jt'], active: true, lastLogin: 'Today 8:01' },
  { id: 'u2', name: 'Dr. Farah Siddiqui', email: 'principal@bfs.edu.pk', roles: ['Principal'], campuses: ['main'], active: true, lastLogin: 'Today 7:52' },
  { id: 'u3', name: 'Saba Noreen', email: 'frontdesk@bfs.edu.pk', roles: ['Front Desk'], campuses: ['main'], active: true, lastLogin: 'Today 8:10' },
  { id: 'u4', name: 'Kamran Yousaf', email: 'accounts@bfs.edu.pk', roles: ['Accounts'], campuses: ['main', 'girls'], active: true, lastLogin: 'Today 8:30' },
  { id: 'u5', name: 'Rabia Aslam', email: 'hr@bfs.edu.pk', roles: ['HR'], campuses: ['main', 'girls', 'jt'], active: true, lastLogin: 'Yesterday 8:02' },
  { id: 'u6', name: 'Tariq Mehmood', email: 'exam@bfs.edu.pk', roles: ['Exam Controller'], campuses: ['main'], active: true, lastLogin: 'Mon 9:14' },
  { id: 'u7', name: 'Waqas Ahmed', email: 'transport@bfs.edu.pk', roles: ['Transport Manager'], campuses: ['main', 'girls'], active: true, lastLogin: 'Today 6:55' },
  { id: 'u8', name: 'Javed Iqbal', email: 'store@bfs.edu.pk', roles: ['Store Keeper'], campuses: ['main'], active: true, lastLogin: 'Yesterday 12:40' },
  { id: 'u9', name: 'Ayesha Siddiqa', email: 'library@bfs.edu.pk', roles: ['Librarian'], campuses: ['main'], active: true, lastLogin: 'Today 9:05' },
  { id: 'u10', name: 'Shazia Parveen', email: 'principal.gc@bfs.edu.pk', roles: ['Principal'], campuses: ['girls'], active: true, lastLogin: 'Today 7:48' },
  { id: 'u11', name: 'Old Cashier', email: 'cashier2@bfs.edu.pk', roles: ['Accounts'], campuses: ['jt'], active: false, lastLogin: '2 Aug' },
];

export type RoleDef = { id: string; name: string; base?: StaffRole; custom: boolean; users: number };

export const ROLE_DEFS: RoleDef[] = [
  { id: 'owner', name: 'Owner / Super Admin', base: 'owner', custom: false, users: 1 },
  { id: 'principal', name: 'Principal', base: 'principal', custom: false, users: 2 },
  { id: 'frontdesk', name: 'Front Desk', base: 'frontdesk', custom: false, users: 3 },
  { id: 'accounts', name: 'Accounts', base: 'accounts', custom: false, users: 3 },
  { id: 'hr', name: 'HR', base: 'hr', custom: false, users: 1 },
  { id: 'exam', name: 'Exam Controller', base: 'exam', custom: false, users: 1 },
  { id: 'transport', name: 'Transport Manager', base: 'transport', custom: false, users: 1 },
  { id: 'store', name: 'Store Keeper', base: 'store', custom: false, users: 1 },
  { id: 'librarian', name: 'Librarian', base: 'librarian', custom: false, users: 1 },
  { id: 'coord', name: 'Academic Coordinator', custom: true, users: 2 },
];

export const PERMS = ['View', 'Add', 'Edit', 'Delete', 'Approve'] as const;
export type Perm = (typeof PERMS)[number];

export type TemplateDef = {
  id: string;
  kind: 'Voucher' | 'Receipt' | 'Report card' | 'Certificate' | 'ID card' | 'Message';
  name: string;
  en: string;
  ur: string;
  variables: string[];
  updated: string;
};

export const TEMPLATES: TemplateDef[] = [
  { id: 't1', kind: 'Voucher', name: 'Monthly fee voucher (3 copies)', en: 'Bank copy · School copy · Parent copy\n{student_name} ({gr_no}) · {class}\nAmount {amount} due {due_date}\nLate fine Rs. 50/day after due date', ur: 'بینک کاپی · اسکول کاپی · والدین کاپی\n{student_name} · رقم {amount} · آخری تاریخ {due_date}', variables: ['student_name', 'gr_no', 'class', 'amount', 'due_date', 'voucher_no'], updated: '2 Sep' },
  { id: 't2', kind: 'Receipt', name: 'Fee receipt', en: 'Received {amount} from {student_name} by {mode}. Receipt {receipt_no}.', ur: '{student_name} سے {amount} وصول ہوئے۔ رسید {receipt_no}', variables: ['student_name', 'amount', 'mode', 'receipt_no'], updated: '2 Sep' },
  { id: 't3', kind: 'Report card', name: 'Term report card with QR', en: '{student_name} · {term}\nTotal {total} · {percentage}% · Grade {grade}\nPosition {position}\nVerify: {qr}', ur: '{student_name} · {term} · فیصد {percentage}', variables: ['student_name', 'term', 'total', 'percentage', 'grade', 'position', 'qr'], updated: '14 Oct' },
  { id: 't4', kind: 'Certificate', name: 'Leaving certificate', en: 'This is to certify that {student_name}, {gr_no}, studied in this school from {from} to {to}. Serial {serial}.', ur: 'تصدیق کی جاتی ہے کہ {student_name} اس اسکول میں زیر تعلیم رہے۔', variables: ['student_name', 'gr_no', 'from', 'to', 'serial'], updated: '1 Aug' },
  { id: 't5', kind: 'Certificate', name: 'Character certificate', en: '{student_name} bears a good moral character. Serial {serial}.', ur: '{student_name} اچھے اخلاق کے حامل ہیں۔', variables: ['student_name', 'serial'], updated: '1 Aug' },
  { id: 't6', kind: 'ID card', name: 'Student ID card', en: '{student_name}\n{gr_no} · {class}\nValid till {valid_till}', ur: '{student_name} · {gr_no}', variables: ['student_name', 'gr_no', 'class', 'valid_till', 'photo'], updated: '3 Apr' },
  { id: 't7', kind: 'Message', name: 'Absent alert', en: 'Dear parent, {student_name} is absent today ({date}). Reply if on leave. {school}', ur: 'محترم والدین، {student_name} آج ({date}) غیر حاضر ہیں۔', variables: ['student_name', 'date', 'school'], updated: '20 Sep' },
  { id: 't8', kind: 'Message', name: 'Fee reminder', en: 'Fee {amount} for {student_name} is due on {due_date}. Pay online in the app.', ur: '{student_name} کی فیس {amount} مورخہ {due_date} تک واجب الادا ہے۔', variables: ['student_name', 'amount', 'due_date'], updated: '20 Sep' },
];

export type Integration = {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  fields: Array<{ label: string; value: string; secret?: boolean }>;
};

export const INTEGRATIONS: Integration[] = [
  { id: 'sms', name: 'SMS gateway', kind: 'SMS', enabled: true, fields: [{ label: 'Provider', value: 'Jazz Business SMS' }, { label: 'Sender ID', value: 'BFSCHOOL' }, { label: 'API key', value: 'sk_live_••••4f2a', secret: true }] },
  { id: 'wa', name: 'WhatsApp Business Cloud API', kind: 'WhatsApp', enabled: true, fields: [{ label: 'Phone number ID', value: '1092837465' }, { label: 'Business account ID', value: '8837261' }, { label: 'Access token', value: 'EAAG••••9Zx', secret: true }] },
  { id: 'email', name: 'Email (SMTP / SES)', kind: 'Email', enabled: true, fields: [{ label: 'Host', value: 'email-smtp.ap-south-1.amazonaws.com' }, { label: 'From', value: 'noreply@bfs.edu.pk' }, { label: 'Password', value: '••••••••', secret: true }] },
  { id: 'jazz', name: 'JazzCash', kind: 'Payment gateway', enabled: true, fields: [{ label: 'Merchant ID', value: 'MC10293' }, { label: 'Integrity salt', value: '••••••', secret: true }] },
  { id: 'easy', name: 'Easypaisa', kind: 'Payment gateway', enabled: true, fields: [{ label: 'Store ID', value: '55621' }, { label: 'Hash key', value: '••••••', secret: true }] },
  { id: 'onelink', name: '1Link / 1Bill', kind: 'Payment gateway', enabled: false, fields: [{ label: 'Biller ID', value: 'BFS-001' }, { label: 'Secret', value: '', secret: true }] },
  { id: 'bio', name: 'Biometric devices (ZKTeco)', kind: 'Biometric', enabled: true, fields: [{ label: 'Device IP', value: '192.168.1.201' }, { label: 'Port', value: '4370' }, { label: 'Sync every', value: '15 minutes' }] },
];

export const LOGIN_HISTORY = [
  { id: 'l1', user: 'Nadeem Akhtar', when: 'Today 8:01', ip: '39.45.12.8', device: 'Android app · Samsung A54', ok: true },
  { id: 'l2', user: 'Dr. Farah Siddiqui', when: 'Today 7:52', ip: '39.45.12.9', device: 'Chrome · Windows', ok: true },
  { id: 'l3', user: 'Kamran Yousaf', when: 'Today 8:30', ip: '110.39.4.77', device: 'Chrome · Windows', ok: true },
  { id: 'l4', user: 'Unknown (accounts@bfs.edu.pk)', when: 'Today 2:14', ip: '182.185.9.3', device: 'Firefox · Linux', ok: false },
  { id: 'l5', user: 'Saba Noreen', when: 'Today 8:10', ip: '39.45.12.10', device: 'Edge · Windows', ok: true },
  { id: 'l6', user: 'Rabia Aslam', when: 'Yesterday 8:02', ip: '39.45.12.8', device: 'Chrome · Windows', ok: true },
  { id: 'l7', user: 'Sadia Anwar', when: 'Yesterday 7:40', ip: '119.160.2.4', device: 'Teacher app · iPhone 13', ok: true },
];

export type Backup = { id: string; when: string; size: string; kind: 'Automatic' | 'Manual'; expires: string };

export const BACKUPS: Backup[] = Array.from({ length: 12 }, (_, i) => ({
  id: `b${i + 1}`,
  when: i === 0 ? 'Today 2:00 AM' : `${22 - i} Oct 2:00 AM`,
  size: `${(1.82 - i * 0.004).toFixed(2)} GB`,
  kind: i === 4 ? 'Manual' : 'Automatic',
  expires: `in ${30 - i} days`,
}));

export type Transfer = { id: string; who: string; kind: 'Student' | 'Staff'; from: string; to: string; when: string; note: string };

export const TRANSFERS: Transfer[] = [
  { id: 'tr1', who: 'Hamza Raza (GR-MC-0341)', kind: 'Student', from: 'Main Campus', to: 'Johar Town Campus', when: '3 Sep', note: 'Family moved · fee structure of new campus applied' },
  { id: 'tr2', who: 'Nida Khan (EMP-0019)', kind: 'Staff', from: 'Girls Campus', to: 'Main Campus', when: '1 Aug', note: 'Science teacher shortage' },
];
