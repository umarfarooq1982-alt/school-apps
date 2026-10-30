import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BookOpen,
  Bus,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  Clock,
  File,
  FileText,
  Globe,
  GraduationCap,
  House,
  LayoutGrid,
  Lock,
  LogOut,
  Paperclip,
  Bell,
  Receipt,
  Send,
  TriangleAlert,
  User,
  X,
} from 'lucide-react-native';
import {
  Badge,
  BellButton,
  Body,
  Button,
  Card,
  Field,
  HeroCard,
  HStack,
  IconButton,
  InfoTile,
  ListRow,
  Muted,
  Placeholder,
  QRCode,
  Screen,
  Toggle,
  toast,
  Avatar,
  InfoBanner,
  formatRs,
} from '../../components/ui';
import { TabShell, useTabs } from '../../components/Tabs';
import { ScreenMap, useNav, useParam } from '../../navigation';
import { useShared, useSession } from '../../store';
import { useI18n } from '../../i18n';
import { colors, radius } from '../../theme';
import {
  HOMEWORK,
  LIBRARY,
  STUDENT,
  TODAY_PERIODS,
} from '../../data/school';
import {
  HomeworkScreen,
  ResultsScreen,
  TimetableScreen,
  useChildFee,
} from '../shared';

type HwStatus = 'Pending' | 'Submitted' | 'Checked';
const HW_INITIAL: Record<string, HwStatus> = Object.fromEntries(
  HOMEWORK.map(h => [h.id, h.status]),
);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) {
    return 'Good morning';
  }
  if (h < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

// ---------- S04 Today ----------

function StudentToday() {
  const nav = useNav();
  const tabs = useTabs();
  const { t } = useI18n();
  const [status] = useShared('hw.status', HW_INITIAL);
  const now = TODAY_PERIODS.find(p => p.now) ?? TODAY_PERIODS[0];
  const upcoming = TODAY_PERIODS.filter(p => !p.now);
  const due = HOMEWORK.filter(h => status[h.id] === 'Pending');
  const overdue = LIBRARY.issued.filter(b => b.tone === 'danger').length;

  return (
    <Screen
      title={`${t(greeting())}, ${STUDENT.name.split(' ')[0]}`}
      subtitle={`${STUDENT.className} · Thursday 22 Oct`}
      right={<BellButton count={3} />}
    >
      <HeroCard
        label={`${t('Now')} · Period ${now.period} · ${now.time}`}
        value={t(now.subject)}
        onPress={() => tabs?.go('timetable')}
      >
        <Text style={s.heroSub}>
          {now.teacher} · Room {now.room}
        </Text>
      </HeroCard>

      <Card
        title="Coming up today"
        action={{ label: 'Timetable', onPress: () => tabs?.go('timetable') }}
      >
        {upcoming.map((p, i) => (
          <ListRow
            key={p.subject}
            icon={Clock}
            title={t(p.subject)}
            subtitle={`${p.time} · ${p.teacher}`}
            right={p.next ? <Badge label="Next" tone="warn" /> : undefined}
            last={i === upcoming.length - 1}
          />
        ))}
      </Card>

      <Card
        title="Homework due"
        action={{ label: 'All', onPress: () => tabs?.go('homework') }}
      >
        {due.length === 0 ? (
          <Muted>{t('Nothing due. Well done!')}</Muted>
        ) : (
          due.map((h, i) => (
            <ListRow
              key={h.id}
              icon={Paperclip}
              title={h.title}
              subtitle={`${t(h.subject)} · ${h.due}`}
              right={<Badge label="Pending" tone="warn" />}
              onPress={() => nav.push('StudentSubmitHomework', { id: h.id })}
              last={i === due.length - 1}
            />
          ))
        )}
      </Card>

      <HStack>
        <InfoTile
          label="Attendance"
          value={`${STUDENT.attendance}%`}
          sub={t('Present today')}
          onPress={() => nav.push('Attendance')}
        />
        <InfoTile
          label="Library"
          value={`${LIBRARY.issued.length} ${t('books')}`}
          sub={`${overdue} ${t('overdue')}`}
          onPress={() => nav.push('Library')}
        />
      </HStack>

      <Card title="Notices" action={{ label: 'All', onPress: () => nav.push('Notices') }}>
        <ListRow
          icon={GraduationCap}
          title="Result published"
          subtitle="Mid-term results are in the app."
          onPress={() => tabs?.go('results')}
          last
        />
      </Card>
    </Screen>
  );
}

// ---------- S08 Submit homework ----------

function StudentSubmitHomework() {
  const nav = useNav();
  const { t } = useI18n();
  const id = useParam('id', HOMEWORK[0].id);
  const hw = HOMEWORK.find(h => h.id === id) ?? HOMEWORK[0];
  const [status, setStatus] = useShared('hw.status', HW_INITIAL);
  const [answer, setAnswer] = useState('');
  const [pages, setPages] = useState<string[]>([]);
  const done = status[hw.id] !== 'Pending';

  const submit = () => {
    if (!answer.trim() && pages.length === 0) {
      toast(t('Write an answer or add a photo'));
      return;
    }
    setStatus(prev => ({ ...prev, [hw.id]: 'Submitted' }));
    toast(t('Homework submitted'));
    nav.pop();
  };

  return (
    <Screen
      title={hw.title}
      subtitle={`${t(hw.subject)} · ${hw.due} · ${hw.maxMarks} ${t('marks')}`}
      footer={
        done ? (
          <InfoBanner tone="success" icon={Check} text={t('Already submitted')} />
        ) : (
          <Button label="Submit homework" icon={Send} onPress={submit} />
        )
      }
    >
      <Card title="Instructions">
        <Body>{hw.instructions}</Body>
        {hw.file ? (
          <View style={s.fileRow}>
            <FileText size={16} color={colors.textMuted} />
            <Text style={s.fileText}>{hw.file}</Text>
          </View>
        ) : null}
      </Card>
      {done ? null : (
        <>
          <Field
            label="Your answer"
            value={answer}
            onChangeText={setAnswer}
            multiline
            placeholder={t('Type your answer here')}
          />
          <View style={s.pages}>
            {pages.map((p, i) => (
              <View key={p} style={s.page}>
                <Placeholder label={p} height={86} />
                <IconButton
                  icon={X}
                  style={s.pageRemove}
                  onPress={() => setPages(ps => ps.filter((_, j) => j !== i))}
                />
              </View>
            ))}
            {pages.length < 6 ? (
              <View style={s.page}>
                <Button
                  label="Add"
                  icon={Camera}
                  variant="outline"
                  style={s.addPage}
                  onPress={() =>
                    setPages(ps => [...ps, `page ${ps.length + 1}`])
                  }
                />
              </View>
            ) : null}
          </View>
          <Muted>{t('Add a clear photo of each page, or a PDF.')}</Muted>
        </>
      )}
    </Screen>
  );
}

// ---------- S18 Fee (view only) ----------

function StudentFee() {
  const { vouchers } = useChildFee(STUDENT);
  const list = vouchers.filter(v => v.month !== 'Annual charges');
  const anyUnpaid = list.some(v => v.status === 'Unpaid');
  return (
    <Screen
      title="My fee"
      subtitle="View only. Parents pay from the parent app."
    >
      <Card>
        {list.map((v, i) => {
          const isPaid = v.status === 'Paid';
          return (
            <ListRow
              key={v.id}
              icon={Receipt}
              title={v.month}
              subtitle={v.note}
              right={
                <View style={s.amountCol}>
                  <Text style={s.amount}>{formatRs(v.amount)}</Text>
                  <Badge
                    label={isPaid ? 'Paid' : 'Unpaid'}
                    tone={isPaid ? 'success' : 'danger'}
                  />
                </View>
              }
              last={i === list.length - 1}
            />
          );
        })}
      </Card>
      {anyUnpaid ? (
        <InfoBanner
          tone="warn"
          icon={TriangleAlert}
          text="Admit cards and report cards are held while fee is unpaid."
        />
      ) : null}
    </Screen>
  );
}

// ---------- S19 My profile ----------

function StudentProfile() {
  const nav = useNav();
  const { signOut } = useSession();
  const { t, lang, setLang } = useI18n();
  const toggleLang = () => setLang(lang === 'en' ? 'ur' : 'en');
  return (
    <Screen
      title="Me"
      right={<IconButton icon={Globe} onPress={toggleLang} />}
    >
      <Card style={s.idCard}>
        <Avatar name={STUDENT.name} size={64} ring />
        <Text style={s.idName}>{STUDENT.name}</Text>
        <Text style={s.idMeta}>
          {STUDENT.gr} · {STUDENT.className} · Roll {STUDENT.roll}
        </Text>
        <QRCode value={STUDENT.gr} size={120} />
        <Text style={s.idValid}>{t('Digital ID card · valid till 31 Mar 2027')}</Text>
      </Card>
      <Card>
        <ListRow
          icon={Lock}
          title={t('Change password')}
          onPress={() => nav.push('ChangePassword')}
        />
        <ListRow
          icon={Globe}
          title={t('Language')}
          subtitle="English / اردو"
          right={<Toggle value={lang === 'ur'} onChange={toggleLang} />}
        />
        <ListRow
          icon={LogOut}
          title={t('Sign out')}
          onPress={() => {
            signOut();
            nav.reset('RoleSelect');
          }}
          last
        />
      </Card>
    </Screen>
  );
}

// ---------- S20 More ----------

function StudentMore() {
  const nav = useNav();
  const { t } = useI18n();
  const groups: Array<
    Array<{ icon: typeof File; label: string; route: string }>
  > = [
    [
      { icon: File, label: 'Daily diary', route: 'Diary' },
      { icon: Check, label: 'Attendance', route: 'Attendance' },
      { icon: CalendarDays, label: 'Exams and date sheet', route: 'Exams' },
      { icon: Calendar, label: 'Calendar', route: 'Calendar' },
      { icon: BookOpen, label: 'Library', route: 'Library' },
      { icon: Bus, label: 'Transport', route: 'Transport' },
    ],
    [
      { icon: Bell, label: 'Notices', route: 'Notices' },
      { icon: Receipt, label: 'Fee', route: 'StudentFee' },
      { icon: GraduationCap, label: 'Report card', route: 'ReportCard' },
      { icon: User, label: 'My profile and ID card', route: 'StudentProfile' },
    ],
  ];
  return (
    <Screen title="More" right={<BellButton count={3} />}>
      {groups.map((g, gi) => (
        <Card key={gi}>
          {g.map((item, i) => (
            <ListRow
              key={item.route}
              icon={item.icon}
              title={t(item.label)}
              onPress={() => nav.push(item.route)}
              last={i === g.length - 1}
            />
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function StudentTabs() {
  return (
    <TabShell
      tabs={[
        { key: 'today', label: 'Today', icon: House, component: StudentToday },
        { key: 'timetable', label: 'Timetable', icon: CalendarDays, component: TimetableScreen },
        { key: 'homework', label: 'Homework', icon: Paperclip, component: HomeworkScreen },
        { key: 'results', label: 'Results', icon: GraduationCap, component: ResultsScreen },
        { key: 'more', label: 'More', icon: LayoutGrid, component: StudentMore },
      ]}
    />
  );
}

export const studentScreens: ScreenMap = {
  StudentTabs,
  StudentSubmitHomework,
  StudentFee,
  StudentProfile,
};

const s = StyleSheet.create({
  heroSub: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 11,
    marginTop: 10,
  },
  fileText: { fontSize: 13.5, color: colors.textMuted, fontWeight: '600' },
  pages: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  page: { width: 92 },
  pageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  addPage: {
    height: 86,
    flexDirection: 'column',
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  amountCol: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '800', color: colors.text },
  idCard: { alignItems: 'center', gap: 6, paddingVertical: 18 },
  idName: { fontSize: 18, fontWeight: '800', color: colors.text },
  idMeta: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  idValid: { fontSize: 11.5, color: colors.textMuted, fontWeight: '600' },
});
