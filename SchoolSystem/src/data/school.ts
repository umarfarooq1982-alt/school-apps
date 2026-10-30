// Dummy data shared by the parent and student apps. Mirrors the design PDFs.
import type { DayStatus, TimetableCell } from '../components/ui';

export const SCHOOL = 'Bright Future School';
export const TODAY_LABEL = 'Thursday, 22 October';

export type Child = {
  id: string;
  name: string;
  className: string;
  gr: string;
  campus: string;
  roll: number;
  due: number;
  attendance: number;
  bloodGroup: string;
  dob: string;
};

export const PARENT = {
  name: 'Imran Khan',
  first: 'Imran',
  mobile: '0300 441 0000',
  cnic: '35202-1234567-1',
};

export const CHILDREN: Child[] = [
  {
    id: 'ayesha',
    name: 'Ayesha Khan',
    className: 'Class 5-A',
    gr: 'GR-MC-0012',
    campus: 'Main Campus',
    roll: 7,
    due: 9375,
    attendance: 94,
    bloodGroup: 'B+',
    dob: '14 Mar 2016',
  },
  {
    id: 'ahmed',
    name: 'Ahmed Khan',
    className: 'Class 2-B',
    gr: 'GR-MC-0145',
    campus: 'Main Campus',
    roll: 12,
    due: 4200,
    attendance: 91,
    bloodGroup: 'B+',
    dob: '2 Aug 2019',
  },
  {
    id: 'mahnoor',
    name: 'Mahnoor Khan',
    className: 'Class 6-A',
    gr: 'GR-GC-0088',
    campus: 'Girls Campus',
    roll: 4,
    due: 0,
    attendance: 97,
    bloodGroup: 'O+',
    dob: '9 Jan 2015',
  },
];

// The student app signs in as Ayesha.
export const STUDENT = CHILDREN[0];

// ---------- Fee ----------

export type Voucher = {
  id: string;
  month: string;
  amount: number;
  status: 'Unpaid' | 'Paid';
  note: string;
  dueDate: string;
};

export const VOUCHERS: Voucher[] = [
  { id: 'V-26-000418', month: 'November 2026', amount: 9375, status: 'Unpaid', note: 'Due 10 Nov', dueDate: '10 Nov' },
  { id: 'V-26-000301', month: 'October 2026', amount: 8500, status: 'Paid', note: 'Paid 6 Oct', dueDate: '10 Oct' },
  { id: 'V-26-000120', month: 'Annual charges', amount: 8000, status: 'Paid', note: 'Paid 12 Apr', dueDate: '15 Apr' },
  { id: 'V-26-000212', month: 'September 2026', amount: 8650, status: 'Paid', note: 'Paid late', dueDate: '10 Sep' },
];

export const VOUCHER_LINES = [
  { title: 'Tuition fee', sub: 'November', amount: 7500 },
  { title: 'Transport fee', sub: 'Route 3 · Model Town', amount: 3500 },
  { title: 'Sibling discount 25%', sub: 'Tuition only', amount: -1875 },
  { title: 'Store: uniform shirt', sub: 'Sale S-00118', amount: 250 },
];

export const RECEIPTS = [
  { id: 'R-26-000611', date: '6 Oct', mode: 'JazzCash online', amount: 8500 },
  { id: 'R-26-000488', date: '9 Sep', mode: 'Cash at counter', amount: 8650 },
  { id: 'R-26-000352', date: '5 Aug', mode: 'Bank deposit', amount: 8500 },
  { id: 'R-26-000120', date: '12 Apr', mode: 'Easypaisa online', amount: 8000 },
  { id: 'R-26-000041', date: '2 Apr', mode: 'Admission fee, cash', amount: 15000 },
];

// ---------- Attendance ----------

// October 2026, Mon 5 .. ; weekends (Sun) are holidays.
export const OCT_ATTENDANCE: Record<number, DayStatus> = (() => {
  const m: Record<number, DayStatus> = {};
  for (let d = 1; d <= 30; d++) {
    const dow = new Date(2026, 9, d).getDay();
    if (dow === 0) {
      m[d] = 'holiday';
    } else if (d <= 22 || dow !== 0) {
      m[d] = 'present';
    }
  }
  m[7] = 'late';
  m[13] = 'absent';
  m[16] = 'leave';
  return m;
})();

export const ATTENDANCE_NOTES = [
  { title: '14 Oct · Absent', sub: 'SMS sent to you at 10:30 AM', kind: 'absent' as const },
  { title: '8 Oct · Late', sub: 'Arrived 8:21 AM', kind: 'late' as const },
];

// ---------- Diary & homework ----------

export const DIARY_DAYS = ['Mon 19', 'Tue 20', 'Wed 21', 'Today'];

export type DiaryEntry = {
  subject: string;
  text: string;
  teacher?: string;
  time?: string;
  attachment?: string;
  rtl?: boolean;
};

export const DIARY: DiaryEntry[] = [
  {
    subject: 'English',
    text: 'Read lesson 7 "The Honest Woodcutter". Learn and write 10 new words in the copy.',
    teacher: 'Sadia Anwar',
    time: '8:40 AM',
  },
  {
    subject: 'Mathematics',
    text: 'Exercise 4.2, Q1–6 in notebook. Test on fractions on Monday.',
    teacher: 'Imran Haider',
    time: '9:55 AM',
    attachment: 'board-photo.jpg',
  },
  {
    subject: 'Urdu',
    text: 'سبق نمبر ۵ کا خلاصہ لکھیں اور مشکل الفاظ یاد کریں',
    teacher: 'Asma Riaz',
    time: '10:30 AM',
    rtl: true,
  },
];

export const DIARY_OLDER: DiaryEntry[] = [
  { subject: 'Science', text: 'Draw and label a plant cell. Bring colour pencils.', teacher: 'Faisal Nadeem', time: '11:05 AM' },
  { subject: 'Islamiat', text: 'Learn Surah Al-Asr with translation.', teacher: 'Bilal Haq', time: '11:40 AM' },
];

export type Homework = {
  id: string;
  title: string;
  subject: string;
  due: string;
  status: 'Pending' | 'Submitted' | 'Checked';
  note?: string;
  marks?: string;
  maxMarks: number;
  comment?: string;
  instructions: string;
  file?: string;
};

export const HOMEWORK: Homework[] = [
  {
    id: 'hw1',
    title: 'Fractions worksheet',
    subject: 'Mathematics',
    due: 'due tomorrow',
    status: 'Pending',
    maxMarks: 10,
    instructions: 'Solve Q1–10 on the worksheet. Show working. Submit a clear photo of each page.',
    file: 'worksheet-fractions.pdf',
  },
  {
    id: 'hw2',
    title: 'My hero essay',
    subject: 'English',
    due: 'due Mon 26 Oct',
    status: 'Pending',
    maxMarks: 20,
    instructions: 'Write 150 words about your hero. Use at least 5 new words from lesson 7.',
  },
  {
    id: 'hw3',
    title: 'Plant cell diagram',
    subject: 'Science',
    due: 'submitted 21 Oct (late)',
    status: 'Submitted',
    note: 'submitted late',
    maxMarks: 10,
    instructions: 'Draw a plant cell and label all parts.',
  },
  {
    id: 'hw4',
    title: 'Map of Pakistan',
    subject: 'Social Studies',
    due: 'checked',
    status: 'Checked',
    marks: '8/10',
    maxMarks: 10,
    comment: 'Neat work, label the rivers next time.',
    instructions: 'Draw the map of Pakistan with provinces and capitals.',
  },
  {
    id: 'hw5',
    title: 'Spelling list 6',
    subject: 'English',
    due: 'checked',
    status: 'Checked',
    marks: '10/10',
    maxMarks: 10,
    instructions: 'Learn spelling list 6 for the test.',
  },
];

// ---------- Timetable ----------

export const TT_TIMES = ['8:00', '8:40', '9:20', '10:20', '11:00', '11:40'];

const tt = (s: string): TimetableCell[] => s.split(' ').map(top => ({ top }));

export const CLASS_TIMETABLE: TimetableCell[][] = [
  tt('Eng Math Eng Sci Isl'),
  tt('Math Urdu Math Eng Math'),
  tt('Urdu Sci Comp Math Urdu'),
  tt('Sci Eng Urdu Comp Eng'),
  tt('Isl SST Sci Urdu Art'),
  tt('SST Comp Isl SST Sci'),
];

export const TODAY_PERIODS = [
  { subject: 'English', time: '8:40 – 9:20', teacher: 'Ms. Sadia Anwar', room: 'R105', period: 2, now: true },
  { subject: 'Mathematics', time: '9:40', teacher: 'Mr. Imran Haider', room: 'R105', period: 3, next: true },
  { subject: 'Urdu', time: '10:20', teacher: 'Ms. Asma Riaz', room: 'R105', period: 4 },
  { subject: 'Science', time: '11:00', teacher: 'Mr. Faisal Nadeem', room: 'Lab 1', period: 5 },
];

// ---------- Calendar ----------

export type CalEvent = {
  title: string;
  when: string;
  kind: 'Event' | 'Exams' | 'Holiday' | 'Vacation';
};

export const EVENTS: CalEvent[] = [
  { title: 'PTM', when: 'Sat 31 Oct · 9:00–12:00', kind: 'Event' },
  { title: 'Final term exams', when: '1 – 12 Dec', kind: 'Exams' },
  { title: 'Quaid Day', when: 'Fri 25 Dec', kind: 'Holiday' },
  { title: 'Winter vacation', when: '21 Dec – 1 Jan', kind: 'Vacation' },
  { title: 'Annual sports day', when: 'Thu 14 Jan', kind: 'Event' },
  { title: 'Kashmir Day', when: 'Thu 5 Feb', kind: 'Holiday' },
];

// ---------- Exams & results ----------

export const DATE_SHEET = [
  { day: 'Mon 1 Dec', subject: 'English', time: '8:30 – 11:00', marks: '100 marks', seat: 'Hall A, seat 14' },
  { day: 'Tue 2 Dec', subject: 'Mathematics', time: '8:30 – 11:00', marks: '100 marks', seat: 'Hall A, seat 14' },
  { day: 'Wed 3 Dec', subject: 'Urdu', time: '8:30 – 11:00', marks: '100 marks', seat: 'Room 2, seat 6' },
  { day: 'Thu 4 Dec', subject: 'Science', time: '8:30 – 11:00', marks: '75 + 25 practical', seat: 'Hall A, seat 14' },
];

export const SYLLABUS = [
  { subject: 'English', text: 'Lessons 5–10, grammar: tenses, essay writing' },
  { subject: 'Mathematics', text: 'Ch 3 Fractions, Ch 4 Decimals, Ch 5 Percentages' },
  { subject: 'Urdu', text: 'اسباق ۴ تا ۹، مضمون نویسی، خط' },
  { subject: 'Science', text: 'Ch 4 Plants, Ch 5 Matter, Ch 6 Forces' },
];

export const RESULT = {
  term: 'Mid-term result',
  published: 'Published 18 Oct',
  percentage: 86.4,
  grade: 'Grade A',
  position: '2nd in section',
  classPosition: '5th in class',
  total: 432,
  max: 500,
  remarks: 'Excellent work. Keep it up.',
  subjects: [
    { name: 'English', marks: 92, grade: 'A+' },
    { name: 'Mathematics', marks: 88, grade: 'A' },
    { name: 'Urdu', marks: 81, grade: 'A' },
    { name: 'Science', marks: 84, grade: 'A' },
    { name: 'Islamiat', marks: 87, grade: 'A' },
  ],
};

// ---------- Library & transport ----------

export const LIBRARY = {
  limit: 2,
  fine: 30,
  issued: [
    { title: 'Tales from Pakistan', sub: 'Issued 10 Oct · due 24 Oct', badge: 'Due in 2 days', tone: 'warn' as const },
    { title: 'Junior Science Encyclopedia', sub: 'Issued 2 Oct · due 16 Oct', badge: 'Overdue 6 days', tone: 'danger' as const },
  ],
  history: [
    { title: 'The Secret Garden', sub: 'Returned 30 Sep', badge: 'On time', tone: 'success' as const },
    { title: 'Urdu Kahaniyan', sub: 'Returned 12 Sep · 3 days late', badge: 'Rs. 30', tone: 'neutral' as const },
  ],
};

export const TRANSPORT = {
  route: 'Route 3 · Model Town',
  pickup: { stop: 'Model Town stop', time: '7:05 AM' },
  drop: { stop: 'Model Town stop', time: '1:40 PM' },
  vehicle: 'LEA-4512 · Coaster, 24 seats',
  fee: 3500,
  contacts: [
    { name: 'Muhammad Aslam', role: 'Driver', phone: '0301 2233445' },
    { name: 'Shahid Iqbal', role: 'Conductor', phone: '0333 9988776' },
  ],
};

// ---------- Notices ----------

export type Notice = {
  title: string;
  text: string;
  when: string;
  kind: 'School' | 'Class teacher' | 'Fee';
  icon: 'result' | 'message' | 'fee' | 'ptm' | 'pickup';
};

export const NOTICES: Notice[] = [
  { title: 'Result published', text: 'Mid-term results are in the app. Report cards can be downloaded.', when: '2h', kind: 'School', icon: 'result' },
  { title: 'Message from Ms. Sadia', text: "Please send Ayesha's art file by Friday.", when: 'Yesterday', kind: 'Class teacher', icon: 'message' },
  { title: 'Fee voucher issued', text: 'November voucher Rs. 9,375, due 10 Nov.', when: 'Mon', kind: 'Fee', icon: 'fee' },
  { title: 'PTM on 31 October', text: 'Meet the class teacher between 9 and 12.', when: 'Sat', kind: 'School', icon: 'ptm' },
  { title: 'Early pickup', text: 'Ayesha was picked up at 11:20 by Uncle Ali.', when: '15 Oct', kind: 'Class teacher', icon: 'pickup' },
];

// ---------- Push notifications (lock screen preview) ----------

export const PARENT_PUSH = [
  { text: 'Ayesha is absent today. Reply if she is on leave.', when: 'now' },
  { text: 'Diary posted: English, Mathematics', when: '8:40' },
  { text: 'Payment of Rs. 8,500 received. Receipt R-26-000501', when: 'Yesterday' },
  { text: 'November fee voucher issued: Rs. 9,375, due 10 Nov', when: 'Mon' },
  { text: 'Leave approved for 23–24 Oct', when: 'Sat' },
];

export const STUDENT_PUSH = [
  { text: 'Homework due tomorrow: Fractions worksheet', when: 'now' },
  { text: 'Diary posted: English, Mathematics', when: '8:40' },
  { text: 'Plant cell diagram was checked: 9/10', when: 'Yesterday' },
  { text: 'Library book "Junior Science Encyclopedia" is overdue', when: 'Mon' },
  { text: 'Mid-term results published', when: 'Sat' },
];
