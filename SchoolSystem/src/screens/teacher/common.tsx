// Shared helpers for the teacher screens: dates, the teacher's classes from
// /teacher/today, and the class picker used by attendance, diary and marks.
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chips } from '../../components/ui';
import { useApi } from '../../api/hooks';
import { teacherApi, TeacherClass } from '../../api/mobile';
import { getSession } from '../../api/session';
import { useShared } from '../../store';

const pad = (n: number) => String(n).padStart(2, '0');

// Phone's local date as YYYY-MM-DD (the school works in local time).
export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + n));
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-11-03" -> "Tue 3 Nov"
export function dayLabel(iso?: string | null) {
  if (!iso) {
    return '';
  }
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) {
    return iso;
  }
  const dt = new Date(y, m - 1, d);
  return `${DOW[dt.getDay()]} ${d} ${MON[m - 1]}`;
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return `${MON[(m || 1) - 1]} ${y}`;
}

export function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function teacherName() {
  const u = getSession()?.user;
  return u?.name || 'Teacher';
}

export type MyClass = {
  key: string; // "17-A"
  classId: number;
  section: string;
  label: string; // "Class 5-A"
  subjects: Array<{ subjectId: number | null; subject: string }>;
};

export function groupClasses(list: TeacherClass[] = []): MyClass[] {
  const map = new Map<string, MyClass>();
  for (const c of list) {
    const key = `${c.classId}-${c.section}`;
    const row =
      map.get(key) ||
      ({
        key,
        classId: c.classId,
        section: c.section,
        label: `${c.className || `Class ${c.classId}`}-${c.section}`,
        subjects: [],
      } as MyClass);
    if (!row.subjects.some(s => s.subjectId === c.subjectId)) {
      row.subjects.push({ subjectId: c.subjectId, subject: c.subject || 'General' });
    }
    map.set(key, row);
  }
  return [...map.values()];
}

export function useToday() {
  return useApi('teacher.today', teacherApi.today);
}

// The teacher's classes (from /teacher/today) and the one picked on screen.
export function useMyClasses() {
  const today = useToday();
  const classes = useMemo(() => groupClasses(today.data?.classes), [today.data]);
  const [picked, setPicked] = useShared<string>('teacher.classKey', '');
  const current = classes.find(c => c.key === picked) || classes[0];
  return { today, classes, current, setPicked };
}

export function classLabelFor(classes: MyClass[], classId: number, section: string) {
  return classes.find(c => c.classId === classId && c.section === section)?.label || `Class ${classId}-${section}`;
}

export function subjectNameFor(classes: MyClass[], subjectId: number | null | undefined) {
  for (const c of classes) {
    const s = c.subjects.find(x => x.subjectId === subjectId);
    if (s) {
      return s.subject;
    }
  }
  return subjectId ? `Subject ${subjectId}` : 'General';
}

export function ClassChips({
  classes,
  value,
  onChange,
}: {
  classes: MyClass[];
  value?: string;
  onChange: (key: string) => void;
}) {
  if (classes.length < 2) {
    return null;
  }
  const byLabel = new Map(classes.map(c => [c.label, c.key]));
  const current = classes.find(c => c.key === value)?.label || classes[0].label;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Chips
        style={s.noWrap}
        options={classes.map(c => c.label)}
        value={current}
        onChange={label => onChange(byLabel.get(label) || classes[0].key)}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  noWrap: { flexWrap: 'nowrap' },
});

export const leaveTone = (status: string) =>
  status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warn';

export const cap = (v: string) => (v ? v[0].toUpperCase() + v.slice(1) : v);
