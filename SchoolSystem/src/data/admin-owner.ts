// Types and role list for the Owner / Super Admin panel (SOW 3.2 A, S-02, S-13). No sample records.
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

export type RoleDef = { id: string; name: string; base?: StaffRole; custom: boolean; users: number };

export const ROLE_DEFS: RoleDef[] = [
  { id: 'owner', name: 'Owner / Super Admin', base: 'owner', custom: false, users: 0 },
  { id: 'principal', name: 'Principal', base: 'principal', custom: false, users: 0 },
  { id: 'frontdesk', name: 'Front Desk', base: 'frontdesk', custom: false, users: 0 },
  { id: 'accounts', name: 'Accounts', base: 'accounts', custom: false, users: 0 },
  { id: 'hr', name: 'HR', base: 'hr', custom: false, users: 0 },
  { id: 'exam', name: 'Exam Controller', base: 'exam', custom: false, users: 0 },
  { id: 'transport', name: 'Transport Manager', base: 'transport', custom: false, users: 0 },
  { id: 'store', name: 'Store Keeper', base: 'store', custom: false, users: 0 },
  { id: 'librarian', name: 'Librarian', base: 'librarian', custom: false, users: 0 },
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

export type Backup = { id: string; when: string; size: string; kind: 'Automatic' | 'Manual'; expires: string };

export type Transfer = { id: string; who: string; kind: 'Student' | 'Staff'; from: string; to: string; when: string; note: string };

