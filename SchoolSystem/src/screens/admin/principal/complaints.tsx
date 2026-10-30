// S-11 Complaints & feedback: tickets, assignment, status, replies, surveys.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ClipboardList, MessageSquare, Send } from 'lucide-react-native';
import { Badge, Bubble, Button, Card, Chips, Field, IconButton, ListRow, Screen, toast } from '../../../components/ui';
import { adminStyles as a, BarChart, FormSheet, KV, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { useShared } from '../../../store';
import { ADMIN_STAFF, logAudit, STAFF_ROLES } from '../../../data/admin';
import { Survey, SURVEYS, Ticket, TICKETS } from '../../../data/admin-principal';
import { localId, ReadOnlyBanner, useGuard } from '../owner/shared';

export const useTickets = () => useShared<Ticket[]>('admin.tickets', TICKETS);
export const useSurveys = () => useShared<Survey[]>('admin.surveys', SURVEYS);

const STATUSES: Ticket['status'][] = ['Open', 'In progress', 'Resolved', 'Closed'];
const tone = (s: Ticket['status']) => (s === 'Open' ? 'danger' : s === 'In progress' ? 'warn' : s === 'Resolved' ? 'success' : 'neutral');
const ASSIGNEES = [
  ...STAFF_ROLES.filter(r => r.key !== 'owner').map(r => `${r.user} (${r.label})`),
  ...ADMIN_STAFF.slice(0, 6).map(s => `${s.name} (${s.designation})`),
];

export function AdminComplaints(_: ScreenProps) {
  const nav = useNav();
  const [list] = useTickets();
  const open = list.filter(t => t.status === 'Open' || t.status === 'In progress').length;
  return (
    <ListScreen
      title="Complaints & feedback"
      subtitle={`${open} open tickets`}
      items={list}
      keyOf={t => t.id}
      searchText={t => `${t.id} ${t.title} ${t.from} ${t.child}`}
      filters={[
        { label: 'Status', options: ['All', ...STATUSES], get: t => t.status },
        { label: 'Category', options: ['All', 'Academics', 'Fee', 'Transport', 'Behaviour', 'Facilities', 'Staff', 'Other'], get: t => t.category },
      ]}
      header={
        <>
          <ReadOnlyBanner />
          <Button label="Feedback surveys" variant="outline" icon={ClipboardList} onPress={() => nav.push('AdminSurveys')} />
        </>
      }
      renderItem={(t, last) => (
        <ListRow
          icon={MessageSquare}
          title={`${t.id} · ${t.title}`}
          subtitle={`${t.category} · ${t.from} (${t.child}) · ${t.opened}${t.assigned ? `\nAssigned: ${t.assigned}` : ''}`}
          right={<Badge label={t.status} tone={tone(t.status)} />}
          onPress={() => nav.push('AdminComplaintDetail', { id: t.id })}
          last={last}
        />
      )}
    />
  );
}

export function AdminComplaintDetail(_: ScreenProps) {
  const [list, setList] = useTickets();
  const id = useParam('id', list[0].id);
  const t = list.find(x => x.id === id) ?? list[0];
  const { guard } = useGuard();
  const [reply, setReply] = useState('');
  const [note, setNote] = useState(t.resolution ?? '');
  const update = (patch: Partial<Ticket>, log: string) => {
    setList(l => l.map(x => (x.id === t.id ? { ...x, ...patch } : x)));
    logAudit('Complaint', `${t.id}: ${log}`);
  };
  const send = guard(() => {
    if (!reply.trim()) {
      toast('Write a reply');
      return;
    }
    update({ thread: [...t.thread, { who: 'School · Today', text: reply.trim(), mine: true }], status: t.status === 'Open' ? 'In progress' : t.status }, 'reply sent to parent');
    setReply('');
    toast('Reply sent. The parent sees it in the app.');
  });
  const setStatus = (s: string) =>
    guard(() => {
      const st = s as Ticket['status'];
      if ((st === 'Resolved' || st === 'Closed') && !note.trim()) {
        toast('Write the resolution notes first');
        return;
      }
      update({ status: st, resolution: note.trim() || t.resolution }, `status ${t.status} → ${st}`);
      toast(`Status: ${st}. Parent notified.`);
    })();
  return (
    <Screen title={`${t.id} · ${t.category}`} subtitle={`${t.from} · ${t.child} · opened ${t.opened}`}>
      <ReadOnlyBanner />
      <Card>
        <KV k="Complaint" v={t.title} />
        <KV k="Status" v={<Badge label={t.status} tone={tone(t.status)} />} last />
      </Card>
      <PickerField
        label="Assigned to"
        value={t.assigned ?? ''}
        placeholder="Assign to staff"
        options={ASSIGNEES}
        onChange={v => guard(() => { update({ assigned: v, status: t.status === 'Open' ? 'In progress' : t.status }, `assigned to ${v}`); toast(`Assigned to ${v}`); })()}
      />
      <Chips options={STATUSES} value={t.status} onChange={setStatus} />
      <Field label="Resolution notes" value={note} onChangeText={setNote} multiline placeholder="What was done to resolve it" />
      <Card title="Conversation">
        <View style={a.flex}>
          {t.thread.map((m, i) => (
            <View key={`${t.id}-${i}`} style={a.flex}>
              <Bubble mine={m.mine} who={m.who} text={m.text} />
              <View style={st.gap} />
            </View>
          ))}
        </View>
      </Card>
      <View style={a.row}>
        <View style={a.flex}>
          <Field value={reply} onChangeText={setReply} placeholder="Write a reply…" />
        </View>
        <IconButton icon={Send} onPress={send} />
      </View>
    </Screen>
  );
}

export function AdminSurveys(_: ScreenProps) {
  const nav = useNav();
  const [list, setList] = useSurveys();
  const { guard } = useGuard();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', audience: 'All parents', questions: 'Teaching\nTransport safety\nCleanliness' });
  const create = () => {
    const qs = f.questions.split('\n').map(q => q.trim()).filter(Boolean);
    if (!f.title.trim() || !qs.length) {
      toast('Enter a title and at least one question');
      return;
    }
    const sv: Survey = { id: localId('sv'), title: f.title.trim(), audience: f.audience, responses: 0, status: 'Open', questions: qs.map(q => ({ q, avg: 0 })) };
    setList(l => [sv, ...l]);
    logAudit('Survey', `Created "${sv.title}" for ${sv.audience}`);
    toast('Survey sent to parents in the app');
    setOpen(false);
  };
  return (
    <>
      <ListScreen
        title="Feedback surveys"
        items={list}
        keyOf={x => x.id}
        searchText={x => `${x.title} ${x.audience}`}
        filters={[{ label: 'Status', options: ['All', 'Open', 'Closed'], get: x => x.status }]}
        onAdd={guard(() => setOpen(true))}
        addLabel="Create survey"
        renderItem={(x, last) => (
          <ListRow icon={ClipboardList} title={x.title} subtitle={`${x.audience} · ${x.responses} responses · ${x.questions.length} questions`} right={<Badge label={x.status} tone={x.status === 'Open' ? 'success' : 'neutral'} />} onPress={() => nav.push('AdminSurveyDetail', { id: x.id })} last={last} />
        )}
      />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Create survey" onSubmit={create} submitLabel="Send survey">
        <Field label="Title" value={f.title} onChangeText={v => setF(x => ({ ...x, title: v }))} />
        <PickerField label="Send to" value={f.audience} options={['All parents', 'Parents of Class 1–5', 'Parents of Class 6–10', 'Parents of transport users']} onChange={v => setF(x => ({ ...x, audience: v }))} />
        <Field label="Questions (one per line, rated 1–5)" value={f.questions} onChangeText={v => setF(x => ({ ...x, questions: v }))} multiline />
      </FormSheet>
    </>
  );
}

export function AdminSurveyDetail(_: ScreenProps) {
  const [list, setList] = useSurveys();
  const id = useParam('id', list[0].id);
  const x = list.find(s => s.id === id) ?? list[0];
  const { guard } = useGuard();
  return (
    <Screen
      title={x.title}
      subtitle={`${x.audience} · ${x.responses} responses`}
      footer={
        x.status === 'Open' ? (
          <Button
            label="Close survey"
            variant="outline"
            onPress={guard(() => {
              setList(l => l.map(s => (s.id === x.id ? { ...s, status: 'Closed' } : s)));
              logAudit('Survey', `Closed "${x.title}"`);
            })}
          />
        ) : undefined
      }
    >
      <Card title="Average rating (out of 5)">
        {x.responses ? (
          <BarChart data={x.questions.map(q => ({ label: q.q.split(' ')[0], value: q.avg, highlight: q.avg >= 4 }))} format={v => v.toFixed(1)} />
        ) : (
          <KV k="No responses yet" v="" last />
        )}
      </Card>
      <Card>
        {x.questions.map((q, i) => (
          <KV key={q.q} k={q.q} v={x.responses ? `${q.avg.toFixed(1)} / 5` : '—'} last={i === x.questions.length - 1} />
        ))}
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({ gap: { height: 8 } });
