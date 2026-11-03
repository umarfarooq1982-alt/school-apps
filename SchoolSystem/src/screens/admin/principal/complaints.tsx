// S-11 Complaints & feedback: tickets, assignment, status, replies, surveys.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ClipboardList, MessageSquare, Send } from 'lucide-react-native';
import { Badge, Bubble, Button, Card, Chips, Field, IconButton, ListRow, Screen, toast } from '../../../components/ui';
import { adminStyles as a, BarChart, FormSheet, KV, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { logAudit } from '../../../data/admin';
import { Survey, Ticket } from '../../../data/admin-principal';
import { useApi } from '../../../api/hooks';
import { field, ModuleRow, webA } from '../../../api/webA';
import { localId, ReadOnlyBanner, useGuard, useModuleList } from '../owner/shared';
import { Empty, Loading } from '../../../components/states';

const CATEGORIES: Ticket['category'][] = ['Academics', 'Fee', 'Transport', 'Behaviour', 'Facilities', 'Staff', 'Other'];

// The server's complaint row has category, body and status only (and its
// update always resets status to "open"), so assignment, status, replies and
// resolution are kept in a "complaint-meta" module record per complaint.
type Meta = { id: string; complaintId: string; status: Ticket['status']; assigned?: string; resolution?: string; thread: Ticket['thread'] };

const metaFrom = (r: ModuleRow): Meta => ({
  id: String(r.id),
  complaintId: field(r, 'complaintId'),
  status: (field(r, 'state') as Ticket['status']) || 'Open',
  assigned: field(r, 'assigned') || undefined,
  resolution: field(r, 'resolution') || undefined,
  thread: Array.isArray(r.thread) ? (r.thread as Ticket['thread']) : [],
});
const metaTo = (m: Meta): Record<string, unknown> => ({ ...m, title: m.complaintId, status: m.status.toLowerCase(), state: m.status });

export function useTickets() {
  const comps = useApi('adm:mod:complaints', () => webA.modules('complaints'));
  const [metas, setMetas] = useModuleList<Meta>('complaint-meta', metaFrom, metaTo);
  const list: Ticket[] = (comps.data ?? []).map(c => {
    const id = String(c.id);
    const m = metas.find(x => x.complaintId === id);
    const body = field(c, 'body');
    const cat = field(c, 'category');
    const at = field(c, 'created_at');
    return {
      id,
      title: body.length > 60 ? `${body.slice(0, 57)}…` : body || 'Complaint',
      category: (CATEGORIES.includes(cat as Ticket['category']) ? cat : 'Other') as Ticket['category'],
      from: field(c, 'raised_by') || 'Parent',
      child: '',
      status: m?.status ?? (field(c, 'status') === 'open' ? 'Open' : 'In progress'),
      assigned: m?.assigned,
      opened: at ? new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '',
      thread: [{ who: `${field(c, 'raised_by') || 'Parent'}${at ? ` · ${new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`, text: body }, ...(m?.thread ?? [])],
      resolution: m?.resolution,
    };
  });
  const setList = (fn: (l: Ticket[]) => Ticket[]) => {
    const next = fn(list);
    setMetas(cur => {
      const out = [...cur];
      next.forEach(t => {
        const before = list.find(x => x.id === t.id);
        if (!before || JSON.stringify(before) === JSON.stringify(t)) {
          return;
        }
        const meta: Meta = {
          id: out.find(m => m.complaintId === t.id)?.id ?? localId('cm'),
          complaintId: t.id,
          status: t.status,
          assigned: t.assigned,
          resolution: t.resolution,
          thread: t.thread.slice(1),
        };
        const i = out.findIndex(m => m.complaintId === t.id);
        if (i >= 0) {
          out[i] = meta;
        } else {
          out.push(meta);
        }
      });
      return out;
    });
  };
  return [list, setList, comps] as const;
}

// Surveys are "surveys" module records that the parent app reads; answers come
// back as "survey-answers" records and are averaged here.
type SurveyRec = Survey & { questionText: string[] };

const surveyFrom = (r: ModuleRow): SurveyRec => {
  const qs = Array.isArray(r.questions) ? (r.questions as unknown[]).map(q => (typeof q === 'string' ? q : String((q as { q?: string }).q ?? ''))) : [];
  return {
    id: String(r.id),
    title: field(r, 'title'),
    audience: field(r, 'audience') || 'All parents',
    responses: 0,
    questions: qs.map(q => ({ q, avg: 0 })),
    questionText: qs,
    status: field(r, 'status') === 'closed' ? 'Closed' : 'Open',
  };
};
const surveyTo = (x: SurveyRec): Record<string, unknown> => ({
  title: x.title,
  audience: x.audience,
  questions: x.questions.map(q => q.q),
  status: x.status === 'Closed' ? 'closed' : 'open',
});

export function useSurveys() {
  const [list, setList] = useModuleList<SurveyRec>('surveys', surveyFrom, surveyTo);
  const answers = useApi('adm:mod:survey-answers', () => webA.modules('survey-answers'));
  const withStats: SurveyRec[] = list.map(sv => {
    const mine = (answers.data ?? []).filter(ans0 => String(ans0.surveyId ?? field(ans0, 'title')) === sv.id);
    const questions = sv.questions.map((q, i) => {
      const vals = mine
        .map(rec => {
          const ans = (rec.answers ?? {}) as Record<string, unknown>;
          return Number(ans[q.q] ?? ans[String(i)] ?? ans[i]);
        })
        .filter(v => Number.isFinite(v) && v > 0);
      return { q: q.q, avg: vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0 };
    });
    return { ...sv, responses: mine.length, questions };
  });
  return [withStats, (fn: (l: SurveyRec[]) => SurveyRec[]) => setList(fn)] as const;
}

const STATUSES: Ticket['status'][] = ['Open', 'In progress', 'Resolved', 'Closed'];
const tone = (s: Ticket['status']) => (s === 'Open' ? 'danger' : s === 'In progress' ? 'warn' : s === 'Resolved' ? 'success' : 'neutral');
// Staff who can handle a complaint (school users that are not parents/students).
function useAssignees() {
  const users = useApi('adm:users', webA.users);
  return (users.data ?? []).filter(u => u.role !== 'parent' && u.role !== 'student').map(u => `${u.name} (${u.role})`);
}

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
  const [list, setList, q] = useTickets();
  const id = String(useParam('id', ''));
  const t = list.find(x => x.id === id) ?? list[0];
  if (!t) {
    return (
      <Screen title="Complaint">
        {q.data ? <Empty text="Complaint not found." /> : <Loading />}
      </Screen>
    );
  }
  return <ComplaintDetail key={t.id} t={t} setList={setList} />;
}

function ComplaintDetail({ t, setList }: { t: Ticket; setList: (fn: (l: Ticket[]) => Ticket[]) => void }) {
  const ASSIGNEES = useAssignees();
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
    const sv: SurveyRec = { id: localId('sv'), title: f.title.trim(), audience: f.audience, responses: 0, status: 'Open', questions: qs.map(q => ({ q, avg: 0 })), questionText: qs };
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
  const id = String(useParam('id', ''));
  const x = list.find(s => s.id === id) ?? list[0];
  const { guard } = useGuard();
  if (!x) {
    return (
      <Screen title="Survey">
        <Empty text="Survey not found." />
      </Screen>
    );
  }
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
