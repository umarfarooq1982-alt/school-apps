// Dummy data for the teacher app. Mirrors Teacher_App_Screens.pdf.
import type { TimetableCell } from '../components/ui';

export const TEACHER = {
  name: 'Sadia Anwar',
  first: 'Sadia',
  id: 'EMP-0001',
  classTeacherOf: '5-A',
  email: 'sadia.anwar@bfs.edu.pk',
  mobile: '0300 555 1212',
};

export const TEACHER_TODAY = 'Thursday 22 Oct';

export const MY_CLASSES = ['5-A English', '6-A English', '3-B English'];

export type TStudent = {
  id: string;
  name: string;
  roll: number;
  gr: string;
  att: number;
  midterm: number;
  grade: string;
  behavior: number;
  health?: string;
  bloodGroup: string;
  emergency: string;
};

const NAMES = [
  'Ayesha Khan',
  'Bilal Ahmed',
  'Fatima Noor',
  'Hamza Ali',
  'Hira Saleem',
  'Imran Javed',
  'Kashif Raza',
  'Laiba Tariq',
  'Maryam Aslam',
  'Muhammad Usman',
  'Noor Fatima',
  'Omer Farooq',
  'Rabia Shah',
  'Saad Hussain',
  'Sana Iqbal',
  'Talha Mahmood',
  'Umair Siddiqui',
  'Zainab Raza',
  'Ali Hassan',
  'Areeba Malik',
  'Daniyal Qureshi',
  'Eman Zahid',
  'Fahad Mirza',
  'Hania Butt',
  'Ibrahim Sheikh',
  'Javeria Akram',
  'Khadija Nawaz',
  'Mustafa Kamal',
  'Rida Anjum',
  'Waleed Khalid',
];

const gradeOf = (m: number) =>
  m >= 90 ? 'A+' : m >= 80 ? 'A' : m >= 70 ? 'B' : m >= 60 ? 'C' : 'D';

const SPECIAL: Record<string, Partial<TStudent>> = {
  'Ayesha Khan': { att: 94, midterm: 86, behavior: 3 },
  'Bilal Ahmed': { att: 81, midterm: 54, behavior: -2 },
  'Fatima Noor': {
    att: 97,
    midterm: 91,
    behavior: 4,
    health: 'Peanut allergy',
    bloodGroup: 'O+',
    emergency: '0321 4455667',
  },
  'Hamza Ali': { att: 89, midterm: 72, behavior: 0, health: 'Asthma' },
  'Hira Saleem': { att: 95, midterm: 83, behavior: 5 },
  'Imran Javed': { att: 90, midterm: 68, behavior: 0 },
};

export const STUDENTS_5A: TStudent[] = NAMES.map((name, i) => {
  const roll = i + 7;
  const base: TStudent = {
    id: `s${roll}`,
    name,
    roll,
    gr: `GR-MC-${String(12 + i * 3).padStart(4, '0')}`,
    att: 85 + ((i * 7) % 14),
    midterm: 60 + ((i * 11) % 38),
    grade: '',
    behavior: (i % 5) - 1,
    bloodGroup: ['A+', 'B+', 'O+', 'AB+'][i % 4],
    emergency: `0300 ${String(1000000 + i * 4321).slice(0, 7)}`,
  };
  const s = { ...base, ...SPECIAL[name] };
  s.grade = gradeOf(s.midterm);
  return s;
});

// Students of the other classes (shorter lists).
export const CLASS_STUDENTS: Record<string, TStudent[]> = {
  '5-A': STUDENTS_5A,
  '6-A English': STUDENTS_5A.slice(10, 18).map(s => ({ ...s, id: `6a-${s.id}` })),
  '3-B English': STUDENTS_5A.slice(18, 26).map(s => ({ ...s, id: `3b-${s.id}` })),
};

export const findStudent = (id: string) =>
  Object.values(CLASS_STUDENTS)
    .flat()
    .find(s => s.id === id) ?? STUDENTS_5A[2];

// ---------- Today ----------

export type Period = {
  id: string;
  title: string;
  sub: string;
  status: 'posted' | 'post' | 'later' | 'cover';
  classKey: string;
};

export const TODAY_PERIODS: Period[] = [
  { id: 'p1', title: 'Period 1 · 8:00', sub: 'Class 5-A English', status: 'posted', classKey: '5-A English' },
  { id: 'p2', title: 'Period 2 · 8:40', sub: 'Class 6-A English', status: 'post', classKey: '6-A English' },
  { id: 'p4', title: 'Period 4 · 10:20', sub: 'Class 3-B English', status: 'later', classKey: '3-B English' },
  { id: 'p5', title: 'Period 5 · 11:00', sub: 'Class 7-B Science · substitution', status: 'cover', classKey: '7-B Science' },
];

// ---------- Timetable ----------

export const T_TIMES = ['8:00', '8:40', '9:20', '10:20', '11:00', '11:40'];

const c = (s: string): TimetableCell =>
  s === 'Free'
    ? { top: 'Free', free: true }
    : s === 'sub'
    ? { top: '7-B', bottom: 'Sci · sub' }
    : { top: s, bottom: 'Eng' };

export const TEACHER_TIMETABLE: TimetableCell[][] = [
  ['5-A', '5-A', 'Free', '5-A', '5-A'].map(c),
  ['6-A', 'Free', '6-A', '6-A', 'Free'].map(c),
  ['Free', '3-B', '3-B', 'Free', '3-B'].map(c),
  ['3-B', 'Free', '5-A', '3-B', '6-A'].map(c),
  ['Free', '6-A', 'Free', 'sub', 'Free'].map(c),
  ['5-A', 'Free', 'Free', 'Free', '5-A'].map(c),
];

export const SUBSTITUTIONS = [
  { title: 'Thu 22 Oct · Period 5', sub: 'Class 7-B Science · for Faisal Nadeem' },
];

// ---------- Attendance ----------

export const ATT_DATES = [
  'Thursday 22 Oct',
  'Wednesday 21 Oct',
  'Tuesday 20 Oct',
  'Monday 19 Oct',
  'Saturday 17 Oct',
];

export type QueueItem = {
  id: string;
  title: string;
  sub: string;
  status: 'Waiting' | 'Uploaded';
};

export const UPLOAD_QUEUE: QueueItem[] = [
  { id: 'q2', title: 'Class 5-A · Tue 20 Oct', sub: 'Uploaded 9:05 AM', status: 'Uploaded' },
];

export const LATE_ARRIVALS = [
  { id: 's10', name: 'Hamza Ali', time: '8:21' },
  { id: 's14', name: 'Laiba Tariq', time: '8:14' },
];

export type EarlyLeave = { id: string; name: string; time: string; by: string };

export const EARLY_LEAVES: EarlyLeave[] = [
  { id: 'e1', name: 'Ayesha Khan', time: '11:20', by: 'Ali Raza (uncle)' },
];

// ---------- Diary ----------

export const CLASS_DIARY = [
  { subject: 'English', text: 'Read lesson 7, write 10 new words', teacher: 'Sadia Anwar', time: '8:40', posted: true },
  { subject: 'Mathematics', text: 'Exercise 4.2 Q1–6', teacher: 'Imran Haider', time: '9:55', posted: true },
  { subject: 'Urdu', text: 'Lesson 5 summary', teacher: 'Asma Riaz', time: '10:30', posted: true },
  { subject: 'Islamiat', text: 'Learn Surah Al-Asr', teacher: 'Bilal Haq', time: '11:05', posted: true },
  { subject: 'Computer', text: 'Typing practice', teacher: 'Usman Ali', time: '12:10', posted: true },
  { subject: 'Science', text: 'Not posted yet', teacher: 'Faisal Nadeem', time: '', posted: false },
  { subject: 'Social Studies', text: 'Not posted yet', teacher: 'Nida Khan', time: '', posted: false },
];

// ---------- Homework ----------

export type THomework = {
  id: string;
  title: string;
  classKey: string;
  due: string;
  submitted: number;
  total: number;
  toCheck: number;
  status: 'Open' | 'Checked' | 'To check';
  maxMarks: number;
  instructions: string;
};

export const T_HOMEWORK: THomework[] = [
  { id: 'th1', title: 'Fractions worksheet', classKey: '5-A Mathematics', due: '23 Oct', submitted: 24, total: 30, toCheck: 18, status: 'To check', maxMarks: 10, instructions: 'Solve Q1–10. Show working.' },
  { id: 'th2', title: 'My hero essay', classKey: '5-A English', due: '26 Oct', submitted: 11, total: 30, toCheck: 0, status: 'Open', maxMarks: 20, instructions: 'Write 150 words about your hero.' },
  { id: 'th3', title: 'Past tense sheet', classKey: '6-A English', due: '20 Oct', submitted: 29, total: 31, toCheck: 0, status: 'Checked', maxMarks: 10, instructions: 'Complete the sheet.' },
  { id: 'th4', title: 'Spelling list 6', classKey: '3-B English', due: '16 Oct', submitted: 27, total: 28, toCheck: 0, status: 'Checked', maxMarks: 10, instructions: 'Learn spelling list 6.' },
];

export const MISSING_HOMEWORK = [
  { id: 'm1', name: 'Bilal Ahmed', what: 'Fractions worksheet · not submitted' },
  { id: 'm2', name: 'Imran Javed', what: 'Fractions worksheet · not submitted' },
  { id: 'm3', name: 'Kashif Raza', what: 'Fractions worksheet · not submitted' },
  { id: 'm4', name: 'Rabia Shah', what: 'My hero essay · not submitted' },
  { id: 'm5', name: 'Saad Hussain', what: 'Fractions worksheet · not submitted' },
  { id: 'm6', name: 'Zainab Raza', what: 'Past tense sheet · not submitted' },
];

export type Submission = {
  id: string;
  name: string;
  when: string;
  badge: 'On time' | 'Late' | 'New';
  answer: string;
  pages: number;
  marks?: string;
  comment?: string;
};

export const SUBMISSIONS: Submission[] = [
  { id: 'sub1', name: 'Ayesha Khan', when: 'Submitted 21 Oct, 7:40 PM', badge: 'On time', answer: 'Done all 10. Q7 was hard, I tried two ways.', pages: 2 },
  { id: 'sub2', name: 'Bilal Ahmed', when: 'Submitted 23 Oct · late', badge: 'Late', answer: 'I did Q1 to Q8.', pages: 1 },
  { id: 'sub3', name: 'Fatima Noor', when: 'Submitted 22 Oct', badge: 'New', answer: 'All questions done.', pages: 2 },
  { id: 'sub4', name: 'Hira Saleem', when: 'Submitted 22 Oct', badge: 'New', answer: 'Done, please check Q9.', pages: 2 },
  { id: 'sub5', name: 'Hamza Ali', when: 'Submitted 22 Oct', badge: 'New', answer: 'Finished.', pages: 1 },
];

// ---------- Marks ----------

export const MARKS_INITIAL: Record<string, string> = {
  s7: '92',
  s8: 'Abs',
  s9: '78',
  s10: '',
  s11: '65',
  s12: '',
  s13: '71',
  s14: '',
  s15: '88',
  s16: '74',
  s17: '81',
  s18: '69',
};

// ---------- Behavior, sick bay, leaves ----------

export type BehaviorRecord = {
  id: string;
  name: string;
  date: string;
  what: string;
  points: number;
  kind: 'Positive' | 'Incident' | 'Warning';
};

export const BEHAVIOR: BehaviorRecord[] = [
  { id: 'b1', name: 'Fatima Noor', date: '20 Oct', what: 'Helped a classmate', points: 2, kind: 'Positive' },
  { id: 'b2', name: 'Bilal Ahmed', date: '18 Oct', what: 'Disturbed class', points: -2, kind: 'Incident' },
  { id: 'b3', name: 'Hamza Ali', date: '12 Oct', what: 'Homework repeatedly late', points: -1, kind: 'Warning' },
  { id: 'b4', name: 'Fatima Noor', date: '7 Oct', what: 'Late homework', points: -1, kind: 'Warning' },
];

export const SICK_BAY = [
  { id: 'k1', name: 'Ayesha Khan', when: '15 Oct, 10:40', what: 'Headache. Rested 30 min, given water. Back to class.' },
  { id: 'k2', name: 'Hamza Ali', when: '9 Oct, 9:15', what: 'Asthma, used inhaler. Parent informed.' },
  { id: 'k3', name: 'Laiba Tariq', when: '2 Oct, 12:05', what: 'Minor cut on knee, cleaned and bandaged.' },
];

export type StudentLeave = {
  id: string;
  name: string;
  dates: string;
  reason: string;
  file?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

export const STUDENT_LEAVES: StudentLeave[] = [
  { id: 'l1', name: 'Ahmed Khan', dates: 'Thu 23 – Fri 24 Oct · 2 days', reason: 'Fever since last night. Doctor advised rest for two days.', file: 'medical-slip.jpg', status: 'Pending' },
  { id: 'l2', name: 'Laiba Tariq', dates: '2–3 Oct', reason: 'family wedding', status: 'Approved' },
  { id: 'l3', name: 'Kashif Raza', dates: '14 Sep', reason: 'fever', status: 'Approved' },
];

// ---------- Curriculum ----------

export type LessonPlan = {
  id: string;
  week: string;
  note: string;
  status: 'Approved' | 'Returned' | 'Pending';
};

export const LESSON_PLANS: LessonPlan[] = [
  { id: 'lp1', week: 'Week of 19 Oct', note: 'Approved by Principal', status: 'Approved' },
  { id: 'lp2', week: 'Week of 12 Oct', note: '"Add a writing task"', status: 'Returned' },
];

export type Chapter = { id: string; title: string; term: string; done?: string };

export const CHAPTERS: Chapter[] = [
  { id: 'c1', title: '1. My School', term: 'First term', done: '20 Apr' },
  { id: 'c2', title: '2. Seasons', term: 'First term', done: '15 May' },
  { id: 'c3', title: '3. The Lion and Mouse', term: 'First term', done: '10 Jun' },
  { id: 'c4', title: '4. Kind Words', term: 'First term', done: '5 Aug' },
  { id: 'c5', title: '5. Our Country', term: 'Mid-term', done: '2 Sep' },
  { id: 'c6', title: '6. Our Helpers', term: 'Mid-term', done: '1 Oct' },
  { id: 'c7', title: '7. Honest Woodcutter', term: 'Mid-term', done: '20 Oct' },
  { id: 'c8', title: '8. Quaid-e-Azam', term: 'Mid-term' },
  { id: 'c9', title: '9. Clean Water', term: 'Final term' },
  { id: 'c10', title: '10. The Village Fair', term: 'Final term' },
  { id: 'c11', title: '11. Letter Writing', term: 'Final term' },
  { id: 'c12', title: '12. My Hobby', term: 'Final term' },
];

// ---------- Own attendance, leave, salary ----------

export const MY_ATTENDANCE = {
  month: 'October 2026',
  present: 18,
  late: 2,
  absent: 0,
  shortLeave: 1,
  week: [
    { day: 'Thu 22 Oct', sub: 'In 7:52 · Out —', status: 'Present' },
    { day: 'Wed 21 Oct', sub: 'In 8:06 · Out 14:02', status: 'Late' },
    { day: 'Tue 20 Oct', sub: 'In 7:49 · Out 13:10', status: 'Short leave' },
    { day: 'Mon 19 Oct', sub: 'In 7:45 · Out 14:00', status: 'Present' },
  ],
};

export type LeaveType = 'Casual' | 'Sick' | 'Annual' | 'Unpaid';

export const LEAVE_BALANCE: Record<LeaveType, { left: number; total: number; note?: string }> = {
  Casual: { left: 7, total: 10 },
  Sick: { left: 8, total: 8 },
  Annual: { left: 16, total: 24, note: 'incl. 10 carried' },
  Unpaid: { left: 99, total: 99 },
};

export const SALARY = {
  month: 'September 2026',
  net: 58630,
  lines: [
    { title: 'Basic salary', amount: 54000 },
    { title: 'House rent allowance', amount: 5000 },
    { title: 'Late arrivals (3 = 1 day)', amount: -1970 },
    { title: 'Loan installment', sub: 'Rs. 15,000 left', amount: -5000 },
    { title: 'EOBI', amount: -370 },
  ],
  earlier: [
    { month: 'August 2026', amount: 58630 },
    { month: 'July 2026', amount: 63630 },
    { month: 'June 2026', amount: 63630 },
  ],
};

// ---------- Notices & reports ----------

export const T_NOTICES = [
  { id: 'n1', title: 'Substitution', text: 'Thu period 5: Class 7-B Science', when: '7:30', icon: 'sub' as const },
  { id: 'n2', title: 'Invigilation duty', text: 'Final term, 1 Dec, Hall A', when: 'Yesterday', icon: 'exam' as const },
  { id: 'n3', title: 'Lesson plan approved', text: 'Week of 19 Oct', when: 'Mon', icon: 'check' as const },
  { id: 'n4', title: 'Salary slip ready', text: 'September: Rs. 58,630', when: '1 Oct', icon: 'salary' as const },
  { id: 'n5', title: 'Staff meeting', text: 'Saturday 10:30 AM in the staff room', when: '28 Sep', icon: 'meeting' as const },
];

export const REPORTS = [
  { id: 'r1', title: 'Student attendance', sub: 'Daily, monthly, by student', icon: 'check' as const },
  { id: 'r2', title: 'Attendance shortage', sub: 'Below 75%', icon: 'alert' as const },
  { id: 'r3', title: 'Homework submission', sub: 'Submitted, late, missing', icon: 'clip' as const },
  { id: 'r4', title: 'Marks entry progress', sub: 'My subjects', icon: 'pencil' as const },
  { id: 'r5', title: 'Result sheet', sub: 'Class 5-A positions', icon: 'cap' as const },
  { id: 'r6', title: 'Syllabus coverage', sub: 'My subjects', icon: 'layers' as const },
];
