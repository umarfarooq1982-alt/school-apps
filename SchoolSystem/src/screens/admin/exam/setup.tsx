// Exam panel: exam setup, date sheet, invigilation and seating (M-12).
// Exams are live (/api/web/modules/exams); papers and invigilation duties are
// "datesheet" and "invigilation" module records.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Armchair, CalendarRange, Pencil, Plus, Printer, Send } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  toast,
} from '../../../components/ui';
import { FormSheet, KV, ListScreen, PickerField, adminStyles } from '../../../components/admin';
import { NoApiBanner, QueryView } from '../../../components/states';
import { colors, radius } from '../../../theme';
import { ScreenProps, useNav } from '../../../navigation';
import { logAudit } from '../../../data/admin';
import {
  Duty,
  ExamType,
  GradeBand,
  RESULT_SUBJECTS,
  ROOMS,
  TEACHERS,
  TIMES,
  examDays,
  useDuties,
  useExamTypes,
  useExams,
  useGrading,
  usePapers,
  usePassRules,
  usePublished,
} from '../../../data/admin-exam';
import { useLiveClasses, useLiveStudents } from '../../../data/admin-frontdesk';
import { useApi } from '../../../api/hooks';
import { webA } from '../../../api/webA';
import { ReadOnlyBanner, isNum, useGuard } from '../frontdesk/util';

// ---------- Exam setup ----------

export function AdminExamSetup(_: ScreenProps) {
  const { guard } = useGuard();
  const [types, setTypes] = useExamTypes();
  const [scale, setScale] = useGrading();
  const [rules, setRules] = usePassRules();
  const [editType, setEditType] = useState<number | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', weight: '', window: '' });
  const [editBand, setEditBand] = useState<number | null>(null);
  const [bandForm, setBandForm] = useState({ min: '', grade: '', remark: '' });
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesForm, setRulesForm] = useState({ overall: '', subject: '', maxFail: '' });
  const [exams, setExams, examsQ] = useExams();
  const [examOpen, setExamOpen] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', start: '', end: '' });
  const totalWeight = types.reduce((s, t) => s + t.weight, 0);

  const openType = (i: number | null) => {
    const t = i === null ? { name: '', weight: 0, window: '' } : types[i];
    setTypeForm({ name: t.name, weight: i === null ? '' : String(t.weight), window: t.window });
    setEditType(i === null ? -1 : i);
  };
  const saveType = () => {
    if (!typeForm.name.trim() || !isNum(typeForm.weight)) {
      toast('Enter a name and a weightage number');
      return;
    }
    const t: ExamType = { name: typeForm.name.trim(), weight: Number(typeForm.weight), window: typeForm.window.trim() };
    const next = editType === -1 ? [...types, t] : types.map((x, i) => (i === editType ? t : x));
    const sum = next.reduce((s, x) => s + x.weight, 0);
    if (sum > 100) {
      toast(`Weightage adds up to ${sum}%. It cannot be more than 100%.`);
      return;
    }
    setTypes(next);
    logAudit('Exam setup', `Exam type ${t.name}: ${t.weight}% (${t.window})`);
    setEditType(null);
  };

  const openBand = (i: number) => {
    const b = scale[i];
    setBandForm({ min: String(b.min), grade: b.grade, remark: b.remark });
    setEditBand(i);
  };
  const saveBand = () => {
    if (!isNum(bandForm.min) || Number(bandForm.min) > 100 || !bandForm.grade.trim()) {
      toast('Minimum must be 0–100 and grade is required');
      return;
    }
    const b: GradeBand = { min: Number(bandForm.min), grade: bandForm.grade.trim(), remark: bandForm.remark.trim() };
    const next = scale.map((x, i) => (i === editBand ? b : x));
    const mins = next.map(x => x.min);
    if (new Set(mins).size !== mins.length || !mins.includes(0)) {
      toast('Each band needs a different minimum and one band must start at 0');
      return;
    }
    setScale([...next].sort((a, c) => c.min - a.min));
    logAudit('Exam setup', `Grade ${b.grade} from ${b.min}%`);
    setEditBand(null);
  };

  const addExam = () => {
    const name = examForm.name.trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!name || !iso.test(examForm.start) || !iso.test(examForm.end) || examForm.end < examForm.start) {
      toast('Enter a name and start / end dates as YYYY-MM-DD (end on or after start)');
      return;
    }
    if (exams.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      toast(`${name} already exists`);
      return;
    }
    setExams(list => [...list, { id: `new-${Date.now()}`, name, start: examForm.start, end: examForm.end, marksOpen: true, locked: false, status: 'draft' }]);
    logAudit('Exam setup', `Exam ${name}: ${examForm.start} to ${examForm.end}`);
    setExamOpen(false);
  };

  return (
    <Screen title="Exam setup" subtitle="Exams, weightage, grading scale and pass rules" refreshing={examsQ.refreshing} onRefresh={examsQ.refresh}>
      <ReadOnlyBanner />
      <Card title="Exams this session" action={{ label: 'Add', onPress: guard(() => setExamOpen(true)) }}>
        <QueryView q={examsQ} isEmpty={d => d.length === 0} emptyText="No exams yet">
          {() =>
            exams.map((e, i) => (
              <ListRow
                key={e.id}
                icon={CalendarRange}
                title={e.name}
                subtitle={`${e.start || '—'} to ${e.end || '—'} · marks ${e.marksOpen ? 'open' : 'closed'}`}
                right={<Badge label={e.status === 'published' ? 'Published' : e.locked ? 'Locked' : 'Draft'} tone={e.status === 'published' ? 'success' : e.locked ? 'info' : 'warn'} />}
                last={i === exams.length - 1}
              />
            ))
          }
        </QueryView>
      </Card>
      <NoApiBanner what="Exam types, grading scale and pass rules (kept in this app)" />
      <Card title="Exam types and weightage" action={{ label: 'Add', onPress: guard(() => openType(null)) }}>
        {types.map((t, i) => (
          <ListRow
            key={t.name}
            icon={CalendarRange}
            title={t.name}
            subtitle={`Window ${t.window || '—'}`}
            right={<Badge label={`${t.weight}%`} tone="info" />}
            onPress={guard(() => openType(i))}
            last={i === types.length - 1}
          />
        ))}
      </Card>
      {totalWeight !== 100 ? (
        <InfoBanner tone="warn" text={`Weightage adds up to ${totalWeight}%. Annual results need 100%.`} />
      ) : null}
      <Card title="Grading scale">
        {scale.map((b, i) => (
          <ListRow
            key={b.grade}
            title={`${b.grade} · ${b.min}% and above`}
            subtitle={b.remark}
            right={<Pencil size={16} color={colors.textMuted} />}
            onPress={guard(() => openBand(i))}
            last={i === scale.length - 1}
          />
        ))}
      </Card>
      <Card title="Pass rules" action={{ label: 'Edit', onPress: guard(() => {
        setRulesForm({ overall: String(rules.overallPct), subject: String(rules.subjectPct), maxFail: String(rules.maxFailSubjects) });
        setRulesOpen(true);
      }) }}>
        <KV k="Minimum overall percentage" v={`${rules.overallPct}%`} />
        <KV k="Minimum per subject" v={`${rules.subjectPct}%`} />
        <KV k="Subjects allowed below the minimum" v={String(rules.maxFailSubjects)} last />
      </Card>

      <FormSheet visible={examOpen} onClose={() => setExamOpen(false)} title="Add exam" onSubmit={addExam}>
        <Field label="Name" value={examForm.name} onChangeText={v => setExamForm(p => ({ ...p, name: v }))} placeholder="e.g. Final term 2026" />
        <Field label="Start date" value={examForm.start} onChangeText={v => setExamForm(p => ({ ...p, start: v }))} placeholder="YYYY-MM-DD" />
        <Field label="End date" value={examForm.end} onChangeText={v => setExamForm(p => ({ ...p, end: v }))} placeholder="YYYY-MM-DD" />
      </FormSheet>
      <FormSheet visible={editType !== null} onClose={() => setEditType(null)} title={editType === -1 ? 'Add exam type' : 'Edit exam type'} onSubmit={saveType}>
        <Field label="Name" value={typeForm.name} onChangeText={v => setTypeForm(p => ({ ...p, name: v }))} />
        <Field label="Weightage %" value={typeForm.weight} keyboardType="number-pad" onChangeText={v => setTypeForm(p => ({ ...p, weight: v }))} />
        <Field label="Exam window" value={typeForm.window} onChangeText={v => setTypeForm(p => ({ ...p, window: v }))} placeholder="e.g. 1 – 12 Dec" />
      </FormSheet>
      <FormSheet visible={editBand !== null} onClose={() => setEditBand(null)} title="Edit grade band" onSubmit={saveBand}>
        <Field label="Grade" value={bandForm.grade} onChangeText={v => setBandForm(p => ({ ...p, grade: v }))} />
        <Field label="Minimum %" value={bandForm.min} keyboardType="number-pad" onChangeText={v => setBandForm(p => ({ ...p, min: v }))} />
        <Field label="Remark" value={bandForm.remark} onChangeText={v => setBandForm(p => ({ ...p, remark: v }))} />
      </FormSheet>
      <FormSheet
        visible={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Pass rules"
        onSubmit={() => {
          const vals = [rulesForm.overall, rulesForm.subject, rulesForm.maxFail];
          if (!vals.every(isNum) || Number(rulesForm.overall) > 100 || Number(rulesForm.subject) > 100) {
            toast('Enter numbers; percentages must be 0–100');
            return;
          }
          setRules({ overallPct: Number(rulesForm.overall), subjectPct: Number(rulesForm.subject), maxFailSubjects: Number(rulesForm.maxFail) });
          logAudit('Exam setup', `Pass rules: overall ${rulesForm.overall}%, subject ${rulesForm.subject}%`);
          setRulesOpen(false);
        }}
      >
        <Field label="Minimum overall %" value={rulesForm.overall} keyboardType="number-pad" onChangeText={v => setRulesForm(p => ({ ...p, overall: v }))} />
        <Field label="Minimum per subject %" value={rulesForm.subject} keyboardType="number-pad" onChangeText={v => setRulesForm(p => ({ ...p, subject: v }))} />
        <Field label="Subjects allowed below minimum" value={rulesForm.maxFail} keyboardType="number-pad" onChangeText={v => setRulesForm(p => ({ ...p, maxFail: v }))} />
      </FormSheet>
    </Screen>
  );
}

// ---------- Date sheet ----------

export function AdminDateSheet(_: ScreenProps) {
  const { guard } = useGuard();
  const [exams, , examsQ] = useExams();
  const classes = useLiveClasses();
  const academic = useApi('adm:academic', webA.academic);
  const subjects = (academic.data?.subjects ?? []).map(x => x.name);
  const [examSel, setExamSel] = useState('');
  const exam = exams.find(e => e.name === examSel) ?? exams[exams.length - 1];
  const [allPapers, setPapers, papersQ] = usePapers();
  const papers = allPapers.filter(p => !exam || p.examId === exam.id);
  const [published, setPublished] = usePublished();
  const days = examDays(exam?.start, exam?.end);
  const [clsSel, setCls] = useState('');
  const cls = clsSel || classes.names[0] || '';
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({ cls: '', subject: '', date: '', time: TIMES[0] });
  const pubKey = `${exam?.id ?? ''}|${cls}`;

  const open = (id: string | null) => {
    const p = papers.find(x => x.id === id);
    setForm(p ? { cls: p.cls, subject: p.subject, date: p.date, time: p.time } : { cls, subject: subjects[0] ?? '', date: days[0], time: TIMES[0] });
    setEdit(id ?? 'new');
  };
  const save = () => {
    if (!exam) {
      toast('Add an exam in Exam setup first');
      return;
    }
    if (!form.cls || !form.subject || !form.date) {
      toast('Pick a class, subject and date');
      return;
    }
    const clash = papers.find(p => p.id !== edit && p.cls === form.cls && p.date === form.date && p.time === form.time);
    if (clash) {
      toast(`${form.cls} already has ${clash.subject} at that time`);
      return;
    }
    const dupSubject = papers.find(p => p.id !== edit && p.cls === form.cls && p.subject === form.subject);
    if (dupSubject) {
      toast(`${form.subject} is already on the ${form.cls} date sheet`);
      return;
    }
    const paper = { id: edit === 'new' ? `new-${Date.now()}` : (edit as string), examId: exam.id, ...form };
    setPapers(list => (edit === 'new' ? [...list, paper] : list.map(p => (p.id === edit ? paper : p))));
    setPublished(m => ({ ...m, [`${exam.id}|${form.cls}`]: false }));
    logAudit('Date sheet', `${exam.name} · ${form.cls} ${form.subject}: ${form.date} ${form.time}`);
    setEdit(null);
  };

  return (
    <ListScreen
      title="Date sheet"
      subtitle={`${exam?.name ?? 'No exam yet'} · builder per class`}
      items={papers}
      keyOf={p => p.id}
      searchText={p => `${p.cls} ${p.subject} ${p.date}`}
      filters={[{ label: 'Class', options: ['All classes', ...classes.names], get: p => p.cls }]}
      onAdd={guard(() => open(null))}
      addLabel="Add paper"
      empty="No papers on this date sheet yet"
      header={
        <>
          <ReadOnlyBanner />
          <QueryView q={papersQ}>{() => null}</QueryView>
          {exams.length ? (
            <PickerField label="Exam" value={exam?.name ?? ''} options={exams.map(e => e.name)} onChange={setExamSel} />
          ) : (
            <QueryView q={examsQ} isEmpty={d => d.length === 0} emptyText="Add an exam in Exam setup first">
              {() => null}
            </QueryView>
          )}
          <Card>
            <PickerField label="Publish date sheet for" value={cls} options={classes.names} onChange={setCls} />
            <View style={[adminStyles.row, s.mt]}>
              <Badge label={published[pubKey] ? 'Published' : 'Draft'} tone={published[pubKey] ? 'success' : 'warn'} />
              <View style={s.flex} />
              <Button
                label={published[pubKey] ? 'Re-publish' : 'Publish to portals'}
                icon={Send}
                style={s.smallBtn}
                onPress={guard(() => {
                  if (!papers.some(p => p.cls === cls)) {
                    toast('Add papers first');
                    return;
                  }
                  setPublished(m => ({ ...m, [pubKey]: true }));
                  logAudit('Date sheet', `${cls} date sheet published`);
                  toast(`${cls} date sheet marked as published`);
                })}
              />
            </View>
          </Card>
          <NoApiBanner what="Publishing the date sheet to the parent and student apps" />
          <FormSheet visible={edit !== null} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add paper' : 'Edit paper'} onSubmit={save}>
            <PickerField label="Class" value={form.cls} options={classes.names} onChange={v => setForm(p => ({ ...p, cls: v }))} />
            <PickerField label="Subject" value={form.subject} options={subjects.length ? subjects : RESULT_SUBJECTS.map(x => x.name)} onChange={v => setForm(p => ({ ...p, subject: v }))} />
            <PickerField label="Date" value={form.date} options={days} onChange={v => setForm(p => ({ ...p, date: v }))} />
            <PickerField label="Time" value={form.time} options={TIMES} onChange={v => setForm(p => ({ ...p, time: v }))} />
          </FormSheet>
        </>
      }
      renderItem={(p, last) => (
        <ListRow
          icon={CalendarRange}
          title={`${p.date} · ${p.subject}`}
          subtitle={`${p.cls} · ${p.time}`}
          onPress={guard(() => open(p.id))}
          chevron
          last={last}
        />
      )}
    />
  );
}

// ---------- Invigilation and seating ----------

export function AdminInvigilation(_: ScreenProps) {
  const nav = useNav();
  const { guard } = useGuard();
  const [exams] = useExams();
  const exam = exams[exams.length - 1];
  const days = examDays(exam?.start, exam?.end).slice(0, 6);
  const [saved, setDuties, q] = useDuties();
  const staffQ = useApi('adm:staff:all', webA.staff);
  const teachers = (staffQ.data ?? []).filter(x => x.status !== 'left').map(x => x.name);
  // Every date and room has a slot; saved records fill in the invigilator.
  const duties: Duty[] = days.flatMap(date =>
    ROOMS.map(room => saved.find(d => d.date === date && d.room === room) ?? { id: `new-${date}-${room}`, date, room, teacher: '' }),
  );
  const [edit, setEdit] = useState<string | null>(null);
  const [teacher, setTeacher] = useState('');
  const current = duties.find(d => d.id === edit);
  return (
    <ListScreen
      title="Invigilation & seating"
      subtitle={`Duty roster · ${exam?.name ?? 'next exam'}`}
      items={duties}
      keyOf={d => d.id}
      searchText={d => `${d.date} ${d.room} ${d.teacher}`}
      filters={[
        { label: 'Date', options: ['All dates', ...days], get: d => d.date },
        { label: 'Room', options: ['All rooms', ...ROOMS], get: d => d.room },
      ]}
      header={
        <>
          <ReadOnlyBanner />
          <QueryView q={q}>{() => null}</QueryView>
          <Button label="Seating plans" icon={Armchair} variant="outline" onPress={() => nav.push('AdminSeating')} />
          <FormSheet
            visible={!!current}
            onClose={() => setEdit(null)}
            title={current ? `${current.date} · ${current.room}` : ''}
            onSubmit={() => {
              if (!current || !teacher) {
                toast('Pick an invigilator');
                return;
              }
              const busy = duties.find(d => d.id !== current.id && d.date === current.date && d.teacher === teacher);
              if (busy) {
                toast(`${teacher} already has duty in ${busy.room} on ${busy.date}`);
                return;
              }
              const next = { ...current, teacher };
              setDuties(list => (list.some(d => d.id === current.id) ? list.map(d => (d.id === current.id ? next : d)) : [...list, next]));
              logAudit('Invigilation', `${current.date} ${current.room}: ${teacher}`);
              setEdit(null);
            }}
          >
            <PickerField label="Invigilator" value={teacher} options={teachers.length ? teachers : TEACHERS} onChange={setTeacher} />
          </FormSheet>
        </>
      }
      renderItem={(d, last) => (
        <ListRow
          avatar={d.teacher || undefined}
          icon={d.teacher ? undefined : Armchair}
          title={d.teacher || 'Not assigned'}
          subtitle={`${d.date} · ${d.room} · ${TIMES[0]}`}
          right={<Pencil size={16} color={colors.textMuted} />}
          onPress={guard(() => {
            setTeacher(d.teacher || teachers[0] || '');
            setEdit(d.id);
          })}
          last={last}
        />
      )}
    />
  );
}

export function AdminSeating(_: ScreenProps) {
  const { list: students, q } = useLiveStudents();
  const [exams] = useExams();
  const exam = exams[exams.length - 1];
  const days = examDays(exam?.start, exam?.end);
  const [room, setRoom] = useState(ROOMS[0]);
  const [date, setDate] = useState('');
  const day = date || days[0];
  // Two classes alternate seats so neighbours never sit the same paper.
  const active = students.filter(x => x.status === 'Active');
  const classNames = Array.from(new Set(active.map(x => x.className))).sort();
  const ri = ROOMS.indexOf(room);
  const ca = classNames.length ? classNames[ri % classNames.length] : '';
  const cb = classNames.length > 1 ? classNames[(ri + 1) % classNames.length] : '';
  const a = active.filter(x => x.className === ca);
  const b = active.filter(x => x.className === cb);
  const seats = Array.from({ length: Math.min(30, a.length + b.length) }, (__, i) => {
    const useA = b.length === 0 || (i % 2 === 0 && Math.floor(i / 2) < a.length) || Math.floor(i / 2) >= b.length;
    const list = useA ? a : b;
    const idx = Math.floor(i / 2) % Math.max(1, list.length);
    const st = list[idx];
    return { seat: i + 1, cls: useA ? ca : cb, roll: st?.roll || idx + 1, name: st?.name ?? '' };
  });
  return (
    <Screen
      title="Seating plan"
      subtitle={`${room} · ${day}`}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={<Button label="Print seating plan" icon={Printer} onPress={() => toast(`Seating plan for ${room} sent to printer (demo)`)} />}
    >
      <QueryView q={q}>{() => null}</QueryView>
      <View style={adminStyles.row}>
        <View style={s.flex}>
          <PickerField label="Room" value={room} options={ROOMS} onChange={setRoom} />
        </View>
        <View style={s.flex}>
          <PickerField label="Date" value={day} options={days} onChange={setDate} />
        </View>
      </View>
      <InfoBanner text="Seats alternate between two classes so neighbours never sit the same paper." />
      {seats.length === 0 ? <InfoBanner text="No active students to seat." /> : null}
      <View style={s.grid}>
        {seats.map(x => (
          <View key={x.seat} style={[s.seat, x.cls === ca ? s.seatA : s.seatB]}>
            <Text style={s.seatNo}>{x.seat}</Text>
            <Text style={s.seatCls} numberOfLines={1}>{x.cls.replace('Class ', 'C')}·R{x.roll}</Text>
          </View>
        ))}
      </View>
      <Card>
        <ListRow icon={Plus} title={ca || '—'} subtitle="Odd seats" right={<View style={[s.legend, s.seatA]} />} />
        <ListRow icon={Plus} title={cb || '—'} subtitle="Even seats" right={<View style={[s.legend, s.seatB]} />} last />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  mt: { marginTop: 10 },
  smallBtn: { height: 38, paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  seat: {
    width: '18.4%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  seatA: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  seatB: { backgroundColor: colors.infoSoft, borderColor: colors.info },
  seatNo: { fontSize: 14, fontWeight: '900', color: colors.text },
  seatCls: { fontSize: 9.5, fontWeight: '700', color: colors.textMuted },
  legend: { width: 22, height: 22, borderRadius: 6, borderWidth: 1 },
});
