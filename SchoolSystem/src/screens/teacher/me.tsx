import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Receipt,
  TriangleAlert,
  Users,
} from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Chips,
  Field,
  formatRs,
  HeroCard,
  HStack,
  IconButton,
  InfoBanner,
  ListRow,
  ProgressBar,
  Screen,
  Segmented,
  StatTile,
  toast,
  Toggle,
} from '../../components/ui';
import { Empty, NoApiBanner, NotAvailable, QueryView } from '../../components/states';
import { colors } from '../../theme';
import { useNav } from '../../navigation';
import { useI18n } from '../../i18n';
import { useApi, useMutation } from '../../api/hooks';
import { LeaveDto, RecordDto, teacherApi } from '../../api/mobile';
import {
  addDays,
  cap,
  ClassChips,
  dayLabel,
  daysBetween,
  isoDate,
  leaveTone,
  monthLabel,
  useMyClasses,
} from './common';

function useCurriculum() {
  return useApi('teacher.curriculum', teacherApi.curriculum);
}

const isPlan = (r: RecordDto) => r.kind === 'lesson-plan' || (!r.kind && /week/i.test(r.title));
const isChapter = (r: RecordDto) => r.kind === 'chapter' || (!isPlan(r) && r.kind !== 'lesson-plan');

// T19: weekly lesson plan for coordinator review.
export function TeacherLessonPlan() {
  const { classes, current, setPicked } = useMyClasses();
  const q = useCurriculum();
  const [objectives, setObjectives] = useState('');
  const [activities, setActivities] = useState('');
  const [assessment, setAssessment] = useState('');
  const save = useMutation(teacherApi.saveCurriculum);
  const monday = (() => {
    const d = new Date();
    const back = (d.getDay() + 6) % 7;
    return addDays(isoDate(d), -back + 7);
  })();
  const plans = (q.data || []).filter(isPlan);

  const send = async () => {
    if (objectives.trim().length < 5) {
      toast('Write the learning objectives');
      return;
    }
    const res = await save.run({
      title: `Week of ${dayLabel(monday)}${current ? ` · ${current.label}` : ''}`,
      status: 'submitted',
      kind: 'lesson-plan',
      week: monday,
      classId: current?.classId,
      section: current?.section,
      objectives: objectives.trim(),
      activities: activities.trim(),
      assessment: assessment.trim(),
    });
    if (res) {
      toast('Sent for review');
      setObjectives('');
      setActivities('');
      setAssessment('');
      q.refresh();
    }
  };

  return (
    <Screen
      title="Lesson plan"
      subtitle={`Week of ${dayLabel(monday)}`}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<Button label="Send for review" onPress={send} loading={save.busy} />}
    >
      <ClassChips classes={classes} value={current?.key} onChange={setPicked} />
      <Field label="Learning objectives" value={objectives} onChangeText={setObjectives} multiline />
      <Field label="Activities and resources" value={activities} onChangeText={setActivities} multiline />
      <Field label="Assessment" value={assessment} onChangeText={setAssessment} />
      <QueryView q={q}>
        {() => (
          <Card title="Earlier plans">
            {plans.length === 0 ? (
              <Empty text="No lesson plans sent yet." />
            ) : (
              plans.map((p, i) => (
                <ListRow
                  key={p.id}
                  icon={p.status === 'approved' ? Check : Pencil}
                  title={p.title}
                  subtitle={p.comment ? `“${String(p.comment)}”` : dayLabel(p.recordDate)}
                  right={<Badge label={cap(p.status)} tone={p.status === 'approved' ? 'success' : p.status === 'returned' ? 'danger' : 'warn'} />}
                  last={i === plans.length - 1}
                />
              ))
            )}
          </Card>
        )}
      </QueryView>
    </Screen>
  );
}

// T20: tick chapters done; coverage %.
export function TeacherSyllabus() {
  const q = useCurriculum();
  const [chapter, setChapter] = useState('');
  const save = useMutation(teacherApi.saveCurriculum);
  const chapters = (q.data || []).filter(isChapter);
  const done = chapters.filter(c => c.status === 'done').length;
  const pct = chapters.length ? Math.round((done / chapters.length) * 100) : 0;

  const toggle = async (c: RecordDto, on: boolean) => {
    const { id, title, ...rest }: Record<string, unknown> & { id: number; title: string } = c;
    delete rest.uuid;
    delete rest.recordDate;
    const res = await save.run({ ...rest, title, kind: 'chapter', status: on ? 'done' : 'planned', doneOn: on ? isoDate() : null }, id);
    if (res) {
      q.setData(list => (list || []).map(x => (x.id === id ? { ...x, status: on ? 'done' : 'planned' } : x)));
    }
  };

  const add = async () => {
    if (chapter.trim().length < 2) {
      toast('Enter a chapter name');
      return;
    }
    const res = await save.run({ title: chapter.trim(), kind: 'chapter', status: 'planned' });
    if (res) {
      setChapter('');
      q.refresh();
    }
  };

  return (
    <Screen title="Syllabus" refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q}>
        {() => (
          <>
            <Card>
              <View style={s.between}>
                <Text style={s.h}>Coverage</Text>
                <Text style={s.h}>{pct}%</Text>
              </View>
              <View style={s.gap8}>
                <ProgressBar value={pct} />
              </View>
              <Text style={s.sub}>
                {done} of {chapters.length} chapters
              </Text>
            </Card>
            <Card>
              {chapters.length === 0 ? (
                <Empty text="No chapters yet. Add the syllabus chapters below." />
              ) : (
                chapters.map((c, i) => (
                  <ListRow
                    key={c.id}
                    title={c.title}
                    subtitle={c.status === 'done' ? `Done ${dayLabel(String(c.doneOn || c.recordDate))}` : 'Not done'}
                    right={<Toggle value={c.status === 'done'} onChange={v => toggle(c, v)} />}
                    last={i === chapters.length - 1}
                  />
                ))
              )}
            </Card>
            <Field label="Add chapter" value={chapter} onChangeText={setChapter} placeholder="8. Quaid-e-Azam" />
            <Button label="Add" variant="outline" icon={Plus} onPress={add} loading={save.busy} />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const thisMonth = () => isoDate().slice(0, 7);
const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

type Policy = { name: string; quota: number };

function policiesOf(raw: Array<Record<string, unknown>>): Policy[] {
  return raw.map(p => ({
    name: String(p.name || p.leave_type || p.type || 'Leave'),
    quota: Number(p.quota ?? p.yearly_quota ?? p.days ?? p.days_per_year ?? 0),
  }));
}

function usedDays(leaves: LeaveDto[], type: string) {
  return leaves
    .filter(l => l.status === 'approved' && (l.leave_type || '').toLowerCase() === type.toLowerCase())
    .reduce((n, l) => n + Number(l.days || 0), 0);
}

// T21: own time in/out and leave balance.
export function TeacherMyAttendance() {
  const nav = useNav();
  const [month, setMonth] = useState(thisMonth());
  const q = useApi(`teacher.myAtt.${month}`, () => teacherApi.myAttendance(month));
  return (
    <Screen title="My attendance" subtitle={monthLabel(month)} refreshing={q.refreshing} onRefresh={q.refresh}
      right={
        <View style={s.row}>
          <IconButton icon={ChevronLeft} onPress={() => setMonth(m => shiftMonth(m, -1))} />
          <IconButton icon={ChevronRight} onPress={() => setMonth(m => (m < thisMonth() ? shiftMonth(m, 1) : m))} />
        </View>
      }
    >
      <QueryView q={q}>
        {d => {
          const by = (st: string) => d.days.filter(x => (x.status || '').toLowerCase().startsWith(st)).length;
          const policies = policiesOf(d.policies);
          return (
            <>
              <HStack gap={8}>
                <StatTile value={by('p')} label="Present" />
                <StatTile value={by('l')} label="Late" />
                <StatTile value={by('a')} label="Absent" />
                <StatTile value={by('s') + by('h')} label="Short leave" />
              </HStack>
              <Card title="Days">
                {d.days.length === 0 ? (
                  <Empty text="No attendance recorded this month." />
                ) : (
                  d.days.map((x, i) => (
                    <ListRow
                      key={x.date}
                      title={dayLabel(x.date)}
                      subtitle={`In ${x.timeIn || '—'} · Out ${x.timeOut || '—'}`}
                      right={<Badge label={cap(x.status || '—')} tone={/^p/i.test(x.status) ? 'success' : /^a/i.test(x.status) ? 'danger' : 'warn'} />}
                      last={i === d.days.length - 1}
                    />
                  ))
                )}
              </Card>
              <Card title="Leave balance">
                {policies.length === 0 ? (
                  <Empty text="The school has not set leave policies yet." />
                ) : (
                  policies.map((p, i) => (
                    <ListRow
                      key={p.name}
                      icon={Calendar}
                      title={p.name}
                      subtitle={`${Math.max(0, p.quota - usedDays(d.leaves, p.name))} of ${p.quota} left`}
                      last={i === policies.length - 1}
                    />
                  ))
                )}
              </Card>
              <Card title="My leave requests">
                {d.leaves.length === 0 ? (
                  <Empty text="No leave requests." />
                ) : (
                  d.leaves.map((l, i) => (
                    <ListRow
                      key={l.id}
                      title={`${l.leave_type || 'Leave'} · ${Number(l.days)} day(s)`}
                      subtitle={`${dayLabel(l.from_date)} – ${dayLabel(l.to_date)}`}
                      right={<Badge label={cap(l.status)} tone={leaveTone(l.status)} />}
                      last={i === d.leaves.length - 1}
                    />
                  ))
                )}
              </Card>
              <Button label="Apply for leave" icon={Plus} onPress={() => nav.push('TeacherApplyLeave')} />
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

const LEAVE_TYPES = ['Casual', 'Sick', 'Annual', 'Unpaid'];

// T22: leave with approval chain and balance check.
export function TeacherApplyLeave() {
  const nav = useNav();
  const q = useApi(`teacher.myAtt.${thisMonth()}`, () => teacherApi.myAttendance(thisMonth()));
  const [type, setType] = useState('Casual');
  const days = Array.from({ length: 30 }, (_, i) => addDays(isoDate(), i));
  const [from, setFrom] = useState(days[1]);
  const [to, setTo] = useState(days[1]);
  const [reason, setReason] = useState('');
  const apply = useMutation(teacherApi.applyLeave);
  const n = to >= from ? daysBetween(from, to) : 0;
  const policy = policiesOf(q.data?.policies || []).find(p => p.name.toLowerCase() === type.toLowerCase());
  const left = policy ? Math.max(0, policy.quota - usedDays(q.data?.leaves || [], type)) : undefined;
  const over = type !== 'Unpaid' && left !== undefined && n > left;
  const info =
    type === 'Unpaid'
      ? `${n} day(s) unpaid. Unpaid leave is deducted in payroll.`
      : left === undefined
      ? `${n} day(s) from ${type}. Goes to the Principal for approval.`
      : over
      ? `Only ${left} ${type} day(s) left. Choose fewer days or Unpaid.`
      : `${n} day(s) from ${type} (${left} left). Goes to the Principal. Your periods appear in Substitutions once approved.`;

  const send = async () => {
    if (!n) {
      toast('The "to" date must be on or after the "from" date');
      return;
    }
    if (over) {
      toast('Leave beyond your balance is allowed only as Unpaid');
      return;
    }
    if (reason.trim().length < 3) {
      toast('Write a reason');
      return;
    }
    const res = await apply.run({ from, to, reason: reason.trim(), type, days: n });
    if (res) {
      toast('Leave request sent');
      nav.pop();
    }
  };

  const pick = (label: string) => days.find(d => dayLabel(d) === label) || days[0];
  return (
    <Screen title="Apply for leave" footer={<Button label="Send request" onPress={send} loading={apply.busy} />}>
      <Segmented options={LEAVE_TYPES} value={type} onChange={setType} />
      <Text style={s.label}>From</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chips style={s.noWrap} options={days.map(dayLabel)} value={dayLabel(from)} onChange={l => setFrom(pick(l))} />
      </ScrollView>
      <Text style={s.label}>To</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chips style={s.noWrap} options={days.map(dayLabel)} value={dayLabel(to)} onChange={l => setTo(pick(l))} />
      </ScrollView>
      <Field label="Reason" value={reason} onChangeText={setReason} multiline />
      <InfoBanner tone={over ? 'danger' : 'info'} icon={over ? TriangleAlert : Users} text={info} />
    </Screen>
  );
}

// T23: monthly salary slips.
export function TeacherSalary() {
  const q = useApi('teacher.salary', teacherApi.salary);
  return (
    <Screen title="Salary" refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No salary slips yet.">
        {d => {
          const latest = d[0];
          return (
            <>
              <HeroCard label={`${monthLabel(latest.month)} net salary`} value={formatRs(latest.net)} />
              <Card title="Breakdown">
                <ListRow title="Basic salary" right={<Text style={s.amount}>{formatRs(latest.basic)}</Text>} />
                <ListRow title="Allowances" right={<Text style={s.amount}>{formatRs(latest.allowances)}</Text>} />
                <ListRow title="Deductions" right={<Text style={[s.amount, s.red]}>{formatRs(-latest.deductions)}</Text>} />
                <ListRow title="Status" right={<Badge label={cap(latest.status)} tone={latest.status === 'paid' ? 'success' : 'warn'} />} last />
              </Card>
              <Card title="Earlier slips">
                {d.slice(1).length === 0 ? (
                  <Empty text="No earlier slips." />
                ) : (
                  d.slice(1).map((x, i, arr) => (
                    <ListRow
                      key={x.id}
                      icon={Receipt}
                      title={monthLabel(x.month)}
                      subtitle={formatRs(x.net)}
                      right={<IconButton icon={Download} onPress={() => toast('Slip PDF is not available from the server yet')} />}
                      last={i === arr.length - 1}
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

// T24: notice to parents of own class.
export function TeacherMessageParents() {
  const nav = useNav();
  const { t } = useI18n();
  const { classes, current, setPicked } = useMyClasses();
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [sms, setSms] = useState(true);
  const send = useMutation(teacherApi.messageParents);
  const submit = async () => {
    if (!current) {
      toast('No class is assigned to you yet');
      return;
    }
    if (!title.trim() || !msg.trim()) {
      toast('Write a title and a message');
      return;
    }
    const res = await send.run({ classId: current.classId, section: current.section, title: title.trim(), body: msg.trim() });
    if (res) {
      toast(`Sent to parents of ${current.label}${res.queued ? ` · ${res.queued} SMS/WhatsApp queued` : ''}`);
      nav.pop();
    }
  };
  return (
    <Screen title="Message parents" footer={<Button label="Send" icon={MessageCircle} onPress={submit} loading={send.busy} />}>
      <ClassChips classes={classes} value={current?.key} onChange={setPicked} />
      <Text style={s.sub}>{t('Parents of')} {current?.label}</Text>
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="Art file by Friday" />
      <Field label="Message" value={msg} onChangeText={setMsg} multiline placeholder="Please send your child's art file on Friday." />
      <Card>
        <ListRow icon={Bell} title={t('In-app notice')} subtitle="Always sent" right={<Badge label="On" tone="success" />} />
        <ListRow icon={MessageCircle} title="SMS / WhatsApp" subtitle={t('Uses school SMS credit')} right={<Toggle value={sms} onChange={setSms} />} />
        <ListRow icon={Phone} title="One parent only" subtitle="Not available yet" last />
      </Card>
      <NoApiBanner what="Choosing channels and messaging one parent" />
    </Screen>
  );
}

// T25: school notices for staff.
export function TeacherNotices() {
  const q = useApi('teacher.notices', teacherApi.notices);
  return (
    <Screen title="Notices" refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No notices.">
        {d => (
          <Card>
            {d.map((n, i) => (
              <ListRow
                key={n.id}
                icon={Bell}
                title={n.title}
                subtitle={n.body}
                right={<Text style={s.when}>{dayLabel(n.at)}</Text>}
                last={i === d.length - 1}
              />
            ))}
          </Card>
        )}
      </QueryView>
    </Screen>
  );
}

// T26: class reports. Only class strength comes from the server.
export function TeacherReports() {
  const q = useApi('teacher.reports.strength', () => teacherApi.reports('strength'));
  const { classes } = useMyClasses();
  return (
    <Screen title="Reports" refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q}>
        {d => (
          <Card title="Class strength">
            {d.length === 0 ? (
              <Empty text="No classes." />
            ) : (
              d.map((r, i) => {
                const label = classes.find(c => c.classId === Number(r.classId) && c.section === r.section)?.label || `Class ${r.classId}-${r.section}`;
                return (
                  <ListRow
                    key={`${r.classId}-${r.section}`}
                    icon={Users}
                    title={label}
                    right={<Badge label={`${r.students} students`} tone="info" />}
                    last={i === d.length - 1}
                  />
                );
              })
            )}
          </Card>
        )}
      </QueryView>
      <NotAvailable
        what="Attendance, homework, marks, result and syllabus reports"
        detail="Only the class strength report is available from the school server so far."
      />
      <InfoBanner text="You see reports only for your own classes and subjects." />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  noWrap: { flexWrap: 'nowrap' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  h: { fontSize: 15, fontWeight: '800', color: colors.text },
  gap8: { marginVertical: 8 },
  sub: { fontSize: 12.5, color: colors.textMuted },
  label: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  when: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
  amount: { fontSize: 14, fontWeight: '800', color: colors.text },
  red: { color: colors.danger },
});
