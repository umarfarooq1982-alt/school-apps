// M-05 Timetable builder (live /api/web/timetable), workload, and daily
// substitutions (approved staff leave + "substitutions" module records).
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
import { ALLOCATION, BELL_SCHEDULES, BellPeriod, WORKLOAD_LIMIT } from '../../../data/admin-principal';
import { useApi, useMutation } from '../../../api/hooks';
import { field, ModuleRow, webA, WebTimetable } from '../../../api/webA';
import { errorMessage } from '../../../api/client';
import { Loading, NoApiBanner, QueryView } from '../../../components/states';
import { colors, radius } from '../../../theme';
import { ReadOnlyBanner, useGuard } from '../owner/shared';

const short = (s: string) => (s === 'Social Studies' ? 'SST' : s === 'Mathematics' ? 'Math' : s.slice(0, 4));
const initials = (n: string) => n.replace(/\(.*\)/, '').trim().split(' ').map(x => x[0]).join('');

type ClassSection = { classId: string; section: string; label: string };

// Every class-section of the selected campus, from /api/web/context.
function useClassSections(): ClassSection[] {
  const ctx = useApi('adm:context', webA.context);
  return (ctx.data?.classes ?? []).flatMap(c => c.sections.map(s => ({ classId: c.id, section: s, label: `${c.name}-${s}` })));
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

function useClassPick() {
  const list = useClassSections();
  const [label, setLabel] = useShared('adm.ttClass', '');
  const cur = list.find(c => c.label === label) ?? list[0];
  return { list, cur, setLabel };
}

function useClassTimetable(cur?: ClassSection) {
  return useApi(cur ? `adm:tt:${cur.classId}:${cur.section}` : null, () => webA.timetable(cur?.classId ?? '', cur?.section ?? 'A'));
}

function Builder() {
  const { list, cur, setLabel } = useClassPick();
  const q = useClassTimetable(cur);
  const { guard, ro } = useGuard();
  const [edit, setEdit] = useState<{ day: string; period: number; subjectId: number | null; staffId: number | null } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const tt = q.data;
  const subjectName = (id: number | null) => tt?.subjects.find(s => s.id === id)?.name ?? '';
  const staffName = (id: number | null) => tt?.staff.find(s => s.id === id)?.name ?? '';
  const save = async () => {
    if (!edit || !cur || busy) {
      return;
    }
    if (!edit.subjectId) {
      setError('Choose a subject');
      return;
    }
    setBusy(true);
    try {
      await webA.saveSlot({ classId: cur.classId, section: cur.section, day: edit.day, period: edit.period, subjectId: edit.subjectId, staffId: edit.staffId ?? undefined });
      logAudit('Timetable', `${cur.label} ${edit.day} P${edit.period}: ${subjectName(edit.subjectId)} · ${staffName(edit.staffId)}`);
      setEdit(null);
      q.refresh();
    } catch (e) {
      // The server refuses a teacher placed in two classes in the same period.
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (!cur) {
    return <Loading />;
  }
  return (
    <>
      <PickerField label="Class" value={cur.label} options={list.map(c => c.label)} onChange={setLabel} />
      <QueryView q={q}>
        {d => (
          <Card>
            <View style={s.ttRow}>
              <View style={s.ttHead} />
              {d.days.map(day => (
                <Text key={day} style={s.ttDay}>{day}</Text>
              ))}
            </View>
            {d.periods.map(p => (
              <View key={p} style={s.ttRow}>
                <Text style={s.ttHead}>P{p}</Text>
                {d.days.map(day => {
                  const slot = d.slots.find(x => x.day === day && x.period === p);
                  return (
                    <Pressable
                      key={day}
                      style={s.ttCell}
                      onPress={() => {
                        if (ro) {
                          toast('This session is closed and read-only.');
                          return;
                        }
                        setError('');
                        setEdit({ day, period: p, subjectId: slot?.subjectId ?? d.subjects[0]?.id ?? null, staffId: slot?.staffId ?? null });
                      }}
                    >
                      <Text style={s.ttSub} numberOfLines={1}>{slot ? short(subjectName(slot.subjectId)) : '—'}</Text>
                      <Text style={s.ttTeacher} numberOfLines={1}>{slot ? initials(staffName(slot.staffId)) : ''}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Card>
        )}
      </QueryView>
      <InfoBanner text="Tap a slot to set subject and teacher. The server refuses a teacher in two classes in the same period. Saved slots show in the teacher and parent apps at once." />
      <Button label="Publish to teacher and parent apps" icon={Send} onPress={guard(() => toast('Saved slots are already live in the apps.'))} />
      {edit && tt ? (
        <FormSheet visible onClose={() => setEdit(null)} title={`${cur.label} · ${edit.day} P${edit.period}`} onSubmit={save} submitLabel={busy ? 'Saving…' : 'Save'}>
          <PickerField
            label="Subject"
            value={subjectName(edit.subjectId)}
            options={tt.subjects.map(x => x.name)}
            onChange={v => { setError(''); setEdit({ ...edit, subjectId: tt.subjects.find(x => x.name === v)?.id ?? null }); }}
          />
          <PickerField
            label="Teacher"
            value={staffName(edit.staffId)}
            options={tt.staff.map(x => x.name)}
            onChange={v => { setError(''); setEdit({ ...edit, staffId: tt.staff.find(x => x.name === v)?.id ?? null }); }}
          />
          {tt.subjects.length === 0 ? <InfoBanner tone="warn" text="Add subjects in Academic setup first." /> : null}
          <Text style={a.small}>Rooms are not stored by the server yet.</Text>
          {error ? <InfoBanner tone="danger" text={`Not saved: ${error}`} /> : null}
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
      <NoApiBanner what="Bell schedules" />
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
      <Button label="Save bell schedule" onPress={guard(() => { logAudit('Bell schedule', `${which} schedule saved (${list.length} rows)`); toast('Bell schedule saved on this phone'); })} />
    </>
  );
}

function Allocation() {
  const [alloc, setAlloc] = useShared<Record<string, number>>('admin.allocation', ALLOCATION);
  const { list, cur, setLabel } = useClassPick();
  const q = useClassTimetable(cur);
  const { guard } = useGuard();
  const tt = q.data;
  const subjects = tt?.subjects.map(x => x.name) ?? [];
  const placed = (name: string) => {
    const id = tt?.subjects.find(x => x.name === name)?.id;
    return (tt?.slots ?? []).filter(x => x.subjectId === id).length;
  };
  const week = (tt?.days.length ?? 5) * (tt?.periods.length ?? 8);
  const total = subjects.reduce((n, x) => n + (alloc[x] ?? 0), 0);
  const change = (subj: string, by: number) =>
    guard(() => {
      setAlloc(al => ({ ...al, [subj]: Math.max(0, (al[subj] ?? 0) + by) }));
      logAudit('Period allocation', `${subj}: ${alloc[subj] ?? 0} → ${Math.max(0, (alloc[subj] ?? 0) + by)} per week`);
    })();
  return (
    <>
      <NoApiBanner what="Periods per week per subject (the count in the timetable is live)" />
      {cur ? <PickerField label="Class" value={cur.label} options={list.map(c => c.label)} onChange={setLabel} /> : null}
      <Card title={`Periods per week · ${total} of ${week}`}>
        {subjects.length === 0 ? <Text style={a.small}>{q.loading ? 'Loading…' : 'No subjects yet.'}</Text> : null}
        {subjects.map((subj, i) => {
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
              last={i === subjects.length - 1}
            />
          );
        })}
      </Card>
      {total > week ? <InfoBanner tone="danger" text="More periods allocated than the week has." /> : null}
    </>
  );
}

// Loads every class timetable once and counts each teacher's periods.
function Workload() {
  const list = useClassSections();
  const q = useApi(list.length ? `adm:tt:all:${list.length}` : null, async () => {
    const out: WebTimetable[] = [];
    for (const c of list) {
      out.push(await webA.timetable(c.classId, c.section));
    }
    return out;
  });
  const w = useMemo(() => {
    const res: Record<string, { week: number; days: Record<string, number> }> = {};
    const days = q.data?.[0]?.days ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    (q.data ?? []).forEach(tt =>
      tt.slots.forEach(slot => {
        const name = tt.staff.find(x => x.id === slot.staffId)?.name;
        if (!name) {
          return;
        }
        const t = (res[name] ??= { week: 0, days: Object.fromEntries(days.map(d => [d, 0])) });
        t.week += 1;
        t.days[slot.day] = (t.days[slot.day] ?? 0) + 1;
      }),
    );
    return { res, days };
  }, [q.data]);
  const rows = Object.entries(w.res).map(([t, v]) => [
    t,
    `${v.week}${v.week > WORKLOAD_LIMIT.perWeek ? ' ⚠' : ''}`,
    ...w.days.map(d => `${v.days[d] ?? 0}${(v.days[d] ?? 0) > WORKLOAD_LIMIT.perDay ? ' ⚠' : ''}`),
  ]);
  const over = Object.values(w.res).filter(v => v.week > WORKLOAD_LIMIT.perWeek || w.days.some(d => (v.days[d] ?? 0) > WORKLOAD_LIMIT.perDay)).length;
  return (
    <>
      <InfoBanner
        tone={over ? 'danger' : 'info'}
        text={`Limits: ${WORKLOAD_LIMIT.perDay} periods a day, ${WORKLOAD_LIMIT.perWeek} a week. ${over ? `${over} teacher(s) over the limit (⚠).` : 'Everyone is within the limits.'}`}
      />
      <QueryView q={q} isEmpty={() => rows.length === 0} emptyText="No periods assigned to teachers yet.">
        {() => (
          <Card>
            <Table columns={['Teacher', 'Week', ...w.days]} rows={rows} />
          </Card>
        )}
      </QueryView>
    </>
  );
}

// ---------- Substitutions ----------

const todayIso = () => new Date().toISOString().slice(0, 10);

export function AdminSubstitutions(_: ScreenProps) {
  const nav = useNav();
  const leave = useApi('adm:leave', webA.leave);
  const subs = useApi('adm:mod:substitutions', () => webA.modules('substitutions'));
  const staff = useApi('adm:staff:all', webA.staff);
  const { guard } = useGuard();
  const [pick, setPick] = useState<{ name: string } | null>(null);
  const [period, setPeriod] = useState('P1');
  const [cls, setCls] = useState('');
  const classes = useClassSections();
  const today = todayIso();
  // Approved staff leave covering today = absent teachers.
  const absent = (leave.data?.items ?? []).filter(l => l.kind === 'staff' && l.status === 'approved' && l.from <= today && l.to >= today);
  const todays = (subs.data ?? []).filter(r => field(r, 'date', 'recordDate') === today);
  const free = (staff.data ?? []).filter(x => !absent.some(l => l.name === x.name));
  const add = useMutation((b: Record<string, unknown>) => webA.addModule('substitutions', b), 'Substitute assigned and notified');
  const assign = async (sub: string) => {
    if (!pick) {
      return;
    }
    if (!cls) {
      toast('Choose the class');
      return;
    }
    if (todays.some(r => field(r, 'substitute') === sub && field(r, 'period') === period)) {
      toast(`${sub} is already covering another class in ${period}`);
      return;
    }
    const res = await add.run({ title: `${cls} ${period}`, status: 'assigned', date: today, absent: pick.name, period, cls, substitute: sub });
    if (res !== undefined) {
      logAudit('Substitution', `${cls} ${period}: ${pick.name} → ${sub}`);
      subs.refresh();
      setPick(null);
    }
  };
  return (
    <>
      <ListScreen
        title="Substitutions"
        subtitle={`${today} · ${absent.length} teachers on leave · ${todays.length} periods covered`}
        items={absent}
        keyOf={r => r.id}
        searchText={r => `${r.name} ${r.reason ?? ''}`}
        empty={leave.loading ? 'Loading…' : 'No teacher is on approved leave today'}
        header={
          <>
            <ReadOnlyBanner />
            {leave.error ? <InfoBanner tone="danger" text={leave.error} /> : null}
            <InfoBanner icon={UserX} text="Approved teacher leave appears here automatically. Pick the class and period, then a free teacher." />
            <Button label="Substitution record" variant="outline" icon={History} onPress={() => nav.push('AdminSubHistory')} />
          </>
        }
        renderItem={(r, last) => (
          <ListRow
            icon={Repeat}
            title={r.name}
            subtitle={`${r.type} leave · ${r.from} – ${r.to}${r.reason ? ` · ${r.reason}` : ''}`}
            right={<Badge label="Assign" tone="warn" />}
            onPress={guard(() => setPick({ name: r.name }))}
            last={last}
          />
        )}
      />
      <FormSheet
        visible={!!pick}
        onClose={() => setPick(null)}
        title={pick ? `Cover for ${pick.name}` : ''}
        submitLabel="Close"
        onSubmit={() => setPick(null)}
      >
        <PickerField label="Class" value={cls} options={classes.map(c => c.label)} onChange={setCls} />
        <PickerField label="Period" value={period} options={['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']} onChange={setPeriod} />
        <Text style={a.small}>Teachers not on leave today</Text>
        {free.map(t => (
          <ListRow key={t.id} icon={Bell} title={t.name} subtitle={t.designation ?? 'Staff'} right={<Badge label="Assign" tone="primary" />} onPress={() => assign(t.name)} />
        ))}
      </FormSheet>
    </>
  );
}

export function AdminSubHistory(_: ScreenProps) {
  const q = useApi('adm:mod:substitutions', () => webA.modules('substitutions'));
  const list = (q.data ?? []) as ModuleRow[];
  const dates = Array.from(new Set(list.map(r => field(r, 'date', 'recordDate'))));
  return (
    <ListScreen
      title="Substitution record"
      items={list}
      keyOf={r => String(r.id)}
      searchText={r => `${field(r, 'absent')} ${field(r, 'substitute')} ${field(r, 'cls')}`}
      filters={[{ label: 'Date', options: ['All', ...dates], get: r => field(r, 'date', 'recordDate') }]}
      empty={q.loading ? 'Loading…' : q.error ?? 'No substitutions recorded'}
      renderItem={(r, last) => (
        <ListRow
          icon={CalendarRange}
          title={`${field(r, 'date', 'recordDate')} · ${field(r, 'period')} · ${field(r, 'cls')}`}
          subtitle={`${field(r, 'absent')} → ${field(r, 'substitute')}`}
          last={last}
        />
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
