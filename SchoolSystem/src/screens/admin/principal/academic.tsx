// M-01 Academic session: sessions, classes, sections, subjects, mapping, terms.
// Live from /api/web/academic (+ sessions, copy-forward, classes, subjects,
// class-subjects). Terms have no server API and stay on the phone.
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
import { adminStyles as a, FormSheet, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps, useNav } from '../../../navigation';
import { useShared } from '../../../store';
import { logAudit, useStaffRole } from '../../../data/admin';
import { Term, TERMS } from '../../../data/admin-principal';
import { invalidate, useApi, useMutation } from '../../../api/hooks';
import { AcademicDto, webA } from '../../../api/webA';
import { getSession } from '../../../api/session';
import { Loading, NoApiBanner, QueryView } from '../../../components/states';
import { localId, ReadOnlyBanner, useGuard } from '../owner/shared';

export const useTerms = () => useShared<Term[]>('admin.terms', TERMS);

export function useAcademic() {
  return useApi('adm:academic', webA.academic);
}

// Students per class-section, from the strength report (grNo, classId, section).
function useEnrolled() {
  const q = useApi('adm:report:strength', () => webA.report('strength'));
  const map: Record<string, number> = {};
  (q.data?.rows ?? []).forEach(r => {
    if (String(r.status ?? 'active') === 'active') {
      const k = `${r.classId}-${r.section}`;
      map[k] = (map[k] ?? 0) + 1;
    }
  });
  return map;
}

const refreshAcademic = () => {
  invalidate('adm:academic');
  invalidate('adm:context');
};

export function AdminAcademicSetup(_: ScreenProps) {
  const nav = useNav();
  const q = useAcademic();
  const [terms] = useTerms();
  const d = q.data;
  const sections = d?.classes.reduce((n, c) => n + c.sections.length, 0) ?? 0;
  const current = d?.sessions.find(s => s.isCurrent);
  const items = [
    { route: 'AdminAcadSessions', icon: CalendarDays, title: 'Sessions', sub: d ? `${d.sessions.filter(s => s.isCurrent).length} active · ${d.sessions.length} in total` : '…' },
    { route: 'AdminAcadCopy', icon: Copy, title: 'Copy forward', sub: 'Classes, sections, subjects and fee structure into a new session' },
    { route: 'AdminAcadClasses', icon: School, title: 'Classes and sections', sub: d ? `${d.classes.length} classes · ${sections} sections with capacity, class teacher and room` : '…' },
    { route: 'AdminAcadSubjects', icon: BookOpen, title: 'Subjects', sub: d ? `${d.subjects.length} subjects · core, elective, optional` : '…' },
    { route: 'AdminAcadMapping', icon: Link, title: 'Class-subject mapping', sub: 'Which subjects each class studies' },
    { route: 'AdminAcadTerms', icon: Layers, title: 'Terms', sub: `${terms.length} terms used by Exams and Curriculum` },
  ];
  return (
    <Screen title="Academic setup" subtitle={current ? `Session ${current.name}` : ''} refreshing={q.refreshing} onRefresh={q.refresh}>
      <ReadOnlyBanner />
      {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
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

type SessionRow = AcademicDto['sessions'][number];

export function AdminAcadSessions(_: ScreenProps) {
  const q = useAcademic();
  const [role] = useStaffRole();
  const { guard } = useGuard();
  const [open, setOpen] = useState(false);
  const y = new Date().getFullYear() + 1;
  const [f, setF] = useState({ name: `${y}-${String(y + 1).slice(2)}`, start: `${y}-04-01`, end: `${y + 1}-03-31`, makeCurrent: false });
  const add = useMutation(webA.addSession, 'Session created');
  const list = q.data?.sessions ?? [];
  const create = async () => {
    if (!/^\d{4}-\d{2}$/.test(f.name)) {
      toast('Session name must look like 2027-28');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.start) || !/^\d{4}-\d{2}-\d{2}$/.test(f.end) || f.end <= f.start) {
      toast('Enter start and end dates as YYYY-MM-DD');
      return;
    }
    if (list.some(s => s.name === f.name)) {
      toast('This session already exists');
      return;
    }
    if (f.makeCurrent && role !== 'owner') {
      toast('Only the Owner can make a new session the active one');
      return;
    }
    if ((await add.run({ name: f.name, startDate: f.start, endDate: f.end, makeCurrent: f.makeCurrent })) !== undefined) {
      logAudit('Session', `Created ${f.name}${f.makeCurrent ? ' (made current)' : ''}`);
      refreshAcademic();
      setOpen(false);
    }
  };
  const status = (s: SessionRow) => (s.isClosed ? 'Closed' : s.isCurrent ? 'Active' : 'Planned');
  return (
    <>
      <ListScreen
        title="Sessions"
        subtitle="One active session at a time"
        items={list}
        keyOf={s => s.id}
        searchText={s => s.name}
        filters={[{ label: 'Status', options: ['All', 'Active', 'Planned', 'Closed'], get: status }]}
        onAdd={guard(() => setOpen(true))}
        addLabel="Create session"
        empty={q.loading ? 'Loading…' : 'No sessions'}
        header={
          <>
            <ReadOnlyBanner />
            {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
            <NoApiBanner what="Closing a session or switching the active one (the server only sets it when a session is created)" />
          </>
        }
        renderItem={(s, last) => (
          <ListRow
            icon={CalendarDays}
            title={s.name}
            subtitle={`${s.start} – ${s.end}`}
            right={<Badge label={status(s)} tone={s.isCurrent ? 'success' : s.isClosed ? 'neutral' : 'info'} />}
            last={last}
          />
        )}
      />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Create session" onSubmit={create} submitLabel={add.busy ? 'Saving…' : 'Create'}>
        <Field label="Session" value={f.name} onChangeText={v => setF(x => ({ ...x, name: v }))} />
        <Field label="Start date (YYYY-MM-DD)" value={f.start} onChangeText={v => setF(x => ({ ...x, start: v }))} />
        <Field label="End date (YYYY-MM-DD)" value={f.end} onChangeText={v => setF(x => ({ ...x, end: v }))} />
        <View style={a.row}>
          <Text style={[a.bold, a.flex]}>Make it the active session</Text>
          <Toggle value={f.makeCurrent} onChange={v => setF(x => ({ ...x, makeCurrent: v }))} />
        </View>
        <Text style={a.small}>Only one session is active at a time; the old one becomes read-only.</Text>
      </FormSheet>
    </>
  );
}

export function AdminAcadCopy(_: ScreenProps) {
  const q = useAcademic();
  const { guard } = useGuard();
  const sessions = q.data?.sessions ?? [];
  const current = sessions.find(s => s.id === getSession()?.sessionId) ?? sessions.find(s => s.isCurrent);
  const others = sessions.filter(s => s.id !== current?.id);
  const [to, setTo] = useState('');
  const copy = useMutation(webA.copyForward, 'Copied into the new session');
  const run = guard(async () => {
    const dest = sessions.find(s => s.name === to);
    if (!dest) {
      toast('Choose the session to copy into');
      return;
    }
    if (dest.isClosed) {
      toast('A closed session cannot be changed');
      return;
    }
    if ((await copy.run(dest.id)) !== undefined) {
      logAudit('Copy forward', `${current?.name ?? ''} → ${dest.name}: classes, sections, subjects, fee structure`);
      refreshAcademic();
    }
  });
  if (!q.data) {
    return (
      <Screen title="Copy forward">
        <QueryView q={q}>{() => null}</QueryView>
      </Screen>
    );
  }
  return (
    <Screen title="Copy forward" subtitle="Start a new session from the current one" footer={<Button label="Copy now" icon={Copy} onPress={run} loading={copy.busy} />}>
      <ReadOnlyBanner />
      <Card>
        <ListRow title="Copy from" subtitle={current ? `${current.name} (selected session)` : '—'} last />
      </Card>
      {others.length ? (
        <PickerField label="Copy into" value={to} options={others.map(s => s.name)} onChange={setTo} />
      ) : (
        <InfoBanner text="Create the new session first (Sessions), then copy into it." />
      )}
      <InfoBanner text="Copies classes, sections, subjects and the fee structure of the selected campus. Students are moved with the Promotion wizard." />
    </Screen>
  );
}

// ---------- Classes and sections ----------

type SectionRow = { key: string; classId: string; className: string; section: string; capacity: number; room: string; teacherId: number | null; enrolled: number };

export function AdminAcadClasses(_: ScreenProps) {
  const q = useAcademic();
  const staff = useApi('adm:staff:all', webA.staff);
  const enrolled = useEnrolled();
  const { guard } = useGuard();
  const [edit, setEdit] = useState<(SectionRow & { isNew?: boolean }) | null>(null);
  const [newClass, setNewClass] = useState<{ name: string; sortOrder: string } | null>(null);
  const classes = q.data?.classes ?? [];
  const rows: SectionRow[] = classes.flatMap(c =>
    c.sections.map(s => ({
      key: `${c.id}-${s.name}`,
      classId: c.id,
      className: c.name,
      section: s.name,
      capacity: s.capacity,
      room: s.room ?? '',
      teacherId: s.teacherId,
      enrolled: enrolled[`${c.id}-${s.name}`] ?? 0,
    })),
  );
  const teachers = (staff.data ?? []).map(t => ({ id: Number(t.id), label: `${t.name} (${t.empId})` }));
  const teacherName = (id: number | null) => (id ? teachers.find(t => t.id === id)?.label ?? `Staff ${id}` : 'No class teacher');

  // The server replaces all sections of a class on save, so always send them all.
  const saveSection = useMutation(async (e: SectionRow & { isNew?: boolean }) => {
    const cls = classes.find(c => c.id === e.classId);
    if (!cls) {
      throw new Error('Class not found');
    }
    const others = cls.sections.filter(s => e.isNew || s.name !== e.section);
    const sections = [
      ...others.map(s => ({ name: s.name, capacity: s.capacity, room: s.room ?? undefined, teacherId: s.teacherId ?? undefined })),
      { name: e.section, capacity: e.capacity, room: e.room || undefined, teacherId: e.teacherId ?? undefined },
    ];
    return webA.saveClass({ name: cls.name, sortOrder: cls.sortOrder, sections }, cls.id);
  }, 'Saved');
  const addClass = useMutation(
    (b: { name: string; sortOrder: number }) => webA.saveClass({ ...b, sections: [{ name: 'A', capacity: 40 }] }),
    'Class added with section A',
  );

  const save = async () => {
    if (!edit) {
      return;
    }
    if (edit.capacity < edit.enrolled) {
      toast(`Capacity cannot be below the ${edit.enrolled} students already enrolled`);
      return;
    }
    if (!/^[A-Z]{1,2}$/.test(edit.section)) {
      toast('Section is one or two letters, e.g. A');
      return;
    }
    if (edit.isNew && rows.some(x => x.classId === edit.classId && x.section === edit.section)) {
      toast('This section already exists');
      return;
    }
    if ((await saveSection.run(edit)) !== undefined) {
      logAudit('Classes', `${edit.className}-${edit.section}: capacity ${edit.capacity}, room ${edit.room || '—'}`);
      refreshAcademic();
      setEdit(null);
    }
  };
  const saveClass = async () => {
    if (!newClass || !newClass.name.trim()) {
      toast('Enter the class name');
      return;
    }
    if (classes.some(c => c.name.toLowerCase() === newClass.name.trim().toLowerCase())) {
      toast('This class already exists');
      return;
    }
    if ((await addClass.run({ name: newClass.name.trim(), sortOrder: Number(newClass.sortOrder) || classes.length })) !== undefined) {
      logAudit('Classes', `Added class ${newClass.name}`);
      refreshAcademic();
      setNewClass(null);
    }
  };
  return (
    <>
      <ListScreen
        title="Classes and sections"
        subtitle={`${classes.length} classes · ${rows.length} sections`}
        items={rows}
        keyOf={c => c.key}
        searchText={c => `${c.className} ${c.section} ${c.room}`}
        filters={[{ label: 'Class', options: ['All', ...classes.map(c => c.name)], get: c => c.className }]}
        onAdd={guard(() =>
          setEdit(
            classes[0]
              ? { key: 'new', classId: classes[0].id, className: classes[0].name, section: 'B', capacity: 40, room: '', teacherId: null, enrolled: 0, isNew: true }
              : null,
          ),
        )}
        addLabel="Add section"
        empty={q.loading ? 'Loading…' : 'No classes yet'}
        header={
          <>
            <ReadOnlyBanner />
            {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
            <Button label="Add class" variant="outline" icon={School} onPress={guard(() => setNewClass({ name: '', sortOrder: String(classes.length) }))} />
          </>
        }
        renderItem={(c, last) => (
          <ListRow
            icon={School}
            title={`${c.className}-${c.section}`}
            subtitle={`${c.enrolled}/${c.capacity} students · ${teacherName(c.teacherId)}${c.room ? ` · Room ${c.room}` : ''}`}
            onPress={guard(() => setEdit(c))}
            chevron
            last={last}
          />
        )}
      />
      {edit ? (
        <FormSheet visible onClose={() => setEdit(null)} title={edit.isNew ? 'Add section' : `${edit.className}-${edit.section}`} onSubmit={save} submitLabel={saveSection.busy ? 'Saving…' : 'Save'}>
          {edit.isNew ? (
            <PickerField
              label="Class"
              value={edit.className}
              options={classes.map(c => c.name)}
              onChange={v => {
                const c = classes.find(x => x.name === v);
                if (c) {
                  setEdit({ ...edit, classId: c.id, className: c.name });
                }
              }}
            />
          ) : null}
          <Field label="Section" value={edit.section} editable={!!edit.isNew} onChangeText={v => setEdit({ ...edit, section: v.toUpperCase().slice(0, 2) })} />
          <Field label="Capacity" value={String(edit.capacity)} keyboardType="number-pad" onChangeText={v => setEdit({ ...edit, capacity: Number(v.replace(/\D/g, '')) || 0 })} />
          <PickerField
            label="Class teacher"
            value={edit.teacherId ? teacherName(edit.teacherId) : ''}
            options={teachers.map(t => t.label)}
            onChange={v => setEdit({ ...edit, teacherId: teachers.find(t => t.label === v)?.id ?? null })}
          />
          <Field label="Room" value={edit.room} onChangeText={v => setEdit({ ...edit, room: v })} />
          <Text style={a.small}>Removing a section is not possible while it has students; it can only be made inactive by the platform team.</Text>
        </FormSheet>
      ) : null}
      {newClass ? (
        <FormSheet visible onClose={() => setNewClass(null)} title="Add class" onSubmit={saveClass} submitLabel={addClass.busy ? 'Saving…' : 'Add class'}>
          <Field label="Class name" value={newClass.name} onChangeText={v => setNewClass({ ...newClass, name: v })} placeholder="e.g. Class 11" />
          <Field label="Order" value={newClass.sortOrder} keyboardType="number-pad" onChangeText={v => setNewClass({ ...newClass, sortOrder: v })} />
        </FormSheet>
      ) : null}
    </>
  );
}

// ---------- Subjects ----------

type SubjectDraft = { code: string; name: string; type: string; kind: string };

export function AdminAcadSubjects(_: ScreenProps) {
  const q = useAcademic();
  const { guard } = useGuard();
  const [edit, setEdit] = useState<SubjectDraft | null>(null);
  const add = useMutation(webA.addSubject, 'Subject added');
  const list = q.data?.subjects ?? [];
  const save = async () => {
    if (!edit) {
      return;
    }
    if (!edit.name.trim() || !/^[A-Z]{2,4}$/.test(edit.code)) {
      toast('Enter a name and a 2–4 letter code');
      return;
    }
    if (list.some(s => s.code === edit.code)) {
      toast('Subject code must be unique');
      return;
    }
    // The server takes Theory | Practical | Both.
    const theoryPrac = edit.kind === 'Theory + Practical' ? 'Both' : edit.kind;
    if ((await add.run({ code: edit.code, name: edit.name.trim(), type: edit.type, theoryPrac })) !== undefined) {
      logAudit('Subjects', `Added ${edit.code} ${edit.name} (${edit.type}, ${edit.kind})`);
      refreshAcademic();
      setEdit(null);
    }
  };
  return (
    <>
      <ListScreen
        title="Subjects"
        subtitle="Subject master"
        items={list}
        keyOf={s => s.id}
        searchText={s => `${s.name} ${s.code}`}
        filters={[{ label: 'Type', options: ['All', 'Core', 'Elective', 'Optional'], get: s => s.type }]}
        onAdd={guard(() => setEdit({ code: '', name: '', type: 'Core', kind: 'Theory' }))}
        addLabel="Add subject"
        empty={q.loading ? 'Loading…' : 'No subjects yet'}
        header={
          <>
            <ReadOnlyBanner />
            {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
            <InfoBanner text="Subjects with marks or timetable slots are never deleted. The server has no edit or deactivate for subjects yet." />
          </>
        }
        renderItem={(s, last) => (
          <ListRow icon={BookOpen} title={`${s.code} · ${s.name}`} subtitle={s.type} last={last} />
        )}
      />
      {edit ? (
        <FormSheet visible onClose={() => setEdit(null)} title="Add subject" onSubmit={save} submitLabel={add.busy ? 'Saving…' : 'Save'}>
          <Field label="Name" value={edit.name} onChangeText={v => setEdit({ ...edit, name: v })} />
          <Field label="Code" value={edit.code} autoCapitalize="characters" onChangeText={v => setEdit({ ...edit, code: v.toUpperCase() })} />
          <PickerField label="Type" value={edit.type} options={['Core', 'Elective', 'Optional']} onChange={v => setEdit({ ...edit, type: v })} />
          <PickerField label="Theory / practical" value={edit.kind} options={['Theory', 'Practical', 'Theory + Practical']} onChange={v => setEdit({ ...edit, kind: v })} />
        </FormSheet>
      ) : null}
    </>
  );
}

export function AdminAcadMapping(_: ScreenProps) {
  const q = useAcademic();
  const { guard, ro } = useGuard();
  const classes = q.data?.classes ?? [];
  const subjects = q.data?.subjects ?? [];
  const [clsId, setClsId] = useState('');
  const cls = classes.find(c => c.id === clsId) ?? classes[0];
  const map = useApi(cls ? `adm:classSubjects:${cls.id}` : null, () => webA.classSubjects(cls?.id ?? ''));
  const [draft, setDraft] = useState<string[] | null>(null);
  const serverIds = ((map.data as unknown[] | undefined) ?? []).map(String);
  const chosen = draft ?? serverIds;
  const saver = useMutation((ids: string[]) => webA.saveClassSubjects(cls?.id ?? '', ids), 'Mapping saved');
  const save = guard(async () => {
    if (!cls) {
      return;
    }
    if (!chosen.length) {
      toast('A class needs at least one subject');
      return;
    }
    if ((await saver.run(chosen)) !== undefined) {
      logAudit('Class subjects', `${cls.name}: ${subjects.filter(s => chosen.includes(s.id)).map(s => s.code).join(', ')}`);
      setDraft(null);
      map.refresh();
    }
  });
  if (!q.data) {
    return (
      <Screen title="Class-subject mapping">
        <QueryView q={q}>{() => null}</QueryView>
      </Screen>
    );
  }
  return (
    <Screen title="Class-subject mapping" subtitle="Subjects taught in each class" footer={<Button label="Save mapping" onPress={save} loading={saver.busy} />}>
      <ReadOnlyBanner />
      <PickerField
        label="Class"
        value={cls?.name ?? ''}
        options={classes.map(c => c.name)}
        onChange={v => {
          setClsId(classes.find(c => c.name === v)?.id ?? '');
          setDraft(null);
        }}
      />
      {map.error ? <InfoBanner tone="danger" text={map.error} /> : null}
      {map.loading ? <Loading /> : null}
      <Card>
        {subjects.length === 0 ? <Text style={a.small}>Add subjects first.</Text> : null}
        {subjects.map((s, i, arr) => (
          <ListRow
            key={s.id}
            title={`${s.code} · ${s.name}`}
            subtitle={s.type}
            right={
              <Toggle
                value={chosen.includes(s.id)}
                onChange={on => (ro ? toast('This session is closed and read-only.') : setDraft(on ? [...chosen, s.id] : chosen.filter(x => x !== s.id)))}
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
        header={
          <>
            <ReadOnlyBanner />
            <NoApiBanner what="Terms" />
          </>
        }
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
