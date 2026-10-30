// Reports Center (SOW M-20, Section 6): the 45 reports, who may see them,
// and dummy rows for each. Real data comes from the API later.
import {
  ADMIN_STAFF,
  ADMIN_STUDENTS,
  CAMPUSES,
  CLASSES,
  StaffRole,
  campusName,
} from './admin';
import {
  RESULT_SUBJECTS,
  classMarks,
  compileResults,
  GRADING_SEED,
  PASS_SEED,
  subjectAverages,
} from './admin-exam';

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
const count = (label: string) => (rows: ReportRow[]) => `${rows.length} ${label}`;
const days = ['Mon 19 Oct', 'Tue 20 Oct', 'Wed 21 Oct', 'Thu 22 Oct'];
const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const stuRow = (s: (typeof ADMIN_STUDENTS)[number], cells: Array<string | number>): ReportRow => ({
  cells,
  campus: s.campus,
  cls: s.className,
  section: s.section,
});
const teachers = ADMIN_STAFF.filter(s => s.department === 'Academics');

export function reportData(id: string): ReportData {
  switch (id) {
    case 'r1': {
      const rows: ReportRow[] = [];
      CAMPUSES.forEach(c =>
        CLASSES.slice(3).forEach((cls, i) =>
          ['A', 'B'].forEach((sec, j) => {
            const boys = 12 + ((i * 3 + j + c.strength) % 9);
            const girls = c.id === 'girls' ? boys + 8 : 10 + ((i * 5 + j) % 8);
            rows.push({ cells: [c.name, cls, sec, boys, girls, boys + girls], campus: c.id, cls, section: sec });
          }),
        ),
      );
      return { columns: ['Campus', 'Class', 'Section', 'Boys', 'Girls', 'Total'], rows, summary: r => `${sumCol(r, 5)} students` };
    }
    case 'r2':
      return {
        columns: ['GR No.', 'Student', 'Class', 'Campus', 'Admitted', 'Father'],
        rows: ADMIN_STUDENTS.slice(0, 40).map(s => stuRow(s, [s.gr, s.name, `${s.className}-${s.section}`, campusName(s.campus), s.admitted, s.father])),
        summary: count('admissions'),
      };
    case 'r3':
      return {
        columns: ['Rank', 'Reg No.', 'Candidate', 'Class', 'Marks /150', 'Result'],
        rows: ['Rayan Malik', 'Eman Butt', 'Areeba Hashmi', 'Noor Sheikh', 'Umar Chaudhry', 'Taha Qureshi', 'Saad Mirza'].map((n, i) => ({
          cells: [i === 1 ? 1 : i + 1, `REG-26-${301 + i}`, n, i > 2 && i < 5 ? 'Class 1' : 'Class 3', [123, 123, 124, 128, 106, 93, 65][i], ['Selected', 'Pending', 'Selected', 'Pending', 'Pending', 'Waiting', 'Rejected'][i]],
        })),
        summary: count('candidates'),
      };
    case 'r4':
      return {
        columns: ['GR No.', 'Student', 'Class', 'Status', 'Date', 'Reason'],
        rows: ADMIN_STUDENTS.filter(s => s.status !== 'Active').concat(ADMIN_STUDENTS.slice(40, 44)).map((s, i) =>
          stuRow(s, [s.gr, s.name, s.className, s.status === 'Active' ? ['Left', 'Struck off'][i % 2] : s.status, `${10 + i} Sep 2026`, ['Moved city', 'Fee default 3 months', 'Transferred campus', 'Parents request'][i % 4]]),
        ),
        summary: count('students'),
      };
    case 'r5':
      return {
        columns: ['Date', 'Cashier', 'Cash', 'Bank', 'Online', 'Total'],
        rows: days.flatMap((d, i) =>
          ['Kamran Yousaf', 'Asma Javed'].map((c, j) => {
            const cash = 182000 + i * 21000 + j * 14000;
            const bank = 95000 + i * 9000;
            const online = 64000 + j * 11000 + i * 7000;
            return { cells: [d, c, rs(cash), rs(bank), rs(online), rs(cash + bank + online)] };
          }),
        ),
        summary: r => `Total ${rs(sumCol(r, 5))}`,
      };
    case 'r6':
      return {
        columns: ['Month', 'Campus', 'Expected', 'Collected', 'Gap', '%'],
        rows: months.flatMap((m, i) =>
          CAMPUSES.map(c => {
            const exp = c.expected * (0.92 + (i % 3) * 0.03);
            const col = exp * (0.8 + ((i + c.strength) % 15) / 100);
            return { cells: [m, c.name, rs(exp), rs(col), rs(exp - col), `${Math.round((col / exp) * 100)}%`], campus: c.id };
          }),
        ),
        summary: r => `Collected ${rs(sumCol(r, 3))} of ${rs(sumCol(r, 2))}`,
      };
    case 'r7':
      return {
        columns: ['GR No.', 'Student', 'Class', '0–30 days', '31–60', '61–90', '90+'],
        rows: ADMIN_STUDENTS.filter(s => s.due > 0).map((s, i) => stuRow(s, [s.gr, s.name, `${s.className}-${s.section}`, rs(s.due), rs(i % 3 ? 0 : 8500), rs(i % 5 ? 0 : 8500), rs(i % 7 ? 0 : 8650)])),
        summary: r => `${r.length} defaulters · ${rs(sumCol(r, 3) + sumCol(r, 4) + sumCol(r, 5) + sumCol(r, 6))} outstanding`,
      };
    case 'r8':
      return {
        columns: ['Fee head', 'Type', 'This month', 'Session to date'],
        rows: [['Tuition', 'Monthly', 10450000, 72100000], ['Transport', 'Monthly', 1690000, 11800000], ['Admission', 'One-time', 640000, 7900000], ['Annual charges', 'One-time', 0, 9800000], ['Exam', 'Termly', 1210000, 2420000], ['Lab', 'Monthly', 380000, 2600000], ['Late fine', 'Fine', 96500, 512000]].map(
          ([h, t, m, s]) => ({ cells: [h as string, t as string, rs(m as number), rs(s as number)] }),
        ),
        summary: r => `This month ${rs(sumCol(r, 2))}`,
      };
    case 'r9':
      return {
        columns: ['Date', 'Cashier', 'System total', 'Cash counted', 'Difference', 'Received by'],
        rows: days.map((d, i) => {
          const sys = 182000 + i * 21000;
          const diff = i === 2 ? -500 : 0;
          return { cells: [d, 'Kamran Yousaf', rs(sys), rs(sys + diff), diff ? `${rs(diff)} flagged` : 'None', 'Accounts Officer'] };
        }),
        summary: r => `${r.filter(x => String(x.cells[4]).includes('flagged')).length} differences flagged`,
      };
    case 'r10':
      return {
        columns: ['Month', 'Fine charged', 'Collected', 'Waived', 'Waived by'],
        rows: months.map((m, i) => ({ cells: [m, rs(98000 + i * 6000), rs(81000 + i * 5000), rs(6500 + i * 900), 'Principal'] })),
        summary: r => `Collected ${rs(sumCol(r, 2))} · waived ${rs(sumCol(r, 3))}`,
      };
    case 'r11':
      return {
        columns: ['Type', 'Class', 'Month', 'Students', 'Amount'],
        rows: ['Sibling', 'Staff child', 'Merit', 'Need-based', 'Management'].flatMap((t, i) =>
          ['Class 3', 'Class 5', 'Class 8'].map((c, j) => ({ cells: [t, c, 'Oct', 3 + ((i + j) % 6), rs((3 + ((i + j) % 6)) * [1875, 3750, 2500, 3000, 1500][i])], cls: c })),
        ),
        summary: r => `Total ${rs(sumCol(r, 4))}`,
      };
    case 'r12':
      return {
        columns: ['GR No.', 'Student', 'Class', 'Present', 'Absent', 'Late', 'Leave', '%'],
        rows: ADMIN_STUDENTS.map(s => {
          const total = 120;
          const p = Math.round((s.attendance / 100) * total);
          return stuRow(s, [s.gr, s.name, `${s.className}-${s.section}`, p, total - p - 3, 2, 1, `${s.attendance}%`]);
        }),
        summary: r => `${r.length} students`,
      };
    case 'r13':
      return {
        columns: ['GR No.', 'Student', 'Class', 'Attendance', 'Consecutive absents', 'Parent informed'],
        rows: ADMIN_STUDENTS.filter(s => s.attendance < 85).map((s, i) => stuRow(s, [s.gr, s.name, `${s.className}-${s.section}`, `${s.attendance}%`, i % 3 === 0 ? 3 : 1, i % 2 ? 'SMS' : 'SMS + call'])),
        summary: count('students below the limit'),
      };
    case 'r14':
      return {
        columns: ['ID', 'Name', 'Designation', 'Campus', 'Type', 'Contract / probation end'],
        rows: ADMIN_STAFF.map(s => ({ cells: [s.id, s.name, s.designation, campusName(s.campus), s.type, s.contractEnd ?? (s.status === 'On probation' ? '15 Jan 2027' : '—')], campus: s.campus })),
        summary: r => `${r.length} staff · ${r.filter(x => x.cells[5] !== '—').length} with end dates`,
      };
    case 'r15':
      return {
        columns: ['ID', 'Name', 'Present', 'Late', 'Absent', 'Short leave', 'Avg time in'],
        rows: ADMIN_STAFF.filter(s => s.status !== 'Left').map((s, i) => ({ cells: [s.id, s.name, 18 - (i % 3), i % 4, i % 5 === 0 ? 1 : 0, i % 6 === 0 ? 1 : 0, `7:${40 + (i % 18)}`], campus: s.campus })),
        summary: r => `${sumCol(r, 3)} late arrivals`,
      };
    case 'r16':
      return {
        columns: ['ID', 'Name', 'Casual (left/10)', 'Sick (left/8)', 'Annual (left/24)', 'Unpaid taken'],
        rows: ADMIN_STAFF.filter(s => s.status !== 'Left').map((s, i) => ({ cells: [s.id, s.name, 10 - (i % 5), 8 - (i % 3), 24 - (i % 9), i % 7 === 0 ? 1 : 0], campus: s.campus })),
        summary: count('employees'),
      };
    case 'r17':
      return {
        columns: ['Time', 'Channel', 'Template', 'Sent', 'Delivered', 'Failed', 'Credits'],
        rows: days.flatMap(d =>
          ['SMS', 'WhatsApp', 'Push'].map((c, j) => ({ cells: [d, c, ['Absent alert', 'Voucher issued', 'Diary posted'][j], 420 + j * 80, 410 + j * 78, 10 + j * 2, c === 'SMS' ? 420 : 0] })),
        ),
        summary: r => `${sumCol(r, 3)} sent · ${sumCol(r, 5)} failed · ${sumCol(r, 6)} SMS credits`,
      };
    case 'r18':
      return {
        columns: ['When', 'User', 'Action', 'Old value', 'New value', 'IP / device'],
        rows: [
          ['22 Oct 10:42', 'Sadia Anwar', 'Attendance 5-A', '—', '26 P, 1 A', 'Android app'],
          ['22 Oct 9:58', 'Kamran Yousaf', 'Receipt R-26-000611', '—', 'Rs. 8,500 cash', '39.45.12.8 Chrome'],
          ['21 Oct 16:20', 'Nadeem Akhtar', 'Late fine per day', 'Rs. 40', 'Rs. 50', '39.45.12.3 Chrome'],
          ['21 Oct 8:02', 'Rabia Aslam', 'Login', '—', 'Success', '39.45.12.8 Windows'],
          ['20 Oct 7:58', 'Unknown', 'Login', '—', 'Failed ×3', '182.180.4.2 Android'],
        ].map(c => ({ cells: c })),
        summary: count('entries'),
      };
    case 'r19':
      return {
        columns: ['Campus', 'Strength', 'Capacity', 'Attendance', 'Collection', 'Expenses', 'Net'],
        rows: CAMPUSES.map(c => ({ cells: [c.name, c.strength, c.capacity, `${c.attendance}%`, rs(c.collection), rs(c.expenses), rs(c.collection - c.expenses)], campus: c.id })),
        summary: r => `${sumCol(r, 1)} students · net ${rs(sumCol(r, 6))}`,
      };
    case 'r20':
      return {
        columns: ['Teacher', 'Subject', 'Periods / week', 'Limit', 'Free periods', 'Status'],
        rows: teachers.map((t, i) => {
          const p = 22 + ((i * 5) % 16);
          return { cells: [t.name, t.subjects ?? '—', p, 36, 40 - p, p > 34 ? 'Near limit' : 'OK'], campus: t.campus };
        }),
        summary: r => `${r.filter(x => x.cells[5] !== 'OK').length} near the limit`,
      };
    case 'r21':
      return {
        columns: ['Date', 'Absent teacher', 'Period', 'Class', 'Substitute'],
        rows: days.flatMap((d, i) => [1, 5].map(p => ({ cells: [d, teachers[i % teachers.length].name, p, `${5 + (i % 3)}-A`, teachers[(i + 3) % teachers.length].name] }))),
        summary: count('substitutions'),
      };
    case 'r22':
      return {
        columns: ['Date', 'Teacher', 'Class', 'Subject', 'Status'],
        rows: days.flatMap((d, i) => teachers.slice(i, i + 3).map((t, j) => ({ cells: [d, t.name, `${5 + j}-A`, t.subjects ?? 'English', j === 1 ? 'Posted late' : 'Not posted'] }))),
        summary: r => `${r.filter(x => x.cells[4] === 'Not posted').length} not posted`,
      };
    case 'r23':
      return {
        columns: ['ID', 'Name', 'Gross', 'Deductions', 'Net', 'Bank account'],
        rows: ADMIN_STAFF.filter(s => s.status !== 'Left').map((s, i) => {
          const gross = s.salary + 5000;
          const ded = 370 + (i % 4) * 1970;
          return { cells: [s.id, s.name, rs(gross), rs(ded), rs(gross - ded), `PK36MEZN00${String(1040000 + i * 73).slice(0, 7)}`], campus: s.campus };
        }),
        summary: r => `Net payroll ${rs(sumCol(r, 4))}`,
      };
    case 'r24':
      return {
        columns: ['ID', 'Name', 'Type', 'Amount', 'Installment', 'Outstanding'],
        rows: ADMIN_STAFF.filter((_, i) => i % 4 === 0).map((s, i) => ({ cells: [s.id, s.name, i % 2 ? 'Advance' : 'Loan', rs(30000 + i * 10000), rs(5000), rs(15000 + i * 5000)], campus: s.campus })),
        summary: r => `Outstanding ${rs(sumCol(r, 5))}`,
      };
    case 'r25': {
      const res = compileResults(classMarks('Class 5', 'Mid-term'), RESULT_SUBJECTS, GRADING_SEED, PASS_SEED);
      return {
        columns: ['Position', 'Student', 'Section', 'Total', '%', 'Grade', 'Result'],
        rows: res.map(r => ({ cells: [r.classPosition, r.name, r.section, `${r.total}/${r.max}`, r.percentage, r.grade, r.pass ? 'Pass' : 'Fail'], cls: 'Class 5', section: r.section })),
        summary: r => `${r.filter(x => x.cells[6] === 'Pass').length} of ${r.length} passed`,
      };
    }
    case 'r26': {
      const m = classMarks('Class 5', 'Mid-term');
      const avg = subjectAverages(m, RESULT_SUBJECTS);
      return {
        columns: ['Subject', 'Average', 'Highest', 'Lowest', 'Failed'],
        rows: RESULT_SUBJECTS.map((sub, i) => {
          const vals = m.map(x => x.marks[sub.name]).map(v => (v === 'Abs' || v === undefined ? 0 : v));
          return { cells: [sub.name, avg[i].avg, Math.max(...vals), Math.min(...vals), vals.filter(v => v < 33).length], cls: 'Class 5' };
        }),
        summary: count('subjects'),
      };
    }
    case 'r27':
      return {
        columns: ['Class', 'Subject', 'Teacher', 'Entered', 'Total', 'Status'],
        rows: ['Class 5', 'Class 6', 'Class 7'].flatMap((c, ci) => RESULT_SUBJECTS.map((s, si) => {
          const e = ci === 0 ? 24 : Math.min(24, (ci * 7 + si * 9) % 25);
          return { cells: [c, s.name, teachers[(ci * 5 + si) % teachers.length].name, e, 24, ci === 0 ? 'Locked' : e === 24 ? 'Complete' : 'Pending'], cls: c };
        })),
        summary: r => `${sumCol(r, 3)} of ${sumCol(r, 4)} entered`,
      };
    case 'r28':
      return {
        columns: ['Class', 'Subject', 'Teacher', 'Chapters done', 'Total', 'Coverage'],
        rows: CLASSES.slice(5, 11).flatMap((c, ci) => RESULT_SUBJECTS.slice(0, 3).map((s, si) => {
          const done = 4 + ((ci + si * 2) % 6);
          return { cells: [c, s.name, teachers[(ci + si) % teachers.length].name, done, 12, `${Math.round((done / 12) * 100)}%`], cls: c };
        })),
        summary: count('class subjects'),
      };
    case 'r29':
      return {
        columns: ['Source', 'Staff', 'Inquiries', 'Registered', 'Lost', 'Conversion'],
        rows: ['Walk-in', 'Call', 'Website', 'Facebook'].flatMap((src, i) => ['Saba Noreen', 'Hina Tariq'].map((st, j) => {
          const n = 18 + i * 6 + j * 4;
          const reg = Math.round(n * (0.25 + i * 0.05));
          return { cells: [src, st, n, reg, Math.round(n * 0.2), `${Math.round((reg / n) * 100)}%`] };
        })),
        summary: r => `${sumCol(r, 3)} of ${sumCol(r, 2)} converted`,
      };
    case 'r30':
      return {
        columns: ['GR No.', 'Student', 'From', 'To', 'Result', 'Decision'],
        rows: ADMIN_STUDENTS.slice(0, 30).map((s, i) => stuRow(s, [s.gr, s.name, s.className, CLASSES[Math.min(CLASSES.length - 1, CLASSES.indexOf(s.className) + 1)], `${s.result}%`, s.result < 55 && i % 2 ? 'Detained' : 'Promoted'])),
        summary: r => `${r.filter(x => x.cells[5] === 'Detained').length} detained`,
      };
    case 'r31':
      return {
        columns: ['Serial', 'Type', 'Student', 'Issued by', 'Date'],
        rows: ADMIN_STUDENTS.slice(0, 12).map((s, i) => stuRow(s, [`${['CC', 'BC', 'LC'][i % 3]}-26-${String(90 + i).padStart(4, '0')}`, ['Character', 'Bonafide', 'Leaving'][i % 3], s.name, 'Saba Noreen', `${i + 1} Oct`])),
        summary: count('certificates'),
      };
    case 'r32':
      return {
        columns: ['Class', 'Homework', 'Assigned', 'Submitted', 'Late', 'Missing'],
        rows: ['5-A', '5-B', '6-A', '7-B'].flatMap((c, i) => ['Fractions worksheet', 'My hero essay', 'Plant cell diagram'].map((h, j) => ({ cells: [c, h, 30, 24 + ((i + j) % 6), 2, 6 - ((i + j) % 6)] }))),
        summary: r => `${sumCol(r, 5)} missing`,
      };
    case 'r33':
      return {
        columns: ['Date', 'Head', 'Description', 'Book', 'Debit', 'Credit'],
        rows: days.flatMap((d, i) => [
          { cells: [d, 'Fee income', 'Collection posted', 'Cash book', rs(0), rs(182000 + i * 21000)] },
          { cells: [d, ['Utilities', 'Stationery', 'Maintenance', 'Fuel'][i], ['LESCO bill', 'Exam paper', 'AC repair', 'Diesel'][i], i % 2 ? 'Bank book' : 'Cash book', rs(24000 + i * 9000), rs(0)] },
        ]),
        summary: r => `Debit ${rs(sumCol(r, 4))} · credit ${rs(sumCol(r, 5))}`,
      };
    case 'r34':
      return {
        columns: ['Month', 'Campus', 'Income', 'Expenses', 'Profit'],
        rows: months.flatMap((m, i) => CAMPUSES.map(c => {
          const inc = c.collection * (0.9 + (i % 3) * 0.04);
          const exp = c.expenses * (0.95 + (i % 2) * 0.05);
          return { cells: [m, c.name, rs(inc), rs(exp), rs(inc - exp)], campus: c.id };
        })),
        summary: r => `Profit ${rs(sumCol(r, 4))}`,
      };
    case 'r35':
      return {
        columns: ['Route', 'Vehicle', 'Capacity', 'Students', 'Free seats'],
        rows: Array.from({ length: 6 }, (_, i) => {
          const cap = [24, 30, 24, 40, 18, 30][i];
          const st = cap - [2, 5, 0, 7, 1, 3][i];
          return { cells: [`Route ${i + 1}`, `LEA-45${10 + i}`, cap, st, cap - st] };
        }),
        summary: r => `${sumCol(r, 3)} students · ${sumCol(r, 4)} free seats`,
      };
    case 'r36':
      return {
        columns: ['Item', 'Document', 'Expiry', 'Days left'],
        rows: [['LEA-4512', 'Fitness', '3 Nov 2026', 12], ['LEA-4513', 'Insurance', '20 Dec 2026', 59], ['LEB-1180', 'Route permit', '9 Jan 2027', 79], ['Shahid Iqbal', 'Driving licence', '30 Nov 2026', 39], ['Muhammad Aslam', 'Driving licence', '14 Mar 2027', 143]].map(c => ({ cells: c as Array<string | number> })),
        summary: r => `${r.filter(x => Number(x.cells[3]) <= 60).length} expire within 60 days`,
      };
    case 'r37':
      return {
        columns: ['Month', 'Vehicle', 'Fuel', 'Maintenance', 'Total'],
        rows: months.slice(3).flatMap(m => ['LEA-4512', 'LEA-4513', 'LEB-1180'].map((v, j) => ({ cells: [m, v, rs(42000 + j * 6000), rs(j === 1 ? 18500 : 3000), rs(42000 + j * 6000 + (j === 1 ? 18500 : 3000))] }))),
        summary: r => `Total ${rs(sumCol(r, 4))}`,
      };
    case 'r38':
      return {
        columns: ['Item', 'Size', 'In stock', 'Low level', 'Status'],
        rows: [['Uniform shirt', '26', 34, 10], ['Uniform shirt', '28', 6, 10], ['Uniform trouser', '28', 21, 10], ['Class 5 book set', '—', 4, 8], ['School bag', '—', 15, 5], ['Notebook (large)', '—', 120, 50], ['Tie', '—', 3, 10], ['Sweater', '30', 9, 10]].map(([a, b, c, d]) => ({ cells: [a, b, c, d, (c as number) < (d as number) ? 'Low stock' : 'OK'] })),
        summary: r => `${r.filter(x => x.cells[4] === 'Low stock').length} items low`,
      };
    case 'r39':
      return {
        columns: ['Date', 'Category', 'Items', 'Cash', 'Added to voucher', 'Total'],
        rows: days.flatMap(d => ['Uniform', 'Books', 'Canteen'].map((c, j) => ({ cells: [d, c, 12 + j * 20, rs(8000 + j * 6000), rs(j === 2 ? 0 : 4200), rs(8000 + j * 6000 + (j === 2 ? 0 : 4200))] }))),
        summary: r => `Total ${rs(sumCol(r, 5))}`,
      };
    case 'r40':
      return {
        columns: ['Asset', 'Tag', 'Location', 'Condition', 'Value'],
        rows: [['Projector', 'AS-0012', 'Room R105', 'Good', 85000], ['Desktop PC', 'AS-0040', 'Computer lab', 'Good', 120000], ['Generator 25kVA', 'AS-0003', 'Main campus', 'Needs service', 950000], ['Coaster LEA-4512', 'AS-0101', 'Transport', 'Good', 6500000], ['Science lab kit', 'AS-0077', 'Lab 1', 'Fair', 210000]].map(([a, t, l, c, v]) => ({ cells: [a, t, l, c, rs(v as number)] })),
        summary: r => `Value ${rs(sumCol(r, 4))}`,
      };
    case 'r41':
      return {
        columns: ['Member', 'Book', 'Issued', 'Due', 'Status', 'Fine'],
        rows: ADMIN_STUDENTS.slice(0, 20).map((s, i) => stuRow(s, [s.name, ['Tales from Pakistan', 'Junior Science Encyclopedia', 'The Secret Garden', 'Urdu Kahaniyan'][i % 4], `${2 + i} Oct`, `${16 + i} Oct`, i % 3 === 0 ? 'Overdue' : 'Issued', rs(i % 3 === 0 ? 30 + i * 5 : 0)])),
        summary: r => `${r.filter(x => x.cells[4] === 'Overdue').length} overdue · fines ${rs(sumCol(r, 5))}`,
      };
    case 'r42':
      return {
        columns: ['Txn ID', 'Gateway', 'Voucher', 'Amount', 'Status', 'Matched'],
        rows: Array.from({ length: 12 }, (_, i) => ({ cells: [`TX${4410 + i}K${i}`, ['JazzCash', 'Easypaisa', '1Link'][i % 3], `V-26-000${400 + i}`, rs(8500 + (i % 3) * 875), i === 4 ? 'Failed' : i === 9 ? 'Pending' : 'Success', i === 4 || i === 9 ? 'No' : 'Yes'] })),
        summary: r => `${r.filter(x => x.cells[5] === 'No').length} not matched`,
      };
    case 'r43':
      return {
        columns: ['Date', 'Visitor', 'CNIC', 'Purpose', 'In', 'Out'],
        rows: days.flatMap((d, i) => ['Shahzad Akram', 'Nida Farooq', 'Ali Raza'].map((v, j) => ({ cells: [d, v, `35202-55667${i}${j}-1`, ['Fee query', 'Admission', 'Early pickup (gate pass)'][j], `9:${10 + j * 15}`, `9:${40 + j * 10}`] }))),
        summary: count('visits'),
      };
    case 'r44':
      return {
        columns: ['Category', 'Open', 'In progress', 'Resolved', 'Closed'],
        rows: ['Academics', 'Fee', 'Transport', 'Behaviour', 'Facilities', 'Staff', 'Other'].map((c, i) => ({ cells: [c, i % 3, (i + 1) % 3, 3 + i, 5 + i] })),
        summary: r => `${sumCol(r, 1) + sumCol(r, 2)} open or in progress`,
      };
    case 'r45':
      return {
        columns: ['Date', 'Student', 'Class', 'Type', 'Points', 'Parent notified'],
        rows: ADMIN_STUDENTS.slice(0, 18).map((s, i) => stuRow(s, [`${5 + i} Oct`, s.name, `${s.className}-${s.section}`, ['Positive', 'Incident', 'Warning', 'Sick bay'][i % 4], [2, -2, -1, 0][i % 4], 'Yes'])),
        summary: count('records'),
      };
    default:
      return { columns: ['—'], rows: [], summary: () => 'No data' };
  }
}
