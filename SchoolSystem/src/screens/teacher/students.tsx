import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Check,
  Flag,
  Heart,
  Paperclip,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  Chips,
  Field,
  HStack,
  IconButton,
  InfoBanner,
  ListRow,
  Muted,
  Screen,
  Segmented,
  StatTile,
  toast,
  Toggle,
} from '../../components/ui';
import { colors } from '../../theme';
import { useNav, useParam } from '../../navigation';
import { useI18n } from '../../i18n';
import { CLASS_STUDENTS, findStudent, STUDENTS_5A } from '../../data/teacher';
import { newId, useBehavior, useSickBay, useStudentLeaves } from './state';

const CLASS_KEYS = Object.keys(CLASS_STUDENTS);

const fmtPoints = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// T15
export function TeacherStudents() {
  const nav = useNav();
  const [cls, setCls] = useState(CLASS_KEYS[0]);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const list = CLASS_STUDENTS[cls].filter(s =>
    s.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <Screen
      title="My students"
      subtitle={`Class ${cls.split(' ')[0]} · ${CLASS_STUDENTS[cls].length}`}
      right={
        <IconButton
          icon={searching ? X : Search}
          onPress={() => {
            setSearching(v => !v);
            setQ('');
          }}
        />
      }
    >
      {searching ? (
        <Field
          icon={Search}
          value={q}
          onChangeText={setQ}
          placeholder="Search by name"
          autoFocus
        />
      ) : null}
      <Chips options={CLASS_KEYS} value={cls} onChange={setCls} />
      <Card>
        {list.length === 0 ? <Muted>No student matches “{q}”.</Muted> : null}
        {list.map((st, i) => {
          let badge: React.ReactNode = null;
          if (st.health) {
            badge = <Badge label={st.health} tone="danger" />;
          } else if (st.att < 85) {
            badge = <Badge label="Att low" tone="danger" />;
          }
          return (
            <ListRow
              key={st.id}
              avatar={st.name}
              title={st.name}
              subtitle={`Att ${st.att}% · Mid-term ${st.midterm}% ${st.grade}${
                st.behavior ? ` · ${fmtPoints(st.behavior)}` : ''
              }`}
              right={badge}
              onPress={() => nav.push('TeacherStudentProfile', { id: st.id })}
              last={i === list.length - 1}
            />
          );
        })}
      </Card>
    </Screen>
  );
}

// T16
export function TeacherStudentProfile() {
  const nav = useNav();
  const id = useParam('id', 's9');
  const st = findStudent(id);
  const [records] = useBehavior();
  const notes = records.filter(r => r.name === st.name);
  const points = notes.reduce((a, r) => a + r.points, 0);
  const subjects = [
    { name: 'English', marks: Math.min(100, st.midterm + 4) },
    { name: 'Mathematics', marks: Math.max(0, st.midterm - 1) },
    { name: 'Science', marks: Math.max(0, st.midterm - 3) },
  ];
  const grade = (m: number) =>
    m >= 90 ? 'A+' : m >= 80 ? 'A' : m >= 70 ? 'B' : m >= 60 ? 'C' : 'D';
  return (
    <Screen title={st.name} subtitle={`${st.gr} · Class 5-A · Roll ${st.roll}`}>
      {st.health ? (
        <InfoBanner
          tone="danger"
          icon={Heart}
          text={`Health alert: ${st.health.toLowerCase()}. Blood group ${st.bloodGroup}. Emergency ${st.emergency}.`}
        />
      ) : (
        <InfoBanner
          icon={Heart}
          text={`No health alerts. Blood group ${st.bloodGroup}. Emergency ${st.emergency}.`}
        />
      )}
      <HStack gap={8}>
        <StatTile value={`${st.att}%`} label="Attendance" />
        <StatTile value={`${st.midterm}%`} label="Mid-term" />
        <StatTile value={fmtPoints(notes.length ? points : st.behavior)} label="Behavior" />
      </HStack>
      <Card title="Mid-term result">
        {subjects.map((x, i) => (
          <ListRow
            key={x.name}
            title={x.name}
            subtitle={String(x.marks)}
            right={<Badge label={grade(x.marks)} tone="success" />}
            last={i === subjects.length - 1}
          />
        ))}
      </Card>
      <Card
        title="Behavior notes"
        action={{
          label: 'Add',
          onPress: () => nav.push('TeacherBehavior', { student: st.name }),
        }}
      >
        {notes.length === 0 ? <Muted>No notes yet.</Muted> : null}
        {notes.map((r, i) => (
          <ListRow
            key={r.id}
            icon={r.points > 0 ? Star : Flag}
            title={r.what}
            subtitle={`${r.date} · ${r.kind} ${fmtPoints(r.points)}`}
            last={i === notes.length - 1}
          />
        ))}
      </Card>
      <Button
        label="Add behavior note"
        variant="outline"
        icon={Plus}
        onPress={() => nav.push('TeacherBehavior', { student: st.name })}
      />
    </Screen>
  );
}

const KIND_TONE = {
  Positive: 'success',
  Incident: 'danger',
  Warning: 'warn',
} as const;

// T17
export function TeacherBehavior() {
  const { t } = useI18n();
  const preset = useParam('student', '');
  const [records, setRecords] = useBehavior();
  const [sick, setSick] = useSickBay();
  const [tab, setTab] = useState('Discipline');
  const [kind, setKind] = useState<'Positive' | 'Incident' | 'Warning'>(
    'Incident',
  );
  const [student, setStudent] = useState(preset);
  const [points, setPoints] = useState('-1');
  const [what, setWhat] = useState('');
  const [tell, setTell] = useState(true);

  const pickKind = (k: string) => {
    const v = k as typeof kind;
    setKind(v);
    setPoints(v === 'Positive' ? '+2' : v === 'Incident' ? '-2' : '-1');
  };

  const save = () => {
    const name = STUDENTS_5A.find(
      s => s.name.toLowerCase() === student.trim().toLowerCase(),
    )?.name;
    if (!name) {
      toast('Type a student name from Class 5-A');
      return;
    }
    if (!what.trim()) {
      toast('Write what happened');
      return;
    }
    if (tab === 'Sick bay') {
      setSick(list => [
        { id: newId('k'), name, when: 'Today, now', what: what.trim() },
        ...list,
      ]);
    } else {
      const n = parseInt(points.replace('+', ''), 10);
      if (Number.isNaN(n)) {
        toast('Points must be a number like +2 or -1');
        return;
      }
      setRecords(list => [
        {
          id: newId('b'),
          name,
          date: '22 Oct',
          what: what.trim(),
          points: n,
          kind,
        },
        ...list,
      ]);
    }
    setWhat('');
    toast(tell ? 'Saved. Parent notified.' : 'Saved');
  };

  return (
    <Screen
      title="Behavior and health"
      subtitle="Class 5-A"
      footer={<Button label="Save record" onPress={save} />}
    >
      <Segmented options={['Discipline', 'Sick bay']} value={tab} onChange={setTab} />
      <Card>
        {tab === 'Discipline'
          ? records.map((r, i) => (
              <ListRow
                key={r.id}
                avatar={r.name}
                title={r.name}
                subtitle={`${r.date} · ${r.what} · ${fmtPoints(r.points)}`}
                right={<Badge label={r.kind} tone={KIND_TONE[r.kind]} />}
                last={i === records.length - 1}
              />
            ))
          : sick.map((r, i) => (
              <ListRow
                key={r.id}
                avatar={r.name}
                title={`${r.name} · ${r.when}`}
                subtitle={r.what}
                last={i === sick.length - 1}
              />
            ))}
      </Card>
      <Card title={tab === 'Discipline' ? 'Add record' : 'Add sick-bay visit'}>
        <View style={s.form}>
          {tab === 'Discipline' ? (
            <Segmented
              options={['Positive', 'Incident', 'Warning']}
              value={kind}
              onChange={pickKind}
            />
          ) : null}
          <HStack>
            <View style={s.flex}>
              <Field value={student} onChangeText={setStudent} placeholder={t('Student')} />
            </View>
            {tab === 'Discipline' ? (
              <View style={s.points}>
                <Field
                  value={points}
                  onChangeText={setPoints}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            ) : null}
          </HStack>
          <Field
            value={what}
            onChangeText={setWhat}
            placeholder={tab === 'Discipline' ? 'What happened' : 'Complaint and care given'}
            multiline
          />
          <View style={s.row}>
            <Text style={s.label}>{t('Tell the parent')}</Text>
            <Toggle value={tell} onChange={setTell} />
          </View>
        </View>
      </Card>
    </Screen>
  );
}

// T18
export function TeacherStudentLeaves() {
  const [leaves, setLeaves] = useStudentLeaves();
  const pending = leaves.filter(l => l.status === 'Pending');
  const earlier = leaves.filter(l => l.status !== 'Pending');
  const decide = (id: string, status: 'Approved' | 'Rejected') => {
    setLeaves(list => list.map(l => (l.id === id ? { ...l, status } : l)));
    toast(status === 'Approved' ? 'Leave approved. Parent notified.' : 'Leave rejected. Parent notified.');
  };
  return (
    <Screen title="Student leaves" subtitle="Class 5-A">
      {pending.length === 0 ? (
        <Card>
          <Muted>No pending leave requests.</Muted>
        </Card>
      ) : null}
      {pending.map(l => (
        <Card key={l.id}>
          <View style={s.leaveHead}>
            <Avatar name={l.name} />
            <View style={s.flex}>
              <Text style={s.name}>{l.name}</Text>
              <Muted>{l.dates}</Muted>
            </View>
            <Badge label="Pending" tone="warn" />
          </View>
          <Body style={s.reason}>"{l.reason}"</Body>
          {l.file ? (
            <View style={s.file}>
              <Paperclip size={16} color={colors.textMuted} />
              <Text style={s.fileText}>{l.file}</Text>
            </View>
          ) : null}
          <HStack>
            <Button
              label="Reject"
              variant="danger"
              onPress={() => decide(l.id, 'Rejected')}
              style={s.flex}
            />
            <Button
              label="Approve"
              onPress={() => decide(l.id, 'Approved')}
              style={s.flex}
            />
          </HStack>
        </Card>
      ))}
      <Card title="Earlier">
        {earlier.map((l, i) => (
          <ListRow
            key={l.id}
            avatar={l.name}
            title={l.name}
            subtitle={`${l.dates} · ${l.reason}`}
            right={
              <Badge
                label={l.status}
                tone={l.status === 'Approved' ? 'success' : 'danger'}
              />
            }
            last={i === earlier.length - 1}
          />
        ))}
      </Card>
      <InfoBanner
        icon={Check}
        text="Approved leave shows as Leave in attendance automatically."
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: 10, marginTop: 6 },
  points: { width: 80 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '800', color: colors.text },
  leaveHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '800', color: colors.text },
  reason: { marginVertical: 10 },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  fileText: { fontSize: 14, color: colors.textMuted },
});
