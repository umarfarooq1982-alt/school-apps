import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Check, Clock, Plus, RefreshCw, WifiOff, X } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Chips,
  Field,
  HStack,
  IconButton,
  InfoBanner,
  ListRow,
  Mark,
  MarkSelector,
  Screen,
  Segmented,
  StatTile,
  toast,
  Toggle,
} from '../../components/ui';
import { BottomSheet } from '../../components/Tabs';
import { Empty, NotAvailable, QueryView } from '../../components/states';
import { colors } from '../../theme';
import { useNav } from '../../navigation';
import { useShared } from '../../store';
import { useI18n } from '../../i18n';
import { useApi, useMutation } from '../../api/hooks';
import { errorMessage } from '../../api/client';
import { RosterDto, teacherApi } from '../../api/mobile';
import { addDays, ClassChips, dayLabel, isoDate, MyClass, useMyClasses } from './common';
import { AttendancePayload, newId, useOffline, useQueue } from './state';

type Marks = Record<string, Mark>;
type Student = RosterDto['students'][number];

const asMark = (m: string | null | undefined): Mark =>
  m === 'A' || m === 'L' || m === 'LV' ? m : 'P';

function counts(students: Student[], marks: Marks) {
  const c = { P: 0, A: 0, L: 0, LV: 0 };
  students.forEach(st => {
    c[marks[st.id] ?? 'P'] += 1;
  });
  return c;
}

function useRoster(cls: MyClass | undefined, date: string) {
  return useApi(cls ? `teacher.roster.${cls.key}.${date}` : null, () =>
    teacherApi.roster(cls!.classId, cls!.section, date),
  );
}

// Server marks merged with the teacher's unsaved taps.
function useDayMarks(cls: MyClass | undefined, date: string, roster?: RosterDto) {
  const [edits, setEdits] = useShared<Marks>(`teacher.att.${cls?.key}.${date}`, {});
  const marks: Marks = {};
  (roster?.students || []).forEach(st => {
    marks[st.id] = edits[st.id] ?? asMark(st.mark);
  });
  return { marks, setMark: (id: string, m: Mark) => setEdits(p => ({ ...p, [id]: m })), clear: () => setEdits({}) };
}

function StudentMarkRow({
  student,
  value,
  onChange,
  last,
  avatar = true,
}: {
  student: Student;
  value: Mark;
  onChange: (m: Mark) => void;
  last?: boolean;
  avatar?: boolean;
}) {
  return (
    <ListRow
      avatar={avatar ? student.name : undefined}
      title={student.name}
      subtitle={student.grNo}
      right={<MarkSelector value={value} onChange={onChange} />}
      last={last}
    />
  );
}

function OfflineCard() {
  const [offline, setOffline] = useOffline();
  const { t } = useI18n();
  return (
    <Card>
      <View style={s.row}>
        <WifiOff size={18} color={colors.text} />
        <View style={s.flex}>
          <Text style={s.rowTitle}>{t('Offline mode')}</Text>
          <Text style={s.rowSub}>Save on this phone and upload later</Text>
        </View>
        <Toggle value={offline} onChange={setOffline} />
      </View>
    </Card>
  );
}

function OfflineBanner() {
  return (
    <InfoBanner
      tone="warn"
      icon={WifiOff}
      text="You are offline. Attendance is saved on this phone; tap Upload now when the internet is back."
    />
  );
}

function QueueCard() {
  const [queue, setQueue] = useQueue();
  const [offline] = useOffline();
  const [busy, setBusy] = useState(false);
  const waiting = queue.filter(q => q.status !== 'Uploaded');
  const uploadNow = async () => {
    if (offline) {
      toast('Still offline. Turn off offline mode to upload.');
      return;
    }
    if (!waiting.length) {
      toast('Nothing waiting to upload');
      return;
    }
    setBusy(true);
    let ok = 0;
    for (const item of waiting) {
      try {
        await teacherApi.saveAttendance(item.payload);
        ok += 1;
        setQueue(q => q.map(x => (x.id === item.id ? { ...x, status: 'Uploaded', sub: 'Uploaded just now' } : x)));
      } catch (e) {
        setQueue(q => q.map(x => (x.id === item.id ? { ...x, status: 'Failed', sub: errorMessage(e) } : x)));
      }
    }
    setBusy(false);
    toast(`${ok} of ${waiting.length} uploaded`);
  };
  return (
    <>
      <Card title="Upload queue">
        {queue.length === 0 ? (
          <Text style={s.rowSub}>Nothing saved on this phone.</Text>
        ) : (
          queue.map((q, i) => (
            <ListRow
              key={q.id}
              icon={q.status === 'Uploaded' ? Check : q.status === 'Failed' ? X : RefreshCw}
              iconTone={q.status === 'Uploaded' ? 'success' : q.status === 'Failed' ? 'danger' : 'primary'}
              title={q.title}
              subtitle={q.sub}
              right={<Badge label={q.status} tone={q.status === 'Uploaded' ? 'success' : q.status === 'Failed' ? 'danger' : 'warn'} />}
              last={i === queue.length - 1}
            />
          ))
        )}
      </Card>
      <Button label="Upload now" variant="outline" icon={RefreshCw} onPress={uploadNow} loading={busy} />
    </>
  );
}

const recentDays = () => Array.from({ length: 6 }, (_, i) => addDays(isoDate(), -i));

function DatePickerSheet({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: string;
  onPick: (d: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const days = recentDays();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={s.sheetTitle}>{t('Choose date')}</Text>
      {days.map((d, i) => (
        <ListRow
          key={d}
          icon={CalendarDays}
          title={i === 0 ? `${t('Today')} · ${dayLabel(d)}` : dayLabel(d)}
          right={d === value ? <Check size={18} color={colors.text} /> : null}
          onPress={() => {
            onPick(d);
            onClose();
          }}
          last={i === days.length - 1}
        />
      ))}
    </BottomSheet>
  );
}

// Saves today's attendance, or queues it when offline.
function useSaveAttendance(cls: MyClass | undefined, date: string, students: Student[], marks: Marks, after: () => void) {
  const [offline] = useOffline();
  const [, setQueue] = useQueue();
  const save = useMutation(teacherApi.saveAttendance);
  return {
    busy: save.busy,
    run: async () => {
      if (!cls || !students.length) {
        toast('No students to mark');
        return;
      }
      const payload: AttendancePayload = { classId: cls.classId, section: cls.section, date, marks: {} };
      students.forEach(st => {
        payload.marks[st.id] = marks[st.id] ?? 'P';
      });
      if (date < isoDate()) {
        // SOW M-07: teachers cannot change old days; the server locks them too.
        toast(`Previous days are locked. Ask the Principal to correct ${dayLabel(date)}.`);
        return;
      }
      if (offline) {
        setQueue(q => [
          { id: newId('q'), title: `${cls.label} · ${dayLabel(date)}`, sub: 'Saved on phone just now', status: 'Waiting', payload },
          ...q,
        ]);
        toast('Saved on this phone. Upload it when you are online.');
        return;
      }
      const res = await save.run(payload);
      if (res) {
        const absent = Object.values(payload.marks).filter(m => m === 'A').length;
        toast(absent ? `Attendance saved. Parents of ${absent} absent get SMS.` : 'Attendance saved');
        after();
      }
    },
  };
}

// T05 + T07: the Attendance tab.
export function TeacherAttendance() {
  const nav = useNav();
  const { t } = useI18n();
  const [mode, setMode] = useState('Daily');
  const [date, setDate] = useState(isoDate());
  const [picker, setPicker] = useState(false);
  const { classes, current, setPicked, today } = useMyClasses();
  const roster = useRoster(current, date);
  const students = roster.data?.students || [];
  const { marks, setMark, clear } = useDayMarks(current, date, roster.data);
  const [offline] = useOffline();
  const c = counts(students, marks);
  const isPast = date < isoDate();
  const save = useSaveAttendance(current, date, students, marks, () => {
    clear();
    roster.refresh();
  });

  return (
    <Screen
      title={current?.label || t('Attendance')}
      subtitle={`${dayLabel(date)} · ${students.length} ${t('students')}${roster.data?.marked ? ` · ${t('marked')}` : ''}`}
      right={<IconButton icon={CalendarDays} onPress={() => setPicker(true)} />}
      refreshing={roster.refreshing}
      onRefresh={() => {
        today.refresh();
        roster.refresh();
      }}
      footer={
        mode === 'Daily' && current ? (
          <Button
            icon={Check}
            label={isPast ? 'Ask Principal to correct' : offline ? 'Save on phone' : `Save · parents of ${c.A} absent get SMS`}
            onPress={save.run}
            loading={save.busy}
          />
        ) : undefined
      }
    >
      <Segmented options={['Daily', 'Period']} value={mode} onChange={setMode} />
      <ClassChips classes={classes} value={current?.key} onChange={setPicked} />
      <HStack gap={8}>
        <LinkChip icon={Clock} label="Late and early" onPress={() => nav.push('TeacherLateEarly')} />
        <LinkChip icon={WifiOff} label="Offline & upload queue" onPress={() => nav.push('TeacherOfflineAttendance')} />
      </HStack>
      {mode === 'Daily' ? (
        <QueryView q={today} isEmpty={() => classes.length === 0} emptyText="No class is assigned to you yet.">
          {() => (
            <>
              {offline ? <OfflineBanner /> : null}
              {isPast ? (
                <InfoBanner tone="warn" icon={Clock} text="Previous days are locked for teachers. The Principal corrects old attendance." />
              ) : null}
              <QueryView q={roster} isEmpty={d => d.students.length === 0} emptyText="No active students in this class.">
                {() => (
                  <>
                    <HStack gap={8}>
                      <StatTile value={c.P} label="Present" />
                      <StatTile value={c.A} label="Absent" />
                      <StatTile value={c.L} label="Late" />
                      <StatTile value={c.LV} label="Leave" />
                    </HStack>
                    <Card>
                      {students.map((st, i) => (
                        <StudentMarkRow
                          key={st.id}
                          student={st}
                          value={marks[st.id] ?? 'P'}
                          onChange={m => setMark(st.id, m)}
                          last={i === students.length - 1}
                        />
                      ))}
                    </Card>
                  </>
                )}
              </QueryView>
            </>
          )}
        </QueryView>
      ) : (
        <PeriodAttendanceBody />
      )}
      {mode === 'Daily' ? <OfflineCard /> : null}
      <DatePickerSheet visible={picker} value={date} onPick={setDate} onClose={() => setPicker(false)} />
    </Screen>
  );
}

function LinkChip({ icon: Icon, label, onPress }: { icon: typeof Clock; label: string; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} style={s.linkChip}>
      <Icon size={15} color={colors.primaryText} />
      <Text style={s.linkChipText} numberOfLines={1}>
        {t(label)}
      </Text>
    </Pressable>
  );
}

// T06: offline marking and the upload queue.
export function TeacherOfflineAttendance() {
  const [offline] = useOffline();
  const date = isoDate();
  const { classes, current, setPicked } = useMyClasses();
  const roster = useRoster(current, date);
  const students = roster.data?.students || [];
  const { marks, setMark, clear } = useDayMarks(current, date, roster.data);
  const save = useSaveAttendance(current, date, students, marks, () => {
    clear();
    roster.refresh();
  });
  return (
    <Screen
      title={current?.label || 'Offline attendance'}
      subtitle={dayLabel(date)}
      footer={<Button icon={Check} label={offline ? 'Save on phone' : 'Save attendance'} onPress={save.run} loading={save.busy} />}
    >
      {offline ? (
        <OfflineBanner />
      ) : (
        <InfoBanner icon={Check} tone="success" text="You are online. Records upload straight away." />
      )}
      <OfflineCard />
      <ClassChips classes={classes} value={current?.key} onChange={setPicked} />
      <QueryView q={roster} isEmpty={d => d.students.length === 0} emptyText="No active students in this class.">
        {() => (
          <Card>
            {students.map((st, i) => (
              <StudentMarkRow
                key={st.id}
                student={st}
                avatar={false}
                value={marks[st.id] ?? 'P'}
                onChange={m => setMark(st.id, m)}
                last={i === students.length - 1}
              />
            ))}
          </Card>
        )}
      </QueryView>
      <QueueCard />
    </Screen>
  );
}

// T07: the server has no per-period attendance API yet, so nothing is shown or
// saved here (no local-only marks that never reach the school).
function PeriodAttendanceBody() {
  return (
    <NotAvailable
      what="Period attendance"
      detail="Period-wise attendance is not available from the school server yet. Use daily attendance for now."
    />
  );
}

// T07 as its own screen.
export function TeacherPeriodAttendance() {
  return (
    <Screen title="Period attendance">
      <PeriodAttendanceBody />
    </Screen>
  );
}

const isTime = (v: string) => /^\d{1,2}:\d{2}$/.test(v.trim());

// T08: late arrival time for students marked Late, and early departures.
export function TeacherLateEarly() {
  const date = isoDate();
  const { current } = useMyClasses();
  const roster = useRoster(current, date);
  const students = roster.data?.students || [];
  const { marks } = useDayMarks(current, date, roster.data);
  const late = students.filter(st => marks[st.id] === 'L');
  const [times, setTimes] = useShared<Record<string, string>>('teacher.lateTimes', {});
  const [early, setEarly] = useShared<Array<{ id: string; name: string; time: string }>>('teacher.early', []);
  const [sheet, setSheet] = useState(false);
  const [pick, setPick] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);

  const saveTimes = async () => {
    if (!late.length) {
      toast('No student is marked Late today');
      return;
    }
    if (late.some(st => !isTime(times[st.id] || ''))) {
      toast('Enter times like 8:21');
      return;
    }
    setBusy(true);
    try {
      for (const st of late) {
        await teacherApi.exception({ studentId: Number(st.id), type: 'late', time: times[st.id], date });
      }
      toast('Arrival times saved');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const addEarly = async () => {
    const st = students.find(x => `${x.name} · ${x.grNo}` === pick);
    if (!st || !isTime(time)) {
      toast('Choose the student and a time like 11:20');
      return;
    }
    setBusy(true);
    try {
      await teacherApi.exception({ studentId: Number(st.id), type: 'early', time: time.trim(), date });
      setEarly(e => [...e, { id: newId('e'), name: st.name, time: time.trim() }]);
      setPick('');
      setTime('');
      setSheet(false);
      toast('Early leave recorded');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Late and early" subtitle={`${current?.label || ''} · ${dayLabel(date)}`}>
      <Card title="Late arrivals: time arrived">
        {late.length === 0 ? (
          <Empty text="No student is marked Late today. Mark Late in Attendance first." />
        ) : (
          late.map((st, i) => (
            <ListRow
              key={st.id}
              avatar={st.name}
              title={st.name}
              subtitle="Marked Late"
              right={
                <View style={s.timeBox}>
                  <Field
                    value={times[st.id] || ''}
                    onChangeText={v => setTimes(p => ({ ...p, [st.id]: v }))}
                    keyboardType="numbers-and-punctuation"
                    placeholder="8:20"
                    style={s.timeInput}
                  />
                </View>
              }
              last={i === late.length - 1}
            />
          ))
        )}
      </Card>
      <Card title="Early departures today">
        {early.length === 0 ? (
          <Empty text="No early departures recorded." />
        ) : (
          early.map((e, i) => (
            <ListRow
              key={e.id}
              avatar={e.name}
              title={e.name}
              subtitle={`Left ${e.time}`}
              right={<Badge label="Recorded" tone="warn" />}
              last={i === early.length - 1}
            />
          ))
        )}
      </Card>
      <Button label="Record early leave" variant="outline" icon={Plus} onPress={() => setSheet(true)} />
      <Button label="Save arrival times" onPress={saveTimes} loading={busy} />
      <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
        <View style={s.sheetBody}>
          <Text style={s.sheetTitle}>Record early leave</Text>
          {students.length ? (
            <Chips options={students.map(x => `${x.name} · ${x.grNo}`)} value={pick} onChange={setPick} />
          ) : (
            <Empty text="No students loaded." />
          )}
          <Field label="Time left" value={time} onChangeText={setTime} placeholder="11:20" keyboardType="numbers-and-punctuation" />
          <InfoBanner text="The gate pass and pickup person are checked at the front desk." />
          <Button label="Save" onPress={addEarly} loading={busy} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 12.5, color: colors.textMuted },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sheetBody: { gap: 12 },
  linkChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  linkChipText: { flexShrink: 1, fontSize: 12.5, fontWeight: '800', color: colors.primaryText },
  timeBox: { width: 90 },
  timeInput: { textAlign: 'center', fontWeight: '800' },
});
