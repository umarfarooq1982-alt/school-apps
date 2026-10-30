// Dummy data and shared state for the Owner / Admin app (SOW 3.2).
import { useCallback } from 'react';
import { getShared, setShared, useShared } from '../store';

// ---------- Staff roles and access ----------

export type StaffRole =
  | 'owner'
  | 'principal'
  | 'frontdesk'
  | 'accounts'
  | 'hr'
  | 'exam'
  | 'transport'
  | 'store'
  | 'librarian';

export const STAFF_ROLES: Array<{ key: StaffRole; label: string; user: string }> = [
  { key: 'owner', label: 'Owner / Super Admin', user: 'Nadeem Akhtar' },
  { key: 'principal', label: 'Principal', user: 'Dr. Farah Siddiqui' },
  { key: 'frontdesk', label: 'Front Desk', user: 'Saba Noreen' },
  { key: 'accounts', label: 'Accounts', user: 'Kamran Yousaf' },
  { key: 'hr', label: 'HR', user: 'Rabia Aslam' },
  { key: 'exam', label: 'Exam Controller', user: 'Tariq Mehmood' },
  { key: 'transport', label: 'Transport Manager', user: 'Waqas Ahmed' },
  { key: 'store', label: 'Store Keeper', user: 'Javed Iqbal' },
  { key: 'librarian', label: 'Librarian', user: 'Ayesha Siddiqa' },
];

export function useStaffRole() {
  return useShared<StaffRole>('admin.role', 'owner');
}

export function roleInfo(role: StaffRole) {
  return STAFF_ROLES.find(r => r.key === role) ?? STAFF_ROLES[0];
}

// ---------- Campuses and sessions (S-02, M-01) ----------

export type Campus = {
  id: string;
  name: string;
  city: string;
  address: string;
  timings: string;
  bank: string;
  strength: number;
  capacity: number;
  staff: number;
  collection: number; // this month
  expected: number;
  expenses: number;
  attendance: number;
  active: boolean;
};

export const CAMPUSES: Campus[] = [
  { id: 'main', name: 'Main Campus', city: 'Lahore', address: '12-A Model Town', timings: '7:45 AM – 1:40 PM', bank: 'Meezan 0123-0104567890', strength: 1240, capacity: 1400, staff: 68, collection: 8420000, expected: 9650000, expenses: 4210000, attendance: 93, active: true },
  { id: 'girls', name: 'Girls Campus', city: 'Lahore', address: '45 Faisal Town', timings: '7:45 AM – 1:30 PM', bank: 'HBL 1234-5678901', strength: 610, capacity: 700, staff: 34, collection: 4110000, expected: 4600000, expenses: 2150000, attendance: 95, active: true },
  { id: 'jt', name: 'Johar Town Campus', city: 'Lahore', address: '88-B Johar Town', timings: '8:00 AM – 1:45 PM', bank: 'UBL 2211-9988776', strength: 395, capacity: 600, staff: 22, collection: 2390000, expected: 2900000, expenses: 1380000, attendance: 91, active: true },
];

export const ALL_CAMPUSES = 'all';

export function useCampus() {
  return useShared<string>('admin.campus', ALL_CAMPUSES);
}

export type Session = { id: string; name: string; start: string; end: string; status: 'Active' | 'Closed' | 'Planned' };

export const SESSIONS: Session[] = [
  { id: '2026-27', name: '2026-27', start: '1 Apr 2026', end: '31 Mar 2027', status: 'Active' },
  { id: '2025-26', name: '2025-26', start: '1 Apr 2025', end: '31 Mar 2026', status: 'Closed' },
  { id: '2024-25', name: '2024-25', start: '1 Apr 2024', end: '31 Mar 2025', status: 'Closed' },
];

export function useAdminSession() {
  return useShared<string>('admin.session', SESSIONS[0].id);
}

// Past sessions are read-only for everyone except the Owner (M-01).
export function useReadOnly() {
  const [session] = useAdminSession();
  const [role] = useStaffRole();
  const s = SESSIONS.find(x => x.id === session);
  return s?.status === 'Closed' && role !== 'owner';
}

// ---------- Academic structure ----------

export const CLASSES = [
  'Playgroup', 'Nursery', 'Prep', 'Class 1', 'Class 2', 'Class 3', 'Class 4',
  'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
];

export const SECTIONS = ['A', 'B', 'C'];

export const SUBJECTS = [
  { code: 'ENG', name: 'English', type: 'Core', kind: 'Theory' },
  { code: 'MTH', name: 'Mathematics', type: 'Core', kind: 'Theory' },
  { code: 'URD', name: 'Urdu', type: 'Core', kind: 'Theory' },
  { code: 'SCI', name: 'Science', type: 'Core', kind: 'Theory + Practical' },
  { code: 'ISL', name: 'Islamiat', type: 'Core', kind: 'Theory' },
  { code: 'SST', name: 'Social Studies', type: 'Core', kind: 'Theory' },
  { code: 'CMP', name: 'Computer', type: 'Elective', kind: 'Theory + Practical' },
  { code: 'ART', name: 'Art', type: 'Optional', kind: 'Practical' },
];

// ---------- People ----------

const FIRST_M = ['Ahmed', 'Bilal', 'Hamza', 'Ali', 'Usman', 'Hassan', 'Zain', 'Imran', 'Kashif', 'Saad', 'Faizan', 'Danish', 'Rayan', 'Taha', 'Umar'];
const FIRST_F = ['Ayesha', 'Fatima', 'Hira', 'Laiba', 'Maryam', 'Zainab', 'Mahnoor', 'Iqra', 'Amna', 'Sana', 'Areeba', 'Hafsa', 'Noor', 'Eman', 'Alishba'];
const LAST = ['Khan', 'Ahmed', 'Ali', 'Raza', 'Saleem', 'Javed', 'Tariq', 'Noor', 'Butt', 'Sheikh', 'Malik', 'Qureshi', 'Chaudhry', 'Hashmi', 'Mirza'];

export type AdminStudent = {
  id: string;
  name: string;
  gender: 'M' | 'F';
  gr: string;
  className: string;
  section: string;
  roll: number;
  campus: string;
  father: string;
  fatherCnic: string;
  mobile: string;
  bForm: string;
  status: 'Active' | 'Struck off' | 'Left' | 'Transferred';
  due: number;
  attendance: number;
  result: number;
  transport?: string;
  admitted: string;
};

export const ADMIN_STUDENTS: AdminStudent[] = Array.from({ length: 64 }, (_, i) => {
  const female = i % 2 === 1;
  const first = (female ? FIRST_F : FIRST_M)[i % 15];
  const last = LAST[(i * 7) % 15];
  const campus = CAMPUSES[i % 5 === 4 ? 1 : i % 7 === 6 ? 2 : 0];
  const cls = CLASSES[3 + (i % 10)];
  const fatherFirst = FIRST_M[(i * 3 + 4) % 15];
  return {
    id: `st${i + 1}`,
    name: `${first} ${last}`,
    gender: female ? 'F' : 'M',
    gr: `GR-${campus.id === 'main' ? 'MC' : campus.id === 'girls' ? 'GC' : 'JT'}-${String(15 + i * 3).padStart(4, '0')}`,
    className: cls,
    section: SECTIONS[i % 2],
    roll: (i % 30) + 1,
    campus: campus.id,
    father: `${fatherFirst} ${last}`,
    fatherCnic: `35202-${String(1234567 + i * 911).slice(0, 7)}-${(i % 9) + 1}`,
    mobile: `03${String(i % 5).padStart(2, '0')} ${String(4410000 + i * 137).slice(0, 3)} ${String(4410000 + i * 137).slice(3, 7)}`,
    bForm: `35202-${String(7654321 + i * 523).slice(0, 7)}-${(i % 8) + 2}`,
    status: i === 61 ? 'Left' : i === 62 ? 'Struck off' : i === 63 ? 'Transferred' : 'Active',
    due: i % 4 === 0 ? 9375 : i % 9 === 0 ? 18750 : 0,
    attendance: 78 + ((i * 13) % 21),
    result: 52 + ((i * 17) % 47),
    transport: i % 3 === 0 ? `Route ${(i % 6) + 1}` : undefined,
    admitted: `${(i % 27) + 1} Apr ${2019 + (i % 7)}`,
  };
});
// The design's Ayesha Khan is the first student everywhere.
ADMIN_STUDENTS[1] = { ...ADMIN_STUDENTS[1], name: 'Ayesha Khan', gr: 'GR-MC-0012', className: 'Class 5', section: 'A', roll: 7, father: 'Imran Khan', fatherCnic: '35202-1234567-1', mobile: '0300 441 0000', campus: 'main', due: 9375, attendance: 94, result: 86, transport: 'Route 3' };

export type AdminStaff = {
  id: string;
  name: string;
  designation: string;
  department: string;
  campus: string;
  cnic: string;
  mobile: string;
  joined: string;
  type: 'Permanent' | 'Contract' | 'Visiting';
  salary: number;
  status: 'Active' | 'On probation' | 'Left';
  contractEnd?: string;
  subjects?: string;
};

const DESIGNATIONS: Array<[string, string]> = [
  ['Teacher', 'Academics'], ['Senior Teacher', 'Academics'], ['Coordinator', 'Academics'],
  ['Accountant', 'Accounts'], ['Clerk', 'Front Desk'], ['Driver', 'Transport'],
  ['Lab Assistant', 'Academics'], ['Librarian', 'Library'],
];

export const ADMIN_STAFF: AdminStaff[] = Array.from({ length: 32 }, (_, i) => {
  const female = i % 3 !== 0;
  const name = `${(female ? FIRST_F : FIRST_M)[(i * 4) % 15]} ${LAST[(i * 5 + 2) % 15]}`;
  const [designation, department] = DESIGNATIONS[i % 5 === 3 ? 3 : i % 7 === 5 ? 5 : i % 6]
    ?? DESIGNATIONS[0];
  return {
    id: `EMP-${String(i + 1).padStart(4, '0')}`,
    name,
    designation,
    department,
    campus: CAMPUSES[i % 4 === 3 ? 1 : i % 9 === 8 ? 2 : 0].id,
    cnic: `35201-${String(2345678 + i * 733).slice(0, 7)}-${(i % 9) + 1}`,
    mobile: `03${String(10 + (i % 40)).padStart(2, '0')} ${String(5551212 + i * 211).slice(0, 7)}`,
    joined: `${(i % 27) + 1} ${['Jan', 'Mar', 'Apr', 'Aug', 'Sep'][i % 5]} ${2015 + (i % 11)}`,
    type: i % 8 === 7 ? 'Visiting' : i % 4 === 2 ? 'Contract' : 'Permanent',
    salary: 38000 + ((i * 3700) % 52000),
    status: i === 31 ? 'Left' : i % 10 === 9 ? 'On probation' : 'Active',
    contractEnd: i % 4 === 2 ? `${(i % 27) + 1} Dec 2026` : undefined,
    subjects: department === 'Academics' ? SUBJECTS[i % SUBJECTS.length].name : undefined,
  };
});
ADMIN_STAFF[0] = { ...ADMIN_STAFF[0], name: 'Sadia Anwar', designation: 'Class teacher 5-A', department: 'Academics', subjects: 'English', salary: 54000, campus: 'main', status: 'Active', type: 'Permanent' };

export function campusName(id: string) {
  if (id === ALL_CAMPUSES) {
    return 'All campuses';
  }
  return CAMPUSES.find(c => c.id === id)?.name ?? id;
}

// ---------- Approvals inbox (shared by every panel) ----------

export type ApprovalType =
  | 'Admission'
  | 'Discount'
  | 'Fine waiver'
  | 'Leave'
  | 'Result'
  | 'Payroll'
  | 'Attendance correction'
  | 'Refund'
  | 'Stock adjustment'
  | 'Voucher reversal'
  | 'Leaving certificate';

export type Approval = {
  id: string;
  type: ApprovalType;
  title: string;
  sub: string;
  by: string;
  when: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  note?: string;
};

const APPROVALS_SEED: Approval[] = [
  { id: 'ap1', type: 'Admission', title: 'Admission: Rayan Malik, Class 3', sub: 'Entry test 78% · Selected · admission fee paid', by: 'Saba Noreen (Front Desk)', when: 'Today 9:10', status: 'Pending' },
  { id: 'ap2', type: 'Discount', title: 'Need-based discount 40% · Hafsa Raza', sub: 'Tuition only · Nov 2026 – Mar 2027', by: 'Kamran Yousaf (Accounts)', when: 'Today 8:45', status: 'Pending' },
  { id: 'ap3', type: 'Fine waiver', title: 'Late fine waiver Rs. 450 · Bilal Ahmed', sub: 'Reason: father hospitalised in October', by: 'Kamran Yousaf (Accounts)', when: 'Yesterday', status: 'Pending' },
  { id: 'ap4', type: 'Leave', title: 'Casual leave · Faisal Nadeem', sub: '22 Oct · 1 day · 6 casual left', by: 'Faisal Nadeem (Teacher)', when: 'Yesterday', status: 'Pending' },
  { id: 'ap5', type: 'Result', title: 'Publish mid-term results · Class 5', sub: 'All marks entered and locked', by: 'Tariq Mehmood (Exam)', when: 'Mon', status: 'Pending' },
  { id: 'ap6', type: 'Payroll', title: 'Payroll September 2026', sub: '102 employees · Rs. 6,284,300 net', by: 'Kamran Yousaf (Accounts)', when: '1 Oct', status: 'Approved' },
  { id: 'ap7', type: 'Attendance correction', title: 'Attendance correction · Class 5-A · 21 Oct', sub: 'Hamza Ali: Absent → Late', by: 'Sadia Anwar (Teacher)', when: 'Today 10:40', status: 'Pending' },
];

export function useApprovals() {
  return useShared<Approval[]>('admin.approvals', APPROVALS_SEED);
}

let seq = 100;
export const adminId = (p: string) => `${p}${++seq}`;

// Any panel calls this when a change needs approval through the chain.
export function requestApproval(a: Omit<Approval, 'id' | 'status' | 'when'>) {
  const item: Approval = { ...a, id: adminId('ap'), status: 'Pending', when: 'Just now' };
  setShared<Approval[]>('admin.approvals', prev => [item, ...(prev ?? getShared('admin.approvals', APPROVALS_SEED))]);
  logAudit('Approval requested', `${a.type}: ${a.title}`);
  return item.id;
}

// ---------- Audit log (S-13): append-only ----------

export type AuditEntry = { id: string; when: string; user: string; action: string; detail: string };

const AUDIT_SEED: AuditEntry[] = [
  { id: 'au1', when: 'Today 10:42', user: 'Sadia Anwar', action: 'Attendance', detail: 'Class 5-A marked · 26 P, 1 A, 1 L, 2 LV' },
  { id: 'au2', when: 'Today 9:58', user: 'Kamran Yousaf', action: 'Fee collection', detail: 'Receipt R-26-000611 · Rs. 8,500 · cash' },
  { id: 'au3', when: 'Today 9:10', user: 'Saba Noreen', action: 'Admission', detail: 'Rayan Malik sent for approval' },
  { id: 'au4', when: 'Yesterday 16:20', user: 'Nadeem Akhtar', action: 'Settings', detail: 'Late fine changed: Rs. 40 → Rs. 50 per day (old → new)' },
  { id: 'au5', when: 'Yesterday 8:02', user: 'Rabia Aslam', action: 'Login', detail: 'Login from Chrome · Windows · 39.45.12.8' },
];

export function useAudit() {
  return useShared<AuditEntry[]>('admin.audit', AUDIT_SEED);
}

// Every change is written here; entries are never edited or removed.
export function logAudit(action: string, detail: string) {
  const role = getShared<StaffRole>('admin.role', 'owner');
  const entry: AuditEntry = {
    id: adminId('au'),
    when: 'Just now',
    user: roleInfo(role).user,
    action,
    detail,
  };
  setShared<AuditEntry[]>('admin.audit', prev => [entry, ...(prev ?? getShared('admin.audit', AUDIT_SEED))]);
}

// Convenience hook: update state and audit in one call.
export function useAudited<T>(key: string, initial: T, action: string) {
  const [value, setValue] = useShared<T>(key, initial);
  const update = useCallback(
    (next: T | ((prev: T) => T), detail: string) => {
      setValue(next);
      logAudit(action, detail);
    },
    [setValue, action],
  );
  return [value, update] as const;
}

// ---------- School settings used by several panels (S-13) ----------

export type SchoolRules = {
  lateFinePerDay: number;
  lateFineCap: number;
  dueDay: number;
  attendanceCutoff: string;
  diaryCutoff: string;
  maxDiscountPct: number;
  libraryIssueLimit: number;
  holdAdmitCardForDefaulters: boolean;
  periodAttendance: boolean;
  admissionNeedsFee: boolean;
  quietHours: string;
};

export const DEFAULT_RULES: SchoolRules = {
  lateFinePerDay: 50,
  lateFineCap: 1000,
  dueDay: 10,
  attendanceCutoff: '10:00 AM',
  diaryCutoff: '8:00 PM',
  maxDiscountPct: 50,
  libraryIssueLimit: 2,
  holdAdmitCardForDefaulters: true,
  periodAttendance: true,
  admissionNeedsFee: true,
  quietHours: '9:00 PM – 7:00 AM',
};

export function useRules() {
  return useShared<SchoolRules>('admin.rules', DEFAULT_RULES);
}
