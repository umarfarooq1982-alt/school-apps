// Dummy data and shared state for the Front Desk / Admission panel
// (SOW 3.2 C: M-02, S-03, S-05, S-10).
import { getShared, setShared, useShared } from '../store';
import { ADMIN_STUDENTS, AdminStudent, CAMPUSES } from './admin';

// ---------- Inquiries (S-03) ----------

export type InquirySource = 'Walk-in' | 'Call' | 'Website' | 'Facebook';
export type InquiryStatus = 'New' | 'Contacted' | 'Visited' | 'Registered' | 'Lost';

export type Inquiry = {
  id: string;
  child: string;
  parent: string;
  mobile: string;
  cls: string;
  source: InquirySource;
  status: InquiryStatus;
  followUp: string;
  assigned: string;
  notes: string;
};

export const FRONT_STAFF = ['Saba Noreen', 'Hina Tariq', 'Adeel Khan'];
export const FOLLOW_UP_DATES = ['Today', 'Tomorrow', 'Sat 24 Oct', 'Mon 26 Oct', 'Wed 28 Oct', 'Sat 31 Oct'];
export const SOURCES: InquirySource[] = ['Walk-in', 'Call', 'Website', 'Facebook'];
export const INQUIRY_STATUSES: InquiryStatus[] = ['New', 'Contacted', 'Visited', 'Registered', 'Lost'];

const CHILD_NAMES = ['Rayan Malik', 'Areeba Hashmi', 'Taha Qureshi', 'Eman Butt', 'Saad Mirza', 'Noor Sheikh', 'Umar Chaudhry', 'Hafsa Raza', 'Zain Javed', 'Alishba Tariq', 'Danish Ali', 'Maryam Saleem', 'Faizan Noor', 'Iqra Malik'];
const INQ_CLASSES = ['Playgroup', 'Nursery', 'Prep', 'Class 1', 'Class 3', 'Class 5', 'Class 6'];

const INQUIRIES_SEED: Inquiry[] = CHILD_NAMES.map((child, i) => ({
  id: `inq${i + 1}`,
  child,
  parent: `${['Asif', 'Naveed', 'Shahid', 'Rizwan', 'Kamran', 'Fahad', 'Babar'][i % 7]} ${child.split(' ')[1]}`,
  mobile: `03${String(10 + i * 3).padStart(2, '0')} ${String(2200000 + i * 7311).slice(0, 7)}`,
  cls: INQ_CLASSES[i % INQ_CLASSES.length],
  source: SOURCES[i % 4],
  status: INQUIRY_STATUSES[i % 9 === 8 ? 4 : i % 5 === 4 ? 3 : i % 3],
  followUp: FOLLOW_UP_DATES[i % FOLLOW_UP_DATES.length],
  assigned: FRONT_STAFF[i % 3],
  notes: i % 2 ? 'Asked about transport and fee structure.' : 'Wants campus visit with the child.',
}));

export const useInquiries = () => useShared<Inquiry[]>('fd.inquiries', INQUIRIES_SEED);

// ---------- Registrations and entry test (M-02) ----------

export type Decision = 'Pending' | 'Selected' | 'Waiting' | 'Rejected';

export type Registration = {
  regNo: string;
  name: string;
  gender: 'M' | 'F';
  dob: string;
  bForm: string;
  father: string;
  fatherCnic: string;
  mobile: string;
  prevSchool: string;
  cls: string;
  campus: string;
  feePaid: boolean;
  testId?: string;
  marks?: Record<string, number>;
  interview?: string;
  decision: Decision;
  admission?: Admission;
};

export type Admission = {
  approvalId: string;
  section: string;
  gr?: string;
  roll?: number;
  feeVoucher?: string;
  feePaid: boolean;
  logins?: { parent: string; student: string; siblings: number };
  final: boolean;
};

export const REG_FEE = 2500;
export const ADMISSION_FEE = 15000;
export const TEST_SUBJECTS = ['English', 'Mathematics', 'Urdu'];
export const TEST_MAX = 50;

const REG_SEED: Registration[] = [
  ['Rayan Malik', 'M', 'Class 3', [44, 41, 38], 'Confident, reads well', 'Selected'],
  ['Areeba Hashmi', 'F', 'Class 3', [39, 45, 40], 'Shy but strong in maths', 'Selected'],
  ['Taha Qureshi', 'M', 'Class 3', [30, 28, 35], 'Needs support in English', 'Waiting'],
  ['Eman Butt', 'F', 'Class 3', [44, 41, 38], 'Excellent manners', 'Pending'],
  ['Saad Mirza', 'M', 'Class 3', [18, 22, 25], 'Weak basics', 'Rejected'],
  ['Noor Sheikh', 'F', 'Class 1', [40, 46, 42], '', 'Pending'],
  ['Umar Chaudhry', 'M', 'Class 1', [35, 33, 38], '', 'Pending'],
  ['Hafsa Raza', 'F', 'Class 6', [], '', 'Pending'],
].map(([name, gender, cls, marks, interview, decision], i) => {
  const m = marks as number[];
  return {
    regNo: `REG-26-${String(301 + i).padStart(4, '0')}`,
    name: name as string,
    gender: gender as 'M' | 'F',
    dob: `${(i % 27) + 1} ${['Jan', 'Mar', 'May', 'Aug'][i % 4]} ${cls === 'Class 1' ? 2020 : cls === 'Class 6' ? 2015 : 2018}`,
    bForm: `35202-${String(8800000 + i * 1371).slice(0, 7)}-${(i % 8) + 1}`,
    father: `${['Asif', 'Naveed', 'Shahid', 'Rizwan', 'Kamran', 'Fahad', 'Babar', 'Tahir'][i]} ${(name as string).split(' ')[1]}`,
    fatherCnic: `35202-${String(4400000 + i * 2213).slice(0, 7)}-${(i % 9) + 1}`,
    mobile: `0321 ${String(5550000 + i * 911).slice(0, 7)}`,
    prevSchool: ['Beaconhouse', 'City School', 'Allied School', 'Home schooled'][i % 4],
    cls: cls as string,
    campus: 'main',
    feePaid: i !== 7,
    testId: m.length ? (cls === 'Class 1' ? 't2' : 't1') : undefined,
    marks: m.length ? Object.fromEntries(TEST_SUBJECTS.map((s, j) => [s, m[j]])) : undefined,
    interview: interview as string,
    decision: decision as Decision,
  };
});

export const useRegistrations = () => useShared<Registration[]>('fd.registrations', REG_SEED);

let regSeq = 309;
export function nextRegNo() {
  regSeq += 1;
  return `REG-26-${String(regSeq).padStart(4, '0')}`;
}

export type TestSchedule = { id: string; cls: string; date: string; time: string; room: string; published: boolean };

const TESTS_SEED: TestSchedule[] = [
  { id: 't1', cls: 'Class 3', date: 'Sat 17 Oct', time: '9:00 AM', room: 'Hall A', published: false },
  { id: 't2', cls: 'Class 1', date: 'Sat 17 Oct', time: '11:00 AM', room: 'Room 4', published: false },
  { id: 't3', cls: 'Class 6', date: 'Sat 31 Oct', time: '9:00 AM', room: 'Hall A', published: false },
];

export const useTests = () => useShared<TestSchedule[]>('fd.tests', TESTS_SEED);

export const testTotal = (r: Registration) =>
  r.marks ? TEST_SUBJECTS.reduce((s, sub) => s + (r.marks?.[sub] ?? 0), 0) : 0;

// Merit list: highest total first; equal totals share a rank (1, 1, 3).
export function meritList(regs: Registration[]) {
  const withMarks = regs.filter(r => r.marks);
  const sorted = [...withMarks].sort((a, b) => testTotal(b) - testTotal(a) || a.name.localeCompare(b.name));
  return sorted.map(r => ({
    reg: r,
    total: testTotal(r),
    rank: 1 + sorted.filter(o => testTotal(o) > testTotal(r)).length,
  }));
}

// ---------- GR numbers: unique per campus, never reused (M-02) ----------

const campusCode = (campus: string) =>
  campus === 'girls' ? 'GC' : campus === 'jt' ? 'JT' : 'MC';

export function nextGr(campus: string) {
  const code = campusCode(campus);
  const used = getShared<string[]>('fd.grUsed', []);
  const all = [...ADMIN_STUDENTS.map(s => s.gr), ...used].filter(g => g.startsWith(`GR-${code}-`));
  const max = all.reduce((m, g) => Math.max(m, Number(g.split('-')[2]) || 0), 0);
  const gr = `GR-${code}-${String(max + 1).padStart(4, '0')}`;
  setShared<string[]>('fd.grUsed', prev => [...(prev ?? []), gr]);
  return gr;
}

// Duplicate check on B-Form number and father CNIC (M-02 key rule).
// Same B-Form = same child. Same father CNIC with the same child name is also
// a duplicate; same CNIC with another name is a sibling and is only reported.
export function findDuplicate(
  regs: Registration[],
  name: string,
  bForm: string,
  fatherCnic: string,
): { error?: string; siblings: AdminStudent[] } {
  const digits = (x: string) => x.replace(/\D/g, '');
  const b = digits(bForm);
  const c = digits(fatherCnic);
  const n = name.trim().toLowerCase();
  const siblings = c ? siblingsOf(fatherCnic) : [];
  const student = ADMIN_STUDENTS.find(
    s => (b && digits(s.bForm) === b) || (c && digits(s.fatherCnic) === c && s.name.toLowerCase() === n),
  );
  if (student) {
    return { error: `Duplicate: already enrolled as ${student.name} (${student.gr})`, siblings };
  }
  const reg = regs.find(
    r => (b && digits(r.bForm) === b) || (c && digits(r.fatherCnic) === c && r.name.toLowerCase() === n),
  );
  if (reg) {
    return { error: `Duplicate: already registered as ${reg.regNo} (${reg.name})`, siblings };
  }
  return { siblings };
}

export function siblingsOf(fatherCnic: string, exceptId?: string): AdminStudent[] {
  const c = fatherCnic.replace(/\D/g, '');
  return ADMIN_STUDENTS.filter(s => s.id !== exceptId && s.fatherCnic.replace(/\D/g, '') === c);
}

// ---------- Student status history ----------

export type StatusChange = { when: string; from: string; to: string; reason: string; by: string };
export const useStudentStatus = () =>
  useShared<Record<string, { status: AdminStudent['status']; history: StatusChange[] }>>('fd.studentStatus', {});

export const useStudentDocs = () =>
  useShared<Record<string, string[]>>('fd.studentDocs', {});

// ---------- Certificates (S-05) ----------

export type CertType = 'Leaving' | 'Character' | 'Bonafide' | 'Other';
export const CERT_TYPES: CertType[] = ['Leaving', 'Character', 'Bonafide', 'Other'];
export const CERT_FEE: Record<CertType, number> = { Leaving: 500, Character: 300, Bonafide: 300, Other: 300 };

export type CertRequest = {
  id: string;
  studentId: string;
  type: CertType;
  purpose: string;
  status: 'Requested' | 'Issued' | 'Rejected' | 'Waiting approval';
  from: 'Parent portal' | 'Front desk';
  serial?: string;
};

const CERT_SEED: CertRequest[] = [
  { id: 'cr1', studentId: 'st2', type: 'Character', purpose: 'Visa application', status: 'Requested', from: 'Parent portal' },
  { id: 'cr2', studentId: 'st5', type: 'Bonafide', purpose: 'Bank account', status: 'Requested', from: 'Parent portal' },
  { id: 'cr3', studentId: 'st9', type: 'Leaving', purpose: 'Moving to Karachi', status: 'Requested', from: 'Parent portal' },
  { id: 'cr4', studentId: 'st14', type: 'Bonafide', purpose: 'Sports trial', status: 'Issued', from: 'Front desk', serial: 'BC-26-0041' },
];

export const useCertRequests = () => useShared<CertRequest[]>('fd.certs', CERT_SEED);

export type IssueLog = { serial: string; studentId: string; type: CertType; by: string; when: string };
export const useIssueLog = () =>
  useShared<IssueLog[]>('fd.issueLog', [
    { serial: 'BC-26-0041', studentId: 'st14', type: 'Bonafide', by: 'Saba Noreen', when: '19 Oct' },
    { serial: 'CC-26-0102', studentId: 'st20', type: 'Character', by: 'Saba Noreen', when: '12 Oct' },
  ]);

let certSeq = 120;
export function nextSerial(type: CertType) {
  certSeq += 1;
  const p = { Leaving: 'LC', Character: 'CC', Bonafide: 'BC', Other: 'OC' }[type];
  return `${p}-26-${String(certSeq).padStart(4, '0')}`;
}

// ---------- Visitors, gate pass, call log (S-10) ----------

export type Visitor = { id: string; name: string; cnic: string; purpose: string; met: string; in: string; out?: string };

export const useVisitors = () =>
  useShared<Visitor[]>('fd.visitors', [
    { id: 'v1', name: 'Shahzad Akram', cnic: '35202-5566778-1', purpose: 'Fee query', met: 'Accounts', in: '9:05 AM' },
    { id: 'v2', name: 'Nida Farooq', cnic: '35201-1122334-2', purpose: 'Admission inquiry', met: 'Front Desk', in: '9:40 AM' },
    { id: 'v3', name: 'Ali Raza', cnic: '35202-1234567-7', purpose: 'Early pickup', met: 'Class teacher 5-A', in: '11:10 AM', out: '11:22 AM' },
    { id: 'v4', name: 'Pak Stationers rep', cnic: '35202-9988776-5', purpose: 'Supplier delivery', met: 'Store', in: '10:15 AM' },
  ]);

export type PickupPerson = { name: string; relation: string; cnic: string };

export const PICKUP_SEED: Record<string, PickupPerson[]> = Object.fromEntries(
  ADMIN_STUDENTS.slice(0, 30).map(s => [
    s.id,
    [
      { name: s.father, relation: 'Father', cnic: s.fatherCnic },
      { name: `Mrs. ${s.father.split(' ')[1]}`, relation: 'Mother', cnic: s.fatherCnic.replace(/-\d$/, '-2') },
      ...(s.id === 'st2' ? [{ name: 'Ali Raza', relation: 'Uncle', cnic: '35202-1234567-7' }] : []),
    ],
  ]),
);

export const usePickupPersons = () => useShared<Record<string, PickupPerson[]>>('fd.pickup', PICKUP_SEED);

export type GatePass = { id: string; studentId: string; person: string; relation: string; time: string; reason: string };
export const useGatePasses = () =>
  useShared<GatePass[]>('fd.gatepasses', [
    { id: 'gp1', studentId: 'st2', person: 'Ali Raza', relation: 'Uncle', time: '15 Oct 11:20', reason: 'Doctor appointment' },
  ]);

export type Call = { id: string; dir: 'Incoming' | 'Outgoing'; name: string; number: string; purpose: string; time: string };
export const useCalls = () =>
  useShared<Call[]>('fd.calls', [
    { id: 'c1', dir: 'Incoming', name: 'Mrs. Hashmi', number: '0321 4455667', purpose: 'Admission test date', time: '8:50 AM' },
    { id: 'c2', dir: 'Outgoing', name: 'Imran Khan', number: '0300 441 0000', purpose: 'Absent alert follow-up', time: '10:35 AM' },
    { id: 'c3', dir: 'Incoming', name: 'Transport office', number: '042 35761234', purpose: 'Route 3 delay', time: '7:55 AM' },
  ]);

export const nowTime = () => {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`;
};

export const campusOptions = CAMPUSES.map(c => c.name);
export const campusIdByName = (name: string) => CAMPUSES.find(c => c.name === name)?.id ?? 'main';
