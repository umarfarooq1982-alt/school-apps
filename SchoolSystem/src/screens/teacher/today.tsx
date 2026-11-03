import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ArrowLeftRight, Check, Clock, Paperclip, Pencil } from 'lucide-react-native';
import {
  Badge,
  BellButton,
  Card,
  InfoBanner,
  ListRow,
  Screen,
  TimetableCell,
  TimetableGrid,
} from '../../components/ui';
import { useTabs } from '../../components/Tabs';
import { Empty, QueryView } from '../../components/states';
import { colors } from '../../theme';
import { useNav } from '../../navigation';
import { useI18n } from '../../i18n';
import { useShared } from '../../store';
import { useApi } from '../../api/hooks';
import { RecordDto, teacherApi } from '../../api/mobile';
import {
  classLabelFor,
  dayLabel,
  greeting,
  isoDate,
  subjectNameFor,
  teacherName,
  useMyClasses,
} from './common';
import { TAB } from './state';

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} style={s.smallBtn} hitSlop={4}>
      <Text style={s.smallBtnText}>{t(label)}</Text>
    </Pressable>
  );
}

// Text of a substitution record (free-form ParityRecord).
function subText(r: RecordDto) {
  const parts = [r.title, r.period ? `period ${r.period}` : '', r.className ? String(r.className) : '', r.note ? String(r.note) : ''];
  return parts.filter(Boolean).join(' · ');
}

export function TeacherToday() {
  const nav = useNav();
  const tabs = useTabs();
  const { t } = useI18n();
  const today = isoDate();
  const { today: q, classes, current } = useMyClasses();
  const [posted] = useShared<Record<string, boolean>>('teacher.diaryPosted', {});
  const roster = useApi(current ? `teacher.roster.${current.key}.${today}` : null, () =>
    teacherApi.roster(current!.classId, current!.section, today),
  );
  const homework = useApi('teacher.homework', teacherApi.homework);
  const leaves = useApi('teacher.leaves', teacherApi.leaves);
  const toCheck = (homework.data || []).reduce(
    (n, h) => n + h.submissions.filter(x => x.status !== 'graded').length,
    0,
  );
  const pendingLeaves = (leaves.data || []).filter(l => l.status === 'pending');
  const refresh = () => {
    q.refresh();
    roster.refresh();
    homework.refresh();
    leaves.refresh();
  };

  return (
    <Screen
      title={`${t(greeting())}, ${teacherName().split(' ')[0]}`}
      subtitle={`${dayLabel(today)}${current ? ` · ${current.label}` : ''}`}
      right={<BellButton count={pendingLeaves.length + toCheck} />}
      refreshing={q.refreshing}
      onRefresh={refresh}
    >
      <QueryView q={q}>
        {d => (
          <>
            {d.substitutions.map(r => (
              <InfoBanner
                key={r.id}
                tone="warn"
                icon={ArrowLeftRight}
                text={`${t('Substitution')}: ${subText(r)}`}
              />
            ))}
            <Card
              title="Today's periods"
              action={{ label: 'Timetable', onPress: () => nav.push('TeacherTimetable') }}
            >
              {d.periods.length === 0 ? (
                <Empty text="No periods today." />
              ) : (
                d.periods
                  .slice()
                  .sort((a, b) => a.period - b.period)
                  .map((p, i, arr) => {
                    const key = `${p.classId}-${p.section}`;
                    const done = posted[`${key}.${p.subjectId}.${today}`];
                    return (
                      <ListRow
                        key={`${p.period}-${key}`}
                        icon={Clock}
                        title={`${t('Period')} ${p.period}`}
                        subtitle={`${classLabelFor(classes, p.classId, p.section)} · ${subjectNameFor(classes, p.subjectId)}`}
                        right={
                          done ? (
                            <Badge label="Diary posted" tone="success" />
                          ) : (
                            <SmallButton
                              label="Post diary"
                              onPress={() =>
                                nav.push('TeacherPostDiary', { classKey: key, subjectId: p.subjectId })
                              }
                            />
                          )
                        }
                        last={i === arr.length - 1}
                      />
                    );
                  })
              )}
            </Card>
          </>
        )}
      </QueryView>
      <Card title="Pending">
        <ListRow
          icon={Check}
          iconTone={roster.data?.marked ? 'success' : 'danger'}
          title={`${t('Attendance')} ${current?.label || ''}`}
          subtitle={
            roster.error
              ? roster.error
              : roster.data?.marked
              ? 'Marked today'
              : 'Not marked yet · cut-off 10:00'
          }
          right={
            roster.data?.marked ? (
              <Badge label="Done" tone="success" />
            ) : (
              <SmallButton label="Mark" onPress={() => tabs?.go(TAB.attendance)} />
            )
          }
        />
        <ListRow
          icon={Pencil}
          title="Marks entry"
          subtitle="Your subjects · before the deadline"
          chevron
          onPress={() => tabs?.go(TAB.marks)}
        />
        <ListRow
          icon={Paperclip}
          title="Homework to check"
          subtitle={`${toCheck} ${t('new submissions')}`}
          right={<Badge label={String(toCheck)} tone={toCheck ? 'warn' : 'success'} />}
          onPress={() => nav.push('TeacherHomeworkList')}
        />
        <ListRow
          icon={Clock}
          title="Leave requests"
          subtitle={pendingLeaves.length ? `${pendingLeaves.length} ${t('waiting for you')}` : 'No pending requests'}
          right={
            <Badge
              label={pendingLeaves.length ? 'Review' : 'Done'}
              tone={pendingLeaves.length ? 'warn' : 'success'}
            />
          }
          onPress={() => nav.push('TeacherStudentLeaves')}
          last
        />
      </Card>
    </Screen>
  );
}

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export function TeacherTimetable() {
  const { t } = useI18n();
  const q = useApi('teacher.timetable', teacherApi.timetable);
  const { classes } = useMyClasses();
  return (
    <Screen title="My timetable" right={<BellButton count={0} />} refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q} isEmpty={d => d.slots.length === 0} emptyText="No periods have been assigned to you yet.">
        {d => {
          const days = (d.days?.length ? d.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map(x => x.slice(0, 3));
          const used = PERIODS.filter(p => d.slots.some(x => x.period === p));
          const periods = used.length ? PERIODS.slice(0, Math.max(...used)) : PERIODS.slice(0, 6);
          const rows: TimetableCell[][] = periods.map(p =>
            days.map(day => {
              const slot = d.slots.find(x => x.period === p && x.day.slice(0, 3) === day);
              if (!slot) {
                return { top: t('Free'), free: true };
              }
              const label = classLabelFor(classes, slot.classId, slot.section).replace(/^Class /, '');
              return { top: label, bottom: (slot.subject || '').slice(0, 4) };
            }),
          );
          return (
            <>
              <Text style={s.sub}>
                {d.slots.length} {t('periods a week')}
              </Text>
              <Card>
                <TimetableGrid days={days} times={periods.map(p => `P${p}`)} rows={rows} filled />
              </Card>
              <Card title="This week">
                {d.substitutions.length === 0 ? (
                  <Empty text="No substitutions this week." />
                ) : (
                  d.substitutions.map((x, i) => (
                    <ListRow
                      key={x.id}
                      icon={ArrowLeftRight}
                      title={subText(x)}
                      subtitle={dayLabel(x.recordDate)}
                      right={<Badge label="Substitution" tone="warn" />}
                      last={i === d.substitutions.length - 1}
                    />
                  ))
                )}
              </Card>
            </>
          );
        }}
      </QueryView>
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
  sub: { fontSize: 12.5, color: colors.textMuted },
});
