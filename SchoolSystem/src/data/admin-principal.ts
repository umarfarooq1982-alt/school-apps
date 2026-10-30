// Dummy data for the Principal / Campus Admin panel (SOW 3.2 B).
import { ADMIN_STAFF, ADMIN_STUDENTS, CLASSES, SUBJECTS } from './admin';

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

const TEACHERS = ADMIN_STAFF.filter(s => s.department === 'Academics' && s.status !== 'Left');
export const TEACHER_NAMES = TEACHERS.map(t => t.name);

export const CLASS_SECTIONS: ClassSection[] = CLASSES.flatMap((c, ci) =>
  ['A', 'B'].map((sec, si) => ({
    id: `cs${ci}${si}`,
    className: c,
    section: sec,
    capacity: ci < 3 ? 25 : 32,
    enrolled: ci < 3 ? 18 + ((ci + si) % 6) : 24 + ((ci * 3 + si) % 8),
    classTeacher: c === 'Class 5' && sec === 'A' ? 'Sadia Anwar' : TEACHER_NAMES[(ci * 2 + si) % TEACHER_NAMES.length],
    room: `R${100 + ci * 2 + si}`,
    active: true,
  })),
);

export type SubjectRow = { code: string; name: string; type: string; kind: string; active: boolean };
export const SUBJECT_ROWS: SubjectRow[] = SUBJECTS.map(s => ({ ...s, active: true }));

// class -> subject codes
export const CLASS_SUBJECTS: Record<string, string[]> = Object.fromEntries(
  CLASSES.map((c, i) => [
    c,
    i < 3 ? ['ENG', 'MTH', 'URD', 'ART'] : i < 8 ? ['ENG', 'MTH', 'URD', 'SCI', 'ISL', 'SST', 'CMP'] : ['ENG', 'MTH', 'URD', 'SCI', 'ISL', 'CMP'],
  ]),
);

export type Term = { id: string; name: string; from: string; to: string };
export const TERMS: Term[] = [
  { id: 'tm1', name: 'First term', from: '1 Apr 2026', to: '30 Jun 2026' },
  { id: 'tm2', name: 'Mid-term', from: '1 Aug 2026', to: '20 Oct 2026' },
  { id: 'tm3', name: 'Final term', from: '21 Oct 2026', to: '15 Mar 2027' },
];

// ---------- Timetable (M-05) ----------

export type BellPeriod = { label: string; time: string; isBreak?: boolean };
export const BELL_SCHEDULES: Record<string, BellPeriod[]> = {
  Normal: [
    { label: 'P1', time: '8:00 – 8:40' },
    { label: 'P2', time: '8:40 – 9:20' },
    { label: 'P3', time: '9:20 – 10:00' },
    { label: 'Break', time: '10:00 – 10:20', isBreak: true },
    { label: 'P4', time: '10:20 – 11:00' },
    { label: 'P5', time: '11:00 – 11:40' },
    { label: 'P6', time: '11:40 – 12:20' },
  ],
  Friday: [
    { label: 'P1', time: '8:00 – 8:35' },
    { label: 'P2', time: '8:35 – 9:10' },
    { label: 'P3', time: '9:10 – 9:45' },
    { label: 'Break', time: '9:45 – 10:00', isBreak: true },
    { label: 'P4', time: '10:00 – 10:35' },
    { label: 'P5', time: '10:35 – 11:10' },
    { label: 'Jumma', time: '11:30', isBreak: true },
  ],
  Summer: [
    { label: 'P1', time: '7:30 – 8:05' },
    { label: 'P2', time: '8:05 – 8:40' },
    { label: 'P3', time: '8:40 – 9:15' },
    { label: 'Break', time: '9:15 – 9:30', isBreak: true },
    { label: 'P4', time: '9:30 – 10:05' },
    { label: 'P5', time: '10:05 – 10:40' },
    { label: 'P6', time: '10:40 – 11:15' },
  ],
};

export const TT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const TT_PERIODS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
export const TT_CLASSES = ['Class 5-A', 'Class 5-B', 'Class 6-A', 'Class 7-B', 'Class 3-B'];

export type Slot = { subject: string; teacher: string; room: string };
// key: `${class}|${day}|${period}`
export type TimetableMap = Record<string, Slot>;

const SUBJ_TEACHER: Record<string, string> = {
  English: 'Sadia Anwar',
  Mathematics: 'Imran Haider',
  Urdu: 'Asma Riaz',
  Science: 'Faisal Nadeem',
  Islamiat: 'Bilal Haq',
  'Social Studies': 'Nida Khan',
  Computer: 'Usman Ali',
};
export const TT_TEACHERS = Object.values(SUBJ_TEACHER).concat(['Hina Tariq', 'Kiran Shah']);
export const TT_SUBJECTS = Object.keys(SUBJ_TEACHER);

export const TIMETABLE_SEED: TimetableMap = (() => {
  const m: TimetableMap = {};
  TT_CLASSES.forEach((c, ci) => {
    TT_DAYS.forEach((d, di) => {
      TT_PERIODS.forEach((p, pi) => {
        // Rotate subjects so the same teacher is never in two classes at once.
        const subject = TT_SUBJECTS[(pi + di + ci) % TT_SUBJECTS.length];
        m[`${c}|${d}|${p}`] = { subject, teacher: SUBJ_TEACHER[subject], room: `R${105 + ci}` };
      });
    });
  });
  return m;
})();

export const WORKLOAD_LIMIT = { perDay: 7, perWeek: 36 };

// Periods per week per subject (period allocation).
export const ALLOCATION: Record<string, number> = {
  English: 6, Mathematics: 6, Urdu: 5, Science: 5, Islamiat: 3, 'Social Studies': 3, Computer: 2,
};

// ---------- Substitutions ----------

export type AbsentTeacher = { id: string; name: string; reason: string; periods: Array<{ period: string; cls: string; subject: string }> };

export const ABSENT_TEACHERS: AbsentTeacher[] = [
  { id: 'ab1', name: 'Faisal Nadeem', reason: 'Approved casual leave', periods: [{ period: 'P5', cls: 'Class 7-B', subject: 'Science' }, { period: 'P2', cls: 'Class 6-A', subject: 'Science' }, { period: 'P6', cls: 'Class 5-A', subject: 'Science' }] },
  { id: 'ab2', name: 'Nida Khan', reason: 'Sick leave', periods: [{ period: 'P3', cls: 'Class 5-B', subject: 'Social Studies' }, { period: 'P4', cls: 'Class 3-B', subject: 'Social Studies' }] },
];

export const FREE_TEACHERS: Record<string, string[]> = {
  P1: ['Hina Tariq', 'Kiran Shah'],
  P2: ['Hina Tariq', 'Usman Ali'],
  P3: ['Kiran Shah', 'Bilal Haq'],
  P4: ['Hina Tariq', 'Asma Riaz'],
  P5: ['Sadia Anwar', 'Hina Tariq'],
  P6: ['Kiran Shah', 'Imran Haider'],
};

export type SubRecord = { id: string; date: string; absent: string; period: string; cls: string; substitute: string };
export const SUB_HISTORY: SubRecord[] = [
  { id: 'sh1', date: '20 Oct', absent: 'Asma Riaz', period: 'P2', cls: 'Class 6-A', substitute: 'Hina Tariq' },
  { id: 'sh2', date: '20 Oct', absent: 'Asma Riaz', period: 'P4', cls: 'Class 5-A', substitute: 'Kiran Shah' },
  { id: 'sh3', date: '16 Oct', absent: 'Usman Ali', period: 'P5', cls: 'Class 7-B', substitute: 'Bilal Haq' },
];

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

export const CAL_ENTRIES: CalEntry[] = [
  { id: 'ce1', title: 'PTM', kind: 'PTM', from: '2026-10-31', to: '2026-10-31', scope: 'All campuses', published: true },
  { id: 'ce2', title: 'Final term exams', kind: 'Exam window', from: '2026-12-01', to: '2026-12-12', scope: 'All campuses', published: true },
  { id: 'ce3', title: 'Winter vacation', kind: 'Vacation', from: '2026-12-21', to: '2027-01-01', scope: 'All campuses', published: true },
  { id: 'ce4', title: 'Quaid Day', kind: 'Holiday', from: '2026-12-25', to: '2026-12-25', scope: 'All campuses', published: true },
  { id: 'ce5', title: 'Annual sports day', kind: 'Event', from: '2027-01-14', to: '2027-01-14', scope: 'Main Campus', published: true },
  { id: 'ce6', title: 'Kashmir Day', kind: 'Holiday', from: '2027-02-05', to: '2027-02-05', scope: 'All campuses', published: true },
  { id: 'ce7', title: 'Iqbal Day', kind: 'Holiday', from: '2026-11-09', to: '2026-11-09', scope: 'All campuses', published: true },
  { id: 'ce8', title: 'Science fair', kind: 'Event', from: '2026-11-20', to: '2026-11-20', scope: 'Class 6–8', published: false },
  { id: 'ce9', title: 'Chehlum holiday', kind: 'Holiday', from: '2026-10-08', to: '2026-10-08', scope: 'All campuses', published: true },
];

// ---------- Curriculum (M-13) ----------

export type Chapter = { id: string; cls: string; subject: string; term: string; title: string; done: boolean; teacher: string };

export const CHAPTERS: Chapter[] = [
  ...['My School', 'Seasons', 'The Lion and Mouse', 'Our Helpers', 'Honest Woodcutter', 'Quaid-e-Azam', 'Clean Water', 'Hockey', 'The Moon'].map((t, i) => ({
    id: `chE${i}`, cls: 'Class 5', subject: 'English', term: i < 3 ? 'First term' : i < 6 ? 'Mid-term' : 'Final term', title: `${i + 1}. ${t}`, done: i < 5, teacher: 'Sadia Anwar',
  })),
  ...['Numbers', 'HCF and LCM', 'Fractions', 'Decimals', 'Percentages', 'Geometry', 'Data handling'].map((t, i) => ({
    id: `chM${i}`, cls: 'Class 5', subject: 'Mathematics', term: i < 2 ? 'First term' : i < 5 ? 'Mid-term' : 'Final term', title: `${i + 1}. ${t}`, done: i < 4, teacher: 'Imran Haider',
  })),
  ...['Living things', 'Plants', 'Matter', 'Forces', 'Light', 'Our Earth'].map((t, i) => ({
    id: `chS${i}`, cls: 'Class 6', subject: 'Science', term: i < 2 ? 'First term' : i < 4 ? 'Mid-term' : 'Final term', title: `${i + 1}. ${t}`, done: i < 2, teacher: 'Faisal Nadeem',
  })),
];

export type LessonPlan = { id: string; teacher: string; cls: string; week: string; objectives: string; activities: string; status: 'Pending' | 'Approved' | 'Returned'; comment?: string };

export const LESSON_PLANS: LessonPlan[] = [
  { id: 'lp1', teacher: 'Sadia Anwar', cls: '5-A English', week: 'Week of 26 Oct', objectives: 'Lesson 8, 10 new words, past tense practice', activities: 'Group reading, word wall, worksheet 8A', status: 'Pending' },
  { id: 'lp2', teacher: 'Imran Haider', cls: '5-A Mathematics', week: 'Week of 26 Oct', objectives: 'Decimals: addition and subtraction', activities: 'Number line game, exercise 4.3', status: 'Pending' },
  { id: 'lp3', teacher: 'Faisal Nadeem', cls: '6-A Science', week: 'Week of 26 Oct', objectives: 'Forces: push and pull', activities: 'Lab demo with spring balance', status: 'Pending' },
  { id: 'lp4', teacher: 'Sadia Anwar', cls: '5-A English', week: 'Week of 19 Oct', objectives: 'Lesson 7 comprehension', activities: 'Role play', status: 'Approved' },
  { id: 'lp5', teacher: 'Sadia Anwar', cls: '5-A English', week: 'Week of 12 Oct', objectives: 'Lesson 6', activities: 'Reading', status: 'Returned', comment: 'Add a writing task' },
];

// ---------- Promotion, transfer, alumni (S-04) ----------

export type Alumnus = { id: string; name: string; batch: string; status: 'Passed out' | 'Left'; contact: string; now: string };

export const ALUMNI: Alumnus[] = [
  { id: 'al1', name: 'Hassan Qureshi', batch: 'Matric 2025', status: 'Passed out', contact: '0321 4455667', now: 'FSc, Govt College Lahore' },
  { id: 'al2', name: 'Maryam Butt', batch: 'Matric 2025', status: 'Passed out', contact: '0300 9988112', now: 'A-Levels, LGS' },
  { id: 'al3', name: 'Zain Sheikh', batch: 'Class 7 · 2025', status: 'Left', contact: '0333 1234987', now: 'Moved to Karachi' },
  { id: 'al4', name: 'Iqra Malik', batch: 'Matric 2024', status: 'Passed out', contact: '0345 2221199', now: 'MBBS, KEMU' },
];

export const PROMOTION_CANDIDATES = (cls: string) =>
  ADMIN_STUDENTS.filter(s => s.className === cls && s.status === 'Active').map(s => ({
    id: s.id,
    name: s.name,
    gr: s.gr,
    section: s.section,
    result: s.result,
    pass: s.result >= 40 && s.id !== 'st12',
    due: s.due,
  }));

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

export const TICKETS: Ticket[] = [
  { id: 'C-0042', title: 'Van reached 25 minutes late twice', category: 'Transport', from: 'Imran Khan', child: 'Ayesha Khan · 5-A', status: 'In progress', assigned: 'Waqas Ahmed (Transport)', opened: '20 Oct', thread: [{ who: 'Parent · 20 Oct', text: 'The van reached 25 minutes late twice this week.' }, { who: 'School · 21 Oct', text: 'Sorry for this. The route was changed for road work; we are fixing the timing from Monday.', mine: true }, { who: 'Parent · 21 Oct', text: 'Thank you, please inform us by SMS.' }] },
  { id: 'C-0043', title: 'Water cooler not working on 2nd floor', category: 'Facilities', from: 'Sana Imran', child: 'Mahnoor Khan · 6-A', status: 'Open', opened: '21 Oct', thread: [{ who: 'Parent · 21 Oct', text: 'Children say the water cooler on the 2nd floor has not worked for 3 days.' }] },
  { id: 'C-0044', title: 'Fee voucher shows wrong transport fee', category: 'Fee', from: 'Asif Raza', child: 'Hafsa Raza · 4-B', status: 'Open', opened: '22 Oct', thread: [{ who: 'Parent · 22 Oct', text: 'November voucher has Rs. 3,500 transport but we stopped the van in October.' }] },
  { id: 'C-0039', title: 'Homework load too high in Class 6', category: 'Academics', from: 'Khalid Mehmood', child: 'Rayan Khalid · 6-B', status: 'Resolved', assigned: 'Dr. Farah Siddiqui', opened: '12 Oct', resolution: 'Coordinator capped homework at 2 subjects per day.', thread: [{ who: 'Parent · 12 Oct', text: 'Too much homework every day.' }, { who: 'School · 14 Oct', text: 'We have limited homework to 2 subjects per day.', mine: true }] },
  { id: 'C-0035', title: 'Rude behaviour of canteen staff', category: 'Staff', from: 'Nadia Hussain', child: 'Eman Hussain · 3-A', status: 'Closed', assigned: 'Javed Iqbal (Store)', opened: '2 Oct', resolution: 'Staff warned in writing; parent informed.', thread: [{ who: 'Parent · 2 Oct', text: 'Canteen staff shouted at my daughter.' }] },
];

export type Survey = { id: string; title: string; audience: string; responses: number; questions: Array<{ q: string; avg: number }>; status: 'Open' | 'Closed' };

export const SURVEYS: Survey[] = [
  { id: 'sv1', title: 'Term 1 parent feedback', audience: 'All parents', responses: 842, status: 'Open', questions: [{ q: 'Teaching', avg: 4.3 }, { q: 'Transport safety', avg: 3.6 }, { q: 'Cleanliness', avg: 4.0 }, { q: 'Communication', avg: 4.4 }] },
  { id: 'sv2', title: 'Canteen food quality', audience: 'Parents of Class 1–5', responses: 310, status: 'Closed', questions: [{ q: 'Taste', avg: 3.2 }, { q: 'Hygiene', avg: 3.8 }, { q: 'Price', avg: 2.9 }] },
];

// ---------- Health & discipline (S-12) ----------

export type HealthProfile = { id: string; student: string; cls: string; blood: string; allergies: string; notes: string; emergency: string };

export const HEALTH: HealthProfile[] = [
  { id: 'hp1', student: 'Fatima Noor', cls: '5-A', blood: 'O+', allergies: 'Peanuts', notes: 'Carries EpiPen in bag', emergency: '0321 4455667' },
  { id: 'hp2', student: 'Hamza Ali', cls: '5-A', blood: 'A+', allergies: 'None', notes: 'Asthma, uses inhaler', emergency: '0300 1122334' },
  { id: 'hp3', student: 'Ayesha Khan', cls: '5-A', blood: 'B+', allergies: 'None', notes: '', emergency: '0300 4410000' },
  { id: 'hp4', student: 'Bilal Ahmed', cls: '5-A', blood: 'AB+', allergies: 'Dust', notes: '', emergency: '0333 5566778' },
  { id: 'hp5', student: 'Zainab Raza', cls: '6-A', blood: 'O-', allergies: 'Penicillin', notes: 'Diabetic type 1', emergency: '0345 9988776' },
];

export type SickVisit = { id: string; student: string; when: string; complaint: string; action: string; notified: boolean };

export const SICK_VISITS: SickVisit[] = [
  { id: 'sb1', student: 'Ayesha Khan · 5-A', when: '15 Oct 10:40', complaint: 'Headache', action: 'Rested 30 min, given water. Back to class.', notified: true },
  { id: 'sb2', student: 'Hamza Ali · 5-A', when: '13 Oct 11:15', complaint: 'Breathing difficulty after PT', action: 'Inhaler used, parent called, picked up 12:00.', notified: true },
  { id: 'sb3', student: 'Saad Malik · 7-B', when: '9 Oct 9:20', complaint: 'Knee scrape', action: 'Cleaned and bandaged.', notified: true },
];

export type Incident = { id: string; student: string; kind: 'Incident' | 'Warning' | 'Positive'; points: number; text: string; by: string; when: string; notified: boolean };

export const INCIDENTS: Incident[] = [
  { id: 'in1', student: 'Bilal Ahmed · 5-A', kind: 'Incident', points: -2, text: 'Disturbed class repeatedly', by: 'Sadia Anwar', when: '18 Oct', notified: true },
  { id: 'in2', student: 'Fatima Noor · 5-A', kind: 'Positive', points: 2, text: 'Helped a classmate', by: 'Sadia Anwar', when: '20 Oct', notified: true },
  { id: 'in3', student: 'Hamza Ali · 5-A', kind: 'Warning', points: -1, text: 'Homework repeatedly late', by: 'Sadia Anwar', when: '12 Oct', notified: true },
  { id: 'in4', student: 'Usman Javed · 8-A', kind: 'Incident', points: -3, text: 'Fight during break', by: 'Discipline In-charge', when: '7 Oct', notified: true },
];
