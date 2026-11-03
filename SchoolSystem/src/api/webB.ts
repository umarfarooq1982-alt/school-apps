// /api/web/* endpoints used by the Accounts, HR, Transport, Store/Library and
// Messages panels. Shapes follow the live server (dist/services/*.js).
import { api } from './client';

// The server sends ids and money as strings in some rows.
export const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ---------- Fees ----------

export type WebFeeHead = { id: number; name: string; type: string; is_discountable: boolean; is_active: boolean };
export type WebStructureRow = {
  id: number;
  class_id: number;
  fee_head_id: number;
  amount: string | number;
  FeeHead?: { id: number; name: string };
  Class?: { id: number; name: string };
};
export type WebVoucher = {
  id: string;
  voucherNo: string;
  studentName?: string;
  grNo?: string;
  studentId: string;
  month: string | null;
  title: string | null;
  issueDate: string | null;
  dueDate: string | null;
  amount: number;
  paid: number;
  balance: number;
  status: string;
  lines: Array<{ label: string; amount: number; discount: number }>;
};
export type WebVoucherPrint = {
  copies: string[];
  school: string;
  logoUrl: string | null;
  voucherNo: string;
  month: string | null;
  issueDate: string | null;
  dueDate: string | null;
  amount: number;
  paid: number;
  status: string;
  student: { name: string; grNo: string; father: string | null; className: string; section: string };
  lines: Array<{ head: string; amount: number; discount: number }>;
};
export type WebCounter = { collectedToday: number; cashToday: number; bankToday: number; onlineToday: number };
export type WebDefaulter = { id: string; name: string; grNo: string; section: string; mobile: string | null; amount: number; vouchers: number };
export type WebDiscount = {
  id: number;
  student_id: number;
  type: string;
  mode: string;
  value: string | number;
  valid_from: string | null;
  valid_to: string | null;
  reason: string | null;
  status: string;
  Student?: { id: number; name: string; gr_no: string };
};
export type WebWaiver = {
  id: number;
  student_id: number | null;
  voucher_id: number | null;
  type: string;
  amount: string | number;
  reason: string | null;
  status: string;
};
export type WebClosing = {
  id: number;
  close_date: string;
  cashier_id: number;
  cash_amount: string | number;
  bank_amount: string | number;
  online_amount: string | number;
  note: string | null;
};
export type CollectResult = { receiptNo: string; paymentId: number; voucherStatus: string; studentId: number };

export const feesApi = {
  heads: () => api.get<WebFeeHead[]>('/api/web/fees/heads'),
  saveHead: (b: { name: string; type: string; discountable?: boolean; active?: boolean }, id?: number) =>
    id ? api.put<WebFeeHead>(`/api/web/fees/heads/${id}`, b) : api.post<WebFeeHead>('/api/web/fees/heads', b),
  structure: (classId?: number) => api.get<WebStructureRow[]>('/api/web/fees/structure', { classId }),
  saveStructure: (classId: number, amounts: Record<string, number>) =>
    api.post<unknown>('/api/web/fees/structure', { classId, amounts }),
  vouchers: (q: { search?: string; status?: string; month?: string } = {}) => api.get<WebVoucher[]>('/api/web/fees/vouchers', q),
  generate: (month: string) => api.post<{ count: number }>('/api/web/fees/vouchers/generate', { month }),
  createVoucher: (b: { studentId: number; type: 'monthly' | 'advance' | 'other'; month?: string; months?: number; title?: string; amount?: number }) =>
    api.post<unknown>('/api/web/fees/vouchers', b),
  print: (id: string | number) => api.get<WebVoucherPrint>(`/api/web/print/vouchers/${id}`),
  counter: () => api.get<WebCounter>('/api/web/fees/counter'),
  collect: (b: { voucherId: number; amount: number; mode: 'cash' | 'bank' | 'online'; reference?: string }) =>
    api.post<CollectResult>('/api/web/fees/collect', b),
  defaulters: () => api.get<WebDefaulter[]>('/api/web/fees/defaulters'),
  discounts: () => api.get<WebDiscount[]>('/api/web/fees/discounts'),
  saveDiscount: (b: { studentId: number; type: string; mode: 'pct' | 'fixed'; value: number; from?: string; to?: string; reason: string }) =>
    api.post<WebDiscount>('/api/web/fees/discounts', b),
  waivers: () => api.get<WebWaiver[]>('/api/web/fees/waivers'),
  saveWaiver: (b: { studentId?: number; voucherId?: number; type: 'fine' | 'refund' | 'adjustment'; amount: number; reason: string }) =>
    api.post<WebWaiver>('/api/web/fees/waivers', b),
  closings: () => api.get<WebClosing[]>('/api/web/fees/cash-closing'),
  closeDay: (note: string) => api.post<WebClosing>('/api/web/fees/cash-closing', { note }),
  exportCsv: () => api.get<{ csv: string }>('/api/web/fees/export'),
};

// ---------- Payroll ----------

export type WebSlip = {
  id: number;
  staff_id: number;
  month: string;
  basic: string | number;
  allowances: string | number;
  deductions: string | number;
  net: string | number;
  status: string;
  staffName?: string;
  empId?: string;
  designation?: string;
};

export const payrollApi = {
  list: (month: string) => api.get<WebSlip[]>('/api/web/payroll', { month }),
  generate: (month: string) => api.post<WebSlip[]>('/api/web/payroll/generate', { month }),
};

// ---------- Staff / HR ----------

export type WebStaff = {
  id: string;
  empId: string;
  name: string;
  cnic: string | null;
  mobile: string | null;
  email: string | null;
  designation: string | null;
  department: string | null;
  joinDate: string | null;
  type: string;
  contractEnd: string | null;
  basic: string | number;
  status: string;
  photoUrl: string | null;
};
export type StaffInput = {
  name: string;
  cnic?: string;
  mobile?: string;
  email?: string;
  designation?: string;
  department?: string;
  joinDate?: string;
  type?: string;
  contractEnd?: string;
  basic?: number;
  status?: string;
};
export type WebStaffDay = {
  id: string;
  name: string;
  empId: string;
  designation: string | null;
  status: string | null;
  timeIn?: string | null;
  timeOut?: string | null;
};
export type WebLeaveItem = {
  id: string;
  kind: 'staff' | 'student';
  name?: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string | null;
  status: string;
};
export type WebLeavePolicy = { id: number; leave_type?: string; name?: string; quota?: number; days?: number; carry_forward?: number };

export const staffApi = {
  list: () => api.get<WebStaff[]>('/api/web/staff'),
  get: (id: string | number) => api.get<WebStaff>(`/api/web/staff/${id}`),
  create: (b: StaffInput) => api.post<WebStaff>('/api/web/staff', b),
  update: (id: string | number, b: Partial<StaffInput>) => api.put<WebStaff>(`/api/web/staff/${id}`, b),
  day: (date?: string) => api.get<WebStaffDay[]>('/api/web/attendance/staff', { date }),
  saveDay: (date: string, marks: Array<{ staffId: number; status: string; timeIn?: string }>) =>
    api.post<{ saved: number }>('/api/web/attendance/staff', { date, marks }),
  leave: () => api.get<{ policies: WebLeavePolicy[]; items: WebLeaveItem[] }>('/api/web/leave'),
  decideLeave: (id: string | number, status: 'approved' | 'rejected') =>
    api.post<unknown>(`/api/web/leave/${id}/decide`, { status }),
  applyLeave: (b: { kind: 'staff'; staffId: number; type: string; from: string; to: string; days: number; reason: string; name?: string }) =>
    api.post<unknown>('/api/web/leave', b),
  leaveCalendar: (month: string) =>
    api.get<Array<{ id: number; kind: string; leave_type: string; from_date: string; to_date: string; status: string; staff_id: number | null; student_id: number | null }>>(
      '/api/web/leave-calendar',
      { month },
    ),
};

// ---------- Generic module records (/api/web/modules/{key}) ----------
// Model-backed keys (vehicles, routes, items, expenses, messages, library)
// return table rows in snake_case; other keys return flattened records.

export type ModuleRow = { id: number | string; [k: string]: unknown };

export const modulesApi = {
  list: <T extends ModuleRow = ModuleRow>(key: string) => api.get<T[]>(`/api/web/modules/${key}`),
  create: <T extends ModuleRow = ModuleRow>(key: string, body: Record<string, unknown>) =>
    api.post<T>(`/api/web/modules/${key}`, body),
  update: <T extends ModuleRow = ModuleRow>(key: string, id: number | string, body: Record<string, unknown>) =>
    api.put<T>(`/api/web/modules/${key}/${id}`, body),
  remove: (key: string, id: number | string) => api.del<{ ok: boolean }>(`/api/web/modules/${key}/${id}`),
};

// ---------- Library ----------

export type WebBookIssue = {
  id: number;
  book_id: number;
  borrower: string;
  issued_on: string;
  due_on: string;
  returned_on: string | null;
  fine: string | number;
  bookTitle?: string;
  overdue: boolean;
};

export const libraryApi = {
  issues: () => api.get<WebBookIssue[]>('/api/web/library/issues'),
  issue: (b: { bookId: number; borrower: string; days?: number; dueOn?: string }) =>
    api.post<WebBookIssue>('/api/web/library/issue', b),
  returnBook: (id: number, fine: number) => api.post<WebBookIssue>(`/api/web/library/issues/${id}/return`, { fine }),
};

// ---------- Messages / notices ----------

export type WebOutbox = {
  id: number;
  channel: string;
  event_key: string;
  target: string | null;
  body: string;
  status: string;
  created_at: string;
};
export type WebGateway = { sms: boolean; whatsapp: boolean; smsProvider: string | null; whatsappProvider: string | null };
export type WebNotice = { id: string; title: string; text: string; bodyUrdu: string | null; audience: string; at: string };

export const messagesApi = {
  outbox: () => api.get<WebOutbox[]>('/api/web/outbox'),
  status: () => api.get<WebGateway>('/api/web/outbox/status'),
  retry: (id: number) => api.post<WebOutbox | null>(`/api/web/outbox/${id}/retry`),
  notices: () => api.get<WebNotice[]>('/api/web/notices'),
  publish: (b: { title: string; body: string; bodyUrdu?: string; audience: string }) => api.post<unknown>('/api/web/notices', b),
  send: (b: { channel: string; recipient: string; body: string }) => modulesApi.create('messages', b),
};

// ---------- Students (for pickers) ----------

export type WebStudentRow = { id: string; grNo: string; name: string; className: string; classId: string; section: string; mobile: string | null };

export const studentsApi = {
  list: (q: { search?: string; page?: number; pageSize?: number } = {}) =>
    api.get<{ items: WebStudentRow[]; total: number }>('/api/web/students', q),
};

// ---------- Context (classes for pickers) ----------

export type WebContext = {
  school: { id: string; name: string; settings?: Record<string, unknown> };
  campuses: Array<{ id: string; name: string }>;
  sessions: Array<{ id: string; name: string; isCurrent: boolean; isClosed: boolean }>;
  classes: Array<{ id: string; name: string; sections: string[] }>;
};

export const contextApi = {
  get: () => api.get<WebContext>('/api/web/context'),
};

// ---------- Users (read-only, to show whether staff have a login) ----------

export type WebUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  disabled: boolean;
  lastLogin: string | null;
  staffId?: string | number | null;
};

export const usersApi = {
  list: () => api.get<WebUser[]>('/api/web/users'),
};
