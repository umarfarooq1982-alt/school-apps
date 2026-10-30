// HR panel (SOW 3.2 E): staff, hiring, attendance, leave, salary, payroll
// and exit. Calculation functions are pure so they can be unit tested.
import { ADMIN_STAFF, AdminStaff } from './admin';

// ---------- Payroll (M-11) ----------

export type Amount = { name: string; amount: number };

export type PayInput = {
  basic: number;
  allowances: Amount[];
  deductions: Amount[]; // fixed: EOBI, tax...
  lates: number;
  latesPerDay?: number; // 3 lates = 1 day
  unpaidLeaveDays: number;
  absentDays: number;
  loanInstallment: number;
  arrears: number;
  bonus: number;
  adjustments?: Array<{ label: string; amount: number }>;
  daysInMonth?: number;
};

export type PayResult = {
  gross: number;
  perDay: number;
  lateDays: number;
  lateDeduction: number;
  leaveDeduction: number;
  absentDeduction: number;
  fixedDeductions: number;
  loan: number;
  additions: number;
  adjustments: number;
  net: number;
  lines: Array<{ label: string; amount: number }>;
};

export function calcPayroll(p: PayInput): PayResult {
  const days = p.daysInMonth ?? 30;
  const per = p.latesPerDay ?? 3;
  const allowances = p.allowances.reduce((s, a) => s + a.amount, 0);
  const gross = p.basic + allowances;
  const perDay = Math.round(gross / days);
  const lateDays = Math.floor(p.lates / per);
  const lateDeduction = lateDays * perDay;
  const leaveDeduction = p.unpaidLeaveDays * perDay;
  const absentDeduction = p.absentDays * perDay;
  const fixedDeductions = p.deductions.reduce((s, d) => s + d.amount, 0);
  const adjustments = (p.adjustments ?? []).reduce((s, a) => s + a.amount, 0);
  const additions = p.arrears + p.bonus;
  const net =
    gross - lateDeduction - leaveDeduction - absentDeduction - fixedDeductions - p.loanInstallment + additions + adjustments;
  const lines: Array<{ label: string; amount: number }> = [
    { label: 'Basic salary', amount: p.basic },
    ...p.allowances.map(a => ({ label: a.name, amount: a.amount })),
  ];
  if (lateDeduction) {
    lines.push({ label: `Late arrivals (${p.lates}; ${per} = 1 day)`, amount: -lateDeduction });
  }
  if (leaveDeduction) {
    lines.push({ label: `Unpaid leave (${p.unpaidLeaveDays} days)`, amount: -leaveDeduction });
  }
  if (absentDeduction) {
    lines.push({ label: `Absent (${p.absentDays} days)`, amount: -absentDeduction });
  }
  if (p.loanInstallment) {
    lines.push({ label: 'Loan installment', amount: -p.loanInstallment });
  }
  p.deductions.forEach(d => lines.push({ label: d.name, amount: -d.amount }));
  if (p.arrears) {
    lines.push({ label: 'Arrears', amount: p.arrears });
  }
  if (p.bonus) {
    lines.push({ label: 'Bonus', amount: p.bonus });
  }
  (p.adjustments ?? []).forEach(a => lines.push({ label: `Adjustment: ${a.label}`, amount: a.amount }));
  return {
    gross,
    perDay,
    lateDays,
    lateDeduction,
    leaveDeduction,
    absentDeduction,
    fixedDeductions,
    loan: p.loanInstallment,
    additions,
    adjustments,
    net,
    lines,
  };
}

// ---------- Leave (M-16) ----------

export type LeaveType = 'Casual' | 'Sick' | 'Annual' | 'Maternity' | 'Unpaid';

export type LeavePolicy = { type: LeaveType; quota: number; carryForward: number };

export const LEAVE_POLICIES: LeavePolicy[] = [
  { type: 'Casual', quota: 10, carryForward: 0 },
  { type: 'Sick', quota: 8, carryForward: 4 },
  { type: 'Annual', quota: 14, carryForward: 10 },
  { type: 'Maternity', quota: 90, carryForward: 0 },
  { type: 'Unpaid', quota: 0, carryForward: 0 },
];

// Leave beyond the balance is allowed only as unpaid leave.
export function splitLeave(left: number, days: number, type: LeaveType) {
  if (type === 'Unpaid') {
    return { paid: 0, unpaid: days };
  }
  const paid = Math.min(Math.max(0, left), days);
  return { paid, unpaid: days - paid };
}

export function carryForwardLeave(left: number, maxCarry: number) {
  return Math.min(Math.max(0, left), maxCarry);
}

// ---------- Staff attendance timing rules (M-10) ----------

export type TimingRules = {
  start: string; // HH:MM
  graceMins: number;
  halfDayAfter: string;
  end: string;
  shortLeaveMaxMins: number;
};

export const TIMING_RULES: TimingRules = {
  start: '07:45',
  graceMins: 10,
  halfDayAfter: '10:00',
  end: '13:40',
  shortLeaveMaxMins: 120,
};

const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

export type StaffDayStatus = 'Present' | 'Late' | 'Half day' | 'Short leave' | 'Early leave' | 'Absent' | 'Leave';

export function classifyAttendance(
  timeIn: string | null,
  timeOut: string | null,
  rules: TimingRules = TIMING_RULES,
  onLeave = false,
): StaffDayStatus {
  if (onLeave) {
    return 'Leave';
  }
  if (!timeIn) {
    return 'Absent';
  }
  const tin = mins(timeIn);
  if (tin > mins(rules.halfDayAfter)) {
    return 'Half day';
  }
  if (timeOut) {
    const early = mins(rules.end) - mins(timeOut);
    if (early > rules.shortLeaveMaxMins) {
      return 'Half day';
    }
    if (early > 0 && tin <= mins(rules.start) + rules.graceMins) {
      return early <= 30 ? 'Early leave' : 'Short leave';
    }
  }
  if (tin > mins(rules.start) + rules.graceMins) {
    return 'Late';
  }
  return 'Present';
}

// ---------- Salary changes ----------

export function applyIncrement(basic: number, inc: { mode: '%' | 'Fixed'; value: number }) {
  return inc.mode === '%' ? Math.round(basic * (1 + inc.value / 100)) : basic + inc.value;
}

export function loanSchedule(amount: number, installments: number) {
  const n = Math.max(1, Math.floor(installments));
  const each = Math.floor(amount / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? amount - each * (n - 1) : each));
}

// Final settlement for a leaver: salary for days worked, leave encashment,
// gratuity (1 basic per completed year for permanent staff) minus loans.
export function finalSettlement(p: {
  basic: number;
  allowances: number;
  daysWorked: number;
  daysInMonth?: number;
  leaveEncashDays: number;
  years: number;
  permanent: boolean;
  loanOutstanding: number;
  otherDeductions?: number;
}) {
  const days = p.daysInMonth ?? 30;
  const salary = Math.round(((p.basic + p.allowances) / days) * p.daysWorked);
  const encash = Math.round((p.basic / days) * p.leaveEncashDays);
  const gratuity = p.permanent ? p.basic * Math.floor(p.years) : 0;
  const deductions = p.loanOutstanding + (p.otherDeductions ?? 0);
  return { salary, encash, gratuity, deductions, net: salary + encash + gratuity - deductions };
}

// ---------- Validation ----------

export function validCnic(cnic: string) {
  return /^\d{5}-\d{7}-\d$/.test(cnic.trim()) || /^\d{13}$/.test(cnic.trim());
}

export function normCnic(cnic: string) {
  return cnic.replace(/\D/g, '');
}

export function nextEmployeeId(ids: string[]) {
  const max = ids.reduce((m, id) => Math.max(m, Number(id.replace(/\D/g, '')) || 0), 0);
  return `EMP-${String(max + 1).padStart(4, '0')}`;
}

// ---------- Staff records with HR detail ----------

export type HrStaff = AdminStaff & {
  emergency: string;
  qualification: string;
  experience: string;
  probationEnd?: string;
  classes?: string;
  login?: string;
  docs: string[];
  allowances: Amount[];
  deductions: Amount[];
  loan?: { amount: number; installments: number; paid: number; each: number };
  increments: Array<{ date: string; from: number; to: number; note: string }>;
  leave: Record<LeaveType, { total: number; used: number }>;
  bankAccount?: string;
};

const QUALS = ['M.A. English, B.Ed', 'M.Sc. Mathematics', 'B.Com', 'M.Phil Urdu', 'B.Sc. Computer Science', 'Matric, LTV licence', 'M.A. Islamiat', 'B.S. Physics'];

export const INITIAL_HR_STAFF: HrStaff[] = ADMIN_STAFF.map((s, i) => ({
  ...s,
  emergency: `03${String(20 + (i % 30)).padStart(2, '0')} ${String(7712345 + i * 97).slice(0, 7)} (spouse)`,
  qualification: QUALS[i % QUALS.length],
  experience: `${2 + (i % 12)} years`,
  probationEnd: s.status === 'On probation' ? '31 Dec 2026' : undefined,
  classes: s.department === 'Academics' ? ['5-A', '6-A', '3-B', '7-B', '8-A'][i % 5] : undefined,
  login: s.department === 'Academics' ? 'Teacher Portal' : i % 3 === 0 ? 'Admin Panel' : undefined,
  docs: ['CNIC copy', 'Degree', ...(i % 2 ? ['Experience letter'] : [])],
  allowances: [
    { name: 'House rent allowance', amount: Math.round(s.salary * 0.1 / 100) * 100 },
    ...(i % 3 === 0 ? [{ name: 'Conveyance', amount: 2500 }] : []),
  ],
  deductions: [{ name: 'EOBI', amount: 370 }, ...(s.salary > 70000 ? [{ name: 'Income tax', amount: 1250 }] : [])],
  loan: i === 0 ? { amount: 30000, installments: 6, paid: 3, each: 5000 } : i % 7 === 3 ? { amount: 20000, installments: 4, paid: 1, each: 5000 } : undefined,
  increments: [{ date: '1 Jul 2026', from: Math.round(s.salary / 1.08), to: s.salary, note: 'Annual 8%' }],
  leave: {
    Casual: { total: 10, used: i % 4 },
    Sick: { total: 8, used: i % 3 },
    Annual: { total: 14 + (i % 3 === 0 ? 10 : 0), used: i % 6 },
    Maternity: { total: 90, used: 0 },
    Unpaid: { total: 0, used: i % 9 === 4 ? 2 : 0 },
  },
  bankAccount: s.type === 'Visiting' ? undefined : `PK${String(36 + i)}MEZN000${String(1040005678 + i * 31)}`,
}));
// Sadia Anwar's numbers match her salary slip in the teacher app.
INITIAL_HR_STAFF[0] = {
  ...INITIAL_HR_STAFF[0],
  allowances: [{ name: 'House rent allowance', amount: 5000 }],
  deductions: [{ name: 'EOBI', amount: 370 }],
};

// October attendance summary per employee (for the monthly sheet / payroll).
export function monthSummary(i: number) {
  return {
    present: 20 - (i % 3),
    lates: i === 0 ? 3 : i % 5,
    absents: i % 11 === 6 ? 1 : 0,
    leaves: i % 4 === 1 ? 1 : 0,
    halfDays: i % 13 === 7 ? 1 : 0,
  };
}

// Today's device punches.
export function todayPunch(i: number): { timeIn: string | null; timeOut: string | null } {
  if (i % 11 === 6) {
    return { timeIn: null, timeOut: null };
  }
  const late = i % 5 === 2;
  const inMin = 7 * 60 + 30 + (late ? 26 : i % 12);
  const hh = Math.floor(inMin / 60);
  const mm = inMin % 60;
  const out = i % 9 === 4 ? '12:15' : i % 8 === 3 ? '13:20' : null;
  return { timeIn: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, timeOut: out };
}

// ---------- Hiring ----------

export type Opening = { id: string; title: string; campus: string; positions: number; closes: string; status: 'Open' | 'Closed' };

export const OPENINGS: Opening[] = [
  { id: 'op1', title: 'Science teacher (Class 6–8)', campus: 'main', positions: 1, closes: '5 Nov', status: 'Open' },
  { id: 'op2', title: 'Accountant', campus: 'girls', positions: 1, closes: '12 Nov', status: 'Open' },
  { id: 'op3', title: 'Montessori teacher', campus: 'jt', positions: 2, closes: '30 Sep', status: 'Closed' },
];

export type Applicant = {
  id: string;
  name: string;
  opening: string;
  cnic: string;
  mobile: string;
  qualification: string;
  experience: string;
  stage: 'Applied' | 'Interview' | 'Demo class' | 'Offered' | 'Hired' | 'Rejected';
  interview?: string;
  demo?: string;
};

export const APPLICANTS: Applicant[] = [
  { id: 'apl1', name: 'Mehwish Tariq', opening: 'op1', cnic: '35202-4455667-8', mobile: '0321 4455667', qualification: 'M.Sc. Chemistry, B.Ed', experience: '4 years', stage: 'Demo class', interview: 'Confident, strong subject knowledge', demo: 'Good board work; manage time better' },
  { id: 'apl2', name: 'Usman Ghani', opening: 'op1', cnic: '35201-9988776-5', mobile: '0333 9988776', qualification: 'B.S. Physics', experience: '1 year', stage: 'Interview' },
  { id: 'apl3', name: 'Sobia Kanwal', opening: 'op2', cnic: '35202-1122334-6', mobile: '0300 1122334', qualification: 'B.Com, ACCA part', experience: '3 years', stage: 'Applied' },
  { id: 'apl4', name: 'Rizwan Ali', opening: 'op2', cnic: '35202-5566778-1', mobile: '0345 5566778', qualification: 'M.Com', experience: '6 years', stage: 'Offered', interview: 'Excellent Excel skills' },
  { id: 'apl5', name: 'Kiran Shahzad', opening: 'op3', cnic: '35202-6677889-2', mobile: '0312 6677889', qualification: 'Montessori diploma', experience: '2 years', stage: 'Hired' },
];

// ---------- Leave requests ----------

export type StaffLeave = {
  id: string;
  staffId: string;
  type: LeaveType;
  from: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  unpaidDays?: number;
};

export const INITIAL_STAFF_LEAVES: StaffLeave[] = [
  { id: 'sl1', staffId: 'EMP-0006', type: 'Casual', from: '22 Oct', days: 1, reason: 'Family matter', status: 'Pending' },
  { id: 'sl2', staffId: 'EMP-0001', type: 'Casual', from: '2 Nov', days: 2, reason: "Sister's wedding in Sialkot", status: 'Pending' },
  { id: 'sl3', staffId: 'EMP-0010', type: 'Sick', from: '19 Oct', days: 2, reason: 'Viral fever', status: 'Approved' },
  { id: 'sl4', staffId: 'EMP-0013', type: 'Annual', from: '28 Oct', days: 12, reason: 'Umrah', status: 'Pending' },
  { id: 'sl5', staffId: 'EMP-0004', type: 'Casual', from: '9 Oct', days: 1, reason: 'Bank work', status: 'Rejected' },
];

// ---------- Exit cases ----------

export type ExitCase = {
  id: string;
  staffId: string;
  resigned: string;
  lastDay: string;
  reason: string;
  checks: { library: boolean; store: boolean; accounts: boolean };
  status: 'In progress' | 'Completed';
};

export const INITIAL_EXITS: ExitCase[] = [
  { id: 'ex1', staffId: 'EMP-0032', resigned: '1 Sep', lastDay: '30 Sep', reason: 'Moved abroad', checks: { library: true, store: true, accounts: true }, status: 'Completed' },
  { id: 'ex2', staffId: 'EMP-0015', resigned: '15 Oct', lastDay: '15 Nov', reason: 'Better offer', checks: { library: true, store: false, accounts: false }, status: 'In progress' },
];
