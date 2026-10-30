import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  HStack,
  InfoBanner,
  ListRow,
  RowWrap,
  Screen,
  toast,
} from '../../components/ui';
import { colors } from '../../theme';
import { useI18n } from '../../i18n';
import { STUDENTS_5A } from '../../data/teacher';
import { useMarks, useMarksComplete } from './state';

const MAX = 100;

const isAbs = (v: string) => v.trim().toLowerCase() === 'abs';
const isInvalid = (v: string) => {
  const x = v.trim();
  if (x === '' || isAbs(x)) {
    return false;
  }
  const n = Number(x);
  return !/^\d+(\.\d)?$/.test(x) || Number.isNaN(n) || n < 0 || n > MAX;
};

// T14: Marks tab.
export function TeacherMarks() {
  const { t } = useI18n();
  const [marks, setMarks] = useMarks();
  const [complete, setComplete] = useMarksComplete();
  const values = STUDENTS_5A.map(s => marks[s.id] ?? '');
  const entered = values.filter(v => v.trim() !== '' && !isInvalid(v)).length;
  const invalid = STUDENTS_5A.filter(s => isInvalid(marks[s.id] ?? ''));
  const blank = values.filter(v => v.trim() === '').length;

  // SOW M-12: once submitted the marks are locked; only the Exam Controller
  // can unlock them.
  const set = (id: string, v: string) => {
    if (complete) {
      toast('Marks are locked. Ask the Exam Controller to unlock.');
      return;
    }
    setMarks(p => ({ ...p, [id]: v }));
  };

  const saveDraft = () => {
    if (invalid.length) {
      toast('Fix the marks shown in red first');
      return;
    }
    toast(`Draft saved · ${entered} of ${STUDENTS_5A.length} entered`);
  };

  const markComplete = () => {
    if (invalid.length) {
      toast('Fix the marks shown in red first');
    } else if (blank) {
      toast(`${blank} students have no marks. Enter marks or Abs.`);
    } else {
      setComplete(true);
      toast('Marks submitted to the coordinator');
    }
  };

  return (
    <Screen
      title="Mid-term · English"
      subtitle="Class 5-A · max 100 · due 28 Oct"
      footer={
        <HStack>
          <Button
            label="Save draft"
            variant="outline"
            onPress={saveDraft}
            style={s.flex}
          />
          <Button
            label={complete ? 'Completed' : 'Mark complete'}
            onPress={markComplete}
            style={s.flex2}
            disabled={complete}
          />
        </HStack>
      }
    >
      <RowWrap>
        <Badge
          label={`${entered} of ${STUDENTS_5A.length} entered`}
          tone={entered === STUDENTS_5A.length ? 'success' : 'warn'}
        />
        <Badge label="Theory only" tone="neutral" />
        <View style={s.flex} />
        <Badge label="Deadline in 6 days" tone="info" />
      </RowWrap>
      <Card>
        {STUDENTS_5A.map((st, i) => {
          const v = marks[st.id] ?? '';
          const bad = isInvalid(v);
          return (
            <ListRow
              key={st.id}
              avatar={st.name}
              title={st.name}
              subtitle={`Roll ${st.roll}`}
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
                    editable={!complete}
                    style={[s.input, bad && s.inputBad]}
                  />
                </View>
              }
              last={i === STUDENTS_5A.length - 1}
            />
          );
        })}
      </Card>
      {invalid.length ? (
        <InfoBanner
          tone="danger"
          icon={TriangleAlert}
          text={`${t('Marks cannot be more than 100. Tick Absent instead of leaving blank.')} (${invalid
            .map(x => x.name)
            .join(', ')})`}
        />
      ) : (
        <InfoBanner
          icon={TriangleAlert}
          text="Marks cannot be more than 100. Tick Absent (A) instead of leaving blank."
        />
      )}
      {complete ? (
        <InfoBanner tone="success" text="Marks are submitted and locked. Only the Exam Controller can unlock them." />
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  flex2: { flex: 1.4 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  input: {
    width: 70,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    paddingVertical: 0,
  },
  inputBad: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
});
