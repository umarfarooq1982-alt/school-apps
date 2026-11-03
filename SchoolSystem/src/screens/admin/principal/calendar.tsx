// M-08 Annual calendar: holidays, vacations, events, PTMs, exam windows.
// Live from /api/web/calendar (one row per date; ranges are saved day by day
// so holidays block attendance on every day).
import React, { useState } from 'react';
import { CalendarDays, Send } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  DayStatus,
  Field,
  InfoBanner,
  ListRow,
  MonthCalendar,
  Segmented,
  toast,
} from '../../../components/ui';
import { FormSheet, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps } from '../../../navigation';
import { logAudit } from '../../../data/admin';
import { CalEntry } from '../../../data/admin-principal';
import { useApi, useMutation } from '../../../api/hooks';
import { CalendarRow, webA } from '../../../api/webA';
import { ReadOnlyBanner, useGuard } from '../owner/shared';

const KINDS: CalEntry['kind'][] = ['Holiday', 'Vacation', 'Event', 'PTM', 'Exam window'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// App kind <-> server kind.
const TO_SERVER: Record<CalEntry['kind'], string> = {
  Holiday: 'holiday',
  Vacation: 'vacation',
  Event: 'event',
  PTM: 'ptm',
  'Exam window': 'exam',
};
const FROM_SERVER = (k: string): CalEntry['kind'] =>
  k === 'holiday' ? 'Holiday' : k === 'vacation' ? 'Vacation' : k === 'ptm' ? 'PTM' : k === 'exam' ? 'Exam window' : 'Event';

const pretty = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const toneOf = (k: CalEntry['kind']) => (k === 'Holiday' || k === 'Vacation' ? 'danger' : k === 'Exam window' ? 'info' : 'success');

type Entry = { id: string; title: string; kind: CalEntry['kind']; date: string };

const toEntry = (r: CalendarRow): Entry => ({ id: String(r.id), title: r.title, kind: FROM_SERVER(r.kind), date: String(r.event_date).slice(0, 10) });

export function useCalendarRows() {
  return useApi('adm:calendar', webA.calendar);
}

function marksFor(list: Entry[], year: number, month: number): Record<number, DayStatus> {
  const out: Record<number, DayStatus> = {};
  list.forEach(e => {
    const [y, m, d] = e.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      out[d] = e.kind === 'Holiday' || e.kind === 'Vacation' ? 'holiday' : e.kind === 'Exam window' ? 'leave' : 'present';
    }
  });
  return out;
}

function daysBetween(from: string, to: string) {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length < 45) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

type Draft = { title: string; kind: CalEntry['kind']; from: string; to: string };

export function AdminCalendarManage(_: ScreenProps) {
  const q = useCalendarRows();
  const { guard } = useGuard();
  const [view, setView] = useState('Year');
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [edit, setEdit] = useState<Draft | null>(null);
  const list = (q.data ?? []).map(toEntry).sort((x, y) => x.date.localeCompare(y.date));
  const { run, busy } = useMutation(async (d: Draft) => {
    const days = daysBetween(d.from, d.to);
    for (const date of days) {
      await webA.addEvent({ title: d.title.trim(), date, kind: TO_SERVER[d.kind] });
    }
    return days.length;
  });
  const save = async () => {
    if (!edit || busy) {
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
    const n = await run(edit);
    if (n !== undefined) {
      logAudit('Calendar', `Added ${edit.kind}: ${edit.title} (${edit.from} – ${edit.to})`);
      toast(
        edit.kind === 'Holiday' || edit.kind === 'Vacation'
          ? `Saved ${n} day(s). Attendance cannot be marked on these days.`
          : `Saved ${n} day(s). It shows in the parent and teacher apps.`,
      );
      setEdit(null);
      q.refresh();
    }
  };
  const publish = guard(() => {
    toast('Entries are published to the apps as soon as they are saved.');
  });
  const header = (
    <>
      <ReadOnlyBanner />
      {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
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
      <InfoBanner text="The server has no edit or delete for calendar entries yet; add a corrected entry instead." />
    </>
  );
  const items = view === 'Month'
    ? list.filter(e => {
        const [y, m] = e.date.split('-').map(Number);
        return y === ym.y && m - 1 === ym.m;
      })
    : list;
  const today = now.toISOString().slice(0, 10);
  return (
    <>
      <ListScreen
        title="Annual calendar"
        subtitle="Holidays block attendance; exam windows feed Exams"
        items={items}
        keyOf={e => e.id}
        searchText={e => `${e.title} ${e.kind}`}
        filters={[{ label: 'Kind', options: ['All', ...KINDS], get: e => e.kind }]}
        onAdd={guard(() => setEdit({ title: '', kind: 'Event', from: today, to: today }))}
        addLabel="Add entry"
        header={header}
        empty={q.loading ? 'Loading…' : 'No calendar entries'}
        renderItem={(e, last) => (
          <ListRow
            icon={CalendarDays}
            title={e.title}
            subtitle={pretty(e.date)}
            right={<Badge label={e.kind} tone={toneOf(e.kind)} />}
            last={last}
          />
        )}
      />
      {edit ? (
        <FormSheet visible onClose={() => setEdit(null)} title={edit.title || 'New entry'} onSubmit={save} submitLabel={busy ? 'Saving…' : 'Save'}>
          <Field label="Title" value={edit.title} onChangeText={v => setEdit({ ...edit, title: v })} />
          <PickerField label="Type" value={edit.kind} options={KINDS} onChange={v => setEdit({ ...edit, kind: v as CalEntry['kind'] })} />
          <Field label="From (YYYY-MM-DD)" value={edit.from} onChangeText={v => setEdit({ ...edit, from: v })} />
          <Field label="To (YYYY-MM-DD)" value={edit.to} onChangeText={v => setEdit({ ...edit, to: v })} />
        </FormSheet>
      ) : null}
    </>
  );
}
