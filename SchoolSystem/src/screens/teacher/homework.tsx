import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Layers, Paperclip, Plus } from 'lucide-react-native';
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
  Label,
  ListRow,
  Muted,
  Placeholder,
  Screen,
  Segmented,
  toast,
} from '../../components/ui';
import { colors } from '../../theme';
import { useNav, useParam } from '../../navigation';
import { MISSING_HOMEWORK } from '../../data/teacher';
import { newId, useHomework, useSubmissions } from './state';

const CLASS_SUBJECTS = [
  '5-A · Mathematics',
  '5-A · English',
  '6-A · English',
  '3-B · English',
];
const DUE_DATES = ['Fri 23 Oct', 'Mon 26 Oct', 'Tue 27 Oct', 'Wed 28 Oct'];

// T11
export function TeacherAssignHomework() {
  const nav = useNav();
  const [, setHomework] = useHomework();
  const [cls, setCls] = useState(CLASS_SUBJECTS[0]);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueIndex, setDueIndex] = useState(0);
  const [max, setMax] = useState('10');
  const [file, setFile] = useState<string | null>(null);

  const assign = () => {
    const m = Number(max);
    if (!title.trim()) {
      toast('Enter a title');
    } else if (!instructions.trim()) {
      toast('Write the instructions');
    } else if (!Number.isInteger(m) || m < 1 || m > 100) {
      toast('Max marks must be 1 to 100');
    } else {
      const [c, subj] = cls.split(' · ');
      setHomework(h => [
        {
          id: newId('th'),
          title: title.trim(),
          classKey: `${c} ${subj}`,
          due: DUE_DATES[dueIndex].replace(/^\w+ /, ''),
          submitted: 0,
          total: 30,
          toCheck: 0,
          status: 'Open',
          maxMarks: m,
          instructions,
        },
        ...h,
      ]);
      toast('Homework assigned to 30 students');
      nav.pop();
    }
  };

  return (
    <Screen
      title="Assign homework"
      footer={<Button label="Assign to 30 students" onPress={assign} />}
    >
      <View style={s.labelRow}>
        <Layers size={16} color={colors.text} />
        <Label>Class and subject</Label>
      </View>
      <Chips options={CLASS_SUBJECTS} value={cls} onChange={setCls} />
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="Fractions worksheet" />
      <Field
        label="Instructions"
        value={instructions}
        onChangeText={setInstructions}
        multiline
        placeholder="Solve Q1–10. Show working. Upload a clear photo of each page."
      />
      <HStack>
        <View style={s.flex2}>
          <Field
            label="Due date"
            icon={CalendarDays}
            value={DUE_DATES[dueIndex]}
            onPress={() => setDueIndex(i => (i + 1) % DUE_DATES.length)}
          />
        </View>
        <View style={s.flex1}>
          <Field label="Max marks" value={max} onChangeText={setMax} keyboardType="number-pad" />
        </View>
      </HStack>
      <Field
        icon={Paperclip}
        value={file ?? 'Attach worksheet (optional)'}
        onPress={() =>
          setFile(f => (f ? null : 'worksheet-fractions.pdf'))
        }
      />
      <Muted>Tap the due date to change it. Tap the attachment to add or remove it.</Muted>
    </Screen>
  );
}

// T12
export function TeacherHomeworkList() {
  const nav = useNav();
  const [homework] = useHomework();
  const [tab, setTab] = useState('Assigned');
  const missingLabel = `Missing ${MISSING_HOMEWORK.length}`;
  return (
    <Screen
      title="Homework"
      right={
        <IconButton icon={Plus} onPress={() => nav.push('TeacherAssignHomework')} />
      }
    >
      <Segmented options={['Assigned', missingLabel]} value={tab} onChange={setTab} />
      {tab === 'Assigned' ? (
        <Card>
          {homework.map((h, i) => (
            <ListRow
              key={h.id}
              icon={Paperclip}
              title={h.title}
              subtitle={`${h.classKey} · due ${h.due}`}
              right={
                <View style={s.right}>
                  <Text style={s.count}>
                    {h.submitted} / {h.total}
                  </Text>
                  <Badge
                    label={
                      h.toCheck ? `${h.toCheck} to check` : h.status
                    }
                    tone={
                      h.toCheck ? 'warn' : h.status === 'Checked' ? 'success' : 'neutral'
                    }
                  />
                </View>
              }
              onPress={() => nav.push('TeacherCheckHomework', { id: h.id })}
              last={i === homework.length - 1}
            />
          ))}
        </Card>
      ) : null}
      <Card title="Missing after due date">
        {(tab === 'Assigned' ? MISSING_HOMEWORK.slice(0, 2) : MISSING_HOMEWORK).map(
          (m, i, arr) => (
            <ListRow
              key={m.id}
              avatar={m.name}
              title={m.name}
              subtitle={m.what}
              right={<Badge label="Missing" tone="danger" />}
              last={i === arr.length - 1}
            />
          ),
        )}
      </Card>
    </Screen>
  );
}

// T13
export function TeacherCheckHomework() {
  const id = useParam('id', 'th1');
  const [homework, setHomework] = useHomework();
  const hw = homework.find(h => h.id === id) ?? homework[0];
  const [subs, setSubs] = useSubmissions();
  const [tab, setTab] = useState('To check');
  const toCheck = subs.filter(x => !x.marks);
  const checked = subs.filter(x => x.marks);
  const [current, setCurrent] = useState(toCheck[0]?.id ?? '');
  const cur = toCheck.find(x => x.id === current) ?? toCheck[0];
  const [marks, setMarks] = useState('9');
  const [comment, setComment] = useState('');

  const saveNext = () => {
    if (!cur) {
      toast('All submissions are checked');
      return;
    }
    const m = Number(marks);
    if (marks.trim() === '' || Number.isNaN(m) || m < 0 || m > hw.maxMarks) {
      toast(`Marks must be 0 to ${hw.maxMarks}`);
      return;
    }
    setSubs(list =>
      list.map(x =>
        x.id === cur.id ? { ...x, marks: `${m}/${hw.maxMarks}`, comment } : x,
      ),
    );
    setHomework(list =>
      list.map(h =>
        h.id === hw.id
          ? {
              ...h,
              toCheck: Math.max(0, h.toCheck - 1),
              status: h.toCheck - 1 <= 0 ? 'Checked' : h.status,
            }
          : h,
      ),
    );
    const next = toCheck.find(x => x.id !== cur.id);
    setCurrent(next?.id ?? '');
    setMarks('');
    setComment('');
    toast(next ? `Saved. Next: ${next.name}` : 'All submissions checked');
  };

  return (
    <Screen
      title={hw.title}
      subtitle={`${hw.classKey.split(' ')[0]} · ${hw.submitted} of ${hw.total} submitted`}
      footer={
        tab === 'To check' && cur ? (
          <Button label="Save and next" onPress={saveNext} />
        ) : undefined
      }
    >
      <Segmented
        options={[
          'To check',
          'Checked',
          `Missing ${MISSING_HOMEWORK.length}`,
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'To check' ? (
        cur ? (
          <>
            <Card>
              <View style={s.subHead}>
                <Avatar name={cur.name} />
                <View style={s.flex1}>
                  <Text style={s.name}>{cur.name}</Text>
                  <Muted>{cur.when}</Muted>
                </View>
                <Badge
                  label={cur.badge}
                  tone={cur.badge === 'Late' ? 'warn' : cur.badge === 'New' ? 'info' : 'success'}
                />
              </View>
              <HStack style={s.pages}>
                {Array.from({ length: cur.pages }).map((_, i) => (
                  <Placeholder key={i} label={`page ${i + 1}`} height={110} style={s.flex1} />
                ))}
              </HStack>
              <Body>"{cur.answer}"</Body>
              <HStack style={s.markRow}>
                <View style={s.markBox}>
                  <View style={s.flex1}>
                    <Field
                      value={marks}
                      onChangeText={setMarks}
                      keyboardType="number-pad"
                      style={s.markInput}
                    />
                  </View>
                  <Text style={s.outOf}>/ {hw.maxMarks}</Text>
                </View>
                <View style={s.flex1}>
                  <Field value={comment} onChangeText={setComment} placeholder="Good effort, check Q7 again" />
                </View>
              </HStack>
            </Card>
            <Card>
              {toCheck
                .filter(x => x.id !== cur.id)
                .map((x, i, arr) => (
                  <ListRow
                    key={x.id}
                    avatar={x.name}
                    title={x.name}
                    subtitle={x.when}
                    right={
                      <Badge
                        label={x.badge}
                        tone={x.badge === 'Late' ? 'warn' : x.badge === 'New' ? 'info' : 'success'}
                      />
                    }
                    onPress={() => setCurrent(x.id)}
                    last={i === arr.length - 1}
                  />
                ))}
              {toCheck.length === 1 ? <Muted>This is the last one.</Muted> : null}
            </Card>
          </>
        ) : (
          <Card>
            <Muted>Everything is checked. Well done!</Muted>
          </Card>
        )
      ) : tab === 'Checked' ? (
        <Card>
          {checked.length ? (
            checked.map((x, i) => (
              <ListRow
                key={x.id}
                avatar={x.name}
                title={x.name}
                subtitle={x.comment ? `"${x.comment}"` : x.when}
                right={<Badge label={x.marks ?? ''} tone="success" />}
                last={i === checked.length - 1}
              />
            ))
          ) : (
            <Muted>Nothing checked yet.</Muted>
          )}
        </Card>
      ) : (
        <Card>
          {MISSING_HOMEWORK.map((m, i) => (
            <ListRow
              key={m.id}
              avatar={m.name}
              title={m.name}
              subtitle={m.what}
              right={<Badge label="Missing" tone="danger" />}
              last={i === MISSING_HOMEWORK.length - 1}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  flex2: { flex: 1.6 },
  right: { alignItems: 'flex-end', gap: 4 },
  count: { fontSize: 14, fontWeight: '800', color: colors.text },
  subHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '800', color: colors.text },
  pages: { marginVertical: 10 },
  markRow: { marginTop: 10, alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  markBox: { width: 104, flexDirection: 'row', alignItems: 'center', gap: 4 },
  markInput: { textAlign: 'center', fontWeight: '800', minWidth: 30 },
  outOf: { fontSize: 14, fontWeight: '700', color: colors.text },
});
