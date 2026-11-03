// Server data hooks for the parent and student apps (familyApi). Child-scoped
// data is cached per child, so switching child shows that child's data.
import { familyApi } from '../../api/mobile';
import { useApi } from '../../api/hooks';
import { useApiSession } from '../../api/session';
import type { DayStatus } from '../../components/ui';

export function useChildId(): number | undefined {
  const [s] = useApiSession();
  return s?.childId;
}

// Loads child-scoped data; `extra` separates e.g. different months.
export function useFamily<T>(name: string, fn: (childId?: number) => Promise<T>, extra = '') {
  const childId = useChildId();
  return useApi<T>(`fam:${name}:${childId ?? '-'}:${extra}`, () => fn(childId));
}

export function useChildren() {
  return useApi('family-children', familyApi.children);
}

export function useFees() {
  return useFamily('fees', familyApi.fees);
}

// ---------- Formatting ----------

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parse(iso?: string | null): Date | null {
  if (!iso) {
    return null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) {
    return null;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function fmtDate(iso?: string | null, withYear = false) {
  const d = parse(iso);
  if (!d) {
    return iso || '—';
  }
  return `${d.getDate()} ${MON[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

export function fmtDay(iso?: string | null) {
  const d = parse(iso);
  return d ? `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` : iso || '—';
}

export function fmtDateTime(iso?: string | null) {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

// "2026-11" -> "November 2026"
export function monthLabel(ym?: string | null) {
  const m = /^(\d{4})-(\d{2})/.exec(ym || '');
  return m ? `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}` : ym || '';
}

export function isoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayIso() {
  return isoDate(new Date());
}

export function addDaysIso(iso: string, n: number) {
  const d = parse(iso) ?? new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

export function daysBetween(from: string, to: string) {
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) {
    return 1;
  }
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export const MARK_STATUS: Record<string, DayStatus> = {
  P: 'present',
  A: 'absent',
  L: 'late',
  LV: 'leave',
  H: 'holiday',
};

export const MARK_LABEL: Record<string, string> = {
  P: 'Present',
  A: 'Absent',
  L: 'Late',
  LV: 'Leave',
};

export function statusTone(status: string): 'success' | 'danger' | 'warn' | 'info' | 'neutral' {
  const s = status.toLowerCase();
  if (['approved', 'paid', 'graded', 'checked', 'resolved', 'closed', 'ready', 'issued', 'done', 'active'].includes(s)) {
    return 'success';
  }
  if (['rejected', 'unpaid', 'missing', 'overdue', 'failed'].includes(s)) {
    return 'danger';
  }
  if (['submitted', 'in progress', 'in_progress'].includes(s)) {
    return 'info';
  }
  if (['pending', 'requested', 'open', 'assigned', 'partial'].includes(s)) {
    return 'warn';
  }
  return 'neutral';
}

export function cap(s?: string | null) {
  if (!s) {
    return '';
  }
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
