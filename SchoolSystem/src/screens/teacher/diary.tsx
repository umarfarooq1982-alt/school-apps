import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, Clock, File, Send, X } from 'lucide-react-native';
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
  Placeholder,
  Screen,
  StatTile,
  toast,
} from '../../components/ui';
import { colors } from '../../theme';
import { useNav, useParam } from '../../navigation';
import { useShared } from '../../store';
import { useI18n } from '../../i18n';
import { CLASS_DIARY, MY_CLASSES } from '../../data/teacher';
import { useDiaryPosted } from './state';

const INITIAL_TEXT: Record<string, string> = {
  '5-A English':
    'Read lesson 7 "The Honest Woodcutter".\nLearn and write 10 new words in the copy.\nSpelling test on Monday.',
};

// T09: Diary tab and pushed screen (param classKey).
export function TeacherPostDiary() {
  const nav = useNav();
  const { t } = useI18n();
  const initialClass = useParam<string>('classKey', MY_CLASSES[0]);
  const [cls, setCls] = useState(
    MY_CLASSES.includes(initialClass) ? initialClass : MY_CLASSES[0],
  );
  const [texts, setTexts] = useShared<Record<string, string>>(
    'teacher.diaryText',
    INITIAL_TEXT,
  );
  const [photos, setPhotos] = useShared<Record<string, string[]>>(
    'teacher.diaryPhotos',
    { '5-A English': ['board.jpg'] },
  );
  const [posted, setPosted] = useDiaryPosted();
  const text = texts[cls] ?? '';
  const pics = photos[cls] ?? [];

  const post = () => {
    if (text.trim().length < 5) {
      toast('Write the classwork and homework first');
      return;
    }
    setPosted(p => ({ ...p, [cls]: true }));
    toast(`Diary posted for ${cls}. Parents notified.`);
    if (nav.canGoBack) {
      // Opened from Today: go back once posted.
      nav.pop();
    }
  };

  return (
    <Screen
      title="Post diary"
      subtitle="Thursday 22 Oct"
      right={
        <IconButton
          icon={File}
          onPress={() => nav.push('TeacherClassDiary')}
        />
      }
      footer={
        <Button
          icon={Send}
          label={
            posted[cls]
              ? 'Update · parents get a notification'
              : 'Post · parents get a notification'
          }
          onPress={post}
        />
      }
    >
      <Chips options={MY_CLASSES} value={cls} onChange={setCls} />
      <Field
        label="Classwork and homework"
        value={text}
        onChangeText={v => setTexts(p => ({ ...p, [cls]: v }))}
        multiline
        placeholder="What was taught and what to do at home"
      />
      <View style={s.photos}>
        {pics.map((p, i) => (
          <View key={`${p}-${i}`} style={s.photo}>
            <Placeholder label={p} height={78} />
            <Pressable
              style={s.remove}
              hitSlop={6}
              onPress={() =>
                setPhotos(prev => ({
                  ...prev,
                  [cls]: pics.filter((_, j) => j !== i),
                }))
              }
            >
              <X size={12} color={colors.white} />
            </Pressable>
          </View>
        ))}
        <Pressable
          style={s.add}
          onPress={() =>
            setPhotos(prev => ({
              ...prev,
              [cls]: [...pics, `photo-${pics.length + 1}.jpg`],
            }))
          }
        >
          <Camera size={18} color={colors.primaryText} />
          <Text style={s.addText}>{t('Add')}</Text>
        </Pressable>
      </View>
      <InfoBanner icon={Clock} text="You can edit today's diary until 8:00 PM." />
      {posted[cls] ? (
        <InfoBanner tone="success" text="Posted. Editing again re-sends the update." />
      ) : null}
      <Button
        label="Class diary"
        variant="outline"
        icon={File}
        onPress={() => nav.push('TeacherClassDiary')}
      />
    </Screen>
  );
}

// T10
export function TeacherClassDiary() {
  const [filter, setFilter] = useState<'posted' | 'missing'>('posted');
  const [posted] = useDiaryPosted();
  const rows = CLASS_DIARY.map(d =>
    d.subject === 'English' && posted['5-A English'] ? { ...d, posted: true } : d,
  );
  const done = rows.filter(r => r.posted);
  const missing = rows.filter(r => !r.posted);
  const list = filter === 'posted' ? [...done, ...missing] : missing;
  return (
    <Screen title="Class diary" subtitle="Class 5-A · Thursday 22 Oct">
      <HStack gap={8}>
        <StatTile
          value={done.length}
          label="Posted"
          active={filter === 'posted'}
          onPress={() => setFilter('posted')}
        />
        <StatTile
          value={missing.length}
          label="Not yet"
          active={filter === 'missing'}
          onPress={() => setFilter('missing')}
        />
      </HStack>
      <Card>
        {list.map((d, i) => (
          <ListRow
            key={d.subject}
            icon={File}
            iconTone={d.posted ? 'primary' : 'danger'}
            title={d.subject}
            subtitle={`${d.text} · ${d.teacher}`}
            right={
              d.posted ? (
                <Badge label={d.time} tone="success" />
              ) : (
                <Badge label="Missing" tone="danger" />
              )
            }
            last={i === list.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 88 },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 88,
    height: 78,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  addText: { fontSize: 12.5, fontWeight: '800', color: colors.primaryText },
});
