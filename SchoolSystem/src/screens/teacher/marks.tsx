import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lock, TriangleAlert } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Chips,
  InfoBanner,
  ListRow,
  RowWrap,
  Screen,
  toast,
} from '../../components/ui';
import { QueryView } from '../../components/states';
import { colors } from '../../theme';
import { useI18n } from '../../i18n';
import { useShared } from '../../store';
import { useApi, useMutation } from '../../api/hooks';
import { teacherApi } from '../../api/mobile';
import { ClassChips, useMyClasses } from './common';

const isAbs = (v: string) => v.trim().toLowerCase() === 'abs';
const isInvalid = (v: string, max: number) => {
  const x = v.trim();
  if (x === '' || isAbs(x)) {
    return false;
  }
  const n = Number(x);
  return !/^\d+(\.\d)?$/.test(x) || Number.isNaN(n) || n < 0 || n > max;
};

// T14: Marks tab. Own subjects only; the exam controller locks entry.
export function TeacherMarks() {
  const { t } = useI18n();
  const { classes, current, setPicked, today } = useMyClasses();
  // Exams come from the server; default to the newest exam open for entry.
  const examsQ = useApi('teacher.exams', teacherApi.exams);
  const examList = examsQ.data?.exams || [];
  const [pickedExam, setExamId] = useShared<string>('teacher.examId', '');
  const examId =
    pickedExam || String((examList.find(e => e.marksOpen && !e.locked) || examList[0])?.id ?? '');
  const examLabel = (e: { id: number; name: string }) => `${e.name} (#${e.id})`;
  const [subjectId, setSubjectId] = useState<number | null | undefined>(undefined);
  const subject = current?.subjects.find(x => x.subjectId === subjectId) || current?.subjects[0];
  const key =
    current && Number(examId) > 0
      ? `teacher.marks.${examId}.${current.key}.${subject?.subjectId ?? 0}`
      : null;
  const q = useApi(key, () =>
    teacherApi.marks(Number(examId), current!.classId, current!.section, subject?.subjectId ?? undefined),
  );
  const [edits, setEdits] = useShared<Record<string, string>>(`teacher.marksEdit.${key}`, {});
  const save = useMutation(teacherApi.saveMarks);
  const students = q.data?.students || [];
  const locked = !!q.data?.exam.locked;
  const value = (id: number) => edits[id] ?? (q.data?.students.find(x => x.id === id)?.marks?.toString() ?? '');
  const maxOf = (id: number) => students.find(x => x.id === id)?.max || 100;
  const invalid = students.filter(st => isInvalid(value(st.id), maxOf(st.id)));
  const entered = students.filter(st => value(st.id).trim() !== '' && !isInvalid(value(st.id), maxOf(st.id))).length;
  const blank = students.filter(st => value(st.id).trim() === '').length;

  const set = (id: number, v: string) => {
    if (locked) {
      toast('Marks are locked. Ask the Exam Controller to unlock.');
      return;
    }
    setEdits(p => ({ ...p, [id]: v }));
  };

  const submit = async () => {
    if (locked) {
      toast('Marks are locked. Ask the Exam Controller to unlock.');
      return;
    }
    if (invalid.length) {
      toast('Fix the marks shown in red first');
      return;
    }
    // Absent students are left out of the upload (the server has no Absent flag).
    const entries = students
      .filter(st => value(st.id).trim() !== '' && !isAbs(value(st.id)))
      .map(st => ({ studentId: st.id, marks: Number(value(st.id)), max: maxOf(st.id) }));
    if (!entries.length) {
      toast('Enter marks first');
      return;
    }
    const res = await save.run({
      examId: Number(examId),
      subjectId: subject?.subjectId ?? undefined,
      subjectName: subject?.subject,
      entries,
    });
    if (res) {
      toast(`Marks saved · ${res.saved} students${blank ? ` · ${blank} still blank` : ''}`);
      setEdits({});
      q.refresh();
    }
  };

  return (
    <Screen
      title={`${q.data?.exam.name || t('Marks entry')}${subject ? ` · ${subject.subject}` : ''}`}
      subtitle={current ? `${current.label} · max ${students[0]?.max || 100}` : undefined}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={
        current ? (
          <Button
            label={locked ? 'Locked by Exam Controller' : 'Save marks'}
            icon={locked ? Lock : undefined}
            onPress={submit}
            loading={save.busy}
            disabled={locked}
          />
        ) : undefined
      }
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
            {examList.length ? (
              <Chips
                options={examList.map(examLabel)}
                value={examLabel(examList.find(e => String(e.id) === examId) || examList[0])}
                onChange={label => {
                  const e = examList.find(x => examLabel(x) === label);
                  if (e) {
                    setExamId(String(e.id));
                  }
                }}
              />
            ) : examsQ.data ? (
              <InfoBanner text="No exam has been created yet. Ask the Exam Controller." />
            ) : null}
            <QueryView q={q} isEmpty={d => d.students.length === 0} emptyText="No students in this class.">
              {d => (
                <>
                  <RowWrap>
                    <Badge label={`${entered} of ${students.length} entered`} tone={entered === students.length ? 'success' : 'warn'} />
                    <Badge label={d.exam.marksOpen ? 'Entry open' : 'Entry closed'} tone={d.exam.marksOpen ? 'info' : 'neutral'} />
                    {locked ? <Badge label="Locked" tone="danger" /> : null}
                  </RowWrap>
                  <Card>
                    {students.map((st, i) => {
                      const v = value(st.id);
                      const bad = isInvalid(v, st.max);
                      return (
                        <ListRow
                          key={st.id}
                          avatar={st.name}
                          title={st.name}
                          subtitle={st.grNo}
                          right={
                            <View style={s.right}>
                              <Pressable
                                onPress={() => set(st.id, isAbs(v) ? '' : 'Abs')}
                                style={[s.absBtn, isAbs(v) && s.absOn]}
                                hitSlop={4}
                              >
                                <Text style={[s.absText, isAbs(v) && s.absTextOn]}>A</Text>
                              </Pressable>
                              <TextInput
                                value={v}
                                onChangeText={x => set(st.id, x)}
                                placeholder="—"
                                placeholderTextColor={colors.text}
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                                editable={!locked}
                                style={[s.input, bad && s.inputBad]}
                              />
                            </View>
                          }
                          last={i === students.length - 1}
                        />
                      );
                    })}
                  </Card>
                  {invalid.length ? (
                    <InfoBanner
                      tone="danger"
                      icon={TriangleAlert}
                      text={`${t('Marks cannot be more than the maximum.')} (${invalid.map(x => x.name).join(', ')})`}
                    />
                  ) : (
                    <InfoBanner icon={TriangleAlert} text="Marks cannot be more than the maximum. Absent (A) students are not uploaded." />
                  )}
                  {locked ? (
                    <InfoBanner tone="success" icon={Lock} text="Marks are locked. Only the Exam Controller can unlock them." />
                  ) : null}
                </>
              )}
            </QueryView>
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const s = StyleSheet.create({
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    width: 64,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  inputBad: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  absBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absOn: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  absText: { fontSize: 11, fontWeight: '800', color: colors.textFaint },
  absTextOn: { color: colors.danger },
});
