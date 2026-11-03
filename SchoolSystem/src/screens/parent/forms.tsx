import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banknote, Calendar, Camera, Clock, File, Plus, Shield } from 'lucide-react-native';
import {
  Badge,
  Bubble,
  Button,
  Card,
  Chips,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  StarRating,
  toast,
  Toggle,
} from '../../components/ui';
import { BottomSheet } from '../../components/Tabs';
import { Empty, NoApiBanner, QueryView } from '../../components/states';
import { colors, radius } from '../../theme';
import { ScreenProps, useNav } from '../../navigation';
import { useSession } from '../../store';
import { useI18n } from '../../i18n';
import { useCurrentChild } from '../../data/useChild';
import { familyApi, RecordDto } from '../../api/mobile';
import { useApi, useMutation } from '../../api/hooks';
import {
  addDaysIso,
  cap,
  daysBetween,
  fmtDate,
  statusTone,
  todayIso,
  useChildId,
  useFamily,
  useFees,
} from '../shared';

// The app has no file picker yet; attachments are not sent.
function AddFile({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={() => toast(t('Attaching photos is coming soon'))}
      style={({ pressed }) => [s.attach, pressed && s.pressed]}
    >
      <Camera size={17} color={colors.textMuted} />
      <Text style={s.attachText}>{t(label)}</Text>
    </Pressable>
  );
}

// ---------- Leave (P20) ----------

function DateField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: string;
  onChange: (d: string) => void;
  min: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const days = Array.from({ length: 21 }, (_, i) => addDaysIso(min, i));
  return (
    <View style={s.flex}>
      <Field label={label} icon={Calendar} value={fmtDate(value, true)} onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text style={s.sheetTitle}>{t(label)}</Text>
        <View style={s.days}>
          {days.map(d => (
            <Pressable
              key={d}
              onPress={() => {
                onChange(d);
                setOpen(false);
              }}
              style={[s.day, d === value && s.dayOn]}
            >
              <Text style={s.dayText}>{fmtDate(d)}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const LEAVE_TYPES = ['Sick', 'Family', 'Other'];

export function ParentLeave(_: ScreenProps) {
  const { t } = useI18n();
  const { role } = useSession();
  const child = useCurrentChild();
  const childId = useChildId();
  const today = todayIso();
  const [from, setFrom] = useState(addDaysIso(today, 1));
  const [to, setTo] = useState(addDaysIso(today, 1));
  const [type, setType] = useState('Sick');
  const [reason, setReason] = useState('');
  const q = useFamily('leave', familyApi.leave);
  const days = Math.max(1, daysBetween(from, to));
  const apply = useMutation(
    () => familyApi.applyLeave({ from, to, reason: reason.trim(), type, days }, childId),
    'Sent to class teacher',
  );
  const send = async () => {
    if (reason.trim().length < 5) {
      toast(t('Please write the reason'));
      return;
    }
    if ((await apply.run()) !== undefined) {
      setReason('');
      q.refresh();
    }
  };
  const isParent = role === 'parent';
  return (
    <Screen title="Leave" subtitle={child.name} refreshing={q.refreshing} onRefresh={q.refresh}>
      {isParent ? (
        <>
          <View style={s.row}>
            <DateField
              label="From"
              value={from}
              min={today}
              onChange={d => {
                setFrom(d);
                if (to < d) {
                  setTo(d);
                }
              }}
            />
            <DateField label="To" value={to} min={from} onChange={setTo} />
          </View>
          <Chips options={LEAVE_TYPES} value={type} onChange={setType} />
          <Field
            label="Reason"
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="Fever since last night. Doctor advised rest for two days."
          />
          <AddFile label="Add photo or file" />
          <Button label={`${t('Send to class teacher')} · ${days} ${t(days === 1 ? 'day' : 'days')}`} onPress={send} loading={apply.busy} />
        </>
      ) : (
        <InfoBanner text={t('Leave is applied by a parent from the parent app.')} />
      )}
      <QueryView q={q}>
        {list => (
          <Card title="Earlier requests">
            {list.length ? (
              list.map((l, i) => (
                <ListRow
                  key={l.id}
                  title={`${fmtDate(l.from_date)}${l.to_date !== l.from_date ? ` – ${fmtDate(l.to_date)}` : ''} · ${l.days} ${t(l.days === 1 ? 'day' : 'days')}`}
                  subtitle={[l.leave_type, l.reason].filter(Boolean).join(' · ')}
                  right={<Badge label={cap(l.status)} tone={statusTone(l.status)} />}
                  last={i === list.length - 1}
                />
              ))
            ) : (
              <Text style={s.empty}>{t('No leave requests yet.')}</Text>
            )}
          </Card>
        )}
      </QueryView>
    </Screen>
  );
}

// ---------- Complaints (P25, P26) ----------

function useComplaints() {
  return useApi('family-complaints', familyApi.complaints);
}

export function ParentComplaints(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const q = useComplaints();
  const [selId, setSelId] = useState<number | undefined>(undefined);
  const list = q.data ?? [];
  const c = list.find(x => x.id === selId) ?? list[0];
  return (
    <Screen
      title={c ? `C-${String(c.id).padStart(4, '0')} · ${c.category}` : 'Complaints'}
      subtitle={c ? cap(c.status) : undefined}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<Button label="New complaint" variant="outline" icon={Plus} onPress={() => nav.push('ParentNewComplaint')} />}
    >
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No complaints yet.">
        {() =>
          c ? (
            <>
              {list.length > 1 ? (
                <Chips
                  options={list.map(x => `C-${String(x.id).padStart(4, '0')}`)}
                  value={`C-${String(c.id).padStart(4, '0')}`}
                  onChange={v => setSelId(Number(v.replace(/\D/g, '')))}
                />
              ) : null}
              <Bubble mine who={c.raisedBy || t('You')} text={c.body} />
              <Badge label={cap(c.status)} tone={statusTone(c.status)} />
              <NoApiBanner what={t('Replies from the school')} />
            </>
          ) : null
        }
      </QueryView>
      <Pressable onPress={() => nav.push('ParentSurvey')}>
        <Text style={s.link}>{t('Answer the parent survey')} ›</Text>
      </Pressable>
    </Screen>
  );
}

const CATEGORIES = ['Academics', 'Fee', 'Transport', 'Behaviour', 'Facilities', 'Staff', 'Other'];

export function ParentNewComplaint(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const q = useComplaints();
  const [cat, setCat] = useState('Transport');
  const [text, setText] = useState('');
  const create = useMutation(() => familyApi.createComplaint(cat, text.trim()));
  const send = async () => {
    if (text.trim().length < 10) {
      toast(t('Please describe the complaint'));
      return;
    }
    const r = await create.run();
    if (r) {
      toast(`${t('Complaint sent')}: C-${String(r.id).padStart(4, '0')}`);
      q.setData(prev => [r, ...(prev ?? [])]);
      nav.pop();
    }
  };
  return (
    <Screen title="New complaint" footer={<Button label="Send complaint" onPress={send} loading={create.busy} />}>
      <Text style={s.label}>{t('Category')}</Text>
      <Chips options={CATEGORIES} value={cat} onChange={setCat} />
      <Field
        label="Complaint"
        value={text}
        onChangeText={setText}
        multiline
        placeholder="The van reached 25 minutes late twice this week."
      />
      <AddFile label="Add photo or file" />
      <InfoBanner icon={Clock} text={t('You get a complaint number and can follow its status here.')} />
    </Screen>
  );
}

// ---------- Survey (P27) ----------

function surveyQuestions(r?: RecordDto): string[] | null {
  const qs = r?.questions;
  return Array.isArray(qs) && qs.every(x => typeof x === 'string') ? (qs as string[]) : null;
}

export function ParentSurvey(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const q = useApi('family-surveys', familyApi.surveys);
  const survey = (q.data ?? []).find(x => x.status !== 'closed');
  const fromServer = surveyQuestions(survey);
  // Only the school's own questions; no survey open → nothing to answer.
  const questions = fromServer ?? [];
  const [ratings, setRatings] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const submit = useMutation(
    () =>
      familyApi.answerSurvey(survey?.id ?? 'parent-feedback', {
        ratings: Object.fromEntries(questions.map((x, i) => [x, ratings[i] ?? 0])),
        suggestion: note.trim(),
      }),
    'Thank you! Answers sent',
  );
  const send = async () => {
    if (questions.some((_q, i) => !ratings[i])) {
      toast(t('Please answer every question'));
      return;
    }
    if ((await submit.run()) !== undefined) {
      nav.pop();
    }
  };
  return (
    <Screen
      title="Parent survey"
      subtitle={survey ? `${survey.title} · ${questions.length} ${t('questions')}` : undefined}
      footer={questions.length ? <Button label="Send answers" onPress={send} loading={submit.busy} /> : undefined}
    >
      <QueryView q={q}>
        {() => (
          <>
            {questions.length ? null : <Empty text="No survey is open right now." />}
            {questions.map((qq, i) => (
              <Card key={qq}>
                <Text style={s.question}>{t(qq)}</Text>
                <StarRating
                  value={ratings[i] ?? 0}
                  onChange={v =>
                    setRatings(r => {
                      const next = [...r];
                      next[i] = v;
                      return next;
                    })
                  }
                />
              </Card>
            ))}
            {questions.length ? (
              <Field label="Any suggestion?" value={note} onChangeText={setNote} multiline />
            ) : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

// ---------- Pickup persons (P28) ----------

const pName = (r: RecordDto) => String(r.name ?? r.title ?? '');
const pRelation = (r: RecordDto) => String(r.relation ?? r.status ?? '');
const pCnic = (r: RecordDto) => String(r.cnic ?? r.notes ?? '');

export function ParentPickup(_: ScreenProps) {
  const { t } = useI18n();
  const child = useCurrentChild();
  const childId = useChildId();
  const first = child.name.split(' ')[0];
  const q = useFamily('pickup', familyApi.pickup);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [cnic, setCnic] = useState('');
  const save = useMutation(
    (b: { name: string; relation: string; cnic: string }) => familyApi.savePickup(b, childId),
    'Person saved',
  );
  const submit = async () => {
    const digits = cnic.replace(/\D/g, '');
    if (name.trim().length < 3) {
      toast(t('Enter the full name'));
    } else if (!relation.trim()) {
      toast(t('Enter the relation'));
    } else if (digits.length !== 13) {
      toast(t('CNIC must have 13 digits'));
    } else {
      const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
      const r = await save.run({ name: name.trim(), relation: relation.trim(), cnic: formatted });
      if (r) {
        q.setData(prev => [r, ...(prev ?? [])]);
        setName('');
        setRelation('');
        setCnic('');
      }
    }
  };
  return (
    <Screen
      title="Authorized pickup"
      subtitle={child.name}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<Button label="Save person" onPress={submit} loading={save.busy} />}
    >
      <InfoBanner icon={Shield} text={`${t('The front desk checks the photo and CNIC before releasing')} ${first}.`} />
      <QueryView q={q}>
        {list =>
          list.length ? (
            <Card>
              {list.map((p, i) => (
                <ListRow
                  key={p.id}
                  title={pName(p)}
                  subtitle={`${t(pRelation(p))} · ${pCnic(p)}`}
                  last={i === list.length - 1}
                  avatar={pName(p) || '?'}
                />
              ))}
            </Card>
          ) : (
            <Empty text="No pickup persons yet." />
          )
        }
      </QueryView>
      <NoApiBanner what={t('Removing a person and photos')} />
      <Card title="Add a person">
        <View style={s.form}>
          <Field label="Name" value={name} onChangeText={setName} placeholder={t('Full name')} />
          <View style={s.row}>
            <View style={s.flex}>
              <Field value={relation} onChangeText={setRelation} placeholder={t('Relation')} />
            </View>
            <View style={s.flex}>
              <Field value={cnic} onChangeText={setCnic} placeholder="CNIC" keyboardType="number-pad" maxLength={15} />
            </View>
          </View>
          <AddFile label="Add photo" />
        </View>
      </Card>
    </Screen>
  );
}

// ---------- Certificates (P29) ----------

const CERTS = [
  { key: 'character', label: 'Character certificate', sub: undefined },
  { key: 'bonafide', label: 'Bonafide certificate', sub: undefined },
  { key: 'leaving', label: 'Leaving certificate', sub: 'After fee and library clearance' },
];

export function ParentCertificates(_: ScreenProps) {
  const { t } = useI18n();
  const childId = useChildId();
  const fees = useFees();
  const due = fees.data?.dues ?? 0;
  const q = useFamily('certs', familyApi.certificates);
  const [kind, setKind] = useState(CERTS[0].key);
  const [purpose, setPurpose] = useState('');
  const req = useMutation((k: string) => familyApi.requestCertificate(k, childId), 'Request sent');
  const send = async () => {
    if (!purpose.trim()) {
      toast(t('Write what the certificate is needed for'));
      return;
    }
    if (kind === 'leaving' && due > 0) {
      toast(t('Clear the fee dues first for a leaving certificate'));
      return;
    }
    const r = await req.run(kind);
    if (r) {
      q.setData(prev => [r, ...(prev ?? [])]);
      setPurpose('');
    }
  };
  const label = (k: string) => CERTS.find(c => c.key === k.toLowerCase())?.label ?? cap(k);
  return (
    <Screen title="Request certificate" refreshing={q.refreshing} onRefresh={q.refresh}>
      <Text style={s.label}>{t('Certificate')}</Text>
      <Card>
        {CERTS.map((c, i) => (
          <ListRow
            key={c.key}
            icon={File}
            title={t(c.label)}
            subtitle={c.sub ? t(c.sub) : undefined}
            right={<Toggle value={kind === c.key} onChange={() => setKind(c.key)} />}
            onPress={() => setKind(c.key)}
            last={i === CERTS.length - 1}
          />
        ))}
      </Card>
      <Field label="Needed for" value={purpose} onChangeText={setPurpose} placeholder="Visa application" />
      <InfoBanner tone="warn" icon={Banknote} text={t('A certificate fee may be added to the next voucher.')} />
      <Button label="Send request" onPress={send} loading={req.busy} />
      <QueryView q={q}>
        {list => (
          <Card title="My requests">
            {list.length ? (
              list.map((r, i) => (
                <ListRow
                  key={r.id}
                  title={t(label(String(r.kind ?? r.title)))}
                  subtitle={`${t('Requested')} ${fmtDate(r.recordDate)}`}
                  right={<Badge label={cap(r.status)} tone={statusTone(r.status)} />}
                  last={i === list.length - 1}
                />
              ))
            ) : (
              <Text style={s.empty}>{t('No requests yet.')}</Text>
            )}
          </Card>
        )}
      </QueryView>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', gap: 10 },
  form: { gap: 10 },
  label: { fontSize: 13, fontWeight: '800', color: colors.text },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
  },
  attachText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 10 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 13, fontWeight: '800', color: colors.text },
  link: { fontSize: 13, fontWeight: '800', color: colors.primaryText, textAlign: 'center', marginTop: 12 },
  question: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 10 },
});
