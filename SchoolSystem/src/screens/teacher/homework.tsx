import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Check, FileText, Paperclip, Plus } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chips,
  Field,
  IconButton,
  InfoBanner,
  ListRow,
  Screen,
  Segmented,
  toast,
} from '../../components/ui';
import { Empty, QueryView } from '../../components/states';
import { colors, radius } from '../../theme';
import { useNav, useParam } from '../../navigation';
import { useI18n } from '../../i18n';
import { useApi, useMutation } from '../../api/hooks';
import { RecordDto, StudentDto, teacherApi } from '../../api/mobile';
import { addDays, ClassChips, classLabelFor, dayLabel, isoDate, useMyClasses } from './common';

function useHomework() {
  return useApi('teacher.homework', teacherApi.homework);
}

function useStudents() {
  return useApi('teacher.students', teacherApi.students);
}

function classStudents(groups: Array<{ classId: number; section: string; students: StudentDto[] }> | undefined, classId: number, section: string) {
  return groups?.find(g => g.classId === classId && g.section === section)?.students || [];
}

const nextDays = () => Array.from({ length: 10 }, (_, i) => addDays(isoDate(), i + 1));

// T11: assign homework to a class.
export function TeacherAssignHomework() {
  const nav = useNav();
  const { classes, current, setPicked, today } = useMyClasses();
  const students = useStudents();
  const [subjectId, setSubjectId] = useState<number | null | undefined>(undefined);
  const subject = current?.subjects.find(x => x.subjectId === subjectId) || current?.subjects[0];
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const days = nextDays();
  const [due, setDue] = useState(days[0]);
  const [max, setMax] = useState('10');
  const assign = useMutation(teacherApi.assignHomework);
  const size = current ? classStudents(students.data, current.classId, current.section).length : 0;

  const submit = async () => {
    if (!current) {
      toast('No class is assigned to you yet');
      return;
    }
    if (title.trim().length < 3) {
      toast('Enter a title');
      return;
    }
    const m = Number(max);
    if (!Number.isFinite(m) || m <= 0 || m > 100) {
      toast('Max marks must be 1–100');
      return;
    }
    // The server has no max-marks field; it is kept in the instructions.
    const res = await assign.run({
      classId: current.classId,
      section: current.section,
      subjectId: subject?.subjectId ?? null,
      title: title.trim(),
      body: `${body.trim()}${body.trim() ? '\n' : ''}Max marks: ${m}`,
      dueDate: due,
    });
    if (res) {
      toast(`Homework assigned to ${current.label}`);
      nav.pop();
    }
  };

  return (
    <Screen
      title="Assign homework"
      footer={<Button label={`Assign to ${size || 'the'} students`} onPress={submit} loading={assign.busy} />}
    >
      <QueryView q={today} isEmpty={() => classes.length === 0} emptyText="No class is assigned to you yet.">
        {() => (
          <>
            <ClassChips classes={classes} value={current?.key} onChange={setPicked} />
            {current && current.subjects.length > 1 ? (
              <Chips
                options={current.subjects.map(x => x.subject)}
                value={subject?.subject || ''}
                onChange={n => setSubjectId(current.subjects.find(x => x.subject === n)?.subjectId ?? null)}
              />
            ) : null}
            <Text style={s.sub}>
              {current?.label} · {subject?.subject}
            </Text>
            <Field label="Title" value={title} onChangeText={setTitle} placeholder="Fractions worksheet" />
            <Field
              label="Instructions"
              value={body}
              onChangeText={setBody}
              multiline
              placeholder="What the students should do"
            />
            <Text style={s.label}>Due date</Text>
            <Chips options={days.map(dayLabel)} value={dayLabel(due)} onChange={l => setDue(days.find(d => dayLabel(d) === l) || days[0])} />
            <Field label="Max marks" value={max} onChangeText={setMax} keyboardType="number-pad" />
            <Button
              label="Attach worksheet"
              variant="outline"
              icon={Paperclip}
              onPress={() => toast('Attaching files needs the file picker, which is not in the app yet.')}
            />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

// T12: all homework with submitted counts and a missing report.
export function TeacherHomeworkList() {
  const nav = useNav();
  const { t } = useI18n();
  const q = useHomework();
  const students = useStudents();
  const { classes } = useMyClasses();
  const [tab, setTab] = useState('Assigned');
  const today = isoDate();
  const list = q.data || [];
  const missing = list
    .filter(h => h.dueDate && h.dueDate < today)
    .flatMap(h => {
      const done = new Set(h.submissions.map(x => Number(x.studentId)));
      return classStudents(students.data, h.classId, h.section)
        .filter(st => !done.has(st.id))
        .map(st => ({ hw: h, st }));
    });
  const missingLabel = `${t('Missing')} ${missing.length}`;
  return (
    <Screen
      title="Homework"
      right={<IconButton icon={Plus} onPress={() => nav.push('TeacherAssignHomework')} />}
      refreshing={q.refreshing}
      onRefresh={() => {
        q.refresh();
        students.refresh();
      }}
    >
      <Segmented options={['Assigned', missingLabel]} value={tab === 'Assigned' ? 'Assigned' : missingLabel} onChange={v => setTab(v === 'Assigned' ? 'Assigned' : 'Missing')} />
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No homework assigned yet.">
        {() =>
          tab === 'Assigned' ? (
            <Card>
              {list.map((h, i) => {
                const size = classStudents(students.data, h.classId, h.section).length;
                const toCheck = h.submissions.filter(x => x.status !== 'graded').length;
                return (
                  <ListRow
                    key={h.id}
                    icon={Paperclip}
                    title={h.title}
                    subtitle={`${classLabelFor(classes, h.classId, h.section)} · ${t('due')} ${dayLabel(h.dueDate)}`}
                    right={
                      <View style={s.right}>
                        <Text style={s.count}>
                          {h.submitted} / {size || '—'}
                        </Text>
                        <Badge
                          label={toCheck ? `${toCheck} to check` : h.submitted ? 'Checked' : 'Open'}
                          tone={toCheck ? 'warn' : h.submitted ? 'success' : 'neutral'}
                        />
                      </View>
                    }
                    onPress={() => nav.push('TeacherCheckHomework', { id: h.id })}
                    last={i === list.length - 1}
                  />
                );
              })}
            </Card>
          ) : (
            <Card title="Missing after due date">
              {missing.length === 0 ? (
                <Empty text="Nobody is missing homework." />
              ) : (
                missing.map(({ hw, st }, i) => (
                  <ListRow
                    key={`${hw.id}-${st.id}`}
                    avatar={st.name}
                    title={st.name}
                    subtitle={`${hw.title} · not submitted`}
                    right={<Badge label="Missing" tone="danger" />}
                    last={i === missing.length - 1}
                  />
                ))
              )}
            </Card>
          )
        }
      </QueryView>
    </Screen>
  );
}

// T13: see submissions, grade and comment.
export function TeacherCheckHomework() {
  const id = useParam<number>('id', 0);
  const q = useHomework();
  const students = useStudents();
  const hw = (q.data || []).find(h => h.id === Number(id)) || (q.data || [])[0];
  const [tab, setTab] = useState('To check');
  const [marks, setMarks] = useState('');
  const [comment, setComment] = useState('');
  const grade = useMutation(teacherApi.grade);
  const subs = hw?.submissions || [];
  const pending = subs.filter(x => x.status !== 'graded');
  const checked = subs.filter(x => x.status === 'graded');
  const roster = hw ? classStudents(students.data, hw.classId, hw.section) : [];
  const done = new Set(subs.map(x => Number(x.studentId)));
  const missing = roster.filter(st => !done.has(st.id));
  const nameOf = (r: RecordDto) => roster.find(st => st.id === Number(r.studentId))?.name || `Student ${r.studentId ?? ''}`;
  // /teacher/homework does not return the instructions or max marks.
  const maxMarks = 10;
  const currentSub = pending[0];
  const late = (r: RecordDto) => !!hw?.dueDate && r.recordDate > hw.dueDate;

  const saveNext = async () => {
    if (!currentSub) {
      toast('Nothing left to check');
      return;
    }
    const m = Number(marks);
    if (marks === '' || !Number.isFinite(m) || m < 0 || m > maxMarks) {
      toast(`Marks must be 0–${maxMarks}`);
      return;
    }
    const res = await grade.run(currentSub.id, m, comment.trim());
    if (res) {
      setMarks('');
      setComment('');
      toast('Saved');
      q.refresh();
    }
  };

  return (
    <Screen
      title={hw?.title || 'Check homework'}
      subtitle={hw ? `${subs.length} of ${roster.length || '—'} submitted` : undefined}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      <QueryView q={q} isEmpty={() => !hw} emptyText="This homework was not found.">
        {() => (
          <>
            <Segmented
              options={[`To check ${pending.length}`, `Checked ${checked.length}`, `Missing ${missing.length}`]}
              value={`${tab} ${tab === 'To check' ? pending.length : tab === 'Checked' ? checked.length : missing.length}`}
              onChange={v => setTab(v.replace(/ \d+$/, ''))}
            />
            {tab === 'To check' ? (
              currentSub ? (
                <>
                  <Card>
                    <View style={s.head}>
                      <Avatar name={nameOf(currentSub)} />
                      <View style={s.flex}>
                        <Text style={s.name}>{nameOf(currentSub)}</Text>
                        <Text style={s.sub}>Submitted {dayLabel(currentSub.recordDate)}</Text>
                      </View>
                      <Badge label={late(currentSub) ? 'Late' : 'On time'} tone={late(currentSub) ? 'warn' : 'success'} />
                    </View>
                    {currentSub.note ? <Text style={s.note}>“{String(currentSub.note)}”</Text> : null}
                    {currentSub.fileUrl ? (
                      <View style={s.file}>
                        <FileText size={16} color={colors.textMuted} />
                        <Text style={s.fileText} numberOfLines={1}>
                          {String(currentSub.fileUrl).split('/').pop()}
                        </Text>
                      </View>
                    ) : null}
                    <View style={s.gradeRow}>
                      <View style={s.marksBox}>
                        <Field value={marks} onChangeText={setMarks} keyboardType="number-pad" placeholder="0" style={s.center} />
                      </View>
                      <Text style={s.outOf}>/ {maxMarks}</Text>
                      <View style={s.flex}>
                        <Field value={comment} onChangeText={setComment} placeholder="Comment" />
                      </View>
                    </View>
                  </Card>
                  <Card>
                    {pending.slice(1).map((r, i, arr) => (
                      <ListRow
                        key={r.id}
                        avatar={nameOf(r)}
                        title={nameOf(r)}
                        subtitle={`Submitted ${dayLabel(r.recordDate)}`}
                        right={<Badge label={late(r) ? 'Late' : 'New'} tone={late(r) ? 'warn' : 'info'} />}
                        last={i === arr.length - 1}
                      />
                    ))}
                    {pending.length < 2 ? <Text style={s.sub}>No more submissions waiting.</Text> : null}
                  </Card>
                  <Button label="Save and next" onPress={saveNext} loading={grade.busy} />
                </>
              ) : (
                <InfoBanner tone="success" icon={Check} text="All submissions are checked." />
              )
            ) : tab === 'Checked' ? (
              <Card>
                {checked.length === 0 ? (
                  <Empty text="Nothing checked yet." />
                ) : (
                  checked.map((r, i) => (
                    <ListRow
                      key={r.id}
                      avatar={nameOf(r)}
                      title={nameOf(r)}
                      subtitle={r.comment ? String(r.comment) : 'No comment'}
                      right={<Badge label={`${r.marks ?? '—'} / ${maxMarks}`} tone="success" />}
                      last={i === checked.length - 1}
                    />
                  ))
                )}
              </Card>
            ) : (
              <Card>
                {missing.length === 0 ? (
                  <Empty text="Everyone has submitted." />
                ) : (
                  missing.map((st, i) => (
                    <ListRow
                      key={st.id}
                      avatar={st.name}
                      title={st.name}
                      subtitle={hw?.dueDate ? `Due ${dayLabel(hw.dueDate)}` : 'Not submitted'}
                      right={<Badge label="Missing" tone="danger" />}
                      last={i === missing.length - 1}
                    />
                  ))
                )}
              </Card>
            )}
            <View style={s.dueRow}>
              <CalendarDays size={14} color={colors.textMuted} />
              <Text style={s.sub}>Due {dayLabel(hw?.dueDate)}</Text>
            </View>
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  sub: { fontSize: 12.5, color: colors.textMuted },
  label: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  right: { alignItems: 'flex-end', gap: 4 },
  count: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '800', color: colors.text },
  note: { fontSize: 13.5, color: colors.text, marginVertical: 6 },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 8,
  },
  fileText: { flex: 1, fontSize: 13, color: colors.textMuted },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  marksBox: { width: 64 },
  outOf: { fontSize: 14, fontWeight: '800', color: colors.text },
  center: { textAlign: 'center', fontWeight: '800' },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
