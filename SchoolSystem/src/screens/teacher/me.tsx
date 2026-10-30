import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ArrowLeftRight,
  Bell,
  CalendarDays,
  Check,
  Clock,
  Download,
  GraduationCap,
  Heart,
  Layers,
  MessageCircle,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Receipt,
  TriangleAlert,
  Users,
} from 'lucide-react-native';
import {
  Amount,
  Badge,
  Button,
  Card,
  Chips,
  Field,
  formatRs,
  HeroCard,
  HStack,
  IconType,
  InfoBanner,
  ListRow,
  Muted,
  ProgressBar,
  Screen,
  Segmented,
  StatTile,
  toast,
  Toggle,
} from '../../components/ui';
import { colors } from '../../theme';
import { useNav } from '../../navigation';
import { useI18n } from '../../i18n';
import {
  CHAPTERS,
  LEAVE_BALANCE,
  LeaveType,
  MY_ATTENDANCE,
  REPORTS,
  SALARY,
  STUDENTS_5A,
  T_NOTICES,
} from '../../data/teacher';
import { newId, useChapters, useLessonPlans } from './state';

// T19
export function TeacherLessonPlan() {
  const [plans, setPlans] = useLessonPlans();
  const [objectives, setObjectives] = useState(
    'Read and understand lesson 8. Use 10 new words in sentences. Past tense practice.',
  );
  const [activities, setActivities] = useState(
    'Group reading, word wall, worksheet 8A.',
  );
  const [assessment, setAssessment] = useState('');
  const sent = plans.some(p => p.week === 'Week of 26 Oct');
  const send = () => {
    if (!objectives.trim() || !activities.trim() || !assessment.trim()) {
      toast('Fill objectives, activities and assessment');
      return;
    }
    if (sent) {
      toast('This week is already sent for review');
      return;
    }
    setPlans(p => [
      {
        id: newId('lp'),
        week: 'Week of 26 Oct',
        note: 'Waiting for coordinator review',
        status: 'Pending',
      },
      ...p,
    ]);
    toast('Lesson plan sent for review');
  };
  return (
    <Screen title="Lesson plan" subtitle="Week of 26 Oct · 5-A English">
      <Field label="Learning objectives" value={objectives} onChangeText={setObjectives} multiline />
      <Field label="Activities and resources" value={activities} onChangeText={setActivities} multiline />
      <Field label="Assessment" value={assessment} onChangeText={setAssessment} placeholder="Spelling test Friday" />
      <Button label={sent ? 'Sent for review' : 'Send for review'} onPress={send} disabled={sent} />
      <Card>
        {plans.map((p, i) => (
          <ListRow
            key={p.id}
            icon={p.status === 'Returned' ? Pencil : p.status === 'Approved' ? Check : Clock}
            title={p.week}
            subtitle={p.note}
            right={
              <Badge
                label={p.status}
                tone={p.status === 'Approved' ? 'success' : p.status === 'Returned' ? 'danger' : 'warn'}
              />
            }
            last={i === plans.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

// T20
export function TeacherSyllabus() {
  const [done, setDone] = useChapters();
  const count = CHAPTERS.filter(c => done[c.id]).length;
  const pct = Math.round((count / CHAPTERS.length) * 100);
  return (
    <Screen title="Syllabus" subtitle="5-A · English">
      <Card>
        <View style={s.between}>
          <Text style={s.h}>Coverage</Text>
          <Text style={s.h}>{pct}%</Text>
        </View>
        <View style={s.gap8}>
          <ProgressBar value={pct} />
        </View>
        <Muted>
          {count} of {CHAPTERS.length} chapters
        </Muted>
      </Card>
      <Card>
        {CHAPTERS.map((c, i) => (
          <ListRow
            key={c.id}
            title={c.title}
            subtitle={done[c.id] ? `${c.term} · done ${done[c.id]}` : c.term}
            right={
              <Toggle
                value={!!done[c.id]}
                onChange={v =>
                  setDone(p => ({ ...p, [c.id]: v ? '22 Oct' : undefined }))
                }
              />
            }
            last={i === CHAPTERS.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

const STATUS_TONE: Record<string, 'success' | 'warn' | 'info'> = {
  Present: 'success',
  Late: 'warn',
  'Short leave': 'info',
};

// T21
export function TeacherMyAttendance() {
  const nav = useNav();
  const a = MY_ATTENDANCE;
  const icons: Record<LeaveType, IconType> = {
    Casual: Clock,
    Sick: Heart,
    Annual: CalendarDays,
    Unpaid: Receipt,
  };
  return (
    <Screen title="My attendance" subtitle={a.month}>
      <HStack gap={8}>
        <StatTile value={a.present} label="Present" />
        <StatTile value={a.late} label="Late" />
        <StatTile value={a.absent} label="Absent" />
        <StatTile value={a.shortLeave} label="Short leave" />
      </HStack>
      <Card title="This week">
        {a.week.map((w, i) => (
          <ListRow
            key={w.day}
            title={w.day}
            subtitle={w.sub}
            right={<Badge label={w.status} tone={STATUS_TONE[w.status]} />}
            last={i === a.week.length - 1}
          />
        ))}
      </Card>
      <Card title="Leave balance">
        {(['Casual', 'Sick', 'Annual'] as LeaveType[]).map((k, i) => {
          const b = LEAVE_BALANCE[k];
          return (
            <ListRow
              key={k}
              icon={icons[k]}
              title={k}
              subtitle={`${b.left} of ${b.total} left${b.note ? ` (${b.note})` : ''}`}
              last={i === 2}
            />
          );
        })}
      </Card>
      <Button label="Apply for leave" icon={Plus} onPress={() => nav.push('TeacherApplyLeave')} />
    </Screen>
  );
}

const DAY_OPTIONS = ['Mon 2 Nov', 'Tue 3 Nov', 'Wed 4 Nov', 'Thu 5 Nov', 'Fri 6 Nov'];

// T22
export function TeacherApplyLeave() {
  const nav = useNav();
  const [type, setType] = useState<LeaveType>('Casual');
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(1);
  const [reason, setReason] = useState('');
  const days = to - from + 1;
  const b = LEAVE_BALANCE[type];
  const over = type !== 'Unpaid' && days > b.left;
  const info =
    days < 1
      ? 'The To date must be on or after the From date.'
      : type === 'Unpaid'
      ? `${days} day(s) unpaid. Goes to the Principal. Your periods appear in Substitutions once approved.`
      : over
      ? `Only ${b.left} ${type} days left. Choose fewer days or Unpaid.`
      : `${days} day(s) from ${type} (${b.left} left). Goes to the Principal. Your periods appear in Substitutions once approved.`;
  const send = () => {
    if (days < 1 || over) {
      toast(info);
    } else if (!reason.trim()) {
      toast('Write a reason');
    } else {
      toast('Leave request sent to the Principal');
      nav.pop();
    }
  };
  return (
    <Screen title="Apply for leave" footer={<Button label="Send request" onPress={send} />}>
      <Segmented
        options={['Casual', 'Sick', 'Annual', 'Unpaid']}
        value={type}
        onChange={v => setType(v as LeaveType)}
      />
      <HStack>
        <View style={s.flex}>
          <Field
            label="From"
            icon={CalendarDays}
            value={DAY_OPTIONS[from]}
            onPress={() => setFrom(i => (i + 1) % DAY_OPTIONS.length)}
          />
        </View>
        <View style={s.flex}>
          <Field
            label="To"
            icon={CalendarDays}
            value={DAY_OPTIONS[to]}
            onPress={() => setTo(i => (i + 1) % DAY_OPTIONS.length)}
          />
        </View>
      </HStack>
      <Muted>Tap a date to move it to the next day.</Muted>
      <Field label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Sister's wedding in Sialkot." />
      <InfoBanner tone={days < 1 || over ? 'danger' : 'info'} icon={Users} text={info} />
    </Screen>
  );
}

// T23
export function TeacherSalary() {
  return (
    <Screen title="Salary">
      <HeroCard label={`${SALARY.month} net salary`} value={formatRs(SALARY.net)} />
      <Card title="Breakdown">
        {SALARY.lines.map((l, i) => (
          <ListRow
            key={l.title}
            title={l.title}
            subtitle={l.sub}
            right={<Amount value={l.amount} tone={l.amount < 0 ? 'danger' : undefined} />}
            last={i === SALARY.lines.length - 1}
          />
        ))}
      </Card>
      <Card title="Earlier slips">
        {SALARY.earlier.map((e, i) => (
          <ListRow
            key={e.month}
            icon={Receipt}
            title={e.month}
            subtitle={formatRs(e.amount)}
            right={<Download size={18} color={colors.text} />}
            onPress={() => toast(`${e.month} slip downloaded (demo)`)}
            last={i === SALARY.earlier.length - 1}
          />
        ))}
      </Card>
      <Button
        label="Download September slip"
        variant="outline"
        icon={Download}
        onPress={() => toast('September slip downloaded (demo)')}
      />
    </Screen>
  );
}

// T24
export function TeacherMessageParents() {
  const nav = useNav();
  const { t } = useI18n();
  const [to, setTo] = useState('Parents of 5-A');
  const [student, setStudent] = useState(STUDENTS_5A[0].name);
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [inApp, setInApp] = useState(true);
  const [sms, setSms] = useState(false);
  const [wa, setWa] = useState(false);
  const count = to === 'One parent' ? 1 : STUDENTS_5A.length;
  const send = () => {
    if (!title.trim() || !msg.trim()) {
      toast('Write a title and a message');
    } else if (!inApp && !sms && !wa) {
      toast('Choose at least one channel');
    } else {
      toast(`Sent to ${count} parent${count > 1 ? 's' : ''}`);
      nav.pop();
    }
  };
  return (
    <Screen title="Message parents" footer={<Button label="Send" icon={MessageCircle} onPress={send} />}>
      <Chips options={['Parents of 5-A', 'One parent']} value={to} onChange={setTo} />
      {to === 'One parent' ? (
        <Card title="Student">
          <Chips
            options={STUDENTS_5A.slice(0, 8).map(x => x.name)}
            value={student}
            onChange={setStudent}
          />
        </Card>
      ) : null}
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="Art file by Friday" />
      <Field
        label="Message"
        value={msg}
        onChangeText={setMsg}
        multiline
        placeholder="Please send your child's art file and colours on Friday."
      />
      <Card>
        <ListRow
          icon={Bell}
          title={t('In-app notification')}
          subtitle={`${count} parent${count > 1 ? 's' : ''}`}
          right={<Toggle value={inApp} onChange={setInApp} />}
        />
        <ListRow
          icon={MessageCircle}
          title="SMS"
          subtitle={t('Uses school SMS credit')}
          right={<Toggle value={sms} onChange={setSms} />}
        />
        <ListRow
          icon={Phone}
          title="WhatsApp"
          right={<Toggle value={wa} onChange={setWa} />}
          last
        />
      </Card>
    </Screen>
  );
}

const NOTICE_ICON: Record<string, IconType> = {
  sub: ArrowLeftRight,
  exam: GraduationCap,
  check: Check,
  salary: Receipt,
  meeting: Users,
};

// T25
export function TeacherNotices() {
  return (
    <Screen title="Notices">
      <Card>
        {T_NOTICES.map((n, i) => (
          <ListRow
            key={n.id}
            icon={NOTICE_ICON[n.icon]}
            title={n.title}
            subtitle={n.text}
            right={<Text style={s.when}>{n.when}</Text>}
            last={i === T_NOTICES.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

const REPORT_ICON: Record<string, IconType> = {
  check: Check,
  alert: TriangleAlert,
  clip: Paperclip,
  pencil: Pencil,
  cap: GraduationCap,
  layers: Layers,
};

// T26
export function TeacherReports() {
  return (
    <Screen title="Reports">
      <Card>
        {REPORTS.map((r, i) => (
          <ListRow
            key={r.id}
            icon={REPORT_ICON[r.icon]}
            title={r.title}
            subtitle={r.sub}
            right={<Badge label="PDF · Excel" tone="neutral" />}
            onPress={() => toast(`${r.title} report downloaded (demo)`)}
            last={i === REPORTS.length - 1}
          />
        ))}
      </Card>
      <InfoBanner text="You see reports only for your own classes and subjects." />
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  h: { fontSize: 15, fontWeight: '800', color: colors.text },
  gap8: { marginVertical: 8 },
  when: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
});
