import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import {
  ArrowLeftRight,
  Check,
  Clock,
  Paperclip,
  Pencil,
} from 'lucide-react-native';
import {
  Badge,
  BellButton,
  Card,
  InfoBanner,
  ListRow,
  Screen,
  TimetableGrid,
} from '../../components/ui';
import { useTabs } from '../../components/Tabs';
import { colors } from '../../theme';
import { useNav } from '../../navigation';
import { useI18n } from '../../i18n';
import {
  SUBSTITUTIONS,
  T_TIMES,
  TEACHER,
  TEACHER_TIMETABLE,
  TEACHER_TODAY,
  TODAY_PERIODS,
} from '../../data/teacher';
import {
  TAB,
  useAttendanceMarked,
  useDiaryPosted,
  useMarks,
  useStudentLeaves,
  useSubmissions,
} from './state';

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} style={s.smallBtn} hitSlop={4}>
      <Text style={s.smallBtnText}>{t(label)}</Text>
    </Pressable>
  );
}

export function TeacherToday() {
  const nav = useNav();
  const tabs = useTabs();
  const { t } = useI18n();
  const [posted] = useDiaryPosted();
  const [attMarked] = useAttendanceMarked();
  const [marks] = useMarks();
  const [subs] = useSubmissions();
  const [leaves] = useStudentLeaves();
  const entered = Object.values(marks).filter(v => v.trim() !== '').length;
  const toCheck = subs.filter(x => !x.marks).length;
  const pendingLeave = leaves.find(l => l.status === 'Pending');

  return (
    <Screen
      title={`Good morning, ${TEACHER.first}`}
      subtitle={`${TEACHER_TODAY} · Class teacher ${TEACHER.classTeacherOf}`}
      right={<BellButton count={5} />}
    >
      <InfoBanner
        tone="warn"
        icon={ArrowLeftRight}
        text={`${t('Substitution')}: period 5, Class 7-B Science (Mr. Faisal is on leave).`}
      />
      <Card
        title="Today's periods"
        action={{
          label: 'Timetable',
          onPress: () => nav.push('TeacherTimetable'),
        }}
      >
        {TODAY_PERIODS.map((p, i) => {
          const isPosted = posted[p.classKey];
          let right: React.ReactNode;
          if (p.status === 'cover') {
            right = <Badge label="Cover" tone="warn" />;
          } else if (isPosted) {
            right = <Badge label="Diary posted" tone="success" />;
          } else if (p.status === 'later') {
            right = <Badge label="Later" tone="neutral" />;
          } else {
            right = (
              <SmallButton
                label="Post diary"
                onPress={() =>
                  nav.push('TeacherPostDiary', { classKey: p.classKey })
                }
              />
            );
          }
          return (
            <ListRow
              key={p.id}
              icon={p.status === 'cover' ? ArrowLeftRight : Clock}
              title={p.title}
              subtitle={p.sub}
              right={right}
              last={i === TODAY_PERIODS.length - 1}
            />
          );
        })}
      </Card>
      <Card title="Pending">
        <ListRow
          icon={Check}
          iconTone={attMarked ? 'success' : 'danger'}
          title="Attendance 5-A"
          subtitle={attMarked ? 'Marked today' : 'Not marked yet · cut-off 10:00'}
          right={
            attMarked ? (
              <Badge label="Done" tone="success" />
            ) : (
              <SmallButton
                label="Mark"
                onPress={() => tabs?.go(TAB.attendance)}
              />
            )
          }
        />
        <ListRow
          icon={Pencil}
          title="Mid-term marks"
          subtitle="English 5-A · due 28 Oct"
          right={<Badge label={`${entered} / 30`} tone="warn" />}
          onPress={() => tabs?.go(TAB.marks)}
        />
        <ListRow
          icon={Paperclip}
          title="Homework to check"
          subtitle={`Fractions worksheet · ${toCheck} new`}
          right={<Badge label={String(toCheck)} tone="warn" />}
          onPress={() => nav.push('TeacherCheckHomework', { id: 'th1' })}
        />
        <ListRow
          icon={Clock}
          title="Leave request"
          subtitle={
            pendingLeave
              ? `${pendingLeave.name} · 23–24 Oct`
              : 'No pending requests'
          }
          right={
            <Badge
              label={pendingLeave ? 'Review' : 'Done'}
              tone={pendingLeave ? 'warn' : 'success'}
            />
          }
          onPress={() => nav.push('TeacherStudentLeaves')}
          last
        />
      </Card>
    </Screen>
  );
}

export function TeacherTimetable() {
  return (
    <Screen
      title="My timetable"
      subtitle="27 periods a week · limit 36"
      right={<BellButton count={5} />}
    >
      <Card>
        <TimetableGrid
          times={T_TIMES}
          rows={TEACHER_TIMETABLE}
          breakAfter={2}
          filled
        />
      </Card>
      <Card title="This week">
        {SUBSTITUTIONS.map((x, i) => (
          <ListRow
            key={i}
            icon={ArrowLeftRight}
            title={x.title}
            subtitle={x.sub}
            right={<Badge label="Substitution" tone="warn" />}
            last
          />
        ))}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  smallBtn: {
    backgroundColor: colors.primary,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  smallBtnText: { fontSize: 12.5, fontWeight: '800', color: colors.text },
});
