import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CalendarDays,
  Check,
  Clock,
  Plus,
  RefreshCw,
  WifiOff,
} from 'lucide-react-native';
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
import { colors } from '../../theme';
import { useNav } from '../../navigation';
import { useShared } from '../../store';
import { useI18n } from '../../i18n';
import {
  ATT_DATES,
  LATE_ARRIVALS,
  STUDENTS_5A,
  TStudent,
} from '../../data/teacher';
import {
  newId,
  useAttendanceMarked,
  useEarlyLeaves,
  useOffline,
  useQueue,
} from './state';

type Marks = Record<string, Mark>;

const defaultMarks = (): Marks => {
  const m: Marks = {};
  STUDENTS_5A.forEach(s => {
    m[s.id] = 'P';
  });
  return m;
};

// Starting state for today mirrors the design (1 absent, 1 late, 2 leave).
const todayMarks = (): Marks => ({
  ...defaultMarks(),
  s8: 'A',
  s10: 'L',
  s12: 'LV',
  s20: 'LV',
});

function useDayMarks(date: string) {
  return useShared<Marks>(
    `teacher.att.${date}`,
    date === ATT_DATES[0] ? todayMarks() : defaultMarks(),
  );
}

function counts(marks: Marks) {
  const c = { P: 0, A: 0, L: 0, LV: 0 };
  Object.values(marks).forEach(m => {
    c[m] += 1;
  });
  return c;
}

function StudentMarkRow({
  student,
  value,
  onChange,
  last,
  avatar = true,
}: {
  student: TStudent;
  value: Mark;
  onChange: (m: Mark) => void;
  last?: boolean;
  avatar?: boolean;
}) {
  return (
    <ListRow
      avatar={avatar ? student.name : undefined}
      title={student.name}
      subtitle={`Roll ${student.roll}`}
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
          <Text style={s.rowSub}>Simulate no internet on this phone</Text>
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
      text="You are offline. Attendance is saved on this phone and uploads automatically when the internet is back."
    />
  );
}

function QueueCard() {
  const [queue, setQueue] = useQueue();
  const [offline] = useOffline();
  const waiting = queue.filter(q => q.status === 'Waiting').length;
  const uploadNow = () => {
    if (offline) {
      toast('Still offline. Turn off offline mode to upload.');
      return;
    }
    if (!waiting) {
      toast('Nothing waiting to upload');
      return;
    }
    setQueue(q =>
      q.map(x =>
        x.status === 'Waiting'
          ? { ...x, status: 'Uploaded', sub: 'Uploaded just now' }
          : x,
      ),
    );
    toast(`${waiting} record(s) uploaded`);
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
              icon={q.status === 'Waiting' ? RefreshCw : Check}
              iconTone={q.status === 'Waiting' ? 'primary' : 'success'}
              title={q.title}
              subtitle={q.sub}
              right={
                <Badge
                  label={q.status}
                  tone={q.status === 'Waiting' ? 'warn' : 'success'}
                />
              }
              last={i === queue.length - 1}
            />
          ))
        )}
      </Card>
      <Button
        label="Upload now"
        variant="outline"
        icon={RefreshCw}
        onPress={uploadNow}
      />
    </>
  );
}

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
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={s.sheetTitle}>{t('Choose date')}</Text>
      {ATT_DATES.map((d, i) => (
        <ListRow
          key={d}
          icon={CalendarDays}
          title={d}
          right={d === value ? <Check size={18} color={colors.text} /> : null}
          onPress={() => {
            onPick(d);
            onClose();
          }}
          last={i === ATT_DATES.length - 1}
        />
      ))}
    </BottomSheet>
  );
}

// T05 + T06 + T07: the Attendance tab.
export function TeacherAttendance() {
  const nav = useNav();
  const [mode, setMode] = useState('Daily');
  const [date, setDate] = useState(ATT_DATES[0]);
  const [picker, setPicker] = useState(false);
  const [marks, setMarks] = useDayMarks(date);
  const [offline] = useOffline();
  const [, setQueue] = useQueue();
  const [, setMarked] = useAttendanceMarked();
  const c = counts(marks);

  const save = () => {
    if (offline) {
      setQueue(q => [
        {
          id: newId('q'),
          title: `Class 5-A · ${date}`,
          sub: 'Saved on phone just now',
          status: 'Waiting',
        },
        ...q,
      ]);
      toast('Saved on this phone. It uploads when you are online.');
    } else {
      toast(
        c.A
          ? `Attendance saved. SMS sent to parents of ${c.A} absent.`
          : 'Attendance saved',
      );
    }
    if (date === ATT_DATES[0]) {
      setMarked(true);
    }
  };

  const daily = (
    <>
      {offline ? <OfflineBanner /> : null}
      <HStack gap={8}>
        <StatTile value={c.P} label="Present" />
        <StatTile value={c.A} label="Absent" />
        <StatTile value={c.L} label="Late" />
        <StatTile value={c.LV} label="Leave" />
      </HStack>
      <Card>
        {STUDENTS_5A.map((st, i) => (
          <StudentMarkRow
            key={st.id}
            student={st}
            value={marks[st.id] ?? 'P'}
            onChange={m => setMarks(prev => ({ ...prev, [st.id]: m }))}
            last={i === STUDENTS_5A.length - 1}
          />
        ))}
      </Card>
    </>
  );

  return (
    <Screen
      title="Class 5-A"
      subtitle={`${date} · ${STUDENTS_5A.length} students`}
      right={
        <IconButton icon={CalendarDays} onPress={() => setPicker(true)} />
      }
      footer={
        mode === 'Daily' ? (
          <Button
            icon={Check}
            label={
              offline
                ? 'Save on phone'
                : `Save · parents of ${c.A} absent get SMS`
            }
            onPress={save}
          />
        ) : undefined
      }
    >
      <Segmented
        options={['Daily', 'Period']}
        value={mode}
        onChange={setMode}
      />
      <HStack gap={8}>
        <LinkChip
          icon={Clock}
          label="Late and early"
          onPress={() => nav.push('TeacherLateEarly')}
        />
        <LinkChip
          icon={WifiOff}
          label="Offline & upload queue"
          onPress={() => nav.push('TeacherOfflineAttendance')}
        />
      </HStack>
      {mode === 'Daily' ? daily : <PeriodAttendanceBody />}
      {mode === 'Daily' ? <OfflineCard /> : null}
      <DatePickerSheet
        visible={picker}
        value={date}
        onPick={setDate}
        onClose={() => setPicker(false)}
      />
    </Screen>
  );
}

function LinkChip({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Clock;
  label: string;
  onPress: () => void;
}) {
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

// T06 as its own screen.
export function TeacherOfflineAttendance() {
  const [offline] = useOffline();
  const [marks, setMarks] = useDayMarks(ATT_DATES[1]);
  const [, setQueue] = useQueue();
  const save = () => {
    setQueue(q => [
      {
        id: newId('q'),
        title: 'Class 5-A · Wed 21 Oct',
        sub: offline ? 'Saved on phone just now' : 'Uploaded just now',
        status: offline ? 'Waiting' : 'Uploaded',
      },
      ...q,
    ]);
    toast(offline ? 'Saved on this phone' : 'Attendance uploaded');
  };
  return (
    <Screen
      title="Class 5-A"
      subtitle="Wednesday 21 Oct"
      footer={
        <Button
          icon={Check}
          label={offline ? 'Save on phone' : 'Save attendance'}
          onPress={save}
        />
      }
    >
      {offline ? (
        <OfflineBanner />
      ) : (
        <InfoBanner
          icon={Check}
          tone="success"
          text="You are online. Records upload straight away."
        />
      )}
      <OfflineCard />
      <Card>
        {STUDENTS_5A.slice(0, 5).map((st, i) => (
          <StudentMarkRow
            key={st.id}
            student={st}
            avatar={false}
            value={marks[st.id] ?? 'P'}
            onChange={m => setMarks(prev => ({ ...prev, [st.id]: m }))}
            last={i === 4}
          />
        ))}
      </Card>
      <QueueCard />
    </Screen>
  );
}

const PERIODS = ['P1', 'P2 · 8:40', 'P3', 'P4', 'P5'];

function PeriodAttendanceBody() {
  const [period, setPeriod] = useState(PERIODS[1]);
  const [all, setAll] = useShared<Record<string, Marks>>(
    'teacher.periodAtt',
    {},
  );
  const students = useMemo(() => STUDENTS_5A.slice(0, 12), []);
  const marks: Marks =
    all[period] ??
    (period === PERIODS[1] ? { ...defaultMarks(), s9: 'A' } : defaultMarks());
  const set = (id: string, m: Mark) =>
    setAll(prev => ({ ...prev, [period]: { ...marks, [id]: m } }));
  const absent = students.filter(st => marks[st.id] === 'A').length;
  return (
    <>
      <Text style={s.rowSub}>Class 6-A · {period.split(' ')[0]} · English</Text>
      <Chips options={PERIODS} value={period} onChange={setPeriod} />
      <Card>
        {students.map((st, i) => (
          <StudentMarkRow
            key={st.id}
            student={st}
            avatar={false}
            value={marks[st.id] ?? 'P'}
            onChange={m => set(st.id, m)}
            last={i === students.length - 1}
          />
        ))}
      </Card>
      <Button
        label="Save period attendance"
        onPress={() =>
          toast(`${period.split(' ')[0]} saved · ${absent} absent`)
        }
      />
    </>
  );
}

// T07 as its own screen.
export function TeacherPeriodAttendance() {
  return (
    <Screen title="Period attendance" subtitle="Class 6-A · English">
      <PeriodAttendanceBody />
    </Screen>
  );
}

// T08
export function TeacherLateEarly() {
  const [times, setTimes] = useShared<Record<string, string>>(
    'teacher.lateTimes',
    Object.fromEntries(LATE_ARRIVALS.map(l => [l.id, l.time])),
  );
  const [early, setEarly] = useEarlyLeaves();
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [by, setBy] = useState('');

  const saveTimes = () => {
    const bad = Object.values(times).some(v => !/^\d{1,2}:\d{2}$/.test(v));
    if (bad) {
      toast('Enter times like 8:21');
      return;
    }
    toast('Arrival times saved');
  };

  const addEarly = () => {
    if (!name.trim() || !time.trim() || !by.trim()) {
      toast('Fill student, time and picked up by');
      return;
    }
    setEarly(e => [...e, { id: newId('e'), name, time, by }]);
    setName('');
    setTime('');
    setBy('');
    setSheet(false);
    toast('Early leave recorded');
  };

  return (
    <Screen title="Late and early" subtitle="Class 5-A · Thu 22 Oct">
      <Card title="Late arrivals: time arrived">
        {LATE_ARRIVALS.map((l, i) => (
          <ListRow
            key={l.id}
            avatar={l.name}
            title={l.name}
            subtitle="Marked Late"
            right={
              <View style={s.timeBox}>
                <Field
                  value={times[l.id]}
                  onChangeText={v => setTimes(p => ({ ...p, [l.id]: v }))}
                  keyboardType="numbers-and-punctuation"
                  style={s.timeInput}
                />
              </View>
            }
            last={i === LATE_ARRIVALS.length - 1}
          />
        ))}
      </Card>
      <Card title="Early departures today">
        {early.map((e, i) => (
          <ListRow
            key={e.id}
            avatar={e.name}
            title={e.name}
            subtitle={`Left ${e.time} · picked up by ${e.by}`}
            right={<Badge label="Gate pass" tone="warn" />}
            last={i === early.length - 1}
          />
        ))}
      </Card>
      <Button
        label="Record early leave"
        variant="outline"
        icon={Plus}
        onPress={() => setSheet(true)}
      />
      <Button label="Save arrival times" onPress={saveTimes} />
      <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
        <View style={s.sheetBody}>
          <Text style={s.sheetTitle}>Record early leave</Text>
          <Field label="Student" value={name} onChangeText={setName} placeholder="Full name" />
          <Field label="Time left" value={time} onChangeText={setTime} placeholder="11:20" keyboardType="numbers-and-punctuation" />
          <Field label="Picked up by" value={by} onChangeText={setBy} placeholder="Name (relation)" />
          <Button label="Save" onPress={addEarly} />
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
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
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
  linkChipText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.primaryText,
  },
  timeBox: { width: 90 },
  timeInput: { textAlign: 'center', fontWeight: '800' },
});

