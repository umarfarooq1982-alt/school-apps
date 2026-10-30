// M-05 Timetable builder with clash checks, workload, and daily substitutions.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, CalendarRange, History, Minus, Plus, Repeat, Send, UserX } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  InfoBanner,
  ListRow,
  Screen,
  Segmented,
  toast,
} from '../../../components/ui';
import { adminStyles as a, FormSheet, ListScreen, PickerField, Table } from '../../../components/admin';
import { ScreenProps, useNav } from '../../../navigation';
import { useShared } from '../../../store';
import { logAudit } from '../../../data/admin';
import {
  ABSENT_TEACHERS,
  ALLOCATION,
  BELL_SCHEDULES,
  BellPeriod,
  FREE_TEACHERS,
  Slot,
  SUB_HISTORY,
  SubRecord,
  TIMETABLE_SEED,
  TimetableMap,
  TT_CLASSES,
  TT_DAYS,
  TT_PERIODS,
  TT_SUBJECTS,
  TT_TEACHERS,
  WORKLOAD_LIMIT,
} from '../../../data/admin-principal';
import { colors, radius } from '../../../theme';
import { localId, ReadOnlyBanner, useGuard } from '../owner/shared';

export const useTimetable = () => useShared<TimetableMap>('admin.timetable', TIMETABLE_SEED);

const key = (c: string, d: string, p: string) => `${c}|${d}|${p}`;
const short = (s: string) => (s === 'Social Studies' ? 'SST' : s === 'Mathematics' ? 'Math' : s.slice(0, 4));
const initials = (n: string) => n.split(' ').map(x => x[0]).join('');

// A teacher (or room) cannot be in two classes in the same period.
export function findClash(map: TimetableMap, cls: string, day: string, period: string, slot: Slot) {
  for (const c of TT_CLASSES) {
    if (c === cls) {
      continue;
    }
    const other = map[key(c, day, period)];
    if (!other) {
      continue;
    }
    if (other.teacher === slot.teacher) {
      return `${slot.teacher} already teaches ${c} in ${period} on ${day}.`;
    }
    if (other.room === slot.room) {
      return `Room ${slot.room} is used by ${c} in ${period} on ${day}.`;
    }
  }
  return null;
}

function workload(map: TimetableMap) {
  const w: Record<string, { week: number; days: Record<string, number> }> = {};
  TT_TEACHERS.forEach(t => {
    w[t] = { week: 0, days: Object.fromEntries(TT_DAYS.map(d => [d, 0])) };
  });
  Object.entries(map).forEach(([k, slot]) => {
    const day = k.split('|')[1];
    const t = (w[slot.teacher] ??= { week: 0, days: Object.fromEntries(TT_DAYS.map(d => [d, 0])) });
    t.week += 1;
    t.days[day] += 1;
  });
  return w;
}

export function AdminTimetableBuilder(_: ScreenProps) {
  const [tab, setTab] = useState('Builder');
  return (
    <Screen title="Timetable builder" subtitle="Clash-free timetable, published to the portals">
      <ReadOnlyBanner />
      <Segmented options={['Builder', 'Bells', 'Periods', 'Workload']} value={tab} onChange={setTab} />
      {tab === 'Builder' ? <Builder /> : null}
      {tab === 'Bells' ? <Bells /> : null}
      {tab === 'Periods' ? <Allocation /> : null}
      {tab === 'Workload' ? <Workload /> : null}
    </Screen>
  );
}

function Builder() {
  const [map, setMap] = useTimetable();
  const [published, setPublished] = useShared('admin.ttPublished', 'Published 1 Oct');
  const { guard, ro } = useGuard();
  const [cls, setCls] = useState(TT_CLASSES[0]);
  const [edit, setEdit] = useState<{ day: string; period: string; slot: Slot } | null>(null);
  const [error, setError] = useState('');
  const save = () => {
    if (!edit) {
      return;
    }
    const clash = findClash(map, cls, edit.day, edit.period, edit.slot);
    if (clash) {
      setError(clash);
      return;
    }
    setMap(m => ({ ...m, [key(cls, edit.day, edit.period)]: edit.slot }));
    logAudit('Timetable', `${cls} ${edit.day} ${edit.period}: ${edit.slot.subject} · ${edit.slot.teacher} · ${edit.slot.room}`);
    setPublished('Changes not published');
    setEdit(null);
  };
  return (
    <>
      <PickerField label="Class" value={cls} options={TT_CLASSES} onChange={setCls} />
      <Card>
        <View style={s.ttRow}>
          <View style={s.ttHead} />
          {TT_DAYS.map(d => (
            <Text key={d} style={s.ttDay}>{d}</Text>
          ))}
        </View>
        {TT_PERIODS.map(p => (
          <View key={p} style={s.ttRow}>
            <Text style={s.ttHead}>{p}</Text>
            {TT_DAYS.map(d => {
              const slot = map[key(cls, d, p)];
              return (
                <Pressable
                  key={d}
                  style={s.ttCell}
                  onPress={() => {
                    if (ro) {
                      toast('This session is closed and read-only.');
                      return;
                    }
                    setError('');
                    setEdit({ day: d, period: p, slot: slot ?? { subject: TT_SUBJECTS[0], teacher: TT_TEACHERS[0], room: 'R105' } });
                  }}
                >
                  <Text style={s.ttSub} numberOfLines={1}>{slot ? short(slot.subject) : '—'}</Text>
                  <Text style={s.ttTeacher} numberOfLines={1}>{slot ? initials(slot.teacher) : ''}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>
      <InfoBanner text={`Tap a slot to set subject, teacher and room. A teacher or room can never be in two classes in the same period. ${published}.`} />
      <Button
        label="Publish to teacher and parent apps"
        icon={Send}
        onPress={guard(() => {
          setPublished('Published today');
          logAudit('Timetable', 'Timetable published to portals');
          toast('Timetable published. Teachers and parents are notified.');
        })}
      />
      {edit ? (
        <FormSheet visible onClose={() => setEdit(null)} title={`${cls} · ${edit.day} ${edit.period}`} onSubmit={save}>
          <PickerField label="Subject" value={edit.slot.subject} options={TT_SUBJECTS} onChange={v => { setError(''); setEdit({ ...edit, slot: { ...edit.slot, subject: v } }); }} />
          <PickerField label="Teacher" value={edit.slot.teacher} options={TT_TEACHERS} onChange={v => { setError(''); setEdit({ ...edit, slot: { ...edit.slot, teacher: v } }); }} />
          <Field label="Room" value={edit.slot.room} onChangeText={v => { setError(''); setEdit({ ...edit, slot: { ...edit.slot, room: v } }); }} />
          {error ? <InfoBanner tone="danger" text={`Clash: ${error}`} /> : null}
        </FormSheet>
      ) : null}
    </>
  );
}

function Bells() {
  const [bells, setBells] = useShared<Record<string, BellPeriod[]>>('admin.bells', BELL_SCHEDULES);
  const { guard, ro } = useGuard();
  const [which, setWhich] = useState('Normal');
  const list = bells[which] ?? [];
  const update = (i: number, time: string) =>
    ro ? toast('This session is closed and read-only.') : setBells(b => ({ ...b, [which]: b[which].map((p, j) => (j === i ? { ...p, time } : p)) }));
  return (
    <>
      <Segmented options={Object.keys(bells)} value={which} onChange={setWhich} />
      <Card>
        {list.map((p, i) => (
          <View key={`${which}-${p.label}`} style={[a.row, s.bellRow]}>
            <Text style={[s.bellLabel, p.isBreak && s.bellBreak]}>{p.label}</Text>
            <View style={a.flex}>
              <Field value={p.time} onChangeText={v => update(i, v)} />
            </View>
          </View>
        ))}
      </Card>
      <Button
        label="Add period"
        variant="outline"
        icon={Plus}
        onPress={guard(() => setBells(b => ({ ...b, [which]: [...b[which], { label: `P${b[which].filter(x => !x.isBreak).length + 1}`, time: '12:20 – 1:00' }] })))}
      />
      <Button label="Save bell schedule" onPress={guard(() => { logAudit('Bell schedule', `${which} schedule saved (${list.length} rows)`); toast('Bell schedule saved'); })} />
    </>
  );
}

function Allocation() {
  const [alloc, setAlloc] = useShared<Record<string, number>>('admin.allocation', ALLOCATION);
  const [map] = useTimetable();
  const { guard } = useGuard();
  const [cls, setCls] = useState(TT_CLASSES[0]);
  const placed = (subj: string) => TT_DAYS.reduce((n, d) => n + TT_PERIODS.filter(p => map[key(cls, d, p)]?.subject === subj).length, 0);
  const total = Object.values(alloc).reduce((x, y) => x + y, 0);
  const change = (subj: string, by: number) =>
    guard(() => {
      setAlloc(al => ({ ...al, [subj]: Math.max(0, (al[subj] ?? 0) + by) }));
      logAudit('Period allocation', `${subj}: ${alloc[subj]} → ${Math.max(0, alloc[subj] + by)} per week`);
    })();
  return (
    <>
      <PickerField label="Class" value={cls} options={TT_CLASSES} onChange={setCls} />
      <Card title={`Periods per week · ${total} of ${TT_DAYS.length * TT_PERIODS.length}`}>
        {TT_SUBJECTS.map((subj, i) => {
          const got = placed(subj);
          const want = alloc[subj] ?? 0;
          return (
            <ListRow
              key={subj}
              title={subj}
              subtitle={`In timetable: ${got}`}
              right={
                <View style={a.row}>
                  {got !== want ? <Badge label={got > want ? `+${got - want}` : `${got - want}`} tone="warn" /> : <Badge label="OK" tone="success" />}
                  <IconButton icon={Minus} onPress={() => change(subj, -1)} />
                  <Text style={a.bold}>{want}</Text>
                  <IconButton icon={Plus} onPress={() => change(subj, 1)} />
                </View>
              }
              last={i === TT_SUBJECTS.length - 1}
            />
          );
        })}
      </Card>
      {total > TT_DAYS.length * TT_PERIODS.length ? <InfoBanner tone="danger" text="More periods allocated than the week has." /> : null}
    </>
  );
}

function Workload() {
  const [map] = useTimetable();
  const w = useMemo(() => workload(map), [map]);
  const rows = Object.entries(w).map(([t, v]) => [
    t,
    `${v.week}${v.week > WORKLOAD_LIMIT.perWeek ? ' ⚠' : ''}`,
    ...TT_DAYS.map(d => `${v.days[d]}${v.days[d] > WORKLOAD_LIMIT.perDay ? ' ⚠' : ''}`),
  ]);
  const over = Object.values(w).filter(v => v.week > WORKLOAD_LIMIT.perWeek || TT_DAYS.some(d => v.days[d] > WORKLOAD_LIMIT.perDay)).length;
  return (
    <>
      <InfoBanner
        tone={over ? 'danger' : 'info'}
        text={`Limits: ${WORKLOAD_LIMIT.perDay} periods a day, ${WORKLOAD_LIMIT.perWeek} a week. ${over ? `${over} teacher(s) over the limit (⚠).` : 'Everyone is within the limits.'}`}
      />
      <Card>
        <Table columns={['Teacher', 'Week', ...TT_DAYS]} rows={rows} />
      </Card>
    </>
  );
}

// ---------- Substitutions ----------

type Assignment = Record<string, string>; // `${absentId}|${period}` -> substitute

export function AdminSubstitutions(_: ScreenProps) {
  const nav = useNav();
  const [assigned, setAssigned] = useShared<Assignment>('admin.subAssigned', {});
  const [, setHistory] = useShared<SubRecord[]>('admin.subHistory', SUB_HISTORY);
  const { guard } = useGuard();
  const [pick, setPick] = useState<{ id: string; name: string; period: string; cls: string } | null>(null);
  const rows = ABSENT_TEACHERS.flatMap(t => t.periods.map(p => ({ id: `${t.id}|${p.period}`, teacher: t.name, reason: t.reason, ...p })));
  const open = rows.filter(r => !assigned[r.id]).length;
  const assign = (sub: string) => {
    if (!pick) {
      return;
    }
    const busy = Object.entries(assigned).some(([k, v]) => v === sub && k.endsWith(`|${pick.period}`));
    if (busy) {
      toast(`${sub} is already covering another class in ${pick.period}`);
      return;
    }
    setAssigned(x => ({ ...x, [pick.id]: sub }));
    setHistory(h => [{ id: localId('sh'), date: 'Today', absent: pick.name, period: pick.period, cls: pick.cls, substitute: sub }, ...h]);
    logAudit('Substitution', `${pick.cls} ${pick.period}: ${pick.name} → ${sub}`);
    toast(`${sub} assigned and notified`);
    setPick(null);
  };
  return (
    <>
      <ListScreen
        title="Substitutions"
        subtitle={`Thursday 22 Oct · ${ABSENT_TEACHERS.length} teachers absent · ${open} periods open`}
        items={rows}
        keyOf={r => r.id}
        searchText={r => `${r.teacher} ${r.cls} ${r.subject}`}
        filters={[{ label: 'Status', options: ['All', 'Open', 'Covered'], get: r => (assigned[r.id] ? 'Covered' : 'Open') }]}
        header={
          <>
            <ReadOnlyBanner />
            <InfoBanner icon={UserX} text="Approved teacher leave appears here automatically. Suggested teachers are free in that period." />
            <Button label="Substitution record" variant="outline" icon={History} onPress={() => nav.push('AdminSubHistory')} />
          </>
        }
        renderItem={(r, last) => (
          <ListRow
            icon={Repeat}
            title={`${r.period} · ${r.cls} · ${r.subject}`}
            subtitle={`${r.teacher} (${r.reason})${assigned[r.id] ? `\nCovered by ${assigned[r.id]}` : ''}`}
            right={assigned[r.id] ? <Badge label="Covered" tone="success" /> : <Badge label="Assign" tone="warn" />}
            onPress={guard(() => setPick({ id: r.id, name: r.teacher, period: r.period, cls: r.cls }))}
            last={last}
          />
        )}
      />
      <FormSheet visible={!!pick} onClose={() => setPick(null)} title={pick ? `${pick.cls} · ${pick.period}` : ''} submitLabel="Notify all substitutes" onSubmit={() => { toast('Substitutes notified by push and SMS'); setPick(null); }}>
        <Text style={a.small}>Suggested free teachers</Text>
        {(pick ? FREE_TEACHERS[pick.period] ?? [] : []).map(t => (
          <ListRow key={t} icon={Bell} title={t} subtitle="Free in this period" right={<Badge label="Assign" tone="primary" />} onPress={() => assign(t)} />
        ))}
      </FormSheet>
    </>
  );
}

export function AdminSubHistory(_: ScreenProps) {
  const [list] = useShared<SubRecord[]>('admin.subHistory', SUB_HISTORY);
  return (
    <ListScreen
      title="Substitution record"
      items={list}
      keyOf={r => r.id}
      searchText={r => `${r.absent} ${r.substitute} ${r.cls}`}
      filters={[{ label: 'Date', options: ['All', ...Array.from(new Set(list.map(r => r.date)))], get: r => r.date }]}
      renderItem={(r, last) => (
        <ListRow icon={CalendarRange} title={`${r.date} · ${r.period} · ${r.cls}`} subtitle={`${r.absent} → ${r.substitute}`} last={last} />
      )}
    />
  );
}

const s = StyleSheet.create({
  ttRow: { flexDirection: 'row', gap: 4, marginBottom: 4, alignItems: 'center' },
  ttHead: { width: 26, fontSize: 11, fontWeight: '800', color: colors.textMuted },
  ttDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  ttCell: {
    flex: 1,
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ttSub: { fontSize: 11, fontWeight: '800', color: colors.text },
  ttTeacher: { fontSize: 9.5, color: colors.textMuted },
  bellRow: { marginBottom: 6 },
  bellLabel: { width: 52, fontWeight: '800', color: colors.text },
  bellBreak: { color: colors.primaryText },
});
