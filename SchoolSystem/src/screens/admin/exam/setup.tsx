// Exam panel: exam setup, date sheet, invigilation and seating (M-12).
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
import { colors, radius } from '../../../theme';
import { ScreenProps, useNav } from '../../../navigation';
import { logAudit } from '../../../data/admin';
import {
  DATES,
  ExamType,
  GradeBand,
  RESULT_CLASSES,
  RESULT_SUBJECTS,
  ROOMS,
  TEACHERS,
  TIMES,
  classMarks,
  useDuties,
  useExamTypes,
  useGrading,
  usePapers,
  usePassRules,
  usePublished,
} from '../../../data/admin-exam';
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

  return (
    <Screen title="Exam setup" subtitle="Exam types, weightage, grading scale and pass rules">
      <ReadOnlyBanner />
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
  const [papers, setPapers] = usePapers();
  const [published, setPublished] = usePublished();
  const [cls, setCls] = useState(RESULT_CLASSES[0]);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({ cls: RESULT_CLASSES[0], subject: RESULT_SUBJECTS[0].name, date: DATES[0], time: TIMES[0] });

  const open = (id: string | null) => {
    const p = papers.find(x => x.id === id);
    setForm(p ? { cls: p.cls, subject: p.subject, date: p.date, time: p.time } : { cls, subject: RESULT_SUBJECTS[0].name, date: DATES[0], time: TIMES[0] });
    setEdit(id ?? 'new');
  };
  const save = () => {
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
    const id = edit === 'new' ? `${form.cls}-${form.subject}` : (edit as string);
    setPapers(list => (edit === 'new' ? [...list, { id, ...form }] : list.map(p => (p.id === edit ? { id, ...form } : p))));
    setPublished(m => ({ ...m, [form.cls]: false }));
    logAudit('Date sheet', `${form.cls} ${form.subject}: ${form.date} ${form.time}`);
    setEdit(null);
  };

  return (
    <ListScreen
      title="Date sheet"
      subtitle="Final term 2026 · builder per class"
      items={papers}
      keyOf={p => p.id}
      searchText={p => `${p.cls} ${p.subject} ${p.date}`}
      filters={[{ label: 'Class', options: ['All classes', ...RESULT_CLASSES], get: p => p.cls }]}
      onAdd={guard(() => open(null))}
      addLabel="Add paper"
      header={
        <>
          <ReadOnlyBanner />
          <Card>
            <PickerField label="Publish date sheet for" value={cls} options={RESULT_CLASSES} onChange={setCls} />
            <View style={[adminStyles.row, s.mt]}>
              <Badge label={published[cls] ? 'Published' : 'Draft'} tone={published[cls] ? 'success' : 'warn'} />
              <View style={s.flex} />
              <Button
                label={published[cls] ? 'Re-publish' : 'Publish to portals'}
                icon={Send}
                style={s.smallBtn}
                onPress={guard(() => {
                  if (!papers.some(p => p.cls === cls)) {
                    toast('Add papers first');
                    return;
                  }
                  setPublished(m => ({ ...m, [cls]: true }));
                  logAudit('Date sheet', `${cls} date sheet published`);
                  toast(`${cls} date sheet published to parent, student and teacher apps`);
                })}
              />
            </View>
          </Card>
          <FormSheet visible={edit !== null} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add paper' : 'Edit paper'} onSubmit={save}>
            <PickerField label="Class" value={form.cls} options={RESULT_CLASSES} onChange={v => setForm(p => ({ ...p, cls: v }))} />
            <PickerField label="Subject" value={form.subject} options={RESULT_SUBJECTS.map(x => x.name)} onChange={v => setForm(p => ({ ...p, subject: v }))} />
            <PickerField label="Date" value={form.date} options={DATES} onChange={v => setForm(p => ({ ...p, date: v }))} />
            <PickerField label="Time" value={form.time} options={TIMES} onChange={v => setForm(p => ({ ...p, time: v }))} />
          </FormSheet>
        </>
      }
      renderItem={(p, last) => (
        <ListRow
          icon={CalendarRange}
          title={`${p.date} · ${p.subject}`}
          subtitle={`${p.cls} · ${p.time} · 100 marks`}
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
  const [duties, setDuties] = useDuties();
  const [edit, setEdit] = useState<string | null>(null);
  const [teacher, setTeacher] = useState('');
  const current = duties.find(d => d.id === edit);
  return (
    <ListScreen
      title="Invigilation & seating"
      subtitle="Duty roster for the final term"
      items={duties}
      keyOf={d => d.id}
      searchText={d => `${d.date} ${d.room} ${d.teacher}`}
      filters={[
        { label: 'Date', options: ['All dates', ...DATES.slice(0, 5)], get: d => d.date },
        { label: 'Room', options: ['All rooms', ...ROOMS], get: d => d.room },
      ]}
      header={
        <>
          <ReadOnlyBanner />
          <Button label="Seating plans" icon={Armchair} variant="outline" onPress={() => nav.push('AdminSeating')} />
          <FormSheet
            visible={!!current}
            onClose={() => setEdit(null)}
            title={current ? `${current.date} · ${current.room}` : ''}
            onSubmit={() => {
              if (!current) {
                return;
              }
              const busy = duties.find(d => d.id !== current.id && d.date === current.date && d.teacher === teacher);
              if (busy) {
                toast(`${teacher} already has duty in ${busy.room} on ${busy.date}`);
                return;
              }
              setDuties(list => list.map(d => (d.id === current.id ? { ...d, teacher } : d)));
              logAudit('Invigilation', `${current.date} ${current.room}: ${teacher}`);
              setEdit(null);
            }}
          >
            <PickerField label="Invigilator" value={teacher} options={TEACHERS} onChange={setTeacher} />
          </FormSheet>
        </>
      }
      renderItem={(d, last) => (
        <ListRow
          avatar={d.teacher}
          title={d.teacher}
          subtitle={`${d.date} · ${d.room} · 8:30 – 11:00`}
          right={<Pencil size={16} color={colors.textMuted} />}
          onPress={guard(() => {
            setTeacher(d.teacher);
            setEdit(d.id);
          })}
          last={last}
        />
      )}
    />
  );
}

export function AdminSeating(_: ScreenProps) {
  const [room, setRoom] = useState(ROOMS[0]);
  const [date, setDate] = useState(DATES[0]);
  // Two classes alternate seats so neighbours never sit the same paper.
  const ri = ROOMS.indexOf(room);
  const a = classMarks(RESULT_CLASSES[ri % 3], 'Final term');
  const b = classMarks(RESULT_CLASSES[(ri + 1) % 3], 'Final term');
  const seats = Array.from({ length: 30 }, (__, i) => {
    const list = i % 2 === 0 ? a : b;
    const st = list[Math.floor(i / 2) % list.length];
    return { seat: i + 1, cls: i % 2 === 0 ? RESULT_CLASSES[ri % 3] : RESULT_CLASSES[(ri + 1) % 3], roll: (Math.floor(i / 2) % list.length) + 1, name: st?.name ?? '' };
  });
  return (
    <Screen
      title="Seating plan"
      subtitle={`${room} · ${date}`}
      footer={<Button label="Print seating plan" icon={Printer} onPress={() => toast(`Seating plan for ${room} sent to printer (demo)`)} />}
    >
      <View style={adminStyles.row}>
        <View style={s.flex}>
          <PickerField label="Room" value={room} options={ROOMS} onChange={setRoom} />
        </View>
        <View style={s.flex}>
          <PickerField label="Date" value={date} options={DATES} onChange={setDate} />
        </View>
      </View>
      <InfoBanner text="Seats alternate between two classes so neighbours never sit the same paper." />
      <View style={s.grid}>
        {seats.map(x => (
          <View key={x.seat} style={[s.seat, x.cls === RESULT_CLASSES[ri % 3] ? s.seatA : s.seatB]}>
            <Text style={s.seatNo}>{x.seat}</Text>
            <Text style={s.seatCls}>{x.cls.replace('Class ', 'C')}·R{x.roll}</Text>
          </View>
        ))}
      </View>
      <Card>
        <ListRow icon={Plus} title={`${RESULT_CLASSES[ri % 3]}`} subtitle="Odd seats" right={<View style={[s.legend, s.seatA]} />} />
        <ListRow icon={Plus} title={`${RESULT_CLASSES[(ri + 1) % 3]}`} subtitle="Even seats" right={<View style={[s.legend, s.seatB]} />} last />
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
