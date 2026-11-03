import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Camera, Clock, File, Send } from 'lucide-react-native';
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
  Screen,
  StatTile,
  toast,
} from '../../components/ui';
import { Empty, QueryView } from '../../components/states';
import { colors } from '../../theme';
import { useNav, useParam } from '../../navigation';
import { useShared } from '../../store';
import { useI18n } from '../../i18n';
import { useApi, useMutation } from '../../api/hooks';
import { teacherApi } from '../../api/mobile';
import { ClassChips, dayLabel, isoDate, subjectNameFor, useMyClasses } from './common';

type DiaryRow = {
  id: number;
  subject_id: number | null;
  staff_id?: number | null;
  entry_date: string;
  topic: string | null;
  homework: string | null;
};

// T09: Diary tab and pushed screen (params classKey, subjectId).
export function TeacherPostDiary() {
  const nav = useNav();
  const { t } = useI18n();
  const date = isoDate();
  const classKey = useParam<string>('classKey', '');
  const subjectParam = useParam<number | null>('subjectId', null);
  const { classes, current, setPicked, today } = useMyClasses();
  const cls = classes.find(c => c.key === classKey) || current;
  const [subjectId, setSubjectId] = useState<number | null>(subjectParam);
  const subject = cls?.subjects.find(x => x.subjectId === subjectId) || cls?.subjects[0];
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [, setPosted] = useShared<Record<string, boolean>>('teacher.diaryPosted', {});
  const post = useMutation(teacherApi.postDiary);

  const submit = async () => {
    if (!cls) {
      toast('No class is assigned to you yet');
      return;
    }
    if (topic.trim().length < 3) {
      toast('Write what was taught first');
      return;
    }
    const res = await post.run({
      classId: cls.classId,
      section: cls.section,
      subjectId: subject?.subjectId ?? null,
      topic: topic.trim(),
      homework: homework.trim() || undefined,
      date,
    });
    if (res) {
      setPosted(p => ({ ...p, [`${cls.key}.${subject?.subjectId ?? null}.${date}`]: true }));
      toast(`Diary posted for ${cls.label}. Parents can see it now.`);
      setTopic('');
      setHomework('');
      if (nav.canGoBack) {
        nav.pop();
      }
    }
  };

  return (
    <Screen
      title="Post diary"
      subtitle={dayLabel(date)}
      right={<IconButton icon={File} onPress={() => nav.push('TeacherClassDiary', { classKey: cls?.key })} />}
      footer={<Button icon={Send} label="Post · parents get a notification" onPress={submit} loading={post.busy} />}
    >
      <QueryView q={today} isEmpty={() => classes.length === 0} emptyText="No class is assigned to you yet.">
        {() => (
          <>
            <ClassChips classes={classes} value={cls?.key} onChange={k => setPicked(k)} />
            {cls && cls.subjects.length > 1 ? (
              <Chips
                options={cls.subjects.map(x => x.subject)}
                value={subject?.subject || ''}
                onChange={name => setSubjectId(cls.subjects.find(x => x.subject === name)?.subjectId ?? null)}
              />
            ) : null}
            <Text style={s.sub}>
              {cls?.label} · {subject?.subject || t('General')}
            </Text>
            <Field
              label="Classwork"
              value={topic}
              onChangeText={setTopic}
              multiline
              placeholder="What was taught today"
            />
            <Field
              label="Homework"
              value={homework}
              onChangeText={setHomework}
              multiline
              placeholder="What to do at home (optional)"
            />
            <Button
              label="Add photo or PDF"
              variant="outline"
              icon={Camera}
              onPress={() => toast('Attaching files needs the photo picker, which is not in the app yet.')}
            />
            <InfoBanner icon={Clock} text="You can edit today's diary until the school's cut-off time." />
            <Button
              label="Class diary"
              variant="outline"
              icon={File}
              onPress={() => nav.push('TeacherClassDiary', { classKey: cls?.key })}
            />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

// T10: the full day's diary for a class.
export function TeacherClassDiary() {
  const date = isoDate();
  const classKey = useParam<string>('classKey', '');
  const { classes, current, setPicked } = useMyClasses();
  const cls = classes.find(c => c.key === classKey) || current;
  const [filter, setFilter] = useState<'posted' | 'missing'>('posted');
  const q = useApi(cls ? `teacher.classDiary.${cls.key}.${date}` : null, () =>
    teacherApi.classDiary(cls!.classId, cls!.section, date) as Promise<DiaryRow[]>,
  );
  const rows = (q.data || []) as DiaryRow[];
  const missing = (cls?.subjects || []).filter(sub => !rows.some(r => r.subject_id === sub.subjectId));
  return (
    <Screen
      title="Class diary"
      subtitle={`${cls?.label || ''} · ${dayLabel(date)}`}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      <ClassChips classes={classes} value={cls?.key} onChange={setPicked} />
      <HStack gap={8}>
        <StatTile value={rows.length} label="Posted" active={filter === 'posted'} onPress={() => setFilter('posted')} />
        <StatTile value={missing.length} label="Not yet" active={filter === 'missing'} onPress={() => setFilter('missing')} />
      </HStack>
      <QueryView q={q}>
        {() =>
          filter === 'posted' ? (
            <Card>
              {rows.length === 0 ? (
                <Empty text="No diary posted for this class today." />
              ) : (
                rows.map((d, i) => (
                  <ListRow
                    key={d.id}
                    icon={File}
                    title={subjectNameFor(classes, d.subject_id)}
                    subtitle={[d.topic, d.homework].filter(Boolean).join(' · ')}
                    right={<Badge label="Posted" tone="success" />}
                    last={i === rows.length - 1}
                  />
                ))
              )}
            </Card>
          ) : (
            <Card>
              {missing.length === 0 ? (
                <Empty text="All your subjects are posted." />
              ) : (
                missing.map((m, i) => (
                  <ListRow
                    key={String(m.subjectId)}
                    icon={File}
                    iconTone="danger"
                    title={m.subject}
                    subtitle="Not posted yet"
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

const s = StyleSheet.create({
  sub: { fontSize: 12.5, color: colors.textMuted, fontWeight: '700' },
});
