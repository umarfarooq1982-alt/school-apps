// M-08 Annual calendar: holidays, vacations, events, PTMs, exam windows.
import React, { useState } from 'react';
import { CalendarDays, Send } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  DayStatus,
  Field,
  ListRow,
  MonthCalendar,
  Segmented,
  toast,
} from '../../../components/ui';
import { FormSheet, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps } from '../../../navigation';
import { useShared } from '../../../store';
import { CAMPUSES, CLASSES, logAudit } from '../../../data/admin';
import { CAL_ENTRIES, CalEntry } from '../../../data/admin-principal';
import { localId, ReadOnlyBanner, useGuard } from '../owner/shared';

const KINDS: CalEntry['kind'][] = ['Holiday', 'Vacation', 'Event', 'PTM', 'Exam window'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pretty = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const toneOf = (k: CalEntry['kind']) => (k === 'Holiday' || k === 'Vacation' ? 'danger' : k === 'Exam window' ? 'info' : 'success');

export const useCalendar = () => useShared<CalEntry[]>('admin.calendar', CAL_ENTRIES);

function marksFor(list: CalEntry[], year: number, month: number): Record<number, DayStatus> {
  const out: Record<number, DayStatus> = {};
  list.forEach(e => {
    const start = new Date(e.from);
    const end = new Date(e.to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === month) {
        out[d.getDate()] = e.kind === 'Holiday' || e.kind === 'Vacation' ? 'holiday' : e.kind === 'Exam window' ? 'leave' : 'present';
      }
    }
  });
  return out;
}

export function AdminCalendarManage(_: ScreenProps) {
  const [list, setList] = useCalendar();
  const { guard } = useGuard();
  const [view, setView] = useState('Year');
  const [ym, setYm] = useState({ y: 2026, m: 9 });
  const [edit, setEdit] = useState<CalEntry | null>(null);
  const sorted = [...list].sort((x, y) => x.from.localeCompare(y.from));
  const save = () => {
    if (!edit) {
      return;
    }
    if (!edit.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(edit.from) || !/^\d{4}-\d{2}-\d{2}$/.test(edit.to)) {
      toast('Enter a title and dates as YYYY-MM-DD');
      return;
    }
    if (edit.to < edit.from) {
      toast('End date is before the start date');
      return;
    }
    const exists = list.some(e => e.id === edit.id);
    setList(l => (exists ? l.map(e => (e.id === edit.id ? edit : e)) : [...l, edit]));
    logAudit('Calendar', `${exists ? 'Edited' : 'Added'} ${edit.kind}: ${edit.title} (${edit.from} – ${edit.to}, ${edit.scope})`);
    toast(edit.kind === 'Holiday' || edit.kind === 'Vacation' ? 'Saved. Attendance cannot be marked on these days.' : 'Saved');
    setEdit(null);
  };
  const publish = guard(() => {
    const drafts = list.filter(e => !e.published).length;
    setList(l => l.map(e => ({ ...e, published: true })));
    logAudit('Calendar', `Published calendar (${drafts} new entries)`);
    toast(drafts ? `Published. Parents notified of ${drafts} new entries.` : 'Everything is already published');
  });
  const header = (
    <>
      <ReadOnlyBanner />
      <Segmented options={['Year', 'Month']} value={view} onChange={setView} />
      {view === 'Month' ? (
        <Card>
          <MonthCalendar
            year={ym.y}
            month={ym.m}
            marks={marksFor(list, ym.y, ym.m)}
            onPrev={() => setYm(p => (p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }))}
            onNext={() => setYm(p => (p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }))}
          />
        </Card>
      ) : null}
      <Button label="Publish and notify parents" variant="outline" icon={Send} onPress={publish} />
    </>
  );
  const items = view === 'Month' ? sorted.filter(e => {
    const [y1, m1] = e.from.split('-').map(Number);
    const [y2, m2] = e.to.split('-').map(Number);
    const a = y1 * 12 + m1 - 1;
    const b = y2 * 12 + m2 - 1;
    const c = ym.y * 12 + ym.m;
    return a <= c && c <= b;
  }) : sorted;
  return (
    <>
      <ListScreen
        title="Annual calendar"
        subtitle="Session 2026-27 · holidays block attendance; exam windows feed Exams"
        items={items}
        keyOf={e => e.id}
        searchText={e => `${e.title} ${e.kind} ${e.scope}`}
        filters={[{ label: 'Kind', options: ['All', ...KINDS], get: e => e.kind }]}
        onAdd={guard(() => setEdit({ id: localId('ce'), title: '', kind: 'Event', from: '2026-11-01', to: '2026-11-01', scope: 'All campuses', published: false }))}
        addLabel="Add entry"
        header={header}
        renderItem={(e, last) => (
          <ListRow
            icon={CalendarDays}
            title={e.title}
            subtitle={`${pretty(e.from)}${e.to !== e.from ? ` – ${pretty(e.to)}` : ''} · ${e.scope}${e.published ? '' : ' · not published'}`}
            right={<Badge label={e.kind} tone={toneOf(e.kind)} />}
            onPress={guard(() => setEdit(e))}
            last={last}
          />
        )}
      />
      {edit ? (
        <FormSheet visible onClose={() => setEdit(null)} title={edit.title || 'New entry'} onSubmit={save}>
          <Field label="Title" value={edit.title} onChangeText={v => setEdit({ ...edit, title: v })} />
          <PickerField label="Type" value={edit.kind} options={KINDS} onChange={v => setEdit({ ...edit, kind: v as CalEntry['kind'] })} />
          <Field label="From (YYYY-MM-DD)" value={edit.from} onChangeText={v => setEdit({ ...edit, from: v })} />
          <Field label="To (YYYY-MM-DD)" value={edit.to} onChangeText={v => setEdit({ ...edit, to: v })} />
          <PickerField label="For" value={edit.scope} options={['All campuses', ...CAMPUSES.map(c => c.name), ...CLASSES]} onChange={v => setEdit({ ...edit, scope: v })} />
        </FormSheet>
      ) : null}
    </>
  );
}
