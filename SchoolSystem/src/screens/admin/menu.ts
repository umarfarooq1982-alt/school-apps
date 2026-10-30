// Admin menu (SOW 3.2). Each staff role sees only the panels listed for it.
import {
  Armchair,
  BadgeCheck,
  ChartColumn,
  Bell,
  BookOpen,
  Building,
  Bus,
  Calculator,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Coffee,
  CreditCard,
  DatabaseBackup,
  DoorOpen,
  FileBadge,
  FileSpreadsheet,
  Fuel,
  GraduationCap,
  HeartPulse,
  FileClock,
  IdCard,
  Inbox,
  Layers,
  ListChecks,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  PhoneCall,
  Plug,
  Printer,
  Receipt,
  Repeat,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react-native';
import { useMemo } from 'react';
import type { IconType } from '../../components/ui';
import type { StaffRole } from '../../data/admin';
import { Perm, ROLE_DEFS, RoleDef } from '../../data/admin-owner';
import { useShared } from '../../store';

export type MenuItem = { route: string; title: string; sub: string; icon: IconType };
export type Panel = {
  key: string;
  title: string;
  roles: StaffRole[];
  items: MenuItem[];
};

export const PANELS: Panel[] = [
  {
    key: 'owner',
    title: 'A · Super Admin / Owner',
    roles: ['owner'],
    items: [
      { route: 'AdminCampuses', title: 'Campuses', sub: 'Add and edit campuses and their settings', icon: Building },
      { route: 'AdminUsersRoles', title: 'Users & roles', sub: 'Users, roles, campuses, permission matrix', icon: ShieldCheck },
      { route: 'AdminSettings', title: 'School settings', sub: 'Profile, logo, formats, rules, approval chains', icon: Settings },
      { route: 'AdminTemplates', title: 'Templates', sub: 'Voucher, receipt, report card, certificate, ID, messages', icon: Palette },
      { route: 'AdminIntegrations', title: 'Integrations', sub: 'SMS, WhatsApp, email, payment gateway, biometric', icon: Plug },
      { route: 'AdminAuditLog', title: 'Audit log & login history', sub: 'Every change and login', icon: FileClock },
      { route: 'AdminBackup', title: 'Backup & restore', sub: 'Backups, download, restore', icon: DatabaseBackup },
    ],
  },
  {
    key: 'principal',
    title: 'B · Principal / Campus Admin',
    roles: ['owner', 'principal'],
    items: [
      { route: 'AdminApprovals', title: 'Approvals inbox', sub: 'Admissions, discounts, waivers, leaves, results, payroll', icon: Inbox },
      { route: 'AdminAcademicSetup', title: 'Academic setup', sub: 'Sessions, classes, sections, subjects, terms', icon: Layers },
      { route: 'AdminTimetableBuilder', title: 'Timetable builder', sub: 'Bell schedules, periods, clash checks, workload', icon: CalendarRange },
      { route: 'AdminSubstitutions', title: 'Substitutions', sub: 'Absent teachers and substitutes', icon: Repeat },
      { route: 'AdminCalendarManage', title: 'Annual calendar', sub: 'Holidays, events, PTMs, exam windows', icon: CalendarDays },
      { route: 'AdminCurriculum', title: 'Curriculum', sub: 'Syllabus, lesson plan review, coverage', icon: BookOpen },
      { route: 'AdminPromotion', title: 'Promotion & transfer', sub: 'Promotion wizard, transfers, leaving, alumni', icon: GraduationCap },
      { route: 'AdminComplaints', title: 'Complaints & feedback', sub: 'Tickets, assignment, status, surveys', icon: MessageSquare },
      { route: 'AdminHealthDiscipline', title: 'Health & discipline', sub: 'Incidents, warnings, points, sick bay', icon: HeartPulse },
    ],
  },
  {
    key: 'frontdesk',
    title: 'C · Front Desk / Admission',
    roles: ['owner', 'principal', 'frontdesk'],
    items: [
      { route: 'AdminInquiries', title: 'Inquiries (CRM)', sub: 'Inquiries, follow-ups, conversion', icon: PhoneCall },
      { route: 'AdminRegistration', title: 'Registration', sub: 'Registration form, fee and slip', icon: UserPlus },
      { route: 'AdminEntryTest', title: 'Entry test', sub: 'Schedule, admit slips, marks, merit list', icon: ClipboardCheck },
      { route: 'AdminAdmission', title: 'Admission', sub: 'Confirm, allot section, GR No., logins', icon: UserCheck },
      { route: 'AdminStudents', title: 'Students', sub: 'Student list and full profiles', icon: Users },
      { route: 'AdminCertificates', title: 'Certificates & ID cards', sub: 'Leaving, character, bonafide, ID cards', icon: FileBadge },
      { route: 'AdminVisitors', title: 'Visitors & gate pass', sub: 'Visitor log, gate pass, pickup persons, calls', icon: DoorOpen },
    ],
  },
  {
    key: 'accounts',
    title: 'D · Accounts',
    roles: ['owner', 'principal', 'accounts'],
    items: [
      { route: 'AdminFeeStructure', title: 'Fee heads & structure', sub: 'Heads and class-wise amounts', icon: ListChecks },
      { route: 'AdminVoucherGeneration', title: 'Voucher generation', sub: 'Bulk, single, advance, custom vouchers', icon: Receipt },
      { route: 'AdminVoucherPrint', title: 'Voucher print & send', sub: '3-copy print, PDF, WhatsApp, portal', icon: Printer },
      { route: 'AdminFeeCounter', title: 'Fee collection counter', sub: 'Find voucher, full or partial payment', icon: Calculator },
      { route: 'AdminDefaulters', title: 'Defaulters', sub: 'Dues, reminders, installments, holds', icon: UserMinus },
      { route: 'AdminDiscounts', title: 'Discounts', sub: 'Requests, approvals, active discounts', icon: BadgeCheck },
      { route: 'AdminCashClosing', title: 'Cash closing', sub: 'Daily closing and handover', icon: Wallet },
      { route: 'AdminOnlinePayments', title: 'Online payments', sub: 'Gateway transactions, reconciliation', icon: CreditCard },
      { route: 'AdminExpenses', title: 'Expenses & accounts', sub: 'Expenses, petty cash, bank, day book, P&L', icon: FileSpreadsheet },
      { route: 'AdminPayroll', title: 'Payroll processing', sub: 'Monthly run, approval, slips, bank sheet', icon: Calculator },
    ],
  },
  {
    key: 'hr',
    title: 'E · HR',
    roles: ['owner', 'principal', 'hr'],
    items: [
      { route: 'AdminStaffDirectory', title: 'Staff directory', sub: 'List and full staff profiles', icon: Users },
      { route: 'AdminHiring', title: 'Hiring', sub: 'Openings, applicants, interviews, offers', icon: UserPlus },
      { route: 'AdminStaffEnroll', title: 'Staff enrollment', sub: 'Add employee, subjects, contract dates', icon: IdCard },
      { route: 'AdminStaffAttendance', title: 'Staff attendance', sub: 'Device sync, manual, corrections, sheet', icon: ClipboardList },
      { route: 'AdminLeaveManagement', title: 'Leave management', sub: 'Policies, balances, approvals', icon: CalendarDays },
      { route: 'AdminSalarySetup', title: 'Salary setup', sub: 'Structures, allowances, loans, increments', icon: Wallet },
      { route: 'AdminExitClearance', title: 'Exit & clearance', sub: 'Resignation, clearance, experience letter', icon: UserMinus },
      { route: 'AdminStaffIdCards', title: 'Staff ID cards', sub: 'Bulk print', icon: IdCard },
    ],
  },
  {
    key: 'exam',
    title: 'F · Exam',
    roles: ['owner', 'principal', 'exam'],
    items: [
      { route: 'AdminExamSetup', title: 'Exam setup', sub: 'Exam types, weightage, grading, pass rules', icon: Settings },
      { route: 'AdminDateSheet', title: 'Date sheet', sub: 'Builder per class, publish', icon: CalendarRange },
      { route: 'AdminInvigilation', title: 'Invigilation & seating', sub: 'Duty roster, seating plans', icon: Armchair },
      { route: 'AdminAdmitCards', title: 'Admit cards', sub: 'Generate, print, defaulter hold', icon: IdCard },
      { route: 'AdminMarksMonitor', title: 'Marks monitor', sub: 'Entry progress, lock and unlock', icon: ClipboardCheck },
      { route: 'AdminResults', title: 'Results', sub: 'Compile, review, publish, report cards', icon: GraduationCap },
      { route: 'AdminResultAnalysis', title: 'Result analysis', sub: 'Averages, toppers, fail list, comparison', icon: ChartColumn },
    ],
  },
  {
    key: 'transport',
    title: 'G · Transport',
    roles: ['owner', 'principal', 'transport'],
    items: [
      { route: 'AdminVehicles', title: 'Vehicles', sub: 'Records and document expiry', icon: Bus },
      { route: 'AdminDrivers', title: 'Drivers & conductors', sub: 'Records and licence expiry', icon: IdCard },
      { route: 'AdminRoutes', title: 'Routes & stops', sub: 'Stops, order, timings, fee', icon: MapPin },
      { route: 'AdminTransportAssign', title: 'Student assignment', sub: 'Assign to route/stop, capacity check', icon: Users },
      { route: 'AdminTransportAttendance', title: 'Transport attendance', sub: 'Boarding log', icon: ClipboardCheck },
      { route: 'AdminFuelMaintenance', title: 'Fuel & maintenance', sub: 'Logs posted as expenses', icon: Fuel },
    ],
  },
  {
    key: 'store',
    title: 'H · Store, Canteen & Library',
    roles: ['owner', 'principal', 'store', 'librarian'],
    items: [
      { route: 'AdminItems', title: 'Items & suppliers', sub: 'Item master, sizes, suppliers', icon: Package },
      { route: 'AdminPurchases', title: 'Purchases', sub: 'Purchase orders, goods received', icon: Truck },
      { route: 'AdminSales', title: 'Sales', sub: 'Uniform and book sales', icon: ShoppingCart },
      { route: 'AdminCanteenPos', title: 'Canteen POS', sub: 'Quick sale, student wallet', icon: Coffee },
      { route: 'AdminStock', title: 'Stock', sub: 'Stock in hand, adjustments, low stock', icon: Layers },
      { route: 'AdminAssets', title: 'Assets register', sub: 'Fixed assets, location, condition', icon: Building },
      { route: 'AdminLibrary', title: 'Library', sub: 'Catalog, barcodes, issue/return, fines', icon: BookOpen },
    ],
  },
  {
    key: 'messages',
    title: 'Notifications (M-19)',
    roles: ['owner', 'principal', 'frontdesk', 'accounts', 'hr', 'exam', 'transport'],
    items: [
      { route: 'AdminMessages', title: 'Messages & broadcast', sub: 'SMS, WhatsApp, email, push, templates, delivery log', icon: Bell },
    ],
  },
];

// Librarians only see the Library inside panel H.
export function panelsFor(role: StaffRole): Panel[] {
  return PANELS.filter(p => p.roles.includes(role)).map(p =>
    role === 'librarian' && p.key === 'store'
      ? { ...p, items: p.items.filter(i => i.route === 'AdminLibrary') }
      : role === 'store' && p.key === 'store'
      ? { ...p, items: p.items.filter(i => i.route !== 'AdminLibrary') }
      : p,
  );
}

export function canOpen(role: StaffRole, route: string) {
  return panelsFor(role).some(p => p.items.some(i => i.route === route));
}

// ---------- Permission matrix (S-13) ----------
// The Owner edits these in Users & roles; menus and screen access follow them.

export type Matrix = Record<string, Record<string, Perm[]>>;

export function defaultPerms(role: RoleDef): Record<string, Perm[]> {
  const base: StaffRole = role.base ?? 'principal';
  const out: Record<string, Perm[]> = {};
  panelsFor(base).forEach(p =>
    p.items.forEach(i => {
      const perms: Perm[] = ['View', 'Add', 'Edit'];
      if (base === 'owner') {
        perms.push('Delete', 'Approve');
      } else if (base === 'principal') {
        perms.push('Approve');
      }
      out[i.route] = role.custom ? ['View'] : perms;
    }),
  );
  return out;
}

export const useMatrix = () =>
  useShared<Matrix>(
    'admin.perms',
    Object.fromEntries(ROLE_DEFS.map(r => [r.id, defaultPerms(r)])),
  );

// Panels the role may see, after the Owner's permission matrix is applied.
// The Owner always keeps full access so they cannot lock themselves out.
export function useAccess(role: StaffRole) {
  const [matrix] = useMatrix();
  return useMemo(() => {
    const perms = matrix[role];
    const panels =
      role === 'owner' || !perms
        ? panelsFor(role)
        : PANELS.map(p => ({
            ...p,
            items: p.items.filter(i => perms[i.route]?.includes('View')),
          })).filter(p => p.items.length > 0);
    const routes = new Set(panels.flatMap(p => p.items.map(i => i.route)));
    return { panels, can: (route: string) => routes.has(route) };
  }, [matrix, role]);
}
