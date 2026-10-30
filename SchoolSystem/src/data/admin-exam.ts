// Exam panel (M-12): setup, date sheets, seating, marks progress and the
// result compilation. The calculation functions are pure so they can be
// unit tested against a manual calculation (SOW 10.4).
import { useShared } from '../store';
import { ADMIN_STAFF, ADMIN_STUDENTS } from './admin';

// ---------- Setup ----------

export type ExamType = { name: string; weight: number; window: string };
export type GradeBand = { min: number; grade: string; remark: string };
export type PassRules = { overallPct: number; subjectPct: number; maxFailSubjects: number };

export const EXAM_TYPES_SEED: ExamType[] = [
  { name: 'Mid-term', weight: 40, window: '12 – 20 Oct' },
  { name: 'Final term', weight: 60, window: '1 – 12 Dec' },
];

export const GRADING_SEED: GradeBand[] = [
  { min: 90, grade: 'A+', remark: 'Outstanding' },
  { min: 80, grade: 'A', remark: 'Excellent' },
  { min: 70, grade: 'B', remark: 'Very good' },
  { min: 60, grade: 'C', remark: 'Good' },
  { min: 50, grade: 'D', remark: 'Fair' },
  { min: 40, grade: 'E', remark: 'Needs improvement' },
  { min: 0, grade: 'F', remark: 'Fail' },
];

export const PASS_SEED: PassRules = { overallPct: 40, subjectPct: 33, maxFailSubjects: 0 };

export const useExamTypes = () => useShared<ExamType[]>('exam.types', EXAM_TYPES_SEED);
export const useGrading = () => useShared<GradeBand[]>('exam.grading', GRADING_SEED);
export const usePassRules = () => useShared<PassRules>('exam.pass', PASS_SEED);

// ---------- Pure calculations ----------

export type SubjectMax = { name: string; max: number };
export type MarkValue = number | 'Abs';
export type StudentMarks = { id: string; name: string; section: string; marks: Record<string, MarkValue> };

export type ResultRow = {
  id: string;
  name: string;
  section: string;
  total: number;
  max: number;
  percentage: number; // one decimal
  grade: string;
  remark: string;
  pass: boolean;
  failed: string[];
  classPosition: number;
  sectionPosition: number;
};

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function gradeFor(pct: number, scale: GradeBand[]): GradeBand {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  return sorted.find(b => pct >= b.min) ?? sorted[sorted.length - 1];
}

// Standard competition ranking: equal scores share a position (1, 1, 3).
export function rank<T>(items: T[], score: (t: T) => number): number[] {
  const scores = items.map(score);
  return scores.map(s => 1 + scores.filter(o => o > s).length);
}

export function validMark(v: MarkValue, max: number) {
  return v === 'Abs' || (Number.isFinite(v) && v >= 0 && v <= max);
}

export function compileResults(
  students: StudentMarks[],
  subjects: SubjectMax[],
  scale: GradeBand[],
  rules: PassRules,
): ResultRow[] {
  const max = subjects.reduce((s, x) => s + x.max, 0);
  const rows = students.map(st => {
    let total = 0;
    const failed: string[] = [];
    subjects.forEach(sub => {
      const v = st.marks[sub.name];
      if (v !== undefined && !validMark(v, sub.max)) {
        throw new Error(`Invalid marks for ${st.name} in ${sub.name}`);
      }
      const got = v === undefined || v === 'Abs' ? 0 : v;
      total += got;
      if ((got / sub.max) * 100 < rules.subjectPct) {
        failed.push(sub.name);
      }
    });
    const percentage = max ? round1((total / max) * 100) : 0;
    const pass = percentage >= rules.overallPct && failed.length <= rules.maxFailSubjects;
    const band = gradeFor(percentage, scale);
    return {
      id: st.id,
      name: st.name,
      section: st.section,
      total,
      max,
      percentage,
      grade: pass ? band.grade : 'F',
      remark: pass ? band.remark : `Fail in ${failed.join(', ') || 'overall percentage'}`,
      pass,
      failed,
      classPosition: 0,
      sectionPosition: 0,
    };
  });
  const cls = rank(rows, r => r.total);
  const sectionPos = new Map<string, number>();
  Array.from(new Set(rows.map(r => r.section))).forEach(section => {
    const list = rows.filter(r => r.section === section);
    rank(list, r => r.total).forEach((pos, i) => sectionPos.set(list[i].id, pos));
  });
  return rows
    .map((r, i) => ({ ...r, classPosition: cls[i], sectionPosition: sectionPos.get(r.id) ?? 0 }))
    .sort((a, b) => a.classPosition - b.classPosition || a.name.localeCompare(b.name));
}

// Annual percentage from term percentages using the exam weightage.
export function annualPercentage(termPct: Record<string, number>, types: ExamType[]) {
  const totalWeight = types.reduce((s, t) => s + t.weight, 0) || 1;
  return round1(types.reduce((s, t) => s + (termPct[t.name] ?? 0) * t.weight, 0) / totalWeight);
}

export function subjectAverages(students: StudentMarks[], subjects: SubjectMax[]) {
  return subjects.map(sub => {
    const vals = students.map(s => s.marks[sub.name]).map(v => (v === undefined || v === 'Abs' ? 0 : v));
    return { name: sub.name, avg: vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
  });
}

// ---------- Dummy class (Class 5, sections A and B) ----------

export const RESULT_SUBJECTS: SubjectMax[] = [
  { name: 'English', max: 100 },
  { name: 'Mathematics', max: 100 },
  { name: 'Urdu', max: 100 },
  { name: 'Science', max: 100 },
  { name: 'Islamiat', max: 100 },
];

export const RESULT_CLASSES = ['Class 5', 'Class 6', 'Class 7'];
export const TERMS = ['Mid-term', 'Final term'];

function classStudents(cls: string) {
  const offset = RESULT_CLASSES.indexOf(cls) * 24;
  return ADMIN_STUDENTS.slice(offset, offset + 24).map((s, i) => ({
    id: s.id,
    name: s.name,
    section: i % 2 ? 'B' : 'A',
  }));
}

// Deterministic marks; term changes them a little. A couple of students fail
// a subject and one is absent so every rule is exercised.
export function classMarks(cls: string, term: string): StudentMarks[] {
  const t = TERMS.indexOf(term) + 1;
  return classStudents(cls).map((s, i) => {
    const marks: Record<string, MarkValue> = {};
    RESULT_SUBJECTS.forEach((sub, j) => {
      const base = 55 + ((i * 37 + j * 23 + t * 11 + cls.length * 7) % 44);
      marks[sub.name] = Math.min(100, base);
    });
    if (i === 7) {
      marks.Mathematics = 28;
    }
    if (i === 13) {
      marks.Science = 'Abs';
    }
    if (i === 19) {
      Object.keys(marks).forEach(k => {
        marks[k] = 30 + (k.length % 5);
      });
    }
    // Two students with equal totals to show shared positions.
    if (i === 3 || i === 5) {
      RESULT_SUBJECTS.forEach((sub, j) => {
        marks[sub.name] = 80 + j;
      });
    }
    return { ...s, marks };
  });
}

// ---------- Date sheet, invigilation, seating ----------

export type Paper = { id: string; cls: string; subject: string; date: string; time: string };

export const DATES = ['Mon 1 Dec', 'Tue 2 Dec', 'Wed 3 Dec', 'Thu 4 Dec', 'Fri 5 Dec', 'Mon 8 Dec'];
export const TIMES = ['8:30 – 11:00', '11:30 – 1:30'];

const PAPERS_SEED: Paper[] = RESULT_CLASSES.flatMap(cls =>
  RESULT_SUBJECTS.map((s, i) => ({ id: `${cls}-${s.name}`, cls, subject: s.name, date: DATES[i], time: TIMES[0] })),
);

export const usePapers = () => useShared<Paper[]>('exam.papers', PAPERS_SEED);
export const usePublished = () => useShared<Record<string, boolean>>('exam.published', { 'Class 5': true });

export const ROOMS = ['Hall A', 'Hall B', 'Room 2', 'Room 4'];
export const TEACHERS = ADMIN_STAFF.filter(s => s.department === 'Academics' && s.status !== 'Left').map(s => s.name);

export type Duty = { id: string; date: string; room: string; teacher: string };
const DUTY_SEED: Duty[] = DATES.slice(0, 5).flatMap((d, i) =>
  ROOMS.map((r, j) => ({ id: `${d}-${r}`, date: d, room: r, teacher: TEACHERS[(i * 4 + j) % TEACHERS.length] })),
);
export const useDuties = () => useShared<Duty[]>('exam.duties', DUTY_SEED);

// ---------- Marks entry progress ----------

export type MarksTask = { id: string; teacher: string; cls: string; subject: string; entered: number; total: number; locked: boolean; deadline: string };

const MARKS_SEED: MarksTask[] = RESULT_CLASSES.flatMap((cls, ci) =>
  RESULT_SUBJECTS.map((s, si) => {
    const total = 24;
    const entered = ci === 0 ? 24 : Math.min(24, ((ci * 7 + si * 9) % 25));
    return {
      id: `${cls}-${s.name}`,
      teacher: si === 0 && ci === 0 ? 'Sadia Anwar' : TEACHERS[(ci * 5 + si) % TEACHERS.length],
      cls,
      subject: s.name,
      entered,
      total,
      locked: ci === 0,
      deadline: '28 Oct',
    };
  }),
);
export const useMarksTasks = () => useShared<MarksTask[]>('exam.marks', MARKS_SEED);

// ---------- Results publish state ----------

export type ResultState = 'Draft' | 'In review' | 'Published';
export const useResultState = () => useShared<Record<string, ResultState>>('exam.resultState', { 'Class 6|Mid-term': 'Published' });

// ---------- Admit card holds ----------

export const useAdmitReleases = () => useShared<Record<string, string>>('exam.admitRelease', {});
export const useAdmitGenerated = () => useShared<Record<string, boolean>>('exam.admitGenerated', {});
