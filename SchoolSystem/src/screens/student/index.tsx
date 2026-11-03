import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  BookOpen,
  Bus,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  Clock,
  File,
  Globe,
  GraduationCap,
  House,
  LayoutGrid,
  Lock,
  LogOut,
  Paperclip,
  Receipt,
  Send,
  TriangleAlert,
  User,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  BellButton,
  Body,
  Button,
  Card,
  Field,
  formatRs,
  HeroCard,
  HStack,
  IconButton,
  InfoBanner,
  InfoTile,
  ListRow,
  Muted,
  QRCode,
  Screen,
  toast,
  Toggle,
} from '../../components/ui';
import { QueryView } from '../../components/states';
import { TabShell, useTabs } from '../../components/Tabs';
import { ScreenMap, useNav, useParam } from '../../navigation';
import { useSession } from '../../store';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { familyApi } from '../../api/mobile';
import { useMutation } from '../../api/hooks';
import { useCurrentChild } from '../../data/useChild';
import {
  cap,
  fmtDate,
  fmtDay,
  HomeworkScreen,
  hwBucket,
  MARK_LABEL,
  monthLabel,
  ResultsScreen,
  statusTone,
  TimetableScreen,
  todayIso,
  useFamily,
  useFees,
  useHomework,
  useTimetable,
} from '../shared';

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

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------- S04 Today ----------

function StudentToday() {
  const nav = useNav();
  const tabs = useTabs();
  const { t, lang } = useI18n();
  const child = useCurrentChild();
  const home = useFamily('home', familyApi.home);
  const tt = useTimetable();
  const lib = useFamily('library', familyApi.library);
  const dow = DOW[new Date().getDay()];
  const periods = (tt.data?.slots ?? [])
    .filter(x => x.day === dow || x.day.slice(0, 3) === dow)
    .sort((a, b) => a.period - b.period);
  const books = (lib.data ?? []).filter(b => !b.returnedOn);
  const overdue = books.filter(b => b.dueOn < todayIso()).length;
  const first = child.name.split(' ')[0];

  return (
    <Screen
      title={`${t(greeting())}${first ? `, ${first}` : ''}`}
      subtitle={home.data ? `${child.className} · ${fmtDay(home.data.today.date)}` : child.className}
      right={<BellButton />}
      refreshing={home.refreshing}
      onRefresh={() => {
        home.refresh();
        tt.refresh();
        lib.refresh();
      }}
    >
      <QueryView q={home}>
        {h => (
          <>
            {periods.length ? (
              <HeroCard
                label={`${t('Today')} · ${periods.length} ${t('periods')}`}
                value={periods[0].subject ? t(periods[0].subject) : t('Free')}
                onPress={() => tabs?.go('timetable')}
              >
                <Text style={s.heroSub}>
                  {t('Period')} {periods[0].period}
                </Text>
              </HeroCard>
            ) : null}

            <Card title="Coming up today" action={{ label: 'Timetable', onPress: () => tabs?.go('timetable') }}>
              {periods.length ? (
                periods.map((p, i) => (
                  <ListRow
                    key={p.period}
                    icon={Clock}
                    title={p.subject ? t(p.subject) : t('Free')}
                    subtitle={`${t('Period')} ${p.period}`}
                    last={i === periods.length - 1}
                  />
                ))
              ) : (
                <Muted>{t('No classes today.')}</Muted>
              )}
            </Card>

            <Card title="Homework due" action={{ label: 'All', onPress: () => tabs?.go('homework') }}>
              {h.today.homeworkDue.length === 0 ? (
                <Muted>{t('Nothing due. Well done!')}</Muted>
              ) : (
                h.today.homeworkDue.map((w, i) => (
                  <ListRow
                    key={w.id}
                    icon={Paperclip}
                    title={w.title}
                    subtitle={`${t('due')} ${fmtDate(w.dueDate)}`}
                    right={<Badge label="Pending" tone="warn" />}
                    onPress={() => nav.push('StudentSubmitHomework', { id: w.id })}
                    last={i === h.today.homeworkDue.length - 1}
                  />
                ))
              )}
            </Card>

            <HStack>
              <InfoTile
                label="Attendance"
                value={MARK_LABEL[h.today.attendance] ? t(MARK_LABEL[h.today.attendance]) : '—'}
                sub={t('Today')}
                onPress={() => nav.push('Attendance')}
              />
              <InfoTile
                label="Library"
                value={`${books.length} ${t('books')}`}
                sub={`${overdue} ${t('overdue')}`}
                onPress={() => nav.push('Library')}
              />
            </HStack>

            <Card title="Notices" action={{ label: 'All', onPress: () => nav.push('Notices') }}>
              {h.today.notices.length ? (
                h.today.notices.slice(0, 2).map((n, i, arr) => (
                  <ListRow
                    key={n.id}
                    icon={Bell}
                    title={n.title}
                    subtitle={lang === 'ur' && n.bodyUrdu ? n.bodyUrdu : n.body}
                    onPress={() => nav.push('Notices')}
                    last={i === arr.length - 1}
                  />
                ))
              ) : (
                <Muted>{t('No notices yet.')}</Muted>
              )}
            </Card>
          </>
        )}
      </QueryView>
    </Screen>
  );
}

// ---------- S08 Submit homework ----------

function StudentSubmitHomework() {
  const nav = useNav();
  const { t } = useI18n();
  const id = useParam<number>('id', 0);
  const q = useHomework();
  const hw = q.data?.find(h => h.id === id);
  const [answer, setAnswer] = useState('');
  const submit = useMutation((note: string) => familyApi.submitHomework(id, note), 'Homework submitted');
  const done = hw ? hwBucket(hw) !== 'Pending' : false;

  const send = async () => {
    if (!answer.trim()) {
      toast(t('Write an answer first'));
      return;
    }
    const r = await submit.run(answer.trim());
    if (r) {
      q.setData(list => (list ?? []).map(h => (h.id === id ? { ...h, status: 'submitted', submission: r } : h)));
      nav.pop();
    }
  };

  return (
    <Screen
      title={hw?.title ?? 'Homework'}
      subtitle={hw ? `${hw.subject ?? t('General')} · ${t('due')} ${fmtDate(hw.dueDate)}` : undefined}
      footer={
        done ? (
          <InfoBanner tone="success" icon={Check} text={t('Already submitted')} />
        ) : (
          <Button label="Submit homework" icon={Send} onPress={send} loading={submit.busy} />
        )
      }
    >
      <QueryView q={q} isEmpty={list => !list.some(h => h.id === id)} emptyText="This homework was not found.">
        {() =>
          hw ? (
            <>
              <Card title="Instructions">
                <Body>{hw.body || t('No instructions.')}</Body>
              </Card>
              {done ? (
                hw.submission?.note ? (
                  <Card title="Your answer">
                    <Body>{String(hw.submission.note)}</Body>
                    {hw.submission.marks !== undefined ? (
                      <Text style={s.marks}>
                        {t('Marks')}: {String(hw.submission.marks)}
                      </Text>
                    ) : null}
                  </Card>
                ) : null
              ) : (
                <>
                  <Field
                    label="Your answer"
                    value={answer}
                    onChangeText={setAnswer}
                    multiline
                    placeholder={t('Type your answer here')}
                  />
                  <View style={s.pages}>
                    <View style={s.page}>
                      <Button
                        label="Add"
                        icon={Camera}
                        variant="outline"
                        style={s.addPage}
                        onPress={() => toast(t('Attaching photos is coming soon'))}
                      />
                    </View>
                  </View>
                  <Muted>{t('Photo and PDF upload is coming soon. Type your answer for now.')}</Muted>
                </>
              )}
            </>
          ) : null
        }
      </QueryView>
    </Screen>
  );
}

// ---------- S18 Fee (view only) ----------

function StudentFee() {
  const q = useFees();
  const { t } = useI18n();
  return (
    <Screen
      title="My fee"
      subtitle="View only. Parents pay from the parent app."
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      <QueryView q={q} isEmpty={d => d.vouchers.length === 0} emptyText="No vouchers yet.">
        {d => (
          <>
            <Card>
              {d.vouchers.map((v, i) => {
                const open = v.status === 'unpaid' || v.status === 'partial';
                return (
                  <ListRow
                    key={v.id}
                    icon={Receipt}
                    title={v.month ? monthLabel(v.month) : v.title || v.voucherNo}
                    subtitle={open ? `${t('Due')} ${fmtDate(v.dueDate)}` : t('Paid')}
                    right={
                      <View style={s.amountCol}>
                        <Text style={s.amount}>{formatRs(open ? v.balance : v.amount)}</Text>
                        <Badge label={cap(v.status)} tone={statusTone(v.status)} />
                      </View>
                    }
                    last={i === d.vouchers.length - 1}
                  />
                );
              })}
            </Card>
            {d.dues > 0 ? (
              <InfoBanner
                tone="warn"
                icon={TriangleAlert}
                text="Admit cards and report cards are held while fee is unpaid."
              />
            ) : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

// ---------- S19 My profile ----------

function StudentProfile() {
  const nav = useNav();
  const { signOut } = useSession();
  const { t, lang, setLang } = useI18n();
  const q = useFamily('profile', familyApi.profile);
  const toggleLang = () => setLang(lang === 'en' ? 'ur' : 'en');
  return (
    <Screen
      title="Me"
      right={<IconButton icon={Globe} onPress={toggleLang} />}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      <QueryView q={q}>
        {p => (
          <Card style={s.idCard}>
            <Avatar name={p.name} size={64} ring />
            <Text style={s.idName}>{p.name}</Text>
            <Text style={s.idMeta}>
              {p.grNo} · {p.className}-{p.section}
              {p.rollNo ? ` · ${t('Roll')} ${p.rollNo}` : ''}
            </Text>
            <QRCode value={p.grNo} size={120} />
            <Text style={s.idValid}>{t('Digital ID card')}</Text>
          </Card>
        )}
      </QueryView>
      <Card>
        <ListRow icon={Lock} title={t('Change password')} onPress={() => nav.push('ChangePassword')} />
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
  const groups: Array<Array<{ icon: typeof File; label: string; route: string }>> = [
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
    <Screen title="More" right={<BellButton />}>
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
  marks: { fontSize: 13.5, color: colors.textMuted, fontWeight: '700', marginTop: 8 },
  pages: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  page: { width: 92 },
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
