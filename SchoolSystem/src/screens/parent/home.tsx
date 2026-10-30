import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Bell as BellIcon,
  CalendarDays,
  Check,
  ChevronDown,
  File,
  Users,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  BellButton,
  Card,
  formatRs,
  HeroCard,
  InfoBanner,
  InfoTile,
  ListRow,
  Screen,
  Segmented,
} from '../../components/ui';
import { BottomSheet, useTabs } from '../../components/Tabs';
import { colors, radius } from '../../theme';
import { ScreenProps, useNav } from '../../navigation';
import { useI18n } from '../../i18n';
import { CHILDREN, NOTICES, PARENT, TODAY_LABEL } from '../../data/school';
import { useCurrentChild, useSelectChild } from '../../data/useChild';
import { DiaryContent, HomeworkContent, useChildFee } from '../shared';

const HOME_DIARY = [
  { subject: 'English', text: 'Read lesson 7, write 10 new words', posted: true },
  { subject: 'Mathematics', text: 'Exercise 4.2 Q1–6 in notebook', posted: true },
  { subject: 'Science', text: 'Not posted yet', posted: false },
];

function ChildDue({ childId }: { childId: string }) {
  const child = CHILDREN.find(c => c.id === childId) ?? CHILDREN[0];
  const { due } = useChildFee(child);
  return due > 0 ? (
    <Badge label={`${formatRs(due)} due`} tone="danger" />
  ) : (
    <Badge label="Paid" tone="success" />
  );
}

function ChildSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [id, setId] = useSelectChild();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={s.sheetTitle}>{t('Your children')}</Text>
      {CHILDREN.map((c, i) => (
        <ListRow
          key={c.id}
          avatar={c.name}
          title={c.name}
          subtitle={`${c.className} · ${c.campus}`}
          right={
            c.id === id ? (
              <Check size={20} color={colors.text} />
            ) : (
              <ChildDue childId={c.id} />
            )
          }
          onPress={() => {
            setId(c.id);
            onClose();
          }}
          last={i === CHILDREN.length - 1}
        />
      ))}
      <InfoBanner
        icon={Users}
        text={t("Children are linked by the father's CNIC. Ask the office if one is missing.")}
        style={s.sheetBanner}
      />
    </BottomSheet>
  );
}

export function ParentHome(_: ScreenProps) {
  const nav = useNav();
  const tabs = useTabs();
  const { t } = useI18n();
  const child = useCurrentChild();
  const { due } = useChildFee(child);
  const [sheet, setSheet] = useState(false);
  const notice = NOTICES[0];
  return (
    <Screen
      title={`${t('Assalam o Alaikum')}, ${t(PARENT.first)}`}
      subtitle={t(TODAY_LABEL)}
      right={<BellButton count={4} />}
    >
      <Pressable
        onPress={() => setSheet(true)}
        style={({ pressed }) => [s.switcher, pressed && s.pressed]}
      >
        <Avatar name={child.name} size={36} />
        <View style={s.flex}>
          <Text style={s.childName}>{child.name}</Text>
          <Text style={s.childSub}>
            {child.className} · {child.gr}
          </Text>
        </View>
        <ChevronDown size={20} color={colors.text} />
      </Pressable>

      <HeroCard
        label={due > 0 ? t('Fee due by 10 Nov') : t('All fee paid')}
        value={formatRs(due)}
        onPress={() => tabs?.go('fee')}
      />

      <View style={s.tiles}>
        <InfoTile
          label="Today"
          value={t('Present')}
          valueStyle={s.green}
          sub={`${t('Arrived')} 7:52 AM`}
          onPress={() => nav.push('Attendance')}
        />
        <InfoTile
          label="Attendance"
          value={`${child.attendance}%`}
          sub={t('This session')}
          onPress={() => nav.push('Attendance')}
        />
      </View>

      <Card
        title="Today's diary"
        action={{ label: 'All', onPress: () => tabs?.go('diary') }}
      >
        {HOME_DIARY.map((d, i) => (
          <ListRow
            key={d.subject}
            icon={File}
            title={t(d.subject)}
            subtitle={t(d.text)}
            right={
              d.posted ? (
                <Badge label="Posted" tone="success" />
              ) : (
                <Badge label="—" />
              )
            }
            onPress={() => tabs?.go('diary')}
            last={i === HOME_DIARY.length - 1}
          />
        ))}
      </Card>

      <Card
        title="Coming up"
        action={{ label: 'Calendar', onPress: () => nav.push('Calendar') }}
      >
        <ListRow
          icon={Users}
          title={t('PTM')}
          subtitle={t('Sat, 31 Oct · 9:00 AM')}
          onPress={() => nav.push('Calendar')}
        />
        <ListRow
          icon={CalendarDays}
          title={t('Winter vacation')}
          subtitle="21 Dec – 1 Jan"
          onPress={() => nav.push('Calendar')}
          last
        />
      </Card>

      <Card
        title="Notices and messages"
        action={{ label: 'All', onPress: () => nav.push('Notices') }}
      >
        <ListRow
          icon={BellIcon}
          title={notice.title}
          subtitle={notice.text}
          right={<Text style={s.when}>{notice.when}</Text>}
          onPress={() => nav.push('Notices')}
          last
        />
      </Card>

      <ChildSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}

export function ParentDiaryTab(_: ScreenProps) {
  const child = useCurrentChild();
  const [tab, setTab] = useState('Diary');
  return (
    <Screen title={tab} subtitle={child.className} right={<BellButton count={4} />}>
      <Segmented options={['Diary', 'Homework']} value={tab} onChange={setTab} />
      {tab === 'Diary' ? <DiaryContent /> : <HomeworkContent />}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  childName: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  childSub: { fontSize: 11.5, fontWeight: '600', color: colors.textMuted },
  tiles: { flexDirection: 'row', gap: 10 },
  green: { color: colors.success },
  when: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, alignSelf: 'flex-start' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sheetBanner: { marginTop: 12 },
});
