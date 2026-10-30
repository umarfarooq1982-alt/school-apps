// M-13 Curriculum: syllabus by term and chapter, lesson plan review, coverage.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { BookOpen, ChartColumn, ClipboardCheck, ListChecks } from 'lucide-react-native';
import { Badge, Button, Card, Field, ListRow, ProgressBar, Screen, toast, Toggle } from '../../../components/ui';
import { adminStyles as a, BarChart, FormSheet, KV, ListScreen, PickerField, Table, useReasonPrompt } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { useShared } from '../../../store';
import { CLASSES, logAudit } from '../../../data/admin';
import { Chapter, CHAPTERS, LESSON_PLANS, LessonPlan } from '../../../data/admin-principal';
import { localId, ReadOnlyBanner, useGuard } from '../owner/shared';

export const useChapters = () => useShared<Chapter[]>('admin.chapters', CHAPTERS);
export const usePlans = () => useShared<LessonPlan[]>('admin.lessonPlans', LESSON_PLANS);

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
  const save = () => {
    if (!add || !add.title.trim()) {
      toast('Enter the chapter title');
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
        onAdd={guard(() => setAdd({ id: localId('ch'), cls: 'Class 5', subject: 'English', term: 'Final term', title: '', done: false, teacher: 'Sadia Anwar' }))}
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
          <PickerField label="Class" value={add.cls} options={CLASSES} onChange={v => setAdd({ ...add, cls: v })} />
          <PickerField label="Subject" value={add.subject} options={['English', 'Mathematics', 'Urdu', 'Science', 'Islamiat', 'Social Studies', 'Computer']} onChange={v => setAdd({ ...add, subject: v })} />
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
  const id = useParam('id', list[0].id);
  const p = list.find(x => x.id === id) ?? list[0];
  const { guard } = useGuard();
  const [prompt, ask] = useReasonPrompt();
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
