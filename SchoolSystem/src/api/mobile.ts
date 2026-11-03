// /api/mobile/* — parent, student and teacher apps. Shapes follow the live
// server (dist/mobile/service.js); Swagger only documents request examples.
import { api, request } from './client';
import type { AcademicSession, Campus, ServerRole } from './session';

// ---------- Auth ----------

export type LoginResult = {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    name: string;
    email?: string;
    role: ServerRole;
    schoolId?: string;
    schoolName?: string;
    campusIds: string[];
    staffId: string | null;
    mustChangePw: boolean;
    permissions: string[];
    brandColor?: string;
  };
  schoolId?: string;
  campusId?: string;
  sessionId?: string;
  campuses: Campus[];
  sessions: AcademicSession[];
};

// `key` is an email, mobile number or GR No.; the server accepts any of them.
export const authApi = {
  login: (key: string, password: string, schoolCode: string) =>
    request<LoginResult>('POST', '/api/mobile/auth/login', { auth: false, body: { key, password, schoolCode } }),
  otpRequest: (phone: string, schoolCode: string) =>
    request<{ sent: boolean; demoCode?: string; hint?: string }>('POST', '/api/mobile/auth/otp/request', {
      auth: false,
      body: { phone, schoolCode },
    }),
  otpVerify: (phone: string, code: string, schoolCode: string) =>
    request<LoginResult>('POST', '/api/mobile/auth/otp/verify', { auth: false, body: { phone, code, schoolCode } }),
  resetRequest: (key: string, schoolCode: string) =>
    request<{ sent: boolean; demoCode?: string; hint?: string }>('POST', '/api/mobile/auth/password/reset-request', {
      auth: false,
      body: { key, schoolCode },
    }),
  reset: (key: string, code: string, password: string, schoolCode: string) =>
    request<{ ok: boolean }>('POST', '/api/mobile/auth/password/reset', {
      auth: false,
      body: { key, code, password, schoolCode },
    }),
  logout: (refreshToken?: string) =>
    request<null>('POST', '/api/mobile/auth/logout', { auth: false, body: refreshToken ? { refreshToken } : undefined }),
  me: () => api.get<LoginResult['user'] & { campuses: Campus[]; sessions: AcademicSession[] }>('/api/mobile/auth/me'),
  changePassword: (current: string, next: string) =>
    api.post<null>('/api/mobile/auth/password/change', { current, next }),
  registerDevice: (token: string, platform: string, locale: string) =>
    api.post('/api/mobile/auth/device', { token, platform, locale }),
};

// ---------- Common ----------

export type AppSettings = { locale: 'en' | 'ur'; notifications: boolean; rtl: boolean };

export const settingsApi = {
  get: () => api.get<AppSettings>('/api/mobile/settings'),
  save: (s: { locale: string; notifications: boolean }) => api.put<unknown>('/api/mobile/settings', s),
};

// ---------- Parent & student ----------

export type StudentDto = {
  id: number;
  name: string;
  grNo: string;
  rollNo: string | null;
  classId: number;
  className: string;
  section: string;
  father: string | null;
  mother: string | null;
  mobile: string | null;
  photoUrl: string | null;
  dob: string | null;
  gender: 'M' | 'F' | null;
  address: string | null;
  campusId: number;
};

export type HomeDto = {
  children: StudentDto[];
  student: StudentDto;
  today: {
    date: string;
    attendance: string; // 'P' | 'A' | 'L' | 'LV' | '—' | 'Not marked'
    diary: Array<{ id: number; topic: string | null; homework: string | null; subjectId: number | null }>;
    homeworkDue: Array<{ id: number; title: string; dueDate: string | null }>;
    periods: Array<{ period: number; subjectId: number | null }>;
    notices: Array<{ id: number; title: string; body: string; bodyUrdu: string | null }>;
    dues: number;
  };
};

export type VoucherDto = {
  id: number;
  voucherNo: string;
  uuid: string;
  month: string | null;
  title: string | null;
  type: string;
  issueDate: string | null;
  dueDate: string | null;
  amount: number;
  paid: number;
  balance: number;
  status: 'unpaid' | 'partial' | 'paid' | string;
  qr: string;
  lines: Array<{ label: string; amount: number; discount: number }>;
};

export type FeesDto = {
  student: StudentDto;
  children: StudentDto[];
  dues: number;
  canPay: boolean;
  vouchers: VoucherDto[];
};

export type PaymentDto = {
  id: number;
  receiptNo: string;
  amount: number;
  mode: string;
  date: string;
  reference: string | null;
  voucherId: number;
};

export type OnlinePayDto = {
  status: string; // 'unavailable' while gateway keys are not set
  message: string;
  reference?: string;
  gateways: Array<{ id: string; name: string; enabled: boolean }>;
  voucher: VoucherDto;
};

export type AttendanceDto = {
  month: string; // YYYY-MM
  percentage: number;
  present: number;
  total: number;
  days: Array<{ date: string; mark: string }>;
};

export type DiaryDto = {
  id: number;
  date: string;
  subjectId: number | null;
  subject: string | undefined;
  topic: string | null;
  homework: string | null;
};

export type HomeworkDto = {
  id: number;
  title: string;
  body: string | null;
  dueDate: string | null;
  subjectId: number | null;
  subject: string | null;
  status: 'assigned' | 'missing' | 'submitted' | 'graded' | string;
  submission: (Record<string, unknown> & { marks?: number; comment?: string; note?: string; fileUrl?: string }) | null;
};

export type TimetableDto = {
  days: string[];
  periods: number[];
  slots: Array<{ day: string; period: number; subjectId: number | null; subject: string | null; staffId: number | null }>;
};

export type CalendarDto = Array<{ id: number; title: string; date: string; kind: string }>;

export type ExamsDto = {
  student: StudentDto;
  exams: Array<{ id: number; name: string; startDate: string | null; endDate: string | null; resultStatus: string }>;
};

export type AdmitCardDto = {
  school: string;
  exam: { id: number; name: string; startDate: string | null; endDate: string | null };
  student: StudentDto;
  qr: string;
};

export type ResultsDto = {
  student: StudentDto;
  total: number;
  max: number;
  percentage: number;
  grade: string;
  position: number | null;
  subjects: Array<{ subject: string; marks: number; max: number }>;
  school?: string;
  qr?: string;
};

export type LeaveDto = {
  id: number;
  kind: 'student' | 'staff';
  leave_type?: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  student_id?: number | null;
  staff_id?: number | null;
};

// ParityRecord rows come back flattened: id/uuid/title/status/recordDate + payload.
export type RecordDto = {
  id: number;
  uuid: string;
  title: string;
  status: string;
  recordDate: string;
  [k: string]: unknown;
};

export type TransportDto = {
  student: StudentDto;
  route: { id: number; name: string; fare: number } | null;
  vehicle: { plate: string; type: string; driver: string; phone: string } | null;
};

export type LibraryDto = Array<{
  id: number;
  title: string;
  issuedOn: string;
  dueOn: string;
  returnedOn: string | null;
  fine: number;
}>;

export type NoticeDto = { id: number; title: string; body: string; bodyUrdu: string | null; audience: string; at: string };

export type ComplaintDto = { id: number; category: string; body: string; status: string; raisedBy: string };

// Parent screens pass the selected child; the client also sends X-Child-Id.
const child = (childId?: number) => (childId ? { childId } : undefined);

export const familyApi = {
  home: (childId?: number) => api.get<HomeDto>('/api/mobile/home', child(childId)),
  children: () => api.get<StudentDto[]>('/api/mobile/children'),
  fees: (childId?: number) => api.get<FeesDto>('/api/mobile/fees', child(childId)),
  voucher: (id: number, childId?: number) => api.get<VoucherDto>(`/api/mobile/vouchers/${id}`, child(childId)),
  payments: (childId?: number) => api.get<PaymentDto[]>('/api/mobile/payments', child(childId)),
  payOnline: (voucherId: number, gateway: string, childId?: number) =>
    request<OnlinePayDto>('POST', '/api/mobile/payments/online', { body: { voucherId, gateway }, query: child(childId) }),
  payStatus: (reference: string) => api.get<RecordDto>(`/api/mobile/payments/online/${encodeURIComponent(reference)}`),
  attendance: (month?: string, childId?: number) =>
    api.get<AttendanceDto>('/api/mobile/attendance', { month, ...child(childId) }),
  diary: (date?: string, childId?: number) => api.get<DiaryDto[]>('/api/mobile/diary', { date, ...child(childId) }),
  homework: (childId?: number) => api.get<HomeworkDto[]>('/api/mobile/homework', child(childId)),
  submitHomework: (homeworkId: number, note: string, file?: { uri: string; name: string; type: string }, childId?: number) =>
    request<RecordDto>('POST', '/api/mobile/homework/submit', { body: { homeworkId, note }, file, query: child(childId) }),
  timetable: (childId?: number) => api.get<TimetableDto>('/api/mobile/timetable', child(childId)),
  calendar: () => api.get<CalendarDto>('/api/mobile/calendar'),
  exams: (childId?: number) => api.get<ExamsDto>('/api/mobile/exams', child(childId)),
  admitCard: (examId?: number, childId?: number) => api.get<AdmitCardDto>('/api/mobile/admit-card', { examId, ...child(childId) }),
  results: (examId?: number, childId?: number) => api.get<ResultsDto>('/api/mobile/results', { examId, ...child(childId) }),
  reportCard: (examId?: number, childId?: number) => api.get<ResultsDto>('/api/mobile/report-card', { examId, ...child(childId) }),
  leave: (childId?: number) => api.get<LeaveDto[]>('/api/mobile/leave', child(childId)),
  applyLeave: (b: { from: string; to: string; reason: string; type?: string; days: number }, childId?: number) =>
    request<LeaveDto>('POST', '/api/mobile/leave', { body: b, query: child(childId) }),
  health: (childId?: number) => api.get<RecordDto[]>('/api/mobile/health', child(childId)),
  transport: (childId?: number) => api.get<TransportDto>('/api/mobile/transport', child(childId)),
  library: (childId?: number) => api.get<LibraryDto>('/api/mobile/library', child(childId)),
  notices: () => api.get<NoticeDto[]>('/api/mobile/notices'),
  complaints: () => api.get<ComplaintDto[]>('/api/mobile/complaints'),
  createComplaint: (category: string, body: string, file?: { uri: string; name: string; type: string }) =>
    api.post<ComplaintDto>('/api/mobile/complaints', { category, body, raisedBy: 'Parent' }, file),
  surveys: () => api.get<RecordDto[]>('/api/mobile/surveys'),
  answerSurvey: (surveyId: number | string, answers: Record<string, unknown>) =>
    api.post<RecordDto>('/api/mobile/surveys', { surveyId, answers }),
  pickup: (childId?: number) => api.get<RecordDto[]>('/api/mobile/pickup', child(childId)),
  savePickup: (b: { name: string; relation: string; cnic: string }, childId?: number) =>
    request<RecordDto>('POST', '/api/mobile/pickup', { body: b, query: child(childId) }),
  certificates: (childId?: number) => api.get<RecordDto[]>('/api/mobile/certificates', child(childId)),
  requestCertificate: (kind: string, childId?: number) =>
    request<RecordDto>('POST', '/api/mobile/certificates', { body: { kind }, query: child(childId) }),
  profile: (childId?: number) => api.get<StudentDto>('/api/mobile/profile', child(childId)),
  changeRequest: (b: { mobile?: string; address?: string; note?: string }, childId?: number) =>
    request<RecordDto>('POST', '/api/mobile/profile/change-request', { body: b, query: child(childId) }),
};

// ---------- Teacher ----------

export type TeacherClass = { classId: number; section: string; subjectId: number | null; className?: string; subject?: string };

export type TeacherTodayDto = {
  date: string;
  periods: Array<{ period: number; classId: number; section: string; subjectId: number | null }>;
  substitutions: RecordDto[];
  classes: TeacherClass[];
};

export type TeacherTimetableDto = {
  days: string[];
  periods: number[];
  slots: Array<{ day: string; period: number; classId: number; section: string; subjectId: number | null; subject: string | null }>;
  substitutions: RecordDto[];
};

export type RosterDto = {
  marked: boolean;
  students: Array<{ id: string; name: string; grNo: string; mark: string | null }>;
};

export type TeacherHomeworkDto = Array<{
  id: number;
  title: string;
  dueDate: string | null;
  classId: number;
  section: string;
  submitted: number;
  submissions: RecordDto[];
}>;

export type MarksRosterDto = {
  exam: { id: number; name: string; marksOpen: boolean; locked: boolean; status: string };
  students: Array<{ id: number; name: string; grNo: string; marks: number | null; max: number }>;
};

export type StudentGroup = { classId: number; section: string; students: StudentDto[] };

export type TeacherStudentDto = {
  student: StudentDto;
  attendance: Array<{ date: string; mark: string }>;
  results: Array<{ subject: string; marks: number; max: number }>;
  health: RecordDto[];
};

export type MyAttendanceDto = {
  month: string;
  days: Array<{ date: string; status: string; timeIn: string | null; timeOut: string | null }>;
  policies: Array<Record<string, unknown>>;
  leaves: LeaveDto[];
};

export type SalarySlipDto = {
  id: number;
  month: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: string;
};

export const teacherApi = {
  today: () => api.get<TeacherTodayDto>('/api/mobile/teacher/today'),
  timetable: () => api.get<TeacherTimetableDto>('/api/mobile/teacher/timetable'),
  roster: (classId: number, section: string, date?: string) =>
    api.get<RosterDto>('/api/mobile/teacher/attendance', { classId, section, date }),
  saveAttendance: (b: { classId: number; section: string; date: string; marks: Record<string, string> }) =>
    api.post<{ saved: number; cutoff: string }>('/api/mobile/teacher/attendance', b),
  exception: (b: { studentId: number; type: 'late' | 'early'; time: string; date?: string }) =>
    api.post<RecordDto>('/api/mobile/teacher/attendance/exceptions', b),
  classDiary: (classId: number, section: string, date?: string) =>
    api.get<Array<Record<string, unknown>>>('/api/mobile/teacher/diary', { classId, section, date }),
  postDiary: (
    b: { classId: number; section: string; subjectId?: number | null; topic: string; homework?: string; date?: string },
    file?: { uri: string; name: string; type: string },
  ) => api.post<{ id: number; date: string; topic: string; homework: string | null; fileUrl?: string }>('/api/mobile/teacher/diary', b, file),
  homework: () => api.get<TeacherHomeworkDto>('/api/mobile/teacher/homework'),
  assignHomework: (
    b: { classId: number; section: string; subjectId?: number | null; title: string; body?: string; dueDate?: string },
    file?: { uri: string; name: string; type: string },
  ) => api.post<{ id: number; title: string; dueDate: string | null }>('/api/mobile/teacher/homework', b, file),
  grade: (submissionId: number, marks: number, comment: string) =>
    api.put<RecordDto>(`/api/mobile/teacher/homework/${submissionId}/grade`, { marks, comment }),
  marks: (examId: number, classId: number, section: string, subjectId?: number) =>
    api.get<MarksRosterDto>('/api/mobile/teacher/marks', { examId, classId, section, subjectId }),
  saveMarks: (b: { examId: number; subjectId?: number; subjectName?: string; entries: Array<{ studentId: number; marks: number; max: number }> }) =>
    api.post<{ saved: number }>('/api/mobile/teacher/marks', b),
  students: () => api.get<StudentGroup[]>('/api/mobile/teacher/students'),
  student: (id: number) => api.get<TeacherStudentDto>(`/api/mobile/teacher/students/${id}`),
  health: (b: { studentId: number; kind: string; note: string; points?: number; title?: string }) =>
    api.post<RecordDto>('/api/mobile/teacher/health', b),
  leaves: () => api.get<LeaveDto[]>('/api/mobile/teacher/leaves'),
  decideLeave: (id: number, status: 'approved' | 'rejected') =>
    api.post<LeaveDto>(`/api/mobile/teacher/leaves/${id}/decide`, { status }),
  curriculum: () => api.get<RecordDto[]>('/api/mobile/teacher/curriculum'),
  saveCurriculum: (b: Record<string, unknown>, id?: number) =>
    id ? api.put<RecordDto>(`/api/mobile/teacher/curriculum/${id}`, b) : api.post<RecordDto>('/api/mobile/teacher/curriculum', b),
  myAttendance: (month?: string) => api.get<MyAttendanceDto>('/api/mobile/teacher/my-attendance', { month }),
  myLeaves: () => api.get<LeaveDto[]>('/api/mobile/leave'),
  applyLeave: (b: { from: string; to: string; reason: string; type: string; days: number }) =>
    api.post<LeaveDto>('/api/mobile/teacher/leave', b),
  salary: () => api.get<SalarySlipDto[]>('/api/mobile/teacher/salary'),
  messageParents: (b: { classId: number; section: string; title: string; body: string; bodyUrdu?: string }) =>
    api.post<{ noticeId: number; queued: number }>('/api/mobile/teacher/messages', b),
  reports: (kind = 'strength') => api.get<Array<Record<string, unknown>>>('/api/mobile/teacher/reports', { kind }),
  notices: () => api.get<NoticeDto[]>('/api/mobile/notices'),
  calendar: () => api.get<CalendarDto>('/api/mobile/calendar'),
  // Exam list for marks entry (server fix: teachers may call /exams).
  exams: () =>
    api.get<{
      exams: Array<{ id: number; name: string; startDate: string | null; endDate: string | null; resultStatus: string; marksOpen?: boolean; locked?: boolean }>;
    }>('/api/mobile/exams'),
};
