// Reports Center (SOW M-20, Section 6): the 45 reports, who may see them,
// and rows for the ones the school server produces. The rest are not available yet.
import { StaffRole } from './admin';

type User = 'Owner' | 'Principal' | 'Front Desk' | 'Accounts' | 'HR' | 'Exam Controller' | 'Transport Manager' | 'Store Keeper' | 'Librarian' | 'Teachers' | 'Coordinators';

export type ReportDef = { id: string; no: number; title: string; module: string; phase: 1 | 2 | 3; users: User[] };

const R = (no: number, title: string, module: string, phase: 1 | 2 | 3, users: User[]): ReportDef => ({
  id: `r${no}`,
  no,
  title,
  module,
  phase,
  users,
});

export const REPORTS: ReportDef[] = [
  R(1, 'Student strength (campus, class, section, gender)', 'M-02', 1, ['Owner', 'Principal']),
  R(2, 'Admission register and new admissions', 'M-02', 1, ['Principal', 'Front Desk']),
  R(3, 'Entry test merit list and results', 'M-02', 1, ['Principal', 'Front Desk']),
  R(4, 'Left / struck-off students', 'M-02', 1, ['Principal', 'Front Desk']),
  R(5, 'Daily fee collection (by cashier and payment mode)', 'M-03', 1, ['Accounts']),
  R(6, 'Monthly fee collection vs. expected', 'M-03', 1, ['Accounts', 'Owner']),
  R(7, 'Defaulters and outstanding dues (aging by month)', 'M-03', 1, ['Accounts', 'Principal']),
  R(8, 'Fee head-wise income', 'M-03', 1, ['Accounts', 'Owner']),
  R(9, 'Cash closing and handover', 'M-03', 1, ['Accounts']),
  R(10, 'Fine collected and waived', 'M-03', 1, ['Accounts', 'Owner']),
  R(11, 'Discounts given (by type, class, month)', 'M-04', 1, ['Accounts', 'Owner']),
  R(12, 'Student attendance (daily, monthly, by student)', 'M-07', 1, ['Principal', 'Teachers']),
  R(13, 'Attendance shortage list', 'M-07', 1, ['Principal']),
  R(14, 'Staff list and contract/probation expiry', 'M-09', 1, ['HR']),
  R(15, 'Staff attendance and late arrivals', 'M-10', 1, ['HR', 'Principal']),
  R(16, 'Leave balances and leave taken', 'M-16', 1, ['HR']),
  R(17, 'Message delivery log and SMS usage', 'M-19', 1, ['Owner', 'Principal']),
  R(18, 'Audit log and login history', 'S-13', 1, ['Owner']),
  R(19, 'Campus comparison', 'S-02', 1, ['Owner']),
  R(20, 'Timetable and teacher workload', 'M-05', 2, ['Principal']),
  R(21, 'Substitution record', 'M-05', 2, ['Principal']),
  R(22, 'Diary compliance (not posted)', 'M-06', 2, ['Principal']),
  R(23, 'Payroll register and bank transfer sheet', 'M-11', 2, ['Accounts', 'Owner']),
  R(24, 'Loans and advances outstanding', 'M-11', 2, ['Accounts', 'HR']),
  R(25, 'Result sheet and position list', 'M-12', 2, ['Exam Controller', 'Principal']),
  R(26, 'Subject-wise result analysis, toppers, fail list', 'M-12', 2, ['Exam Controller', 'Principal']),
  R(27, 'Marks entry progress', 'M-12', 2, ['Exam Controller']),
  R(28, 'Syllabus coverage', 'M-13', 2, ['Principal', 'Coordinators']),
  R(29, 'Inquiry conversion (by source and staff)', 'S-03', 2, ['Principal', 'Front Desk']),
  R(30, 'Promotion and detention list', 'S-04', 2, ['Principal']),
  R(31, 'Certificates issued', 'S-05', 2, ['Front Desk']),
  R(32, 'Homework submission', 'S-06', 2, ['Teachers', 'Principal']),
  R(33, 'Expenses by head, day book, cash and bank book', 'S-08', 2, ['Accounts']),
  R(34, 'Profit and loss (by campus and month)', 'S-08', 2, ['Owner']),
  R(35, 'Route-wise students and vehicle capacity', 'M-14', 3, ['Transport Manager']),
  R(36, 'Vehicle and licence document expiry', 'M-14', 3, ['Transport Manager']),
  R(37, 'Fuel and maintenance cost', 'M-14', 3, ['Transport Manager', 'Accounts']),
  R(38, 'Stock in hand and low stock', 'M-15', 3, ['Store Keeper']),
  R(39, 'Sales (uniform, books, canteen)', 'M-15', 3, ['Store Keeper', 'Accounts']),
  R(40, 'Assets register', 'M-15', 3, ['Accounts', 'Owner']),
  R(41, 'Books issued, overdue and fines', 'S-07', 3, ['Librarian']),
  R(42, 'Online payments and reconciliation', 'S-09', 3, ['Accounts']),
  R(43, 'Visitor and gate pass log', 'S-10', 3, ['Front Desk', 'Principal']),
  R(44, 'Complaints by status and category', 'S-11', 3, ['Principal']),
  R(45, 'Health and discipline incidents', 'S-12', 3, ['Principal']),
];

const USER_ROLE: Record<User, StaffRole> = {
  Owner: 'owner',
  Principal: 'principal',
  'Front Desk': 'frontdesk',
  Accounts: 'accounts',
  HR: 'hr',
  'Exam Controller': 'exam',
  'Transport Manager': 'transport',
  'Store Keeper': 'store',
  Librarian: 'librarian',
  Teachers: 'principal',
  Coordinators: 'principal',
};

export function reportRoles(r: ReportDef): StaffRole[] {
  return Array.from(new Set<StaffRole>(['owner', ...r.users.map(u => USER_ROLE[u])]));
}

export function canSeeReport(role: StaffRole, r: ReportDef) {
  return reportRoles(r).includes(role);
}

// ---------- Rows ----------

export type ReportRow = { cells: Array<string | number>; campus?: string; cls?: string; section?: string };
export type ReportData = { columns: string[]; rows: ReportRow[]; summary: (rows: ReportRow[]) => string };

const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-US')}`;
const sumCol = (rows: ReportRow[], i: number) =>
  rows.reduce((s, r) => s + (Number(String(r.cells[i]).replace(/[^\d.-]/g, '')) || 0), 0);

// ---------- Live reports (/api/web/reports/{kind}) ----------
// Section 6 reports the server can produce. The rest open a "not available yet" page.

export const LIVE_REPORTS: Record<string, string> = {
  r1: 'strength',
  r2: 'admissions',
  r5: 'collection',
  r6: 'collection',
  r7: 'defaulters',
  r11: 'discounts',
  r12: 'attendance',
  r14: 'staff',
  r16: 'leave',
};

// Row fields for each server report, in column order.
const LIVE_COLUMNS: Record<string, Array<[string, string]>> = {
  strength: [['grNo', 'GR No.'], ['name', 'Name'], ['classId', 'Class'], ['section', 'Section'], ['gender', 'Gender'], ['status', 'Status']],
  admissions: [['regNo', 'Reg No.'], ['name', 'Name'], ['classId', 'Class'], ['decision', 'Decision'], ['status', 'Status']],
  collection: [['date', 'Date'], ['amount', 'Amount'], ['mode', 'Mode'], ['status', 'Status']],
  defaulters: [['voucher', 'Voucher'], ['studentId', 'Student'], ['amount', 'Outstanding'], ['status', 'Status']],
  discounts: [['studentId', 'Student'], ['type', 'Type'], ['value', 'Value'], ['status', 'Status']],
  attendance: [['date', 'Date'], ['classId', 'Class'], ['section', 'Section']],
  staff: [['empId', 'Emp ID'], ['name', 'Name'], ['designation', 'Designation'], ['type', 'Type'], ['contractEnd', 'Contract end'], ['status', 'Status']],
  leave: [['kind', 'For'], ['type', 'Type'], ['from', 'From'], ['status', 'Status']],
};

export type LiveRow = ReportRow & { date?: string };

export function liveReportData(
  id: string,
  rows: Array<Record<string, unknown>>,
  names: { cls: (id: unknown) => string; student: (id: unknown) => string },
): ReportData & { rows: LiveRow[] } {
  const kind = LIVE_REPORTS[id];
  const text = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));
  if (id === 'r6') {
    // Monthly collection: payments grouped by month.
    const byMonth = new Map<string, { amount: number; n: number }>();
    rows.forEach(r => {
      const m = String(r.date ?? '').slice(0, 7) || '—';
      const cur = byMonth.get(m) ?? { amount: 0, n: 0 };
      byMonth.set(m, { amount: cur.amount + (Number(r.amount) || 0), n: cur.n + 1 });
    });
    const out: LiveRow[] = Array.from(byMonth.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([m, v]) => ({ cells: [m, v.n, rs(v.amount)], date: `${m}-01` }));
    return { columns: ['Month', 'Payments', 'Collected'], rows: out, summary: list => `${rs(sumCol(list, 2))} collected` };
  }
  const cols = LIVE_COLUMNS[kind] ?? Object.keys(rows[0] ?? {}).map(k => [k, k] as [string, string]);
  const out: LiveRow[] = rows.map(r => ({
    cells: cols.map(([k]) =>
      k === 'classId' ? names.cls(r[k]) : k === 'studentId' ? names.student(r[k]) : k === 'amount' ? rs(Number(r[k]) || 0) : text(r[k]),
    ),
    cls: r.classId !== undefined ? names.cls(r.classId) : undefined,
    section: r.section ? String(r.section) : undefined,
    date: typeof r.date === 'string' ? r.date : typeof r.from === 'string' ? r.from : undefined,
  }));
  const amountCol = cols.findIndex(([k]) => k === 'amount');
  return {
    columns: cols.map(([, label]) => label),
    rows: out,
    summary: list => (amountCol >= 0 ? `${list.length} rows · ${rs(sumCol(list, amountCol))}` : `${list.length} rows`),
  };
}
