// M-01 Academic session: sessions, classes, sections, subjects, mapping, terms.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { BookOpen, CalendarDays, Copy, Layers, Link, School } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  toast,
  Toggle,
} from '../../../components/ui';
import { adminStyles as a, FormSheet, ListScreen, PickerField, useReasonPrompt } from '../../../components/admin';
import { ScreenProps, useNav } from '../../../navigation';
import { useShared } from '../../../store';
import { CAMPUSES, CLASSES, logAudit, Session, SESSIONS, useStaffRole } from '../../../data/admin';
import {
  CLASS_SECTIONS,
  CLASS_SUBJECTS,
  ClassSection,
  SUBJECT_ROWS,
  SubjectRow,
  TEACHER_NAMES,
  Term,
  TERMS,
} from '../../../data/admin-principal';
import { localId, ReadOnlyBanner, useGuard } from '../owner/shared';

type SessionRow = Session & { campus: string };

const SESSION_SEED: SessionRow[] = CAMPUSES.flatMap(c => SESSIONS.map(s => ({ ...s, campus: c.name })));

export const useSessions = () => useShared<SessionRow[]>('admin.sessionList', SESSION_SEED);
export const useClassSections = () => useShared<ClassSection[]>('admin.classSections', CLASS_SECTIONS);
export const useSubjects = () => useShared<SubjectRow[]>('admin.subjects', SUBJECT_ROWS);
export const useMapping = () => useShared<Record<string, string[]>>('admin.classSubjects', CLASS_SUBJECTS);
export const useTerms = () => useShared<Term[]>('admin.terms', TERMS);

export function AdminAcademicSetup(_: ScreenProps) {
  const nav = useNav();
  const [sessions] = useSessions();
  const [cs] = useClassSections();
  const [subjects] = useSubjects();
  const [terms] = useTerms();
  const active = sessions.filter(s => s.status === 'Active');
  const items = [
    { route: 'AdminAcadSessions', icon: CalendarDays, title: 'Sessions', sub: `${active.length} active (one per campus) · ${sessions.length} in total` },
    { route: 'AdminAcadCopy', icon: Copy, title: 'Copy forward', sub: 'Classes, sections, subjects and fee structure into a new session' },
    { route: 'AdminAcadClasses', icon: School, title: 'Classes and sections', sub: `${CLASSES.length} classes · ${cs.length} sections with capacity, class teacher and room` },
    { route: 'AdminAcadSubjects', icon: BookOpen, title: 'Subjects', sub: `${subjects.length} subjects · core, elective, optional` },
    { route: 'AdminAcadMapping', icon: Link, title: 'Class-subject mapping', sub: 'Which subjects each class studies' },
    { route: 'AdminAcadTerms', icon: Layers, title: 'Terms', sub: `${terms.length} terms used by Exams and Curriculum` },
  ];
  return (
    <Screen title="Academic setup" subtitle="Session 2026-27">
      <ReadOnlyBanner />
      <Card>
        {items.map((it, i) => (
          <ListRow key={it.route} icon={it.icon} title={it.title} subtitle={it.sub} onPress={() => nav.push(it.route)} chevron last={i === items.length - 1} />
        ))}
      </Card>
      <InfoBanner text="A class, section or subject with linked records can only be deactivated, never deleted." />
    </Screen>
  );
}

// ---------- Sessions ----------

export function AdminAcadSessions(_: ScreenProps) {
  const [list, setList] = useSessions();
  const [role] = useStaffRole();
  const { guard } = useGuard();
  const [prompt, ask] = useReasonPrompt();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '2027-28', start: '1 Apr 2027', end: '31 Mar 2028', campus: CAMPUSES[0].name });
  const create = () => {
    if (!/^\d{4}-\d{2}$/.test(f.name)) {
      toast('Session name must look like 2027-28');
      return;
    }
    if (list.some(s => s.name === f.name && s.campus === f.campus)) {
      toast('This session already exists for the campus');
      return;
    }
    setList(l => [{ id: f.name, name: f.name, start: f.start, end: f.end, status: 'Planned', campus: f.campus }, ...l]);
    logAudit('Session', `Created ${f.name} for ${f.campus}`);
    toast('Session created as Planned');
    setOpen(false);
  };
  const activate = (s: SessionRow) =>
    guard(() => {
      const current = list.find(x => x.campus === s.campus && x.status === 'Active');
      if (current && current !== s) {
        toast(`Close ${current.name} first. Only one session can be active per campus.`);
        return;
      }
      if (s.status === 'Closed' && role !== 'owner') {
        toast('A closed session can only be reopened by the Owner');
        return;
      }
      setList(l => l.map(x => (x === s ? { ...x, status: 'Active' } : x)));
      logAudit('Session', `${s.name} (${s.campus}) marked active`);
    })();
  const close = (s: SessionRow) =>
    guard(() =>
      ask(`Close session ${s.name} for ${s.campus}?`, reason => {
        setList(l => l.map(x => (x === s ? { ...x, status: 'Closed' } : x)));
        logAudit('Session', `${s.name} (${s.campus}) closed. Reason: ${reason}`);
        toast('Session closed. It is now read-only except for the Owner.');
      }),
    )();
  return (
    <>
      <ListScreen
        title="Sessions"
        subtitle="One active session per campus"
        items={list}
        keyOf={s => `${s.campus}-${s.id}`}
        searchText={s => `${s.name} ${s.campus}`}
        filters={[
          { label: 'Campus', options: ['All', ...CAMPUSES.map(c => c.name)], get: s => s.campus },
          { label: 'Status', options: ['All', 'Active', 'Planned', 'Closed'], get: s => s.status },
        ]}
        onAdd={guard(() => setOpen(true))}
        addLabel="Create session"
        header={<ReadOnlyBanner />}
        renderItem={(s, last) => (
          <ListRow
            icon={CalendarDays}
            title={`${s.name} · ${s.campus}`}
            subtitle={`${s.start} – ${s.end}`}
            right={
              <View style={a.right}>
                <Badge label={s.status} tone={s.status === 'Active' ? 'success' : s.status === 'Planned' ? 'info' : 'neutral'} />
                {s.status === 'Active' ? (
                  <Text style={a.small} onPress={() => close(s)}>Close</Text>
                ) : (
                  <Text style={a.small} onPress={() => activate(s)}>Make active</Text>
                )}
              </View>
            }
            last={last}
          />
        )}
      />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Create session" onSubmit={create}>
        <Field label="Session" value={f.name} onChangeText={v => setF(x => ({ ...x, name: v }))} />
        <Field label="Start date" value={f.start} onChangeText={v => setF(x => ({ ...x, start: v }))} />
        <Field label="End date" value={f.end} onChangeText={v => setF(x => ({ ...x, end: v }))} />
        <PickerField label="Campus" value={f.campus} options={CAMPUSES.map(c => c.name)} onChange={v => setF(x => ({ ...x, campus: v }))} />
      </FormSheet>
      {prompt}
    </>
  );
}

export function AdminAcadCopy(_: ScreenProps) {
  const [sessions] = useSessions();
  const { guard } = useGuard();
  const names = Array.from(new Set(sessions.map(s => s.name)));
  const [from, setFrom] = useState('2025-26');
  const [to, setTo] = useState(names.includes('2027-28') ? '2027-28' : '2026-27');
  const [what, setWhat] = useState({ classes: true, sections: true, subjects: true, fee: true });
  const run = guard(() => {
    if (from === to) {
      toast('Choose two different sessions');
      return;
    }
    const parts = Object.entries(what).filter(([, v]) => v).map(([k]) => k);
    if (!parts.length) {
      toast('Choose at least one item to copy');
      return;
    }
    logAudit('Copy forward', `${from} → ${to}: ${parts.join(', ')}`);
    toast(`Copied ${parts.join(', ')} from ${from} to ${to}`);
  });
  return (
    <Screen title="Copy forward" subtitle="Start a new session from the last one" footer={<Button label="Copy now" icon={Copy} onPress={run} />}>
      <ReadOnlyBanner />
      <PickerField label="Copy from" value={from} options={names} onChange={setFrom} />
      <PickerField label="Copy into" value={to} options={names} onChange={setTo} />
      <Card>
        <ListRow title="Classes" right={<Toggle value={what.classes} onChange={v => setWhat(w => ({ ...w, classes: v }))} />} />
        <ListRow title="Sections" right={<Toggle value={what.sections} onChange={v => setWhat(w => ({ ...w, sections: v }))} />} />
        <ListRow title="Subjects and mapping" right={<Toggle value={what.subjects} onChange={v => setWhat(w => ({ ...w, subjects: v }))} />} />
        <ListRow title="Fee structure" right={<Toggle value={what.fee} onChange={v => setWhat(w => ({ ...w, fee: v }))} />} last />
      </Card>
      <InfoBanner text="Students are moved with the Promotion wizard, not by copy forward." />
    </Screen>
  );
}

// ---------- Classes and sections ----------

export function AdminAcadClasses(_: ScreenProps) {
  const [list, setList] = useClassSections();
  const { guard } = useGuard();
  const [edit, setEdit] = useState<ClassSection | null>(null);
  const save = () => {
    if (!edit) {
      return;
    }
    if (edit.capacity < edit.enrolled) {
      toast(`Capacity cannot be below the ${edit.enrolled} students already enrolled`);
      return;
    }
    if (!edit.room.trim()) {
      toast('Enter a room');
      return;
    }
    const exists = list.some(x => x.id === edit.id);
    if (!exists && list.some(x => x.className === edit.className && x.section === edit.section)) {
      toast('This section already exists');
      return;
    }
    setList(l => (exists ? l.map(x => (x.id === edit.id ? edit : x)) : [...l, edit]));
    logAudit('Classes', `${edit.className}-${edit.section}: capacity ${edit.capacity}, teacher ${edit.classTeacher}, room ${edit.room}`);
    toast('Saved');
    setEdit(null);
  };
  const toggle = (c: ClassSection) =>
    guard(() => {
      setList(l => l.map(x => (x.id === c.id ? { ...x, active: !x.active } : x)));
      logAudit('Classes', `${c.className}-${c.section} ${c.active ? 'deactivated' : 'activated'}`);
      toast(c.enrolled ? 'Section has linked students, so it is deactivated, not deleted' : 'Updated');
    })();
  return (
    <>
      <ListScreen
        title="Classes and sections"
        subtitle="Playgroup to Matric"
        items={list}
        keyOf={c => c.id}
        searchText={c => `${c.className} ${c.section} ${c.classTeacher} ${c.room}`}
        filters={[
          { label: 'Class', options: ['All', ...CLASSES], get: c => c.className },
          { label: 'Status', options: ['All', 'Active', 'Inactive'], get: c => (c.active ? 'Active' : 'Inactive') },
        ]}
        onAdd={guard(() => setEdit({ id: localId('cs'), className: 'Class 1', section: 'C', capacity: 30, enrolled: 0, classTeacher: TEACHER_NAMES[0], room: 'R130', active: true }))}
        addLabel="Add section"
        header={<ReadOnlyBanner />}
        renderItem={(c, last) => (
          <ListRow
            icon={School}
            title={`${c.className}-${c.section}`}
            subtitle={`${c.enrolled}/${c.capacity} students · ${c.classTeacher} · Room ${c.room}`}
            right={<Toggle value={c.active} onChange={() => toggle(c)} />}
            onPress={guard(() => setEdit(c))}
            last={last}
          />
        )}
      />
      {edit ? (
        <FormSheet visible onClose={() => setEdit(null)} title={`${edit.className}-${edit.section}`} onSubmit={save}>
          <PickerField label="Class" value={edit.className} options={CLASSES} onChange={v => setEdit({ ...edit, className: v })} />
          <Field label="Section" value={edit.section} onChangeText={v => setEdit({ ...edit, section: v.toUpperCase().slice(0, 2) })} />
          <Field label="Capacity" value={String(edit.capacity)} keyboardType="number-pad" onChangeText={v => setEdit({ ...edit, capacity: Number(v.replace(/\D/g, '')) || 0 })} />
          <PickerField label="Class teacher" value={edit.classTeacher} options={TEACHER_NAMES} onChange={v => setEdit({ ...edit, classTeacher: v })} />
          <Field label="Room" value={edit.room} onChangeText={v => setEdit({ ...edit, room: v })} />
        </FormSheet>
      ) : null}
    </>
  );
}

// ---------- Subjects ----------

export function AdminAcadSubjects(_: ScreenProps) {
  const [list, setList] = useSubjects();
  const { guard } = useGuard();
  const [edit, setEdit] = useState<(SubjectRow & { isNew?: boolean }) | null>(null);
  const save = () => {
    if (!edit) {
      return;
    }
    if (!edit.name.trim() || !/^[A-Z]{2,4}$/.test(edit.code)) {
      toast('Enter a name and a 2–4 letter code');
      return;
    }
    if (edit.isNew && list.some(s => s.code === edit.code)) {
      toast('Subject code must be unique');
      return;
    }
    const { isNew, ...row } = edit;
    setList(l => (isNew ? [...l, row] : l.map(s => (s.code === row.code ? row : s))));
    logAudit('Subjects', `${isNew ? 'Added' : 'Edited'} ${row.code} ${row.name} (${row.type}, ${row.kind})`);
    setEdit(null);
  };
  return (
    <>
      <ListScreen
        title="Subjects"
        subtitle="Subject master"
        items={list}
        keyOf={s => s.code}
        searchText={s => `${s.name} ${s.code}`}
        filters={[{ label: 'Type', options: ['All', 'Core', 'Elective', 'Optional'], get: s => s.type }]}
        onAdd={guard(() => setEdit({ code: '', name: '', type: 'Core', kind: 'Theory', active: true, isNew: true }))}
        addLabel="Add subject"
        header={<ReadOnlyBanner />}
        renderItem={(s, last) => (
          <ListRow
            icon={BookOpen}
            title={`${s.code} · ${s.name}`}
            subtitle={`${s.type} · ${s.kind}`}
            right={
              <Toggle
                value={s.active}
                onChange={() =>
                  guard(() => {
                    setList(l => l.map(x => (x.code === s.code ? { ...x, active: !x.active } : x)));
                    logAudit('Subjects', `${s.code} ${s.active ? 'deactivated' : 'activated'} (never deleted)`);
                  })()
                }
              />
            }
            onPress={guard(() => setEdit(s))}
            last={last}
          />
        )}
      />
      {edit ? (
        <FormSheet visible onClose={() => setEdit(null)} title={edit.isNew ? 'Add subject' : edit.name} onSubmit={save}>
          <Field label="Name" value={edit.name} onChangeText={v => setEdit({ ...edit, name: v })} />
          <Field label="Code" value={edit.code} editable={!!edit.isNew} autoCapitalize="characters" onChangeText={v => setEdit({ ...edit, code: v.toUpperCase() })} />
          <PickerField label="Type" value={edit.type} options={['Core', 'Elective', 'Optional']} onChange={v => setEdit({ ...edit, type: v })} />
          <PickerField label="Theory / practical" value={edit.kind} options={['Theory', 'Practical', 'Theory + Practical']} onChange={v => setEdit({ ...edit, kind: v })} />
        </FormSheet>
      ) : null}
    </>
  );
}

export function AdminAcadMapping(_: ScreenProps) {
  const [map, setMap] = useMapping();
  const [subjects] = useSubjects();
  const { guard, ro } = useGuard();
  const [cls, setCls] = useState('Class 5');
  const [draft, setDraft] = useState<string[]>(map[cls] ?? []);
  const pick = (c: string) => {
    setCls(c);
    setDraft(map[c] ?? []);
  };
  const save = guard(() => {
    if (!draft.length) {
      toast('A class needs at least one subject');
      return;
    }
    setMap(m => ({ ...m, [cls]: draft }));
    logAudit('Class subjects', `${cls}: ${draft.join(', ')}`);
    toast('Mapping saved');
  });
  return (
    <Screen title="Class-subject mapping" subtitle="Subjects taught in each class" footer={<Button label="Save mapping" onPress={save} />}>
      <ReadOnlyBanner />
      <PickerField label="Class" value={cls} options={CLASSES} onChange={pick} />
      <Card>
        {subjects.filter(s => s.active).map((s, i, arr) => (
          <ListRow
            key={s.code}
            title={`${s.code} · ${s.name}`}
            subtitle={`${s.type} · ${s.kind}`}
            right={
              <Toggle
                value={draft.includes(s.code)}
                onChange={on => (ro ? toast('This session is closed and read-only.') : setDraft(d => (on ? [...d, s.code] : d.filter(x => x !== s.code))))}
              />
            }
            last={i === arr.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

export function AdminAcadTerms(_: ScreenProps) {
  const [list, setList] = useTerms();
  const { guard } = useGuard();
  const [edit, setEdit] = useState<Term | null>(null);
  const save = () => {
    if (!edit || !edit.name.trim() || !edit.from.trim() || !edit.to.trim()) {
      toast('Enter name and dates');
      return;
    }
    const exists = list.some(t => t.id === edit.id);
    setList(l => (exists ? l.map(t => (t.id === edit.id ? edit : t)) : [...l, edit]));
    logAudit('Terms', `${edit.name}: ${edit.from} – ${edit.to}`);
    setEdit(null);
  };
  return (
    <>
      <ListScreen
        title="Terms"
        subtitle="Used by Exams and Curriculum"
        items={list}
        keyOf={t => t.id}
        searchText={t => t.name}
        onAdd={guard(() => setEdit({ id: localId('tm'), name: '', from: '', to: '' }))}
        addLabel="Add term"
        header={<ReadOnlyBanner />}
        renderItem={(t, last) => (
          <ListRow icon={Layers} title={t.name} subtitle={`${t.from} – ${t.to}`} onPress={guard(() => setEdit(t))} chevron last={last} />
        )}
      />
      {edit ? (
        <FormSheet visible onClose={() => setEdit(null)} title={edit.name || 'Add term'} onSubmit={save}>
          <Field label="Term name" value={edit.name} onChangeText={v => setEdit({ ...edit, name: v })} placeholder="e.g. Second term" />
          <Field label="From" value={edit.from} onChangeText={v => setEdit({ ...edit, from: v })} placeholder="1 Apr 2027" />
          <Field label="To" value={edit.to} onChangeText={v => setEdit({ ...edit, to: v })} placeholder="30 Jun 2027" />
        </FormSheet>
      ) : null}
    </>
  );
}
