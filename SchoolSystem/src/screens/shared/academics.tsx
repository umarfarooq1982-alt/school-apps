import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Banknote,
  CalendarDays,
  Clock,
  Download,
  File,
  Flag,
  GraduationCap,
  Lock,
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
  formatRs,
  HeroCard,
  HeroPill,
  IconButton,
  IconType,
  InfoBanner,
  ListRow,
  MonthCalendar,
  QRCode,
  Screen,
  Segmented,
  StatTile,
  TimetableCell,
  TimetableGrid,
  toast,
} from '../../components/ui';
import { Empty, NoApiBanner, QueryView } from '../../components/states';
import { colors, radius, Tone } from '../../theme';
import { ScreenProps, useNav, useParam } from '../../navigation';
import { useSession } from '../../store';
import { useI18n } from '../../i18n';
import { SYLLABUS } from '../../data/school';
import { useCurrentChild } from '../../data/useChild';
import { useApi } from '../../api/hooks';
import { familyApi, HomeworkDto, ResultsDto, TimetableDto } from '../../api/mobile';
import {
  addDaysIso,
  cap,
  fmtDate,
  fmtDay,
  MARK_LABEL,
  MARK_STATUS,
  MONTH_NAMES,
  todayIso,
  useFamily,
  useFees,
} from './data';

const hasUrdu = (t?: string | null) => !!t && /[؀-ۿ]/.test(t);

export function useNotices() {
  return useApi('family-notices', familyApi.notices);
}

function Bell() {
  const { data } = useNotices();
  return <BellButton count={data?.length || undefined} />;
}

// ---------- Attendance ----------

function monthKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function AttendanceScreen(_: ScreenProps) {
  const child = useCurrentChild();
  const { t } = useI18n();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const key = monthKey(ym.y, ym.m);
  const q = useFamily('attendance', cid => familyApi.attendance(key, cid), key);
  const shift = (d: number) =>
    setYm(({ y, m }) => {
      const k = y * 12 + m + d;
      return { y: Math.floor(k / 12), m: k % 12 };
    });
  const days = q.data?.days ?? [];
  const marks: Record<number, DayStatus> = {};
  days.forEach(d => {
    const st = MARK_STATUS[d.mark];
    const day = Number(d.date.slice(8, 10));
    if (st && day) {
      marks[day] = st;
    }
  });
  const absent = days.filter(d => d.mark === 'A');
  const late = days.filter(d => d.mark === 'L');
  const leave = days.filter(d => d.mark === 'LV');
  const notes = [...absent, ...late, ...leave].sort((a, b) => (a.date < b.date ? 1 : -1));
  const isThisMonth = ym.y === now.getFullYear() && ym.m === now.getMonth();
  return (
    <Screen
      title="Attendance"
      subtitle={child.loaded ? `${child.name} · ${child.className}` : undefined}
      right={<Bell />}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      <View style={s.stats}>
        <StatTile
          value={q.data && q.data.total ? `${q.data.percentage}%` : '—'}
          label={MONTH_NAMES[ym.m]}
          active
        />
        <StatTile value={q.data ? `${q.data.present}/${q.data.total}` : '—'} label="Present" />
        <StatTile value={absent.length} label="Absent" />
        <StatTile value={late.length} label="Late" />
      </View>
      <Card>
        <MonthCalendar
          year={ym.y}
          month={ym.m}
          marks={marks}
          selected={isThisMonth ? now.getDate() : undefined}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
        />
      </Card>
      <QueryView q={q}>
        {() => (
          <Card title="Notes">
            {notes.length ? (
              notes.map((n, i) => (
                <ListRow
                  key={n.date}
                  icon={n.mark === 'A' ? TriangleAlert : Clock}
                  iconTone={n.mark === 'A' ? 'danger' : 'primary'}
                  title={`${fmtDate(n.date)} · ${t(MARK_LABEL[n.mark] ?? n.mark)}`}
                  last={i === notes.length - 1}
                />
              ))
            ) : (
              <Text style={s.empty}>
                {days.length ? t('No absences or late arrivals.') : t('No attendance marked this month.')}
              </Text>
            )}
          </Card>
        )}
      </QueryView>
    </Screen>
  );
}

// ---------- Diary ----------

// Today and the three school days before it (Sundays skipped).
function diaryDays() {
  const out: string[] = [];
  let d = todayIso();
  while (out.length < 4) {
    if (new Date(`${d}T00:00:00`).getDay() !== 0) {
      out.push(d);
    }
    d = addDaysIso(d, -1);
  }
  return out.reverse();
}

export function DiaryContent() {
  const { t } = useI18n();
  const days = useMemo(diaryDays, []);
  const labels = days.map((d, i) => (i === days.length - 1 ? t('Today') : fmtDay(d)));
  const [day, setDay] = useState(days[days.length - 1]);
  const q = useFamily('diary', cid => familyApi.diary(day, cid), day);
  return (
    <>
      <Chips
        options={labels}
        value={labels[days.indexOf(day)]}
        onChange={v => setDay(days[labels.indexOf(v)])}
      />
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No diary posted for this day.">
        {list =>
          list.map(e => (
            <Card key={e.id}>
              <Text style={s.subject}>{e.subject || t('General')}</Text>
              {e.topic ? <Text style={[s.diaryText, hasUrdu(e.topic) && s.rtl]}>{e.topic}</Text> : null}
              {e.homework ? (
                <Text style={[s.diaryText, hasUrdu(e.homework) && s.rtl]}>
                  <Text style={s.bold}>{t('Homework')}: </Text>
                  {e.homework}
                </Text>
              ) : null}
              <View style={s.tags}>
                <Badge label={fmtDate(e.date)} />
              </View>
            </Card>
          ))
        }
      </QueryView>
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

export function hwBucket(h: HomeworkDto): HwStatus {
  if (h.status === 'graded') {
    return 'Checked';
  }
  if (h.status === 'submitted') {
    return 'Submitted';
  }
  return 'Pending';
}

const HW_TONE: Record<HwStatus, Tone> = {
  Pending: 'warn',
  Submitted: 'info',
  Checked: 'success',
};

export function useHomework() {
  return useFamily('homework', familyApi.homework);
}

export function HomeworkContent() {
  const { role } = useSession();
  const nav = useNav();
  const { t } = useI18n();
  const q = useHomework();
  const [tab, setTab] = useState<HwStatus>('Pending');
  const isStudent = role === 'student';
  const list = q.data ?? [];
  const count = (st: HwStatus) => list.filter(h => hwBucket(h) === st).length;
  const order: HwStatus[] = ['Pending', 'Submitted', 'Checked'];
  const labels = order.map(st =>
    st === 'Pending'
      ? `${t(isStudent ? 'To do' : 'Pending')} ${count(st)}`
      : `${t(st)} ${count(st)}`,
  );
  const shown = list.filter(h => hwBucket(h) === tab);
  const comments = shown.filter(h => h.submission?.comment);
  return (
    <>
      <Segmented
        options={labels}
        value={labels[order.indexOf(tab)]}
        onChange={v => setTab(order[labels.indexOf(v)])}
      />
      <QueryView q={q}>
        {() => (
          <Card>
            {shown.length ? (
              shown.map((h, i) => {
                const missing = h.status === 'missing';
                const marks = h.submission?.marks;
                const sub =
                  tab === 'Checked'
                    ? `${h.subject ?? ''}${marks !== undefined ? ` · ${marks}` : ''}`
                    : `${h.subject ?? t('General')} · ${t('due')} ${fmtDate(h.dueDate)}`;
                const canOpen = isStudent && tab === 'Pending';
                return (
                  <ListRow
                    key={h.id}
                    icon={Paperclip}
                    title={h.title}
                    subtitle={sub}
                    last={i === shown.length - 1}
                    chevron={canOpen}
                    onPress={canOpen ? () => nav.push('StudentSubmitHomework', { id: h.id }) : undefined}
                    right={
                      canOpen && !missing ? undefined : tab === 'Checked' && marks !== undefined ? (
                        <Badge label={String(marks)} tone="success" />
                      ) : (
                        <Badge
                          label={missing ? 'Missing' : isStudent && tab === 'Submitted' ? 'Waiting' : tab}
                          tone={missing ? 'danger' : HW_TONE[tab]}
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
        )}
      </QueryView>
      {comments.map(h => (
        <Card key={`c-${h.id}`}>
          <Text style={s.quote}>“{String(h.submission?.comment)}”</Text>
          <Text style={s.quoteSub}>
            {t('Teacher comment on')} {h.title}
          </Text>
        </Card>
      ))}
    </>
  );
}

export function HomeworkScreen(_: ScreenProps) {
  const child = useCurrentChild();
  const { role } = useSession();
  const q = useHomework();
  return (
    <Screen
      title="Homework"
      subtitle={role === 'student' ? undefined : child.className}
      right={<Bell />}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      <HomeworkContent />
    </Screen>
  );
}

// ---------- Timetable & calendar ----------

const ABBR: Record<string, string> = {
  English: 'Eng',
  Mathematics: 'Math',
  Urdu: 'Urdu',
  Science: 'Sci',
  Islamiat: 'Isl',
  'Social Studies': 'SST',
  Computer: 'Comp',
  Art: 'Art',
};
const abbr = (n?: string | null) => (n ? ABBR[n] ?? n.slice(0, 4) : '—');

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useTimetable() {
  return useFamily('timetable', familyApi.timetable);
}

// Periods that actually have a slot, so empty trailing periods are hidden.
function usedPeriods(tt: TimetableDto) {
  const used = tt.periods.filter(p => tt.slots.some(x => x.period === p));
  return used.length ? used : tt.periods.slice(0, 6);
}

function ClassGrid({ tt }: { tt: TimetableDto }) {
  const periods = usedPeriods(tt);
  const rows: TimetableCell[][] = periods.map(p =>
    tt.days.map(d => {
      const slot = tt.slots.find(x => x.period === p && (x.day === d || x.day.slice(0, 3) === d));
      return slot ? { top: abbr(slot.subject) } : { top: '—', free: true };
    }),
  );
  return (
    <Card>
      <TimetableGrid days={tt.days} times={periods.map(p => `P${p}`)} rows={rows} />
      <Text style={s.small}>Times per period are not provided by the server yet.</Text>
    </Card>
  );
}

function TodayPeriods({ tt }: { tt: TimetableDto }) {
  const { t } = useI18n();
  const dow = DOW[new Date().getDay()];
  const list = tt.slots
    .filter(x => x.day === dow || x.day.slice(0, 3) === dow)
    .sort((a, b) => a.period - b.period);
  return (
    <Card title="Today">
      {list.length ? (
        list.map((p, i) => (
          <ListRow
            key={`${p.day}-${p.period}`}
            icon={Clock}
            title={`${t('Period')} ${p.period} · ${p.subject ?? t('Free')}`}
            last={i === list.length - 1}
          />
        ))
      ) : (
        <Text style={s.empty}>{t('No classes today.')}</Text>
      )}
    </Card>
  );
}

const EVENT_ICON: Record<string, IconType> = {
  event: Star,
  exam: GraduationCap,
  exams: GraduationCap,
  holiday: Flag,
  vacation: CalendarDays,
  ptm: Users,
};
const EVENT_TONE: Record<string, Tone> = {
  event: 'success',
  exam: 'info',
  exams: 'info',
  holiday: 'danger',
  vacation: 'danger',
};

export function useCalendar() {
  return useApi('family-calendar', familyApi.calendar);
}

export function EventsCard({ limit }: { limit?: number }) {
  const q = useCalendar();
  const today = todayIso();
  return (
    <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No events on the calendar yet.">
      {list => {
        const upcoming = list.filter(e => e.date >= today);
        const past = list.filter(e => e.date < today);
        const shown = (upcoming.length ? upcoming : past).slice(0, limit ?? 100);
        return (
          <Card title={upcoming.length ? 'Coming up' : 'Past events'}>
            {shown.map((e, i) => {
              const kind = (e.kind || 'event').toLowerCase();
              return (
                <ListRow
                  key={e.id}
                  icon={/ptm|parent-teacher/i.test(e.title) ? Users : EVENT_ICON[kind] ?? Star}
                  title={e.title}
                  subtitle={fmtDay(e.date)}
                  right={<Badge label={cap(kind)} tone={EVENT_TONE[kind] ?? 'neutral'} />}
                  last={i === shown.length - 1}
                />
              );
            })}
          </Card>
        );
      }}
    </QueryView>
  );
}

function TimetableOrCalendar({ initial }: { initial: string }) {
  const child = useCurrentChild();
  const { role } = useSession();
  const isStudent = role === 'student';
  const options = isStudent ? ['Week', 'Today'] : ['Timetable', 'Calendar'];
  const [tab, setTab] = useState(options.includes(initial) ? initial : options[0]);
  const q = useTimetable();
  const cal = useCalendar();
  const calendar = tab === 'Calendar';
  return (
    <Screen
      title={calendar ? 'Calendar' : 'Timetable'}
      subtitle={calendar ? undefined : child.className}
      right={<Bell />}
      refreshing={calendar ? cal.refreshing : q.refreshing}
      onRefresh={calendar ? cal.refresh : q.refresh}
    >
      <Segmented options={options} value={tab} onChange={setTab} />
      {calendar ? (
        <EventsCard />
      ) : (
        <QueryView q={q} isEmpty={d => d.slots.length === 0} emptyText="The timetable is not published yet.">
          {tt => (tab === 'Today' ? <TodayPeriods tt={tt} /> : <ClassGrid tt={tt} />)}
        </QueryView>
      )}
    </Screen>
  );
}

export function TimetableScreen(_: ScreenProps) {
  const tab = useParam('tab', 'Timetable');
  return <TimetableOrCalendar initial={tab} />;
}

export function CalendarScreen(_: ScreenProps) {
  const { role } = useSession();
  const cal = useCalendar();
  if (role !== 'student') {
    return <TimetableOrCalendar initial="Calendar" />;
  }
  return (
    <Screen title="Calendar" right={<Bell />} refreshing={cal.refreshing} onRefresh={cal.refresh}>
      <EventsCard />
    </Screen>
  );
}

// ---------- Exams & results ----------

// Same bands the server uses for the overall grade.
export function gradeFor(pct: number) {
  if (!pct) {
    return '—';
  }
  return pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'D';
}

export function useExams() {
  return useFamily('exams', familyApi.exams);
}

// Exam picker shared by results and report card.
function useExamPick() {
  const exams = useExams();
  const list = exams.data?.exams ?? [];
  const [examId, setExamId] = useState<number | undefined>(undefined);
  const current = examId ?? list[0]?.id;
  const picker =
    list.length > 1 ? (
      <Chips
        options={list.map(e => e.name)}
        value={list.find(e => e.id === current)?.name ?? ''}
        onChange={n => setExamId(list.find(e => e.name === n)?.id)}
      />
    ) : null;
  return { examId: current, examName: list.find(e => e.id === current)?.name, picker, exams };
}

function ResultBody({ r }: { r: ResultsDto }) {
  const nav = useNav();
  const { t } = useI18n();
  if (!r.subjects.length) {
    return <Empty text="Results are not published yet." />;
  }
  return (
    <>
      <HeroCard label={t('Percentage')} value={`${r.percentage}%`}>
        <View style={s.pills}>
          <HeroPill label={`${t('Grade')} ${r.grade}`} />
          {r.position ? <HeroPill label={`${t('Position')} ${r.position}`} /> : null}
          <HeroPill label={`${r.total} / ${r.max}`} />
        </View>
      </HeroCard>
      <Card title="Subjects">
        {r.subjects.map((sub, i) => {
          const pct = sub.max ? Math.round((sub.marks / sub.max) * 100) : 0;
          return (
            <ListRow
              key={`${sub.subject}-${i}`}
              title={sub.subject}
              subtitle={`${sub.marks} / ${sub.max}`}
              right={<Badge label={gradeFor(pct)} tone={pct >= 50 ? 'success' : 'danger'} />}
              last={i === r.subjects.length - 1}
            />
          );
        })}
      </Card>
      <Button label="Report card (PDF with QR)" icon={Download} onPress={() => nav.push('ReportCard')} />
    </>
  );
}

function ResultsContent() {
  const { examId, picker } = useExamPick();
  const q = useFamily('results', cid => familyApi.results(examId, cid), String(examId ?? ''));
  return (
    <>
      {picker}
      <QueryView q={q}>{r => <ResultBody r={r} />}</QueryView>
    </>
  );
}

export function ExamsScreen(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const initial = useParam('tab', 'Date sheet');
  const [tab, setTab] = useState(initial);
  const exams = useExams();
  return (
    <Screen title="Exams" right={<Bell />} refreshing={exams.refreshing} onRefresh={exams.refresh}>
      <Segmented options={['Date sheet', 'Syllabus', 'Results']} value={tab} onChange={setTab} />
      {tab === 'Date sheet' ? (
        <>
          <QueryView q={exams} isEmpty={d => d.exams.length === 0} emptyText="No exams scheduled yet.">
            {d => (
              <Card>
                {d.exams.map((e, i) => (
                  <ListRow
                    key={e.id}
                    icon={CalendarDays}
                    title={e.name}
                    subtitle={`${fmtDate(e.startDate, true)} – ${fmtDate(e.endDate, true)}`}
                    right={<Badge label={cap(e.resultStatus)} tone={e.resultStatus === 'published' ? 'success' : 'neutral'} />}
                    last={i === d.exams.length - 1}
                  />
                ))}
              </Card>
            )}
          </QueryView>
          <NoApiBanner what={t('Paper-by-paper date sheet')} />
          <Button label="Download admit card" icon={Download} onPress={() => nav.push('AdmitCard')} />
        </>
      ) : null}
      {tab === 'Syllabus' ? (
        <>
          <NoApiBanner what={t('Exam syllabus')} />
          <Card title="Syllabus">
            {SYLLABUS.map((sy, i) => (
              <ListRow key={sy.subject} icon={File} title={sy.subject} subtitle={sy.text} last={i === SYLLABUS.length - 1} />
            ))}
          </Card>
        </>
      ) : null}
      {tab === 'Results' ? <ResultsContent /> : null}
    </Screen>
  );
}

export function ResultsScreen(_: ScreenProps) {
  const nav = useNav();
  const { examName } = useExamPick();
  return (
    <Screen title={examName ?? 'Results'} right={<Bell />}>
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
  const { t } = useI18n();
  return (
    <View style={s.studentHead}>
      <Avatar name={child.name || '?'} size={54} ring />
      <View style={s.flex}>
        <Text style={s.studentName}>{child.name}</Text>
        <Text style={s.studentSub}>
          {child.gr} · {child.className} · {t('Roll')} {child.roll}
        </Text>
        {child.father ? (
          <Text style={s.studentSub}>
            {t('Father')}: {child.father}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function DownloadButton() {
  const { t } = useI18n();
  return <IconButton icon={Download} onPress={() => toast(t('PDF download is not available yet'))} />;
}

// SOW M-03/M-12: admit cards and report cards are held while fee is due.
function FeeHold({ what }: { what: string }) {
  const nav = useNav();
  const { role } = useSession();
  const { t } = useI18n();
  const fees = useFees();
  const due = fees.data?.dues ?? 0;
  const unpaid = fees.data?.vouchers.find(v => v.status === 'unpaid' || v.status === 'partial');
  return (
    <>
      <Card style={s.holdCard}>
        <View style={s.holdIcon}>
          <Lock size={26} color={colors.danger} />
        </View>
        <Text style={s.holdTitle}>{t(`${what} is on hold`)}</Text>
        <Text style={s.holdText}>
          {t('Fee of')} {formatRs(due)} {t('is due. It opens as soon as the dues are cleared.')}
        </Text>
      </Card>
      {role === 'parent' && unpaid ? (
        <Button label="Pay fee now" icon={Banknote} onPress={() => nav.push('ParentVoucher', { id: unpaid.id })} />
      ) : (
        <InfoBanner tone="warn" icon={TriangleAlert} text={t('Ask your parent to pay the fee from the parent app.')} />
      )}
    </>
  );
}

export function AdmitCardScreen(_: ScreenProps) {
  const { t } = useI18n();
  const fees = useFees();
  const q = useFamily('admit', cid => familyApi.admitCard(undefined, cid));
  const due = fees.data?.dues ?? 0;
  if (fees.data && due > 0) {
    return (
      <Screen title="Admit card">
        <FeeHold what="Admit card" />
      </Screen>
    );
  }
  return (
    <Screen title="Admit card" subtitle={q.data?.exam.name} right={<DownloadButton />} refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q}>
        {a => (
          <>
            <Card>
              <StudentHeader />
              <View style={[s.admitRow, s.divider]}>
                <Text style={s.bold}>{a.exam.name}</Text>
                <Text style={s.small}>
                  {fmtDate(a.exam.startDate, true)} – {fmtDate(a.exam.endDate, true)}
                </Text>
              </View>
              <View style={s.qrRow}>
                <QRCode value={a.qr} size={100} />
                <Text style={[s.small, s.flex]}>{t('Bring this card to every paper. Scan to verify.')}</Text>
              </View>
            </Card>
            <NoApiBanner what={t('Paper-by-paper seats and timings')} />
          </>
        )}
      </QueryView>
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
  const fees = useFees();
  const { examId, examName, picker } = useExamPick();
  const q = useFamily('report', cid => familyApi.reportCard(examId, cid), String(examId ?? ''));
  const due = fees.data?.dues ?? 0;
  if (fees.data && due > 0) {
    return (
      <Screen title="Report card">
        <FeeHold what="Report card" />
      </Screen>
    );
  }
  return (
    <Screen
      title="Report card"
      subtitle={examName}
      right={<DownloadButton />}
      footer={<Button label="Download PDF" icon={Download} onPress={() => toast(t('PDF download is not available yet'))} />}
    >
      {picker}
      <QueryView q={q}>
        {r =>
          r.subjects.length ? (
            <Card>
              <View style={s.rcHead}>
                <View style={s.rcLogo}>
                  <GraduationCap size={18} color={colors.text} />
                </View>
                <View style={s.flex}>
                  <Text style={s.bold}>{r.school}</Text>
                  <Text style={s.small}>
                    {t('Progress Report')}
                    {examName ? ` · ${examName}` : ''}
                  </Text>
                </View>
              </View>
              <Text style={s.rcStudent}>
                {child.name} · {child.className} · {t('Roll')} {child.roll}
              </Text>
              {r.subjects.map((sub, i) => {
                const pct = sub.max ? Math.round((sub.marks / sub.max) * 100) : 0;
                return (
                  <ListRow
                    key={`${sub.subject}-${i}`}
                    title={sub.subject}
                    subtitle={`${sub.marks} / ${sub.max}`}
                    right={<Badge label={gradeFor(pct)} tone={pct >= 50 ? 'success' : 'danger'} />}
                  />
                );
              })}
              <View style={s.total}>
                <Text style={s.totalText}>
                  {t('Total')} {r.total} / {r.max} · {r.percentage}%
                </Text>
                <Badge label={`${t('Grade')} ${r.grade}`} tone="success" />
              </View>
              <View style={s.qrRow}>
                <QRCode value={r.qr ?? `report-${child.id}`} size={100} />
                <View style={s.flex}>
                  {r.position ? (
                    <Text style={s.bold}>
                      {t('Position')}: {r.position}
                    </Text>
                  ) : null}
                  <Text style={s.small}>{t('Scan to verify this report card.')}</Text>
                </View>
              </View>
            </Card>
          ) : (
            <Empty text="Results are not published yet." />
          )
        }
      </QueryView>
    </Screen>
  );
}

const s = StyleSheet.create({
  holdCard: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  holdIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  holdText: { fontSize: 13.5, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: 6 },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
  subject: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  diaryText: { fontSize: 13.5, color: colors.text, lineHeight: 20, marginTop: 4 },
  rtl: { textAlign: 'right', writingDirection: 'rtl', fontSize: 16 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  quote: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  quoteSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  bold: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  small: { fontSize: 12, color: colors.textMuted, marginTop: 1, lineHeight: 17 },
  studentHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
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
