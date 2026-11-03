// /api/web/* used by the admin app part A: dashboard, search, owner,
// principal, front desk, exam and reports. Shapes follow the live server.
import { api } from './client';

export type Id = string | number;

// ---------- Overview ----------

export type DashboardDto = {
  greeting: string;
  stats: Array<{ key: string; label: string; value: string; sub?: string; route?: string }>;
  feeTrend: Array<{ label: string; amount: number }>;
  alerts: Array<{ text: string; route?: string }>;
  pendingApprovals: number;
  notices: Array<{ id: string; title: string; text: string; at: string }>;
};

export type ContextDto = {
  school: { id: string; name: string; brandColor?: string; settings: Record<string, unknown> };
  campuses: Array<{
    id: string;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    timings: string | null;
    bankName: string | null;
    bankAccount: string | null;
    activeSessionId?: string;
  }>;
  sessions: Array<{ id: string; name: string; isCurrent: boolean; isClosed: boolean }>;
  classes: Array<{ id: string; name: string; sections: string[] }>;
};

export type SearchDto = {
  students: Array<{ id: string; name: string; sub: string }>;
  staff: Array<{ id: string; name: string; sub: string }>;
};

// ---------- Students ----------

export type WebStudent = {
  id: string;
  grNo: string;
  name: string;
  className: string;
  classId: string;
  section: string;
  rollNo: string | null;
  fatherName: string | null;
  fatherCnic: string | null;
  mobile: string | null;
  motherName: string | null;
  occupation: string | null;
  address: string | null;
  bform: string | null;
  dob: string | null;
  gender: string | null;
  status: string;
  staffChild: boolean;
  admissionDate: string | null;
  prevSchool: string | null;
  prevClass: string | null;
  photoUrl: string | null;
};

export type StudentListDto = { items: WebStudent[]; total: number; page: number; pageSize: number };

export type Student360 = WebStudent & {
  dues: number;
  vouchers: Array<{ id: string; voucherNo: string; month: string; amount: number; paid: number; status: string }>;
  siblings: Array<{ id: string; name: string; grNo: string; section: string }>;
  attendance: Array<{ date: string; mark: string }>;
  results: Array<{ subject: string; marks: number; max: number }>;
};

// ---------- Users, settings, audit ----------

export type WebUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  disabled: boolean;
  lastLogin: string | null;
  permissions: string[] | null;
  staffId?: string | null; // linked staff record (teacher/staff logins)
};

// Server permission list (constants/permissions.ts).
export const SERVER_PERMISSIONS = [
  'students.view',
  'students.create',
  'students.export',
  'fees.view',
  'fees.collect',
  'fees.export',
  'attendance.view',
  'attendance.mark',
  'admissions.view',
  'admissions.create',
  'academic.view',
  'academic.edit',
  'staff.view',
  'staff.edit',
  'reports.view',
  'reports.export',
  'users.view',
  'users.edit',
  'settings.edit',
  'approvals.decide',
] as const;

export type AuditRow = {
  id: number;
  user_id: number | null;
  action: string;
  entity: string | null;
  entity_id: number | null;
  meta: unknown;
  created_at: string;
};

export type SetupDto = {
  setupDone: boolean;
  name: string;
  code: string;
  brandColor: string;
  logoUrl: string | null;
  subdomain: string;
  plan: string;
  campuses: number;
  sessions: number;
  classes: number;
  feeHeads: number;
};

// ---------- Academic ----------

export type AcademicDto = {
  sessions: Array<{ id: string; name: string; start: string; end: string; isCurrent: boolean; isClosed: boolean }>;
  subjects: Array<{ id: string; code: string; name: string; type: string }>;
  classes: Array<{
    id: string;
    name: string;
    sortOrder: number;
    sections: Array<{ id: string; name: string; capacity: number; room: string | null; teacherId: number | null }>;
  }>;
};

export type TeachingRow = {
  id: number;
  staff_id: number;
  class_id: number;
  section: string;
  subject_id: number;
  Staff?: { id: number; name: string; emp_id: string };
  Class?: { id: number; name: string };
  Subject?: { id: number; name: string; code: string };
};

export type WebTimetable = {
  days: string[];
  periods: number[];
  slots: Array<{ id: number; day: string; period: number; subjectId: number | null; staffId: number | null }>;
  subjects: Array<{ id: number; name: string }>;
  staff: Array<{ id: number; name: string }>;
};

export type CalendarRow = { id: number; title: string; event_date: string; kind: string; campus_id: number | null };

// ---------- Approvals ----------

export type ApprovalRow = {
  id: string;
  type: string;
  title: string;
  sub: string;
  at: string;
  entityType: string | null;
  entityId: number | null;
};

// ---------- Admissions ----------

export type InquiryRow = {
  id: number;
  child_name: string;
  parent_name: string | null;
  mobile: string;
  class_id: number | null;
  source: string | null;
  status: string;
  notes: string | null;
  created_at?: string;
};

export type RegistrationRow = {
  id: string;
  regNo: string;
  name: string;
  className: string;
  classId: string;
  fatherName: string;
  fatherCnic: string;
  mobile: string;
  feeAmount: string;
  feePaid: boolean;
  decision: string;
  principal: string;
  status: string;
  gender: string | null;
  dob: string | null;
  bform: string | null;
};

export type AdmitResult = { studentId: number; grNo: string; parentPassword?: string; studentPassword?: string };

export type EntryTestRow = {
  id: number;
  name: string;
  test_date: string;
  test_time: string | null;
  room: string | null;
  subjects: Array<{ name: string; max: number }>;
  class_ids?: Array<number | string>;
  reg_ids?: Array<number | string>;
};

export type MeritRow = {
  id: number;
  name: string;
  regNo: string;
  classId: number;
  marks: Record<string, number>;
  total: number;
  decision: string;
  rank: number;
};
// Marks save and merit both return the test and its ranked list.
export type MeritDto = { test: EntryTestRow; merit: MeritRow[] };

// ---------- Exams ----------

export type ExamRow = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  marks_open: boolean;
  is_locked: boolean;
  result_status: string;
};

export type MarksRoster = {
  exam: { id: number; name: string; marksOpen: boolean; locked: boolean; status: string };
  students: Array<{ id: number; name: string; grNo: string; marks: number | null; max: number }>;
};

export type ResultsDto = {
  exam: ExamRow;
  cards: Array<{
    studentId: number;
    name: string;
    grNo: string;
    section: string;
    subjects: Array<{ name: string; marks: number; max: number }>;
    obtained: number;
    max: number;
    pct: number;
    grade: string;
  }>;
  analysis: { average: number; pass: number; fail: number };
};

export type ReportDto = { title: string; rows: Array<Record<string, unknown>>; csv: string };

// Module records: model rows (snake_case) or ParityRecord rows.
export type ModuleRow = Record<string, unknown> & { id: number };

export const webA = {
  dashboard: () => api.get<DashboardDto>('/api/web/dashboard'),
  context: () => api.get<ContextDto>('/api/web/context'),
  search: (q: string) => api.get<SearchDto>('/api/web/search', { q }),

  students: (q: { search?: string; classId?: Id; status?: string; page?: number; pageSize?: number }) =>
    api.get<StudentListDto>('/api/web/students', q),
  student: (id: Id) => api.get<Student360>(`/api/web/students/${id}`),
  updateStudent: (id: Id, b: Record<string, unknown>) => api.put<WebStudent>(`/api/web/students/${id}`, b),
  promote: (b: { studentIds?: Id[]; fromClassId?: Id; toClassId?: Id; action?: 'promote' | 'leave' | 'struck_off' }) =>
    api.post<{ updated: number }>('/api/web/students/promote', b),

  staff: () => api.get<Array<{ id: string; empId: string; name: string; designation: string | null; department: string | null; status: string }>>('/api/web/staff'),
  defaulters: () =>
    api.get<Array<{ id: string; name: string; grNo: string; section: string; mobile: string; amount: number; vouchers: number }>>('/api/web/fees/defaulters'),
  users: () => api.get<WebUser[]>('/api/web/users'),
  createUser: (b: { name: string; email: string; phone?: string; role: string; password?: string; campusIds?: Id[]; permissions?: string[]; staffId?: Id }) =>
    api.post<{ id: string; name: string; email: string; phone: string | null; role: string; staffId: string | null; campusIds: string[]; mustChangePw: boolean }>('/api/web/users', b),
  toggleUser: (id: Id) => api.post<{ id: string; disabled: boolean }>(`/api/web/users/${id}/toggle`),
  saveAccess: (id: Id, b: { permissions?: string[]; campusIds?: Id[]; staffId?: Id | null }) =>
    api.put<{ id: string; permissions: string[] }>(`/api/web/users/${id}/access`, b),
  saveSettings: (b: Record<string, unknown>) => api.put<Record<string, unknown>>('/api/web/settings', b),
  setup: () => api.get<SetupDto>('/api/web/setup'),
  saveCampus: (b: Record<string, unknown>, id?: Id) =>
    id ? api.put<Record<string, unknown>>(`/api/web/campuses/${id}`, b) : api.post<Record<string, unknown>>('/api/web/campuses', b),
  audit: (action?: string) => api.get<AuditRow[]>('/api/web/audit', { action }),
  backup: () => api.get<{ exportedAt: string; counts: Record<string, number> }>('/api/web/backup'),
  restore: (payload: { records: unknown[] }) => api.post<{ restored?: number }>('/api/web/restore', payload),
  outboxStatus: () =>
    api.get<{ sms: boolean; whatsapp: boolean; smsProvider: string | null; whatsappProvider: string | null }>('/api/web/outbox/status'),

  approvals: () => api.get<ApprovalRow[]>('/api/web/approvals'),
  decideApproval: (id: Id, status: 'approved' | 'rejected', note?: string) =>
    api.post<unknown>(`/api/web/approvals/${id}/decide`, { status, note }),

  academic: () => api.get<AcademicDto>('/api/web/academic'),
  addSession: (b: { name: string; startDate: string; endDate: string; makeCurrent?: boolean }) =>
    api.post<unknown>('/api/web/academic/sessions', b),
  copyForward: (sessionId: Id) => api.post<unknown>('/api/web/academic/copy-forward', { sessionId }),
  saveClass: (b: { name: string; sortOrder?: number; sections?: Array<{ name: string; capacity?: number; room?: string }> }, id?: Id) =>
    id ? api.put<unknown>(`/api/web/academic/classes/${id}`, b) : api.post<unknown>('/api/web/academic/classes', b),
  addSubject: (b: { code: string; name: string; type?: string; theoryPrac?: string }) =>
    api.post<unknown>('/api/web/academic/subjects', b),
  teaching: () => api.get<TeachingRow[]>('/api/web/academic/teaching'),
  assignTeaching: (b: { staffId: Id; classId: Id; section: string; subjectId: Id }) =>
    api.post<unknown>('/api/web/academic/teaching', b),
  classSubjects: (classId: Id) => api.get<Array<number | string>>('/api/web/class-subjects', { classId }),
  saveClassSubjects: (classId: Id, subjectIds: Id[]) =>
    api.post<Array<number | string>>('/api/web/class-subjects', { classId: Number(classId), subjectIds: subjectIds.map(Number) }),
  shortage: (classId: Id, section: string) =>
    api.get<Array<Record<string, unknown>>>('/api/web/attendance/shortage', { classId, section }),
  timetable: (classId: Id, section: string) => api.get<WebTimetable>('/api/web/timetable', { classId, section }),
  saveSlot: (b: { classId: Id; section: string; day: string; period: number; subjectId: Id; staffId?: Id }) =>
    api.post<unknown>('/api/web/timetable', b),
  leave: () =>
    api.get<{
      policies: unknown[];
      items: Array<{ id: string; kind: string; name: string; type: string; from: string; to: string; days: number; reason: string | null; status: string }>;
    }>('/api/web/leave'),
  calendar: () => api.get<CalendarRow[]>('/api/web/calendar'),
  addEvent: (b: { title: string; date: string; kind: string }) => api.post<CalendarRow>('/api/web/calendar', b),

  inquiries: () => api.get<InquiryRow[]>('/api/web/inquiries'),
  addInquiry: (b: { childName: string; parentName?: string; mobile: string; classId?: Id; source?: string; notes?: string }) =>
    api.post<InquiryRow>('/api/web/inquiries', b),
  convertInquiry: (id: Id) => api.post<RegistrationRow>(`/api/web/inquiries/${id}/convert`),
  registrations: () => api.get<RegistrationRow[]>('/api/web/registrations'),
  register: (b: Record<string, unknown>) => api.post<RegistrationRow>('/api/web/registrations', b),
  decide: (id: Id, decision: 'selected' | 'waiting' | 'rejected') =>
    api.post<RegistrationRow>(`/api/web/registrations/${id}/decision`, { decision }),
  admit: (id: Id, section: string) => api.post<AdmitResult>(`/api/web/registrations/${id}/admit`, { section }),
  entryTests: () => api.get<EntryTestRow[]>('/api/web/entry-tests'),
  addEntryTest: (b: { name: string; testDate: string; testTime?: string; room?: string; classIds?: Id[]; regIds?: Id[]; subjects?: Array<{ name: string; max: number }> }) =>
    api.post<EntryTestRow>('/api/web/entry-tests', b),
  saveEntryMarks: (id: Id, marks: Record<string, Record<string, number>>) =>
    api.post<MeritDto>(`/api/web/entry-tests/${id}/marks`, { marks }),
  merit: (id: Id) => api.get<MeritDto>(`/api/web/entry-tests/${id}/merit`),
  printCertificate: (studentId: Id, kind?: string) =>
    api.get<{ kind: string; school: string; date: string; student: Record<string, string> }>(
      `/api/web/print/certificates/${studentId}`,
      { kind },
    ),

  marks: (q: { examId: Id; classId: Id; section: string; subjectId?: Id }) => api.get<MarksRoster>('/api/web/marks', q),
  saveMarks: (b: { examId: Id; subjectId?: Id; subjectName?: string; entries: Array<{ studentId: Id; marks: number; max: number }> }) =>
    api.post<{ saved: number }>('/api/web/marks', b),
  results: (examId: Id) => api.get<ResultsDto>('/api/web/results', { examId }),
  lockExam: (id: Id, publish: boolean) => api.post<ExamRow>(`/api/web/exams/${id}/lock`, { publish }),

  report: (kind: string) => api.get<ReportDto>(`/api/web/reports/${kind}`),
  libraryIssues: () =>
    api.get<Array<{ id: number; book_id: number; borrower: string; issued_on: string; due_on: string; returned_on: string | null; fine: number | string }>>(
      '/api/web/library/issues',
    ),

  modules: <T extends ModuleRow = ModuleRow>(key: string) => api.get<T[]>(`/api/web/modules/${key}`),
  addModule: <T extends ModuleRow = ModuleRow>(key: string, b: Record<string, unknown>) => api.post<T>(`/api/web/modules/${key}`, b),
  updateModule: <T extends ModuleRow = ModuleRow>(key: string, id: Id, b: Record<string, unknown>) =>
    api.put<T>(`/api/web/modules/${key}/${id}`, b),
  deleteModule: (key: string, id: Id) => api.del<{ ok: boolean }>(`/api/web/modules/${key}/${id}`),
};

// Reads a string field from a module/record row in either naming style.
export function field(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && v !== '') {
      return String(v);
    }
  }
  return '';
}
