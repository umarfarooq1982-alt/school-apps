import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Banknote,
  Calendar,
  Camera,
  Clock,
  File,
  Paperclip,
  Plus,
  Send,
  Shield,
  X,
} from 'lucide-react-native';
import {
  Badge,
  Bubble,
  Button,
  Card,
  Chips,
  Field,
  IconButton,
  InfoBanner,
  ListRow,
  Screen,
  StarRating,
  toast,
  Toggle,
} from '../../components/ui';
import { BottomSheet } from '../../components/Tabs';
import { colors, radius, Tone } from '../../theme';
import { ScreenProps, useNav } from '../../navigation';
import { useShared } from '../../store';
import { useI18n } from '../../i18n';
import { useCurrentChild } from '../../data/useChild';
import { useChildFee } from '../shared';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TODAY = new Date(2026, 9, 22);

const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmt = (d: Date) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
const short = (d: Date) => `${d.getDate()} ${MON[d.getMonth()]}`;
const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

function AttachChip({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}) {
  return (
    <View style={s.attach}>
      <Paperclip size={17} color={colors.textMuted} />
      <Text style={[s.attachText, s.flex]}>{name}</Text>
      <Pressable onPress={onRemove} hitSlop={10}>
        <X size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function AddFile({ label, onPress }: { label: string; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.attach, pressed && s.pressed]}>
      <Camera size={17} color={colors.textMuted} />
      <Text style={s.attachText}>{t(label)}</Text>
    </Pressable>
  );
}

// ---------- Leave (P20) ----------

type LeaveReq = {
  childId: string;
  range: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

function DateField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  min: Date;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const days = Array.from({ length: 21 }, (_, i) => addDays(min, i));
  return (
    <View style={s.flex}>
      <Field label={label} icon={Calendar} value={fmt(value)} onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text style={s.sheetTitle}>{t(label)}</Text>
        <View style={s.days}>
          {days.map(d => {
            const on = d.getTime() === value.getTime();
            return (
              <Pressable
                key={d.getTime()}
                onPress={() => {
                  onChange(d);
                  setOpen(false);
                }}
                style={[s.day, on && s.dayOn]}
              >
                <Text style={s.dayText}>{short(d)}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

export function ParentLeave(_: ScreenProps) {
  const { t } = useI18n();
  const child = useCurrentChild();
  const [from, setFrom] = useState(addDays(TODAY, 1));
  const [to, setTo] = useState(addDays(TODAY, 2));
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<string | null>('medical-slip.jpg');
  const [list, setList] = useShared<LeaveReq[]>('parent.leaves', [
    { childId: 'ayesha', range: '2 – 3 Oct', days: 2, reason: 'Family wedding', status: 'Approved' },
    { childId: 'ayesha', range: '14 Sep', days: 1, reason: 'Fever', status: 'Approved' },
  ]);
  const mine = list.filter(l => l.childId === child.id);
  const send = () => {
    if (reason.trim().length < 5) {
      toast(t('Please write the reason'));
      return;
    }
    const days = dayDiff(from, to) + 1;
    const range =
      days === 1 ? short(from) : `${from.getDate()} – ${short(to)}`;
    setList(l => [
      { childId: child.id, range, days, reason: reason.trim(), status: 'Pending' },
      ...l,
    ]);
    setReason('');
    toast(t('Sent to class teacher'));
  };
  const TONE: Record<LeaveReq['status'], Tone> = {
    Pending: 'warn',
    Approved: 'success',
    Rejected: 'danger',
  };
  return (
    <Screen title="Leave" subtitle={child.name}>
      <View style={s.row}>
        <DateField
          label="From"
          value={from}
          min={TODAY}
          onChange={d => {
            setFrom(d);
            if (to.getTime() < d.getTime()) {
              setTo(d);
            }
          }}
        />
        <DateField label="To" value={to} min={from} onChange={setTo} />
      </View>
      <Field
        label="Reason"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="Fever since last night. Doctor advised rest for two days."
      />
      {file ? (
        <AttachChip name={file} onRemove={() => setFile(null)} />
      ) : (
        <AddFile label="Add photo or file" onPress={() => setFile('medical-slip.jpg')} />
      )}
      <Button label="Send to class teacher" onPress={send} />
      <Card title="Earlier requests">
        {mine.length ? (
          mine.map((l, i) => (
            <ListRow
              key={`${l.range}-${i}`}
              title={`${l.range} · ${l.days} ${t(l.days === 1 ? 'day' : 'days')}`}
              subtitle={l.reason}
              right={<Badge label={l.status} tone={TONE[l.status]} />}
              last={i === mine.length - 1}
            />
          ))
        ) : (
          <Text style={s.empty}>{t('No leave requests yet.')}</Text>
        )}
      </Card>
    </Screen>
  );
}

// ---------- Complaints (P25, P26) ----------

type Complaint = {
  id: string;
  category: string;
  status: string;
  assigned: string;
  messages: Array<{ mine: boolean; who: string; text: string }>;
};

function useComplaints() {
  return useShared<Complaint[]>('parent.complaints', [
    {
      id: 'C-0042',
      category: 'Transport',
      status: 'In progress',
      assigned: 'Transport Manager',
      messages: [
        { mine: true, who: 'You · 20 Oct', text: 'The van reached 25 minutes late twice this week.' },
        { mine: false, who: 'School · 21 Oct', text: 'Sorry for this. The route was changed for road work; we are fixing the timing from Monday.' },
        { mine: true, who: 'You · 21 Oct', text: 'Thank you, please inform us by SMS.' },
      ],
    },
  ]);
}

export function ParentComplaints(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const [list, setList] = useComplaints();
  const [selId, setSelId] = useShared('parent.complaintSel', 'C-0042');
  const [reply, setReply] = useState('');
  const c = list.find(x => x.id === selId) ?? list[0];
  const send = () => {
    const text = reply.trim();
    if (!text) {
      return;
    }
    setList(l =>
      l.map(x =>
        x.id === c.id
          ? { ...x, messages: [...x.messages, { mine: true, who: 'You · 22 Oct', text }] }
          : x,
      ),
    );
    setReply('');
  };
  return (
    <Screen
      title={`${c.id} · ${c.category}`}
      subtitle={`${c.status} · ${t('assigned to')} ${c.assigned}`}
      footer={
        <>
          <View style={s.replyRow}>
            <View style={s.flex}>
              <Field
                value={reply}
                onChangeText={setReply}
                placeholder={t('Write a reply...')}
                onSubmitEditing={send}
                returnKeyType="send"
              />
            </View>
            <IconButton icon={Send} onPress={send} style={s.sendBtn} />
          </View>
          <Button
            label="New complaint"
            variant="outline"
            icon={Plus}
            onPress={() => nav.push('ParentNewComplaint')}
          />
        </>
      }
    >
      {list.length > 1 ? (
        <Chips
          options={list.map(x => x.id)}
          value={c.id}
          onChange={setSelId}
        />
      ) : null}
      {c.messages.map((m, i) => (
        <Bubble key={i} mine={m.mine} who={m.who} text={m.text} />
      ))}
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
  const [list, setList] = useComplaints();
  const [, setSel] = useShared('parent.complaintSel', 'C-0042');
  const [cat, setCat] = useState('Transport');
  const [text, setText] = useState('');
  const [file, setFile] = useState<string | null>(null);
  const send = () => {
    if (text.trim().length < 10) {
      toast(t('Please describe the complaint'));
      return;
    }
    const newId = `C-00${42 + list.length}`;
    setList(l => [
        {
          id: newId,
          category: cat,
          status: 'Open',
          assigned: 'Front desk',
          messages: [
            {
              mine: true,
              who: 'You · 22 Oct',
              text: file ? `${text.trim()}\n📎 ${file}` : text.trim(),
            },
          ],
        },
        ...l,
    ]);
    setSel(newId);
    toast(`${t('Complaint sent')}: ${newId}`);
    nav.pop();
  };
  return (
    <Screen
      title="New complaint"
      footer={<Button label="Send complaint" onPress={send} />}
    >
      <Text style={s.label}>{t('Category')}</Text>
      <Chips options={CATEGORIES} value={cat} onChange={setCat} />
      <Field
        label="Complaint"
        value={text}
        onChangeText={setText}
        multiline
        placeholder="The van reached 25 minutes late twice this week."
      />
      {file ? (
        <AttachChip name={file} onRemove={() => setFile(null)} />
      ) : (
        <AddFile label="Add photo or file" onPress={() => setFile('photo-1.jpg')} />
      )}
      <InfoBanner
        icon={Clock}
        text={t('You get a complaint number and can follow every reply here.')}
      />
    </Screen>
  );
}

// ---------- Survey (P27) ----------

const QUESTIONS = [
  'How satisfied are you with teaching?',
  'How safe is school transport?',
  'How clear is communication from the school?',
];

export function ParentSurvey(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const [ratings, setRatings] = useState<number[]>([4, 3, 0]);
  const [note, setNote] = useState('Please add more sports activities after school.');
  const send = () => {
    if (ratings.some(r => r === 0)) {
      toast(t('Please answer every question'));
      return;
    }
    toast(t('Thank you! Answers sent'));
    nav.pop();
  };
  return (
    <Screen
      title="Parent survey"
      subtitle={`Term 1 feedback · ${QUESTIONS.length} questions`}
      footer={<Button label="Send answers" onPress={send} />}
    >
      {QUESTIONS.map((q, i) => (
        <Card key={q}>
          <Text style={s.question}>{t(q)}</Text>
          <StarRating
            value={ratings[i]}
            onChange={v => setRatings(r => r.map((x, j) => (j === i ? v : x)))}
          />
        </Card>
      ))}
      <Field label="Any suggestion?" value={note} onChangeText={setNote} multiline />
    </Screen>
  );
}

// ---------- Pickup persons (P28) ----------

type Person = { name: string; relation: string; cnic: string; locked?: boolean; photo?: boolean };

export function ParentPickup(_: ScreenProps) {
  const { t } = useI18n();
  const child = useCurrentChild();
  const first = child.name.split(' ')[0];
  const [people, setPeople] = useShared<Person[]>(`parent.pickup.${child.id}`, [
    { name: 'Imran Khan', relation: 'Father', cnic: '35202-1234567-1', locked: true },
    { name: 'Sana Imran', relation: 'Mother', cnic: '35202-7654321-2', locked: true },
    { name: 'Ali Raza', relation: 'Uncle', cnic: '35202-1234567-7' },
  ]);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [cnic, setCnic] = useState('');
  const [photo, setPhoto] = useState(false);
  const save = () => {
    const digits = cnic.replace(/\D/g, '');
    if (name.trim().length < 3) {
      toast(t('Enter the full name'));
    } else if (!relation.trim()) {
      toast(t('Enter the relation'));
    } else if (digits.length !== 13) {
      toast(t('CNIC must have 13 digits'));
    } else if (!photo) {
      toast(t('Add a photo so the front desk can check'));
    } else {
      const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
      setPeople(p => [...p, { name: name.trim(), relation: relation.trim(), cnic: formatted, photo }]);
      setName('');
      setRelation('');
      setCnic('');
      setPhoto(false);
      toast(t('Person saved'));
    }
  };
  return (
    <Screen
      title="Authorized pickup"
      subtitle={child.name}
      footer={<Button label="Save person" onPress={save} />}
    >
      <InfoBanner
        icon={Shield}
        text={`${t('The front desk checks the photo and CNIC before releasing')} ${first}.`}
      />
      <Card>
        {people.map((p, i) => (
          <ListRow
            key={p.cnic}
            title={p.name}
            subtitle={`${t(p.relation)} · ${p.cnic}`}
            right={
              p.locked ? undefined : (
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    setPeople(list => list.filter(x => x.cnic !== p.cnic));
                    toast(`${p.name} ${t('removed')}`);
                  }}
                >
                  <X size={20} color={colors.text} />
                </Pressable>
              )
            }
            last={i === people.length - 1}
            avatar={p.name}
          />
        ))}
      </Card>
      <Card title="Add a person">
        <View style={s.form}>
          <Field label="Name" value={name} onChangeText={setName} placeholder={t('Full name')} />
          <View style={s.row}>
            <View style={s.flex}>
              <Field value={relation} onChangeText={setRelation} placeholder={t('Relation')} />
            </View>
            <View style={s.flex}>
              <Field
                value={cnic}
                onChangeText={setCnic}
                placeholder="CNIC"
                keyboardType="number-pad"
                maxLength={15}
              />
            </View>
          </View>
          {photo ? (
            <AttachChip name="pickup-photo.jpg" onRemove={() => setPhoto(false)} />
          ) : (
            <AddFile label="Add photo" onPress={() => setPhoto(true)} />
          )}
        </View>
      </Card>
    </Screen>
  );
}

// ---------- Certificates (P29) ----------

type CertReq = { childId: string; type: string; when: string; status: string };

const CERTS = [
  { key: 'Character certificate', sub: undefined },
  { key: 'Bonafide certificate', sub: undefined },
  { key: 'Leaving certificate', sub: 'After fee and library clearance' },
];

export function ParentCertificates(_: ScreenProps) {
  const { t } = useI18n();
  const child = useCurrentChild();
  const { due } = useChildFee(child);
  const [type, setType] = useState(CERTS[0].key);
  const [purpose, setPurpose] = useState('Visa application');
  const [reqs, setReqs] = useShared<CertReq[]>('parent.certs', [
    { childId: 'ayesha', type: 'Bonafide certificate', when: 'Requested 3 Sep', status: 'Ready to collect' },
  ]);
  const mine = reqs.filter(r => r.childId === child.id);
  const send = () => {
    if (!purpose.trim()) {
      toast(t('Write what the certificate is needed for'));
      return;
    }
    if (type === 'Leaving certificate' && due > 0) {
      toast(t('Clear the fee dues first for a leaving certificate'));
      return;
    }
    setReqs(r => [{ childId: child.id, type, when: 'Requested 22 Oct', status: 'Requested' }, ...r]);
    toast(t('Request sent'));
  };
  return (
    <Screen title="Request certificate">
      <Text style={s.label}>{t('Certificate')}</Text>
      <Card>
        {CERTS.map((c, i) => (
          <ListRow
            key={c.key}
            icon={File}
            title={t(c.key)}
            subtitle={c.sub ? t(c.sub) : undefined}
            right={<Toggle value={type === c.key} onChange={() => setType(c.key)} />}
            onPress={() => setType(c.key)}
            last={i === CERTS.length - 1}
          />
        ))}
      </Card>
      <Field label="Needed for" value={purpose} onChangeText={setPurpose} />
      <InfoBanner
        tone="warn"
        icon={Banknote}
        text={t('Fee Rs. 300 is added to the next voucher.')}
      />
      <Button label="Send request" onPress={send} />
      <Card title="My requests">
        {mine.length ? (
          mine.map((r, i) => (
            <ListRow
              key={`${r.type}-${i}`}
              title={t(r.type)}
              subtitle={r.when}
              right={
                <Badge
                  label={r.status}
                  tone={r.status === 'Ready to collect' ? 'success' : 'warn'}
                />
              }
              last={i === mine.length - 1}
            />
          ))
        ) : (
          <Text style={s.empty}>{t('No requests yet.')}</Text>
        )}
      </Card>
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
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sendBtn: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  link: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryText,
    textAlign: 'center',
    marginTop: 12,
  },
  question: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 10 },
});
