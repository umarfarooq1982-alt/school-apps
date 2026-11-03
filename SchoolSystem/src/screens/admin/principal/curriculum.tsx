// M-13 Curriculum: syllabus by term and chapter, lesson plan review, coverage.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { BookOpen, ChartColumn, ClipboardCheck, ListChecks } from 'lucide-react-native';
import { Badge, Button, Card, Field, ListRow, ProgressBar, Screen, toast, Toggle } from '../../../components/ui';
import { adminStyles as a, BarChart, FormSheet, KV, ListScreen, PickerField, Table, useReasonPrompt } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { getSession } from '../../../api/session';
import { useApi } from '../../../api/hooks';
import { logAudit } from '../../../data/admin';
import { Chapter, LessonPlan } from '../../../data/admin-principal';
import { ModuleRow, field, webA } from '../../../api/webA';
import { localId, ReadOnlyBanner, useGuard, useModuleList } from '../owner/shared';

// Chapters and lesson plans live in the "curriculum" module that the teacher
// app also writes (status "done" ticks a chapter).
type CurItem = (Chapter & { kind: 'chapter' }) | (LessonPlan & { kind: 'plan' });

const fromRow = (r: ModuleRow): CurItem => {
  const status = field(r, 'status');
  if (field(r, 'kind') === 'plan' || r.objectives !== undefined) {
    const st = status.toLowerCase();
    return {
      kind: 'plan',
      id: String(r.id),
      teacher: field(r, 'teacher') || 'Teacher',
      cls: field(r, 'cls', 'className'),
      week: field(r, 'week', 'title'),
      objectives: field(r, 'objectives'),
      activities: field(r, 'activities'),
      status: st === 'approved' ? 'Approved' : st === 'returned' ? 'Returned' : 'Pending',
      comment: field(r, 'comment') || undefined,
    };
  }
  return {
    kind: 'chapter',
    id: String(r.id),
    cls: field(r, 'cls', 'className') || '—',
    subject: field(r, 'subject') || '—',
    term: field(r, 'term') || '—',
    title: field(r, 'title', 'chapter'),
    done: status === 'done' || r.done === true,
    teacher: field(r, 'teacher'),
  };
};

const toPayload = (x: CurItem): Record<string, unknown> =>
  x.kind === 'plan'
    ? { ...x, title: x.week, status: x.status.toLowerCase() }
    : { ...x, status: x.done ? 'done' : 'planned' };

function useCurriculum() {
  return useModuleList<CurItem>('curriculum', fromRow, toPayload);
}

export function useChapters() {
  const [all, setAll, q] = useCurriculum();
  const list = all.filter((x): x is Chapter & { kind: 'chapter' } => x.kind === 'chapter');
  const set = (next: Chapter[] | ((p: Chapter[]) => Chapter[])) =>
    setAll(cur => {
      const mine = cur.filter(x => x.kind === 'chapter') as Chapter[];
      const out = typeof next === 'function' ? next(mine) : next;
      return [...cur.filter(x => x.kind !== 'chapter'), ...out.map(c => ({ ...c, kind: 'chapter' as const }))];
    });
  return [list as Chapter[], set, q] as const;
}

export function usePlans() {
  const [all, setAll, q] = useCurriculum();
  const list = all.filter(x => x.kind === 'plan') as LessonPlan[];
  const set = (next: LessonPlan[] | ((p: LessonPlan[]) => LessonPlan[])) =>
    setAll(cur => {
      const mine = cur.filter(x => x.kind === 'plan') as LessonPlan[];
      const out = typeof next === 'function' ? next(mine) : next;
      return [...cur.filter(x => x.kind !== 'plan'), ...out.map(p => ({ ...p, kind: 'plan' as const }))];
    });
  return [list, set, q] as const;
}

const pct = (list: Chapter[]) => (list.length ? Math.round((list.filter(c => c.done).length / list.length) * 100) : 0);

export function AdminCurriculum(_: ScreenProps) {
  const nav = useNav();
  const [chapters] = useChapters();
  const [plans] = usePlans();
  const pending = plans.filter(p => p.status === 'Pending').length;
  return (
    <Screen title="Curriculum" subtitle="Syllabus, lesson plans and coverage">
      <ReadOnlyBanner />
      <Card>
        <KV k="Overall coverage" v={`${pct(chapters)}%`} />
        <ProgressBar value={pct(chapters)} />
      </Card>
      <Card>
        <ListRow icon={BookOpen} title="Syllabus" subtitle={`${chapters.length} chapters split by term · exam syllabus shown to parents`} onPress={() => nav.push('AdminCurrSyllabus')} chevron />
        <ListRow icon={ClipboardCheck} title="Lesson plan review" subtitle={`${pending} waiting for review`} right={pending ? <Badge label={String(pending)} tone="warn" /> : undefined} onPress={() => nav.push('AdminCurrPlans')} chevron />
        <ListRow icon={ChartColumn} title="Coverage report" subtitle="By class, subject and teacher" onPress={() => nav.push('AdminCurrCoverage')} chevron last />
      </Card>
    </Screen>
  );
}

export function AdminCurrSyllabus(_: ScreenProps) {
  const [list, setList] = useChapters();
  const { guard } = useGuard();
  const [add, setAdd] = useState<Chapter | null>(null);
  const subjects = Array.from(new Set(list.map(c => c.subject)));
  const acad = useApi('adm:academic', webA.academic);
  const classOptions = (acad.data?.classes ?? []).map(c => c.name);
  const subjectOptions = (acad.data?.subjects ?? []).map(x => x.name);
  const save = () => {
    if (!add || !add.title.trim() || !add.cls || !add.subject) {
      toast('Choose the class and subject, and enter the chapter title');
      return;
    }
    setList(l => [...l, add]);
    logAudit('Syllabus', `${add.cls} ${add.subject} · ${add.term}: added ${add.title}`);
    setAdd(null);
  };
  return (
    <>
      <ListScreen
        title="Syllabus"
        subtitle="Per class and subject, split by term and chapter"
        items={list}
        keyOf={c => c.id}
        searchText={c => `${c.title} ${c.subject} ${c.cls}`}
        filters={[
          { label: 'Class', options: ['All', ...Array.from(new Set(list.map(c => c.cls)))], get: c => c.cls },
          { label: 'Subject', options: ['All', ...subjects], get: c => c.subject },
          { label: 'Term', options: ['All', 'First term', 'Mid-term', 'Final term'], get: c => c.term },
        ]}
        onAdd={guard(() => setAdd({ id: localId('ch'), cls: '', subject: '', term: 'Final term', title: '', done: false, teacher: getSession()?.user.name ?? '' }))}
        addLabel="Add chapter"
        header={<ReadOnlyBanner />}
        renderItem={(c, last) => (
          <ListRow
            title={c.title}
            subtitle={`${c.cls} · ${c.subject} · ${c.term} · ${c.teacher}`}
            right={<Badge label={c.done ? 'Done' : 'To do'} tone={c.done ? 'success' : 'neutral'} />}
            last={last}
          />
        )}
      />
      {add ? (
        <FormSheet visible onClose={() => setAdd(null)} title="Add chapter" onSubmit={save}>
          <PickerField label="Class" value={add.cls} options={classOptions} placeholder="Choose the class" onChange={v => setAdd({ ...add, cls: v })} />
          <PickerField label="Subject" value={add.subject} options={subjectOptions} placeholder="Choose the subject" onChange={v => setAdd({ ...add, subject: v })} />
          <PickerField label="Term" value={add.term} options={['First term', 'Mid-term', 'Final term']} onChange={v => setAdd({ ...add, term: v })} />
          <Field label="Chapter" value={add.title} onChangeText={v => setAdd({ ...add, title: v })} placeholder="e.g. 10. Our Country" />
        </FormSheet>
      ) : null}
    </>
  );
}

export function AdminCurrPlans(_: ScreenProps) {
  const nav = useNav();
  const [list] = usePlans();
  return (
    <ListScreen
      title="Lesson plan review"
      subtitle="Approve or return with comments"
      items={list}
      keyOf={p => p.id}
      searchText={p => `${p.teacher} ${p.cls} ${p.week}`}
      filters={[{ label: 'Status', options: ['All', 'Pending', 'Approved', 'Returned'], get: p => p.status }]}
      renderItem={(p, last) => (
        <ListRow
          icon={ListChecks}
          title={`${p.cls} · ${p.week}`}
          subtitle={`${p.teacher}${p.comment ? ` · “${p.comment}”` : ''}`}
          right={<Badge label={p.status} tone={p.status === 'Approved' ? 'success' : p.status === 'Returned' ? 'danger' : 'warn'} />}
          onPress={() => nav.push('AdminCurrPlanDetail', { id: p.id })}
          last={last}
        />
      )}
    />
  );
}

export function AdminCurrPlanDetail(_: ScreenProps) {
  const [list, setList] = usePlans();
  const id = String(useParam('id', ''));
  const found = list.find(x => x.id === id) ?? list[0];
  const { guard } = useGuard();
  const [prompt, ask] = useReasonPrompt();
  const p: LessonPlan = found ?? { id: '', teacher: '', cls: 'Lesson plan', week: '', objectives: '', activities: '', status: 'Approved' };
  const approve = guard(() => {
    setList(l => l.map(x => (x.id === p.id ? { ...x, status: 'Approved', comment: undefined } : x)));
    logAudit('Lesson plan', `Approved ${p.teacher} ${p.cls} ${p.week}`);
    toast('Approved. The teacher is notified.');
  });
  const ret = guard(() =>
    ask('Return with comment', comment => {
      setList(l => l.map(x => (x.id === p.id ? { ...x, status: 'Returned', comment } : x)));
      logAudit('Lesson plan', `Returned ${p.teacher} ${p.cls} ${p.week}: ${comment}`);
      toast('Returned to the teacher');
    }),
  );
  return (
    <Screen
      title={p.cls}
      subtitle={`${p.week} · ${p.teacher}`}
      footer={
        p.status === 'Pending' ? (
          <>
            <Button label="Approve" onPress={approve} />
            <Button label="Return with comment" variant="outline" onPress={ret} />
          </>
        ) : undefined
      }
    >
      <ReadOnlyBanner />
      <Card>
        <KV k="Learning objectives" v={p.objectives} />
        <KV k="Activities and resources" v={p.activities} />
        <KV k="Status" v={<Badge label={p.status} tone={p.status === 'Approved' ? 'success' : p.status === 'Returned' ? 'danger' : 'warn'} />} last={!p.comment} />
        {p.comment ? <KV k="Comment" v={p.comment} last /> : null}
      </Card>
      {prompt}
    </Screen>
  );
}

export function AdminCurrCoverage(_: ScreenProps) {
  const [list, setList] = useChapters();
  const { ro } = useGuard();
  const groups = Array.from(new Set(list.map(c => `${c.cls}|${c.subject}|${c.teacher}`))).map(k => {
    const [cls, subject, teacher] = k.split('|');
    const rows = list.filter(c => c.cls === cls && c.subject === subject);
    return { key: k, cls, subject, teacher, rows, pct: pct(rows) };
  });
  const [open, setOpen] = useState(groups[0]?.key ?? '');
  return (
    <Screen title="Coverage report" subtitle="Topics marked done by teachers">
      <Card title="Coverage %">
        <BarChart data={groups.map(g => ({ label: `${g.cls.replace('Class ', '')} ${g.subject.slice(0, 4)}`, value: g.pct, highlight: g.pct >= 60 }))} format={v => `${v}%`} />
      </Card>
      <Card>
        <Table columns={['Class', 'Subject', 'Teacher', 'Done', 'Coverage']} rows={groups.map(g => [g.cls, g.subject, g.teacher, `${g.rows.filter(r => r.done).length}/${g.rows.length}`, `${g.pct}%`])} />
      </Card>
      {groups.map(g => (
        <Card key={g.key}>
          <ListRow title={`${g.cls} · ${g.subject}`} subtitle={`${g.teacher} · ${g.pct}%`} onPress={() => setOpen(o => (o === g.key ? '' : g.key))} chevron last={open !== g.key} />
          {open === g.key
            ? g.rows.map((c, i) => (
                <View key={c.id} style={[a.row, i === 0 && a.flex]}>
                  <Text style={[a.flex, a.small]}>{c.title} · {c.term}</Text>
                  <Toggle
                    value={c.done}
                    onChange={v => {
                      if (ro) {
                        toast('This session is closed and read-only.');
                        return;
                      }
                      setList(l => l.map(x => (x.id === c.id ? { ...x, done: v } : x)));
                      logAudit('Coverage', `${c.cls} ${c.subject} ${c.title}: ${v ? 'done' : 'not done'}`);
                    }}
                  />
                </View>
              ))
            : null}
        </Card>
      ))}
    </Screen>
  );
}
