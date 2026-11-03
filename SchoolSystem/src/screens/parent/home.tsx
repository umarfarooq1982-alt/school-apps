import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell as BellIcon, CalendarDays, Check, ChevronDown, File, Paperclip, Users } from 'lucide-react-native';
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
import { Empty, QueryView } from '../../components/states';
import { colors, radius } from '../../theme';
import { ScreenProps, useNav } from '../../navigation';
import { useI18n } from '../../i18n';
import { getSession } from '../../api/session';
import { familyApi } from '../../api/mobile';
import { useCurrentChild, useSelectChild } from '../../data/useChild';
import {
  DiaryContent,
  EventsCard,
  fmtDate,
  fmtDay,
  HomeworkContent,
  MARK_LABEL,
  useChildren,
  useFamily,
  useNotices,
  useTimetable,
} from '../shared';

function ChildSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [id, select] = useSelectChild();
  const q = useChildren();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={s.sheetTitle}>{t('Your children')}</Text>
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No child is linked to this login.">
        {list =>
          list.map((c, i) => (
            <ListRow
              key={c.id}
              avatar={c.name}
              title={c.name}
              subtitle={`${c.className}-${c.section} · ${c.grNo}`}
              right={c.id === id ? <Check size={20} color={colors.text} /> : undefined}
              onPress={() => {
                select(c.id);
                onClose();
              }}
              last={i === list.length - 1}
            />
          ))
        }
      </QueryView>
      <InfoBanner
        icon={Users}
        text={t("Children are linked by the father's CNIC. Ask the office if one is missing.")}
        style={s.sheetBanner}
      />
    </BottomSheet>
  );
}

const ATT_TONE: Record<string, 'success' | 'danger' | 'warn' | 'info'> = {
  P: 'success',
  A: 'danger',
  L: 'warn',
  LV: 'info',
};

export function ParentHome(_: ScreenProps) {
  const nav = useNav();
  const tabs = useTabs();
  const { t, lang } = useI18n();
  const child = useCurrentChild();
  const home = useFamily('home', familyApi.home);
  const tt = useTimetable();
  const notices = useNotices();
  const [sheet, setSheet] = useState(false);
  const first = (getSession()?.user.name || '').split(' ')[0];
  const subjects = new Map((tt.data?.slots ?? []).map(x => [x.subjectId, x.subject]));
  const refresh = () => {
    home.refresh();
    notices.refresh();
  };
  return (
    <Screen
      title={`${t('Assalam o Alaikum')}${first ? `, ${first}` : ''}`}
      subtitle={home.data ? fmtDay(home.data.today.date) : undefined}
      right={<BellButton count={notices.data?.length || undefined} />}
      refreshing={home.refreshing}
      onRefresh={refresh}
    >
      <Pressable onPress={() => setSheet(true)} style={({ pressed }) => [s.switcher, pressed && s.pressed]}>
        <Avatar name={child.name || '?'} size={36} />
        <View style={s.flex}>
          <Text style={s.childName}>{child.name || t('Loading…')}</Text>
          <Text style={s.childSub}>
            {child.className} · {child.gr}
          </Text>
        </View>
        <ChevronDown size={20} color={colors.text} />
      </Pressable>

      <QueryView q={home}>
        {h => {
          const mark = h.today.attendance;
          const known = MARK_LABEL[mark];
          return (
            <>
              <HeroCard
                label={h.today.dues > 0 ? t('Fee due') : t('All fee paid')}
                value={formatRs(h.today.dues)}
                onPress={() => tabs?.go('fee')}
              />
              <View style={s.tiles}>
                <InfoTile
                  label="Today"
                  value={known ? t(known) : t(mark === 'Not marked' ? 'Not marked' : '—')}
                  valueStyle={known ? s[ATT_TONE[mark]] : undefined}
                  sub={fmtDate(h.today.date)}
                  onPress={() => nav.push('Attendance')}
                />
                <InfoTile
                  label="Homework due"
                  value={h.today.homeworkDue.length}
                  sub={t('Open the list')}
                  onPress={() => tabs?.go('diary')}
                />
              </View>

              <Card title="Today's diary" action={{ label: 'All', onPress: () => tabs?.go('diary') }}>
                {h.today.diary.length ? (
                  h.today.diary.map((d, i) => (
                    <ListRow
                      key={d.id}
                      icon={File}
                      title={(d.subjectId && subjects.get(d.subjectId)) || t('Diary')}
                      subtitle={d.topic || d.homework || ''}
                      right={<Badge label="Posted" tone="success" />}
                      onPress={() => tabs?.go('diary')}
                      last={i === h.today.diary.length - 1}
                    />
                  ))
                ) : (
                  <Empty text="No diary posted today yet." />
                )}
              </Card>

              {h.today.homeworkDue.length ? (
                <Card title="Homework due" action={{ label: 'All', onPress: () => tabs?.go('diary') }}>
                  {h.today.homeworkDue.map((w, i) => (
                    <ListRow
                      key={w.id}
                      icon={Paperclip}
                      title={w.title}
                      subtitle={`${t('due')} ${fmtDate(w.dueDate)}`}
                      onPress={() => tabs?.go('diary')}
                      last={i === h.today.homeworkDue.length - 1}
                    />
                  ))}
                </Card>
              ) : null}

              <EventsCard limit={3} />

              <Card title="Notices and messages" action={{ label: 'All', onPress: () => nav.push('Notices') }}>
                {h.today.notices.length ? (
                  h.today.notices.slice(0, 2).map((n, i, arr) => (
                    <ListRow
                      key={n.id}
                      icon={BellIcon}
                      title={n.title}
                      subtitle={lang === 'ur' && n.bodyUrdu ? n.bodyUrdu : n.body}
                      onPress={() => nav.push('Notices')}
                      last={i === arr.length - 1}
                    />
                  ))
                ) : (
                  <Empty text="No notices yet." />
                )}
              </Card>
            </>
          );
        }}
      </QueryView>
      <ListRow icon={CalendarDays} title={t('Open the calendar')} onPress={() => nav.push('Calendar')} chevron last />

      <ChildSheet visible={sheet} onClose={() => setSheet(false)} />
    </Screen>
  );
}

export function ParentDiaryTab(_: ScreenProps) {
  const child = useCurrentChild();
  const [tab, setTab] = useState('Diary');
  const notices = useNotices();
  return (
    <Screen title={tab} subtitle={child.className} right={<BellButton count={notices.data?.length || undefined} />}>
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
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sheetBanner: { marginTop: 12 },
  success: { color: colors.success },
  danger: { color: colors.danger },
  warn: { color: colors.warn },
  info: { color: colors.info },
});
