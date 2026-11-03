// Types for the Principal / Campus Admin panel (SOW 3.2 B). No sample records.

// ---------- Academic setup (M-01) ----------

export type ClassSection = {
  id: string;
  className: string;
  section: string;
  capacity: number;
  enrolled: number;
  classTeacher: string;
  room: string;
  active: boolean;
};

export type SubjectRow = { code: string; name: string; type: string; kind: string; active: boolean };
export type Term = { id: string; name: string; from: string; to: string };
// Terms are added by the school; none are built in.
export const TERMS: Term[] = [];

// ---------- Timetable (M-05) ----------

export type BellPeriod = { label: string; time: string; isBreak?: boolean };
export type Slot = { subject: string; teacher: string; room: string };
// key: `${class}|${day}|${period}`
export type TimetableMap = Record<string, Slot>;

export const WORKLOAD_LIMIT = { perDay: 7, perWeek: 36 };

// ---------- Substitutions ----------

export type AbsentTeacher = { id: string; name: string; reason: string; periods: Array<{ period: string; cls: string; subject: string }> };

export type SubRecord = { id: string; date: string; absent: string; period: string; cls: string; substitute: string };
// ---------- Annual calendar (M-08) ----------

export type CalEntry = {
  id: string;
  title: string;
  kind: 'Holiday' | 'Vacation' | 'Event' | 'PTM' | 'Exam window';
  from: string; // e.g. '2026-10-31'
  to: string;
  scope: string; // 'All campuses' | campus | class
  published: boolean;
};

// ---------- Curriculum (M-13) ----------

export type Chapter = { id: string; cls: string; subject: string; term: string; title: string; done: boolean; teacher: string };

export type LessonPlan = { id: string; teacher: string; cls: string; week: string; objectives: string; activities: string; status: 'Pending' | 'Approved' | 'Returned'; comment?: string };

// ---------- Promotion, transfer, alumni (S-04) ----------

export type Alumnus = { id: string; name: string; batch: string; status: 'Passed out' | 'Left'; contact: string; now: string };

// ---------- Complaints & surveys (S-11) ----------

export type Ticket = {
  id: string;
  title: string;
  category: 'Academics' | 'Fee' | 'Transport' | 'Behaviour' | 'Facilities' | 'Staff' | 'Other';
  from: string;
  child: string;
  status: 'Open' | 'In progress' | 'Resolved' | 'Closed';
  assigned?: string;
  opened: string;
  thread: Array<{ who: string; text: string; mine?: boolean }>;
  resolution?: string;
};

export type Survey = { id: string; title: string; audience: string; responses: number; questions: Array<{ q: string; avg: number }>; status: 'Open' | 'Closed' };

// ---------- Health & discipline (S-12) ----------

export type HealthProfile = { id: string; student: string; cls: string; blood: string; allergies: string; notes: string; emergency: string };

export type SickVisit = { id: string; student: string; when: string; complaint: string; action: string; notified: boolean };

export type Incident = { id: string; student: string; kind: 'Incident' | 'Warning' | 'Positive'; points: number; text: string; by: string; when: string; notified: boolean };
