import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ArrowLeftRight,
  CalendarDays,
  Clock,
  Download,
  File,
  Flag,
  GraduationCap,
  Image as ImageIcon,
  Paperclip,
  Star,
  TriangleAlert,
  Users,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  BellButton,
  Button,
  Card,
  Chips,
  DayStatus,
  HeroCard,
  HeroPill,
  IconButton,
  IconType,
  InfoBanner,
  ListRow,
  MonthCalendar,
  Placeholder,
  QRCode,
  Screen,
  Segmented,
  StatTile,
  TimetableGrid,
  toast,
} from '../../components/ui';
import { colors, radius, Tone } from '../../theme';
import { ScreenProps, useNav, useParam } from '../../navigation';
import { useSession, useShared } from '../../store';
import { useI18n } from '../../i18n';
import {
  ATTENDANCE_NOTES,
  CalEvent,
  CLASS_TIMETABLE,
  DATE_SHEET,
  DIARY,
  DIARY_DAYS,
  DIARY_OLDER,
  DiaryEntry,
  EVENTS,
  HOMEWORK,
  OCT_ATTENDANCE,
  PARENT,
  RESULT,
  SCHOOL,
  SYLLABUS,
  TODAY_PERIODS,
  TT_TIMES,
} from '../../data/school';
import { useCurrentChild } from '../../data/useChild';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function useBellCount() {
  const { role } = useSession();
  return role === 'student' ? 3 : 4;
}

function Bell() {
  return <BellButton count={useBellCount()} />;
}

// ---------- Attendance ----------

// Plausible marks for any month of the session (Apr 2026 – Mar 2027).
function monthMarks(year: number, month: number): Record<number, DayStatus> {
  if (year === 2026 && month === 9) {
    return OCT_ATTENDANCE;
  }
  const marks: Record<number, DayStatus> = {};
  const days = new Date(year, month + 1, 0).getDate();
  const key = year * 12 + month;
  const inSession = key >= 2026 * 12 + 3 && key < 2026 * 12 + 9;
  const summer = year === 2026 && (month === 5 || month === 6);
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 0 || (summer && inSession)) {
      marks[d] = 'holiday';
    } else if (inSession) {
      marks[d] = 'present';
    }
  }
  if (inSession && !summer) {
    const a = ((month * 7) % 24) + 2;
    const l = ((month * 11) % 22) + 3;
    if (marks[a] === 'present') {
      marks[a] = 'absent';
    }
    if (marks[l] === 'present') {
      marks[l] = 'late';
    }
  }
  return marks;
}

function percent(marks: Record<number, DayStatus>) {
  const v = Object.values(marks);
  const school = v.filter(m => m !== 'holiday').length;
  if (!school) {
    return null;
  }
  const ok = v.filter(m => m === 'present' || m === 'late').length;
  return Math.round((ok / school) * 100);
}

export function AttendanceScreen(_: ScreenProps) {
  const child = useCurrentChild();
  const { t } = useI18n();
  const [ym, setYm] = useState({ y: 2026, m: 9 });
  const marks = useMemo(() => monthMarks(ym.y, ym.m), [ym]);
  const pct = percent(marks);
  const absent = Object.entries(marks).filter(([, s]) => s === 'absent');
  const late = Object.entries(marks).filter(([, s]) => s === 'late');
  const isOct = ym.y === 2026 && ym.m === 9;
  const shift = (d: number) =>
    setYm(({ y, m }) => {
      const k = y * 12 + m + d;
      return { y: Math.floor(k / 12), m: k % 12 };
    });
  const short = MONTH_NAMES[ym.m].slice(0, 3);
  const notes = isOct
    ? ATTENDANCE_NOTES
    : [
        ...absent.map(([d]) => ({
          title: `${d} ${short} · Absent`,
          sub: 'SMS sent to you at 10:30 AM',
          kind: 'absent' as const,
        })),
        ...late.map(([d]) => ({
          title: `${d} ${short} · Late`,
          sub: 'Arrived 8:18 AM',
          kind: 'late' as const,
        })),
      ];
  return (
    <Screen
      title="Attendance"
      subtitle={`${child.name} · ${child.className}`}
      right={<Bell />}
    >
      <View style={s.stats}>
        <StatTile value={`${child.attendance}%`} label="Session" active />
        <StatTile value={pct === null ? '—' : `${pct}%`} label={MONTH_NAMES[ym.m]} />
        <StatTile value={absent.length} label="Absent" />
        <StatTile value={late.length} label="Late" />
      </View>
      <Card>
        <MonthCalendar
          year={ym.y}
          month={ym.m}
          marks={marks}
          selected={isOct ? 22 : undefined}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
        />
      </Card>
      <Card title="Notes">
        {notes.length ? (
          notes.map((n, i) => (
            <ListRow
              key={n.title}
              icon={n.kind === 'absent' ? TriangleAlert : Clock}
              iconTone={n.kind === 'absent' ? 'danger' : 'primary'}
              title={n.title}
              subtitle={n.sub}
              last={i === notes.length - 1}
            />
          ))
        ) : (
          <Text style={s.empty}>{t('No absences or late arrivals.')}</Text>
        )}
      </Card>
    </Screen>
  );
}

// ---------- Diary ----------

const DIARY_BY_DAY: Record<string, DiaryEntry[]> = {
  Today: DIARY,
  'Wed 21': DIARY_OLDER,
  'Tue 20': [
    { subject: 'English', text: 'Grammar: past tense worksheet, page 32.', teacher: 'Sadia Anwar', time: '8:45 AM' },
    { subject: 'Computer', text: 'Typing practice, 15 minutes at home.', teacher: 'Usman Ali', time: '12:10 PM' },
  ],
  'Mon 19': [
    { subject: 'Mathematics', text: 'Exercise 4.1, Q1–8. Learn the table of 12.', teacher: 'Imran Haider', time: '9:50 AM', attachment: 'exercise-4-1.jpg' },
    { subject: 'Social Studies', text: 'Read chapter 3 and colour the map.', teacher: 'Nida Khan', time: '11:45 AM' },
  ],
};

export function DiaryContent() {
  const [day, setDay] = useState('Today');
  const entries = DIARY_BY_DAY[day] ?? [];
  return (
    <>
      <Chips options={DIARY_DAYS} value={day} onChange={setDay} />
      {entries.map(e => (
        <Card key={e.subject + e.text}>
          <Text style={s.subject}>{e.subject}</Text>
          <Text style={[s.diaryText, e.rtl && s.rtl]}>{e.text}</Text>
          {e.attachment ? (
            <Placeholder
              label={e.attachment}
              icon={ImageIcon}
              height={80}
              style={s.attach}
            />
          ) : null}
          <View style={s.tags}>
            {e.teacher ? <Badge label={e.teacher} /> : null}
            {e.time ? <Badge label={e.time} /> : null}
          </View>
        </Card>
      ))}
    </>
  );
}

export function DiaryScreen(_: ScreenProps) {
  const child = useCurrentChild();
  return (
    <Screen title="Diary" subtitle={child.className} right={<Bell />}>
      <DiaryContent />
    </Screen>
  );
}

// ---------- Homework ----------

export type HwStatus = 'Pending' | 'Submitted' | 'Checked';

export function useHomeworkStatus() {
  return useShared<Record<string, HwStatus>>(
    'hw.status',
    Object.fromEntries(HOMEWORK.map(h => [h.id, h.status])),
  );
}

const HW_TONE: Record<HwStatus, Tone> = {
  Pending: 'warn',
  Submitted: 'info',
  Checked: 'success',
};

export function HomeworkContent() {
  const { role } = useSession();
  const nav = useNav();
  const { t } = useI18n();
  const [status] = useHomeworkStatus();
  const [tab, setTab] = useState<HwStatus>('Pending');
  const isStudent = role === 'student';
  const list = HOMEWORK.map(h => ({ ...h, status: status[h.id] ?? h.status }));
  const count = (st: HwStatus) => list.filter(h => h.status === st).length;
  const order: HwStatus[] = ['Pending', 'Submitted', 'Checked'];
  const labels = order.map(st =>
    st === 'Pending'
      ? `${t(isStudent ? 'To do' : 'Pending')} ${count(st)}`
      : `${t(st)} ${count(st)}`,
  );
  const shown = list.filter(h => h.status === tab);
  const comments = shown.filter(h => h.comment);
  return (
    <>
      <Segmented
        options={labels}
        value={labels[order.indexOf(tab)]}
        onChange={v => setTab(order[labels.indexOf(v)])}
      />
      <Card>
        {shown.length ? (
          shown.map((h, i) => {
            const sub =
              h.status === 'Checked' && h.marks
                ? `${h.subject} · ${h.marks}`
                : h.status === 'Submitted'
                ? `${h.subject} · ${h.note ?? 'submitted'}`
                : `${h.subject} · ${h.due}${isStudent ? ` · ${h.maxMarks} marks` : ''}`;
            const canOpen = isStudent && h.status === 'Pending';
            return (
              <ListRow
                key={h.id}
                icon={Paperclip}
                title={h.title}
                subtitle={sub}
                last={i === shown.length - 1}
                chevron={canOpen}
                onPress={
                  canOpen
                    ? () => nav.push('StudentSubmitHomework', { id: h.id })
                    : undefined
                }
                right={
                  canOpen ? undefined : h.status === 'Checked' && isStudent && h.marks ? (
                    <Badge label={h.marks.replace('/', ' / ')} tone="success" />
                  ) : (
                    <Badge
                      label={
                        isStudent && h.status === 'Submitted' ? 'Waiting' : h.status
                      }
                      tone={HW_TONE[h.status]}
                    />
                  )
                }
              />
            );
          })
        ) : (
          <Text style={s.empty}>{t('Nothing here right now.')}</Text>
        )}
      </Card>
      {comments.map(h => (
        <Card key={`c-${h.id}`}>
          <Text style={s.quote}>“{h.comment}”</Text>
          <Text style={s.quoteSub}>Teacher comment on {h.title}</Text>
        </Card>
      ))}
    </>
  );
}

export function HomeworkScreen(_: ScreenProps) {
  const child = useCurrentChild();
  const { role } = useSession();
  return (
    <Screen
      title="Homework"
      subtitle={role === 'student' ? undefined : child.className}
      right={<Bell />}
    >
      <HomeworkContent />
    </Screen>
  );
}

// ---------- Timetable & calendar ----------

function ClassGrid() {
  return (
    <Card>
      <TimetableGrid
        times={TT_TIMES}
        rows={CLASS_TIMETABLE}
        breakAfter={2}
        breakLabel="Break 9:20 – 9:40"
        highlight={[1, 3]}
      />
    </Card>
  );
}

function NowCard() {
  return (
    <Card>
      <ListRow
        icon={Clock}
        title="Now: English"
        subtitle="Period 2 · Sadia Anwar · Room R105"
        right={<Badge label="8:40 – 9:20" tone="warn" />}
        last
      />
    </Card>
  );
}

const EVENT_ICON: Record<CalEvent['kind'], IconType> = {
  Event: Star,
  Exams: GraduationCap,
  Holiday: Flag,
  Vacation: CalendarDays,
};
const EVENT_TONE: Record<CalEvent['kind'], Tone> = {
  Event: 'success',
  Exams: 'info',
  Holiday: 'danger',
  Vacation: 'danger',
};

export function EventsCard() {
  return (
    <Card title="Coming up">
      {EVENTS.map((e, i) => (
        <ListRow
          key={e.title}
          icon={e.title === 'PTM' ? Users : EVENT_ICON[e.kind]}
          title={e.title}
          subtitle={e.when}
          right={<Badge label={e.kind} tone={EVENT_TONE[e.kind]} />}
          last={i === EVENTS.length - 1}
        />
      ))}
    </Card>
  );
}

function StudentToday() {
  return (
    <Card title="Today">
      {TODAY_PERIODS.map((p, i) => (
        <ListRow
          key={p.subject}
          icon={Clock}
          title={`Period ${p.period} · ${p.subject}`}
          subtitle={`${p.time} · ${p.teacher} · Room ${p.room}`}
          right={
            p.now ? (
              <Badge label="Now" tone="primary" />
            ) : p.next ? (
              <Badge label="Next" tone="warn" />
            ) : undefined
          }
          last={i === TODAY_PERIODS.length - 1}
        />
      ))}
    </Card>
  );
}

function SubstitutionCard() {
  return (
    <Card>
      <ListRow
        icon={ArrowLeftRight}
        title="Substitution today"
        subtitle="Period 5 Science: Ms. Hina Tariq is covering"
        right={<Badge label="Change" tone="warn" />}
        last
      />
    </Card>
  );
}

function TimetableOrCalendar({ initial }: { initial: string }) {
  const child = useCurrentChild();
  const { role } = useSession();
  const isStudent = role === 'student';
  const options = isStudent ? ['Week', 'Today'] : ['Timetable', 'Calendar'];
  const [tab, setTab] = useState(
    options.includes(initial) ? initial : options[0],
  );
  const calendar = tab === 'Calendar';
  return (
    <Screen
      title={calendar ? 'Calendar' : 'Timetable'}
      subtitle={calendar ? 'Session 2026-27' : `${child.className} · Room R105`}
      right={<Bell />}
    >
      <Segmented options={options} value={tab} onChange={setTab} />
      {tab === 'Calendar' ? <EventsCard /> : null}
      {tab === 'Timetable' || tab === 'Week' ? <ClassGrid /> : null}
      {tab === 'Timetable' ? <NowCard /> : null}
      {tab === 'Week' ? <SubstitutionCard /> : null}
      {tab === 'Today' ? <StudentToday /> : null}
    </Screen>
  );
}

export function TimetableScreen(_: ScreenProps) {
  const tab = useParam('tab', 'Timetable');
  return <TimetableOrCalendar initial={tab} />;
}

export function CalendarScreen(_: ScreenProps) {
  const { role } = useSession();
  if (role !== 'student') {
    return <TimetableOrCalendar initial="Calendar" />;
  }
  return (
    <Screen title="Calendar" subtitle="Session 2026-27" right={<Bell />}>
      <EventsCard />
    </Screen>
  );
}

// ---------- Exams & results ----------

function ResultsContent() {
  const nav = useNav();
  const { t } = useI18n();
  return (
    <>
      <HeroCard label={t('Percentage')} value={`${RESULT.percentage}%`}>
        <View style={s.pills}>
          <HeroPill label={RESULT.grade} />
          <HeroPill label={RESULT.position} />
          <HeroPill label="Pass" />
        </View>
      </HeroCard>
      <Card title="Subjects">
        {RESULT.subjects.map((sub, i) => (
          <ListRow
            key={sub.name}
            title={sub.name}
            subtitle={`${sub.marks} / 100`}
            right={<Badge label={sub.grade} tone="success" />}
            last={i === RESULT.subjects.length - 1}
          />
        ))}
      </Card>
      <Card title="Remarks">
        <Text style={s.remark}>“{RESULT.remarks}”</Text>
      </Card>
      <Button
        label="Report card (PDF with QR)"
        icon={Download}
        onPress={() => nav.push('ReportCard')}
      />
    </>
  );
}

export function ExamsScreen(_: ScreenProps) {
  const nav = useNav();
  const initial = useParam('tab', 'Date sheet');
  const [tab, setTab] = useState(initial);
  return (
    <Screen title="Exams" subtitle="Final term 2026" right={<Bell />}>
      <Segmented
        options={['Date sheet', 'Syllabus', 'Results']}
        value={tab}
        onChange={setTab}
      />
      {tab === 'Date sheet' ? (
        <>
          <Card>
            {DATE_SHEET.map((d, i) => (
              <ListRow
                key={d.day}
                icon={CalendarDays}
                title={`${d.day} · ${d.subject}`}
                subtitle={`${d.time} · ${d.marks}`}
                last={i === DATE_SHEET.length - 1}
              />
            ))}
          </Card>
          <Card
            title="Syllabus"
            action={{ label: 'All subjects', onPress: () => setTab('Syllabus') }}
          >
            <Text style={s.diaryText}>
              <Text style={s.bold}>{SYLLABUS[1].subject}: </Text>
              {SYLLABUS[1].text}
            </Text>
          </Card>
          <Button
            label="Download admit card"
            icon={Download}
            onPress={() => nav.push('AdmitCard')}
          />
        </>
      ) : null}
      {tab === 'Syllabus' ? (
        <Card title="Syllabus">
          {SYLLABUS.map((sy, i) => (
            <ListRow
              key={sy.subject}
              icon={File}
              title={sy.subject}
              subtitle={sy.text}
              last={i === SYLLABUS.length - 1}
            />
          ))}
        </Card>
      ) : null}
      {tab === 'Results' ? <ResultsContent /> : null}
    </Screen>
  );
}

export function ResultsScreen(_: ScreenProps) {
  const nav = useNav();
  return (
    <Screen title={RESULT.term} subtitle={RESULT.published} right={<Bell />}>
      <ResultsContent />
      <Button
        label="Exams and date sheet"
        variant="outline"
        icon={CalendarDays}
        onPress={() => nav.push('Exams')}
      />
    </Screen>
  );
}

function StudentHeader() {
  const child = useCurrentChild();
  return (
    <View style={s.studentHead}>
      <Avatar name={child.name} size={54} ring />
      <View style={s.flex}>
        <Text style={s.studentName}>{child.name}</Text>
        <Text style={s.studentSub}>
          {child.gr} · {child.className} · Roll {child.roll}
        </Text>
        <Text style={s.studentSub}>Father: {PARENT.name}</Text>
      </View>
    </View>
  );
}

function DownloadButton() {
  const { t } = useI18n();
  return (
    <IconButton icon={Download} onPress={() => toast(t('Downloaded (demo)'))} />
  );
}

export function AdmitCardScreen(_: ScreenProps) {
  const child = useCurrentChild();
  const { t } = useI18n();
  return (
    <Screen title="Admit card" subtitle="Final term 2026" right={<DownloadButton />}>
      <Card>
        <StudentHeader />
        {DATE_SHEET.map((d, i) => (
          <View key={d.day} style={[s.admitRow, i < DATE_SHEET.length - 1 && s.divider]}>
            <Text style={s.bold}>{d.day}</Text>
            <Text style={s.small}>
              {d.subject} · {d.time} · {d.seat}
            </Text>
          </View>
        ))}
        <View style={s.qrRow}>
          <QRCode value={`ADMIT-${child.gr}`} size={100} />
          <Text style={[s.small, s.flex]}>
            {t('Bring this card to every paper. Scan to verify.')}
          </Text>
        </View>
      </Card>
      <InfoBanner
        tone="warn"
        icon={TriangleAlert}
        text={t('If fee is unpaid, the admit card stays locked until the dues are cleared.')}
      />
    </Screen>
  );
}

export function ReportCardScreen(_: ScreenProps) {
  const child = useCurrentChild();
  const { t } = useI18n();
  return (
    <Screen
      title="Report card"
      subtitle="Mid-term 2026"
      right={<DownloadButton />}
      footer={
        <Button
          label="Download PDF"
          icon={Download}
          onPress={() => toast(t('Downloaded (demo)'))}
        />
      }
    >
      <Card>
        <View style={s.rcHead}>
          <View style={s.rcLogo}>
            <GraduationCap size={18} color={colors.text} />
          </View>
          <View style={s.flex}>
            <Text style={s.bold}>{SCHOOL}</Text>
            <Text style={s.small}>Progress Report · Mid-term 2026</Text>
          </View>
        </View>
        <Text style={s.rcStudent}>
          {child.name} · {child.className} · Roll {child.roll}
        </Text>
        {RESULT.subjects.map(sub => (
          <ListRow
            key={sub.name}
            title={sub.name}
            subtitle={`${sub.marks} / 100`}
            right={<Badge label={sub.grade} tone="success" />}
          />
        ))}
        <View style={s.total}>
          <Text style={s.totalText}>
            Total {RESULT.total} / {RESULT.max} · {RESULT.percentage}%
          </Text>
          <Badge label="Pass" tone="success" />
        </View>
        <View style={s.qrRow}>
          <QRCode value={`RC-${child.gr}`} size={100} />
          <View style={s.flex}>
            <Text style={s.bold}>
              Position: {RESULT.position}, {RESULT.classPosition}
            </Text>
            <Text style={s.bold}>Attendance: {child.attendance}%</Text>
            <Text style={s.small}>Verify: RC-…-{child.gr.slice(-6).replace('-', '')}</Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: 6 },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
  subject: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  diaryText: { fontSize: 13.5, color: colors.text, lineHeight: 20, marginTop: 4 },
  rtl: { textAlign: 'right', writingDirection: 'rtl', fontSize: 16 },
  attach: { marginTop: 10 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  quote: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  quoteSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  remark: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginTop: 2 },
  bold: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  small: { fontSize: 12, color: colors.textMuted, marginTop: 1, lineHeight: 17 },
  studentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  studentName: { fontSize: 17, fontWeight: '800', color: colors.text },
  studentSub: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
  admitRow: { paddingVertical: 9 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  rcHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rcLogo: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rcStudent: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted, marginTop: 8 },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: colors.text,
    paddingTop: 10,
    marginTop: 2,
  },
  totalText: { fontSize: 15, fontWeight: '800', color: colors.text },
});
