import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Flag, HeartPulse, Paperclip, Plus, Search, Star, X } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chips,
  Field,
  HStack,
  IconButton,
  InfoBanner,
  ListRow,
  Screen,
  Segmented,
  StatTile,
  toast,
  Toggle,
} from '../../components/ui';
import { Empty, QueryView } from '../../components/states';
import { colors } from '../../theme';
import { useNav, useParam } from '../../navigation';
import { useI18n } from '../../i18n';
import { useApi, useMutation } from '../../api/hooks';
import { RecordDto, StudentDto, teacherApi } from '../../api/mobile';
import { cap, dayLabel, leaveTone } from './common';

function useGroups() {
  return useApi('teacher.students', teacherApi.students);
}

const groupLabel = (g: { students: StudentDto[]; classId: number; section: string }) =>
  `${g.students.find(st => st.classId === g.classId)?.className || `Class ${g.classId}`}-${g.section}`;

function pct(marks: number, max: number) {
  return max ? Math.round((marks / max) * 100) : 0;
}

// T15: students of my classes.
export function TeacherStudents() {
  const nav = useNav();
  const { t } = useI18n();
  const q = useGroups();
  const groups = q.data || [];
  const [picked, setPicked] = useState('');
  const [search, setSearch] = useState(false);
  const [text, setText] = useState('');
  const group = groups.find(g => groupLabel(g) === picked) || groups[0];
  const list = (group?.students || []).filter(st =>
    `${st.name} ${st.grNo}`.toLowerCase().includes(text.trim().toLowerCase()),
  );
  return (
    <Screen
      title="My students"
      subtitle={group ? `${groupLabel(group)} · ${group.students.length}` : undefined}
      right={<IconButton icon={search ? X : Search} onPress={() => setSearch(v => !v)} />}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No class is assigned to you yet.">
        {() => (
          <>
            {search ? <Field icon={Search} value={text} onChangeText={setText} placeholder={t('Search by name or GR No.')} autoFocus /> : null}
            {groups.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chips style={s.noWrap} options={groups.map(groupLabel)} value={group ? groupLabel(group) : ''} onChange={setPicked} />
              </ScrollView>
            ) : null}
            <Card>
              {list.length === 0 ? (
                <Empty text="No student matches." />
              ) : (
                list.map((st, i) => (
                  <ListRow
                    key={st.id}
                    avatar={st.name}
                    title={st.name}
                    subtitle={`${st.grNo}${st.rollNo ? ` · Roll ${st.rollNo}` : ''}`}
                    chevron
                    onPress={() => nav.push('TeacherStudentProfile', { id: st.id })}
                    last={i === list.length - 1}
                  />
                ))
              )}
            </Card>
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const isPositive = (r: RecordDto) => Number(r.points || 0) > 0;
const kindOf = (r: RecordDto) => String(r.kind || r.status || 'behavior');

// T16: one student.
export function TeacherStudentProfile() {
  const nav = useNav();
  const id = Number(useParam('id', 0));
  const q = useApi(id ? `teacher.student.${id}` : null, () => teacherApi.student(id));
  if (!id) {
    return (
      <Screen title="Student">
        <Empty text="Open a student from My students." />
      </Screen>
    );
  }
  return (
    <Screen
      title={q.data?.student.name || 'Student'}
      subtitle={q.data ? `${q.data.student.grNo} · ${q.data.student.className}-${q.data.student.section}` : undefined}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      <QueryView q={q}>
        {d => {
          const counted = d.attendance.filter(a => a.mark !== '—');
          const present = counted.filter(a => a.mark === 'P' || a.mark === 'L').length;
          const att = counted.length ? Math.round((present / counted.length) * 100) : 0;
          const total = d.results.reduce((n, r) => n + r.marks, 0);
          const max = d.results.reduce((n, r) => n + r.max, 0);
          const points = d.health.reduce((n, r) => n + Number(r.points || 0), 0);
          const alerts = d.health.filter(r => kindOf(r) === 'sickbay' || kindOf(r) === 'health');
          return (
            <>
              {alerts.length ? (
                <InfoBanner tone="danger" icon={HeartPulse} text={`Health: ${alerts.map(a => a.note || a.title).join(' · ')}`} />
              ) : null}
              <HStack gap={8}>
                <StatTile value={counted.length ? `${att}%` : '—'} label="Attendance" />
                <StatTile value={max ? `${pct(total, max)}%` : '—'} label="Results" />
                <StatTile value={points > 0 ? `+${points}` : String(points)} label="Behavior" />
              </HStack>
              <Card title="Results">
                {d.results.length === 0 ? (
                  <Empty text="No marks entered yet." />
                ) : (
                  d.results.map((r, i) => (
                    <ListRow
                      key={`${r.subject}-${i}`}
                      title={r.subject || 'Subject'}
                      subtitle={`${r.marks} / ${r.max}`}
                      right={<Badge label={`${pct(r.marks, r.max)}%`} tone="success" />}
                      last={i === d.results.length - 1}
                    />
                  ))
                )}
              </Card>
              <Card title="Behavior and health" action={{ label: 'Add', onPress: () => nav.push('TeacherBehavior', { studentId: d.student.id }) }}>
                {d.health.length === 0 ? (
                  <Empty text="No notes yet." />
                ) : (
                  d.health.map((r, i) => (
                    <ListRow
                      key={r.id}
                      icon={kindOf(r) === 'sickbay' ? HeartPulse : isPositive(r) ? Star : Flag}
                      iconTone={isPositive(r) ? 'primary' : 'danger'}
                      title={String(r.note || r.title)}
                      subtitle={`${dayLabel(r.recordDate)} · ${cap(kindOf(r))}${r.points ? ` · ${Number(r.points) > 0 ? '+' : ''}${r.points}` : ''}`}
                      last={i === d.health.length - 1}
                    />
                  ))
                )}
              </Card>
              <Button label="Add behavior note" variant="outline" icon={Plus} onPress={() => nav.push('TeacherBehavior', { studentId: d.student.id })} />
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

const KINDS = ['Positive', 'Incident', 'Warning'];

// T17: discipline records and sick-bay log; saved with /teacher/health.
export function TeacherBehavior() {
  const { t } = useI18n();
  const groupsQ = useGroups();
  // A student can be in several of my groups (homeroom and subject); list once.
  const all = useMemo(() => {
    const seen = new Map<number, StudentDto>();
    (groupsQ.data || []).flatMap(g => g.students).forEach(st => seen.set(st.id, st));
    return [...seen.values()];
  }, [groupsQ.data]);
  const labelOf = (st: StudentDto) => `${st.name} · ${st.grNo}`;
  const preset = Number(useParam('studentId', 0));
  const [pickedName, setPickedName] = useState('');
  const student = all.find(st => labelOf(st) === pickedName) || all.find(st => st.id === preset) || all[0];
  const profile = useApi(student ? `teacher.student.${student.id}` : null, () => teacherApi.student(student!.id));
  const [tab, setTab] = useState('Discipline');
  const [kind, setKind] = useState('Positive');
  const [points, setPoints] = useState('2');
  const [note, setNote] = useState('');
  const [tellParent, setTellParent] = useState(true);
  const save = useMutation(teacherApi.health);
  const records = (profile.data?.health || []).filter(r =>
    tab === 'Sick bay' ? kindOf(r) === 'sickbay' : kindOf(r) !== 'sickbay',
  );

  const submit = async () => {
    if (!student) {
      toast('Choose a student');
      return;
    }
    if (note.trim().length < 3) {
      toast('Write what happened');
      return;
    }
    const sick = tab === 'Sick bay';
    const p = Number(points);
    const res = await save.run({
      studentId: student.id,
      kind: sick ? 'sickbay' : kind === 'Positive' ? 'behavior' : kind.toLowerCase(),
      title: sick ? 'Sick bay' : kind,
      note: note.trim(),
      points: sick ? undefined : kind === 'Positive' ? Math.abs(p || 1) : -Math.abs(p || 1),
    });
    if (res) {
      toast(tellParent ? 'Saved. The parent can see it in the app.' : 'Saved');
      setNote('');
      profile.refresh();
    }
  };

  return (
    <Screen title="Behavior and health" subtitle={student ? student.name : undefined} refreshing={profile.refreshing} onRefresh={profile.refresh}>
      <QueryView q={groupsQ} isEmpty={() => all.length === 0} emptyText="No students in your classes.">
        {() => (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chips style={s.noWrap} options={all.map(labelOf)} value={student ? labelOf(student) : ''} onChange={setPickedName} />
            </ScrollView>
            <Segmented options={['Discipline', 'Sick bay']} value={tab} onChange={setTab} />
            <Card>
              {profile.loading ? (
                <Text style={s.sub}>{t('Loading…')}</Text>
              ) : records.length === 0 ? (
                <Empty text="Nothing recorded yet." />
              ) : (
                records.map((r, i) => (
                  <ListRow
                    key={r.id}
                    avatar={student?.name}
                    title={String(r.note || r.title)}
                    subtitle={`${dayLabel(r.recordDate)}${r.points ? ` · ${Number(r.points) > 0 ? '+' : ''}${r.points}` : ''}`}
                    right={
                      <Badge
                        label={tab === 'Sick bay' ? 'Sick bay' : isPositive(r) ? 'Positive' : cap(kindOf(r))}
                        tone={tab === 'Sick bay' ? 'info' : isPositive(r) ? 'success' : 'danger'}
                      />
                    }
                    last={i === records.length - 1}
                  />
                ))
              )}
            </Card>
            <Card title="Add record">
              <View style={s.form}>
                {tab === 'Discipline' ? (
                  <>
                    <Segmented options={KINDS} value={kind} onChange={setKind} />
                    <Field label="Points" value={points} onChangeText={setPoints} keyboardType="number-pad" />
                  </>
                ) : null}
                <Field label={tab === 'Sick bay' ? 'Complaint and action taken' : 'What happened'} value={note} onChangeText={setNote} multiline />
                <View style={s.row}>
                  <Text style={[s.sub, s.flex]}>{t('Tell the parent')}</Text>
                  <Toggle value={tellParent} onChange={setTellParent} />
                </View>
              </View>
            </Card>
            <Button label="Save record" onPress={submit} loading={save.busy} />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

// T18: approve or reject leave of my classes.
export function TeacherStudentLeaves() {
  const q = useApi('teacher.leaves', teacherApi.leaves);
  const groups = useGroups();
  const decide = useMutation(teacherApi.decideLeave);
  const nameOf = (id?: number | null) =>
    (groups.data || []).flatMap(g => g.students).find(st => st.id === id)?.name || `Student ${id ?? ''}`;
  const list = q.data || [];
  const pending = list.filter(l => l.status === 'pending');
  const earlier = list.filter(l => l.status !== 'pending');
  const act = async (id: number, status: 'approved' | 'rejected') => {
    if (await decide.run(id, status)) {
      toast(status === 'approved' ? 'Leave approved' : 'Leave rejected');
      q.refresh();
    }
  };
  return (
    <Screen title="Student leaves" refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No leave requests from your classes.">
        {() => (
          <>
            {pending.map(l => (
              <Card key={l.id}>
                <View style={s.head}>
                  <Avatar name={nameOf(l.student_id)} />
                  <View style={s.flex}>
                    <Text style={s.name}>{nameOf(l.student_id)}</Text>
                    <Text style={s.sub}>
                      {dayLabel(l.from_date)} – {dayLabel(l.to_date)} · {Number(l.days)} day(s)
                    </Text>
                  </View>
                  <Badge label="Pending" tone="warn" />
                </View>
                {l.reason ? <Text style={s.note}>“{l.reason}”</Text> : null}
                <View style={s.actions}>
                  <Button label="Reject" variant="danger" style={s.flex} onPress={() => act(l.id, 'rejected')} />
                  <Button label="Approve" style={s.flex} onPress={() => act(l.id, 'approved')} loading={decide.busy} />
                </View>
              </Card>
            ))}
            <Card title="Earlier">
              {earlier.length === 0 ? (
                <Empty text="No earlier requests." />
              ) : (
                earlier.map((l, i) => (
                  <ListRow
                    key={l.id}
                    avatar={nameOf(l.student_id)}
                    title={nameOf(l.student_id)}
                    subtitle={`${dayLabel(l.from_date)} – ${dayLabel(l.to_date)}${l.reason ? ` · ${l.reason}` : ''}`}
                    right={<Badge label={cap(l.status)} tone={leaveTone(l.status)} />}
                    last={i === earlier.length - 1}
                  />
                ))
              )}
            </Card>
            <InfoBanner icon={Paperclip} text="Approved leave shows as Leave in attendance." />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  noWrap: { flexWrap: 'nowrap' },
  sub: { fontSize: 12.5, color: colors.textMuted },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '800', color: colors.text },
  note: { fontSize: 13.5, color: colors.text, marginVertical: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  form: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
