// Front Desk: inquiries CRM (S-03), registration, entry test and admission (M-02).
// Live from /api/web/modules/inquiries, /registrations, /entry-tests and
// /registrations/{id}/admit; what the server does not store stays in the app.
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BellRing,
  ChartColumn,
  ClipboardCheck,
  KeyRound,
  Printer,
  Receipt,
  ShieldCheck,
  UserPlus,
} from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Chips,
  Field,
  InfoBanner,
  ListRow,
  QRCode,
  Screen,
  Segmented,
  Toggle,
  formatRs,
  toast,
} from '../../../components/ui';
import { BottomSheet } from '../../../components/Tabs';
import {
  FormSheet,
  KV,
  Kpi,
  KpiGrid,
  ListScreen,
  PickerField,
  adminStyles,
} from '../../../components/admin';
import { NoApiBanner, QueryView } from '../../../components/states';
import { colors, radius } from '../../../theme';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { campusName, logAudit, useRules, useStaffRole } from '../../../data/admin';
import {
  Decision,
  FOLLOW_UP_DATES,
  INQUIRY_STATUSES,
  Inquiry,
  InquirySource,
  InquiryStatus,
  Registration,
  SOURCES,
  TEST_MAX,
  TEST_SUBJECTS,
  findDuplicate,
  meritList,
  siblingsOf,
  testTotal,
  useFrontStaff,
  useInquiries,
  useLiveClasses,
  useRegistrations,
  useTests,
} from '../../../data/admin-frontdesk';
import { invalidate, useApi } from '../../../api/hooks';
import { errorMessage } from '../../../api/client';
import { useApiSession } from '../../../api/session';
import { webA } from '../../../api/webA';
import { ReadOnlyBanner, isNum, statusTone, useGuard } from './util';

const cnicOk = (v: string) => v.replace(/\D/g, '').length === 13;

// The next four Saturdays as ISO dates for the test schedule picker.
function nextSaturdays() {
  const out: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  for (let i = 0; i < 4; i += 1) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

// ---------- Inquiries (S-03) ----------

export function AdminInquiries(_: ScreenProps) {
  const nav = useNav();
  const { guard } = useGuard();
  const classes = useLiveClasses();
  const staff = useFrontStaff();
  const [items, setItems, q] = useInquiries();
  const [adding, setAdding] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({
    child: '',
    parent: '',
    mobile: '',
    cls: '',
    source: 'Walk-in' as InquirySource,
    followUp: 'Tomorrow',
    assigned: '',
  });
  const selected = items.find(i => i.id === sel);
  const registered = items.filter(i => i.status === 'Registered').length;
  const update = (id: string, patch: Partial<Inquiry>, detail: string) => {
    setItems(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)));
    logAudit('Inquiry', detail);
  };
  const save = () => {
    if (!form.child.trim() || !form.parent.trim() || form.mobile.replace(/\D/g, '').length < 10) {
      toast('Enter child name, parent name and a valid mobile number');
      return;
    }
    const cls = form.cls || classes.names[0] || '';
    setItems(list => [{ id: `new-${Date.now()}`, ...form, cls, status: 'New', notes: '' }, ...list]);
    logAudit('Inquiry', `New inquiry: ${form.child} (${form.source}, ${cls})`);
    toast(`Inquiry saved. Follow-up reminder set for ${form.followUp}.`);
    setAdding(false);
    setForm(f => ({ ...f, child: '', parent: '', mobile: '' }));
  };
  return (
    <ListScreen
      title="Inquiries (CRM)"
      subtitle="Walk-in, call, website and Facebook leads"
      items={items}
      keyOf={i => i.id}
      searchText={i => `${i.child} ${i.parent} ${i.mobile} ${i.cls}`}
      filters={[
        { label: 'Status', options: ['All', ...INQUIRY_STATUSES], get: i => i.status },
        { label: 'Source', options: ['All sources', ...SOURCES], get: i => i.source },
      ]}
      onAdd={guard(() => setAdding(true))}
      addLabel="Log inquiry"
      empty="No inquiries yet"
      header={
        <>
          <ReadOnlyBanner />
          <QueryView q={q}>{() => null}</QueryView>
          <KpiGrid>
            <Kpi label="New" value={String(items.filter(i => i.status === 'New').length)} />
            <Kpi label="Follow-ups today" value={String(items.filter(i => i.followUp === 'Today' && i.status !== 'Lost' && i.status !== 'Registered').length)} tone="warn" />
            <Kpi label="Converted" value={`${Math.round((registered / Math.max(1, items.length)) * 100)}%`} sub={`${registered} registered`} tone="success" />
            <Kpi label="Lost" value={String(items.filter(i => i.status === 'Lost').length)} tone="danger" />
          </KpiGrid>
          <Button label="Conversion report" icon={ChartColumn} variant="outline" onPress={() => nav.push('AdminReport', { id: 'r29' })} />
          <FormSheet visible={adding} onClose={() => setAdding(false)} title="Log inquiry" onSubmit={save}>
            <Field label="Child name" value={form.child} onChangeText={v => setForm(f => ({ ...f, child: v }))} />
            <Field label="Parent name" value={form.parent} onChangeText={v => setForm(f => ({ ...f, parent: v }))} />
            <Field label="Mobile" value={form.mobile} keyboardType="phone-pad" onChangeText={v => setForm(f => ({ ...f, mobile: v }))} />
            <PickerField label="Class" value={form.cls || classes.names[0] || ''} options={classes.names} onChange={v => setForm(f => ({ ...f, cls: v }))} />
            <Text style={adminStyles.section}>Source</Text>
            <Chips options={SOURCES} value={form.source} onChange={v => setForm(f => ({ ...f, source: v as InquirySource }))} />
            <PickerField label="Follow-up date" value={form.followUp} options={FOLLOW_UP_DATES} onChange={v => setForm(f => ({ ...f, followUp: v }))} />
            <PickerField label="Assigned to" value={form.assigned} options={staff} placeholder="Choose staff" onChange={v => setForm(f => ({ ...f, assigned: v }))} />
          </FormSheet>
          <BottomSheet visible={!!selected} onClose={() => setSel(null)}>
            {selected ? (
              <View style={s.gap}>
                <Text style={s.sheetTitle}>{selected.child}</Text>
                <Card>
                  <KV k="Parent" v={selected.parent || '—'} />
                  <KV k="Mobile" v={selected.mobile} />
                  <KV k="Class" v={selected.cls} />
                  <KV k="Source" v={selected.source} last />
                </Card>
                <Text style={adminStyles.section}>Status</Text>
                <Chips
                  options={INQUIRY_STATUSES}
                  value={selected.status}
                  onChange={guard((v: string) => update(selected.id, { status: v as InquiryStatus }, `${selected.child}: status → ${v}`))}
                />
                <PickerField
                  label="Next follow-up"
                  value={selected.followUp}
                  options={FOLLOW_UP_DATES}
                  onChange={guard((v: string) => update(selected.id, { followUp: v }, `${selected.child}: follow-up ${v}`))}
                />
                <PickerField
                  label="Assigned staff"
                  value={selected.assigned}
                  options={staff}
                  onChange={guard((v: string) => update(selected.id, { assigned: v }, `${selected.child}: assigned to ${v}`))}
                />
                <Button
                  label="Set reminder"
                  icon={BellRing}
                  variant="outline"
                  onPress={() => toast(`Reminder set for ${selected.assigned} on ${selected.followUp}`)}
                />
                <Button
                  label="Convert to registration"
                  icon={UserPlus}
                  onPress={guard(() => {
                    const inq = selected;
                    setSel(null);
                    nav.push('AdminRegistrationForm', {
                      fromInquiry: inq.id,
                      name: inq.child,
                      father: inq.parent,
                      mobile: inq.mobile,
                      cls: inq.cls,
                    });
                  })}
                />
              </View>
            ) : null}
          </BottomSheet>
        </>
      }
      renderItem={(i, last) => (
        <ListRow
          icon={UserPlus}
          title={i.child}
          subtitle={`${i.cls} · ${i.parent || '—'} · ${i.mobile}\n${i.source} · follow-up ${i.followUp} · ${i.assigned}`}
          right={<Badge label={i.status} tone={statusTone(i.status)} />}
          onPress={() => setSel(i.id)}
          last={last}
        />
      )}
    />
  );
}

// ---------- Registration (M-02) ----------

export function AdminRegistration(_: ScreenProps) {
  const nav = useNav();
  const { guard } = useGuard();
  const classes = useLiveClasses();
  const { list: regs, q } = useRegistrations();
  return (
    <ListScreen
      title="Registration"
      subtitle={regs[0]?.feeAmount ? `Registration fee ${formatRs(regs[0].feeAmount)}` : `${regs.length} registrations`}
      items={regs}
      keyOf={r => r.regNo}
      searchText={r => `${r.regNo} ${r.name} ${r.father} ${r.fatherCnic} ${r.bForm}`}
      filters={[
        { label: 'Class', options: ['All classes', ...classes.names], get: r => r.cls },
        { label: 'Fee', options: ['All', 'Fee paid', 'Fee due'], get: r => (r.feePaid ? 'Fee paid' : 'Fee due') },
      ]}
      onAdd={guard(() => nav.push('AdminRegistrationForm'))}
      addLabel="New registration"
      empty="No registrations yet"
      header={
        <>
          <ReadOnlyBanner />
          <QueryView q={q}>{() => null}</QueryView>
        </>
      }
      renderItem={(r, last) => (
        <ListRow
          icon={ClipboardCheck}
          title={`${r.name} · ${r.cls}`}
          subtitle={`${r.regNo} · Father ${r.father} · ${r.fatherCnic}`}
          right={
            r.status === 'admitted' ? (
              <Badge label="Admitted" tone="success" />
            ) : (
              <Badge label={r.feePaid ? 'Fee paid' : 'Fee due'} tone={r.feePaid ? 'success' : 'danger'} />
            )
          }
          onPress={() => nav.push('AdminRegistrationSlip', { regNo: r.regNo })}
          last={last}
        />
      )}
    />
  );
}

export function AdminRegistrationForm(_: ScreenProps) {
  const nav = useNav();
  const { guard } = useGuard();
  const classes = useLiveClasses();
  const [session] = useApiSession();
  const campuses = session?.campuses ?? [];
  const { list: regs, patchLocal } = useRegistrations();
  const [inquiries, setInquiries] = useInquiries();
  const fromInquiry = useParam<string>('fromInquiry', '');
  const current = campuses.find(c => String(c.id) === String(session?.campusId)) ?? campuses[0];
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: useParam('name', ''),
    gender: 'M' as 'M' | 'F',
    dob: '',
    bForm: '',
    father: useParam('father', ''),
    fatherCnic: '',
    mobile: useParam('mobile', ''),
    prevSchool: '',
    cls: useParam('cls', ''),
    campus: current?.name ?? '',
    feePaid: true,
    mode: 'Cash',
  });
  const set = (k: keyof typeof f) => (v: string | boolean) => setF(p => ({ ...p, [k]: v }));
  const dup = findDuplicate(regs, f.name, f.bForm, f.fatherCnic);
  const cls = f.cls || classes.names[0] || '';

  const save = async () => {
    if (!f.name.trim() || !f.father.trim() || !f.dob.trim() || !f.prevSchool.trim()) {
      toast('Fill in student name, date of birth, father name and previous school');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dob.trim())) {
      toast('Enter the date of birth as YYYY-MM-DD');
      return;
    }
    if (!cnicOk(f.bForm) || !cnicOk(f.fatherCnic)) {
      toast('B-Form and father CNIC must have 13 digits');
      return;
    }
    if (f.mobile.replace(/\D/g, '').length < 10) {
      toast('Enter a valid mobile number');
      return;
    }
    if (dup.error) {
      toast(dup.error);
      return;
    }
    const classId = classes.idOf(cls);
    if (!classId) {
      toast('Pick a class');
      return;
    }
    const campusId = campuses.find(c => c.name === f.campus)?.id;
    setBusy(true);
    try {
      const reg = await webA.register({
        name: f.name.trim(),
        gender: f.gender,
        dob: f.dob.trim(),
        bform: f.bForm,
        fatherName: f.father.trim(),
        fatherCnic: f.fatherCnic,
        mobile: f.mobile,
        prevSchool: f.prevSchool.trim(),
        classId: Number(classId),
        campusId: campusId ? Number(campusId) : undefined,
        mode: f.feePaid ? f.mode.toLowerCase() : 'unpaid',
      });
      patchLocal(reg.regNo, { prevSchool: f.prevSchool.trim(), campus: campusId ? String(campusId) : '' });
      const inq = fromInquiry ? inquiries.find(i => i.id === fromInquiry) : undefined;
      if (inq) {
        setInquiries(list => list.map(i => (i.id === fromInquiry ? { ...i, status: 'Registered' } : i)));
      }
      logAudit('Registration', `${reg.regNo}: ${reg.name}, ${cls}${f.feePaid ? `, fee by ${f.mode}` : ', fee due'}`);
      invalidate('adm:registrations');
      toast(`Registered as ${reg.regNo}`);
      nav.replace('AdminRegistrationSlip', { regNo: reg.regNo });
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Registration form"
      subtitle={fromInquiry ? 'Converted from inquiry · details filled in' : 'Front desk or public online form'}
      footer={<Button label={busy ? 'Saving…' : 'Save and print slip'} icon={Printer} onPress={guard(() => (busy ? undefined : save()))} />}
    >
      <ReadOnlyBanner />
      <Text style={adminStyles.section}>Student</Text>
      <Field label="Student name" value={f.name} onChangeText={set('name')} />
      <Chips options={['M', 'F']} value={f.gender} onChange={set('gender')} />
      <Field label="Date of birth" value={f.dob} onChangeText={set('dob')} placeholder="YYYY-MM-DD, e.g. 2018-03-14" />
      <Field label="B-Form number" value={f.bForm} onChangeText={set('bForm')} keyboardType="numbers-and-punctuation" placeholder="35202-1234567-1" />
      <Text style={adminStyles.section}>Guardian</Text>
      <Field label="Father name" value={f.father} onChangeText={set('father')} />
      <Field label="Father CNIC" value={f.fatherCnic} onChangeText={set('fatherCnic')} keyboardType="numbers-and-punctuation" placeholder="35202-1234567-1" />
      <Field label="Mobile" value={f.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" />
      <Text style={adminStyles.section}>School</Text>
      <Field label="Previous school" value={f.prevSchool} onChangeText={set('prevSchool')} />
      <PickerField label="Class applied for" value={cls} options={classes.names} onChange={set('cls')} />
      {campuses.length ? (
        <PickerField label="Campus" value={f.campus} options={campuses.map(c => c.name)} onChange={set('campus')} />
      ) : null}
      {dup.error ? <InfoBanner tone="danger" text={dup.error} /> : null}
      {!dup.error && dup.siblings.length ? (
        <InfoBanner
          tone="info"
          text={`Sibling found by father CNIC: ${dup.siblings.map(x => `${x.name} (${x.className})`).join(', ')}. They will share one parent login.`}
        />
      ) : null}
      <Card>
        <View style={adminStyles.row}>
          <View style={s.flex}>
            <Text style={adminStyles.bold}>Registration fee (school setting)</Text>
            <Text style={adminStyles.small}>{f.feePaid ? `Collected by ${f.mode}` : 'Not collected yet'}</Text>
          </View>
          <Toggle value={f.feePaid} onChange={set('feePaid')} />
        </View>
        {f.feePaid ? <Chips style={s.mt} options={['Cash', 'Bank', 'Online']} value={f.mode} onChange={set('mode')} /> : null}
      </Card>
    </Screen>
  );
}

export function AdminRegistrationSlip(_: ScreenProps) {
  const { list: regs, q, patchLocal } = useRegistrations();
  const { list: tests } = useTests();
  const [session] = useApiSession();
  const { guard } = useGuard();
  const regNo = useParam('regNo', regs[0]?.regNo ?? '');
  const r = regs.find(x => x.regNo === regNo) ?? regs[0];
  if (!r) {
    return (
      <Screen title="Registration slip">
        <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No registrations yet">
          {() => null}
        </QueryView>
      </Screen>
    );
  }
  const test = tests.find(t => t.classId === r.classId || t.cls === r.cls);
  return (
    <Screen
      title="Registration slip"
      subtitle={r.regNo}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={
        <>
          {r.feePaid ? null : (
            <Button
              label={`Collect fee ${formatRs(r.feeAmount)}`}
              icon={Receipt}
              onPress={guard(() => {
                patchLocal(r.regNo, { feePaid: true });
                logAudit('Registration fee', `${r.regNo}: ${formatRs(r.feeAmount)} collected`);
                toast('Fee marked as collected in this app.');
              })}
            />
          )}
          <Button label="Print slip" icon={Printer} variant="outline" onPress={() => toast('Registration slip sent to printer (demo)')} />
        </>
      }
    >
      {r.feePaid ? null : <NoApiBanner what="Collecting a registration fee after the form is saved" />}
      <Card>
        <View style={s.slipHead}>
          <View style={s.flex}>
            <Text style={s.slipNo}>{r.regNo}</Text>
            <Text style={adminStyles.small}>{session?.user.schoolName ?? 'School'} · {r.campus ? campusName(r.campus) : '—'}</Text>
          </View>
          <QRCode value={r.regNo} size={72} />
        </View>
        <KV k="Student" v={`${r.name} (${r.gender})`} />
        <KV k="Date of birth" v={r.dob || '—'} />
        <KV k="B-Form" v={r.bForm || '—'} />
        <KV k="Father" v={`${r.father} · ${r.fatherCnic}`} />
        <KV k="Mobile" v={r.mobile} />
        <KV k="Previous school" v={r.prevSchool || '—'} />
        <KV k="Class applied" v={r.cls} />
        <KV k="Registration fee" v={<Badge label={r.feePaid ? 'Paid' : 'Due'} tone={r.feePaid ? 'success' : 'danger'} />} />
        <KV k="Entry test" v={test ? `${test.date}${test.time ? ` · ${test.time}` : ''}${test.room ? ` · ${test.room}` : ''}` : 'Date to be announced'} last />
      </Card>
      <InfoBanner text="Bring this slip and the child's B-Form to the entry test." />
    </Screen>
  );
}

// ---------- Entry test ----------

export function AdminEntryTest(_: ScreenProps) {
  const { guard } = useGuard();
  const classes = useLiveClasses();
  const [tab, setTab] = useState('Schedule');
  const { list: tests, q: testsQ, setPublished } = useTests();
  const { list: regs, q: regsQ, patchLocal } = useRegistrations();
  const testClasses = Array.from(new Set(tests.map(t => t.cls)));
  const [clsSel, setCls] = useState('');
  const cls = clsSel || testClasses[0] || '';
  const [adding, setAdding] = useState(false);
  const saturdays = nextSaturdays();
  const [nt, setNt] = useState({ cls: '', date: saturdays[0], time: '9:00 AM', room: 'Hall A' });
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [decideFor, setDecideFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const test = tests.find(t => t.cls === cls);
  const subjects = test?.subjects ?? TEST_SUBJECTS.map(name => ({ name, max: TEST_MAX }));
  const maxTotal = subjects.reduce((n, x) => n + x.max, 0);
  const meritQ = useApi(test ? `adm:merit:${test.id}` : null, () => webA.merit(test?.id ?? ''));
  const serverMarks = new Map((meritQ.data?.merit ?? []).map(m => [String(m.id), m.marks]));
  const candidates = regs
    .filter(r => (test?.classId ? r.classId === test.classId : r.cls === cls) && r.feePaid && r.status !== 'admitted')
    .map(r => ({ ...r, marks: serverMarks.get(r.id) && Object.keys(serverMarks.get(r.id) ?? {}).length ? serverMarks.get(r.id) : r.marks }));
  const merit = meritList(candidates);

  const saveMarks = async () => {
    if (!test) {
      toast('Schedule a test for this class first');
      return;
    }
    let bad = false;
    const payload: Record<string, Record<string, number>> = {};
    candidates.forEach(r => {
      const d = draft[r.regNo];
      const marks: Record<string, number> = { ...(r.marks ?? {}) };
      if (d) {
        for (const sub of subjects) {
          const v = d[sub.name];
          if (v === undefined || v === '') {
            continue;
          }
          if (!isNum(v) || Number(v) > sub.max) {
            bad = true;
          } else {
            marks[sub.name] = Number(v);
          }
        }
      }
      if (subjects.every(sub => marks[sub.name] !== undefined) && d) {
        payload[r.id] = marks;
      }
      if (remarks[r.regNo] !== undefined) {
        patchLocal(r.regNo, { interview: remarks[r.regNo], testId: test.id });
      }
    });
    if (bad) {
      toast(`Marks must be numbers from 0 to ${subjects[0]?.max ?? TEST_MAX}`);
      return;
    }
    if (Object.keys(payload).length) {
      setBusy(true);
      try {
        const res = await webA.saveEntryMarks(test.id, payload);
        meritQ.setData(() => res);
      } catch (e) {
        toast(errorMessage(e));
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setDraft({});
    logAudit('Entry test', `Marks saved for ${cls}`);
    toast('Marks and interview remarks saved');
  };

  const decide = async (id: string, regNo: string, d: Decision) => {
    setDecideFor(null);
    try {
      await webA.decide(id, d.toLowerCase() as 'selected' | 'waiting' | 'rejected');
      logAudit('Entry test', `${regNo}: ${d}`);
      if (d === 'Selected') {
        invalidate('adm:approvals');
        toast('Selected. Sent to the Principal for admission approval.');
      }
      regsQ.refresh();
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const schedule = async () => {
    const name = nt.cls || classes.names[0] || '';
    const classId = classes.idOf(name);
    if (!classId) {
      toast('Pick a class');
      return;
    }
    if (tests.some(t => t.cls === name)) {
      toast(`${name} already has a test scheduled`);
      return;
    }
    try {
      await webA.addEntryTest({
        name: `${name} entry test`,
        testDate: nt.date,
        testTime: nt.time,
        room: nt.room,
        classIds: [Number(classId)],
        regIds: regs.filter(r => r.classId === String(classId) && r.status !== 'admitted').map(r => Number(r.id)),
        subjects: TEST_SUBJECTS.map(x => ({ name: x, max: TEST_MAX })),
      });
      logAudit('Entry test', `Scheduled ${name} on ${nt.date} ${nt.time}`);
      setAdding(false);
      toast('Test scheduled');
      testsQ.refresh();
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  return (
    <Screen
      title="Entry test"
      subtitle="Schedule, admit slips, marks, merit list, interview"
      refreshing={testsQ.refreshing}
      onRefresh={() => Promise.all([testsQ.refresh(), regsQ.refresh(), meritQ.refresh()]).then(() => undefined)}
    >
      <ReadOnlyBanner />
      <QueryView q={testsQ}>{() => null}</QueryView>
      <Segmented options={['Schedule', 'Marks', 'Merit list']} value={tab} onChange={setTab} />
      {tab !== 'Schedule' && testClasses.length ? (
        <PickerField label="Class" value={cls} options={testClasses} onChange={setCls} />
      ) : null}

      {tab === 'Schedule' ? (
        <>
          <Card title="Scheduled tests">
            {tests.length === 0 ? <Text style={adminStyles.small}>No entry tests scheduled yet.</Text> : null}
            {tests.map((t, i) => {
              const n = regs.filter(r => (t.classId ? r.classId === t.classId : r.cls === t.cls) && r.feePaid && r.status !== 'admitted').length;
              return (
                <ListRow
                  key={t.id}
                  icon={ClipboardCheck}
                  title={`${t.cls} · ${t.date}`}
                  subtitle={`${t.time || '—'} · ${t.room || '—'} · ${n} candidates`}
                  right={
                    <Button
                      label="Admit slips"
                      variant="outline"
                      style={s.smallBtn}
                      onPress={() => toast(`${n} admit slips printed for ${t.cls} (demo)`)}
                    />
                  }
                  last={i === tests.length - 1}
                />
              );
            })}
          </Card>
          <Button label="Schedule a test" onPress={guard(() => setAdding(true))} />
          <FormSheet visible={adding} onClose={() => setAdding(false)} title="Schedule entry test" onSubmit={schedule}>
            <PickerField label="Class" value={nt.cls || classes.names[0] || ''} options={classes.names} onChange={v => setNt(p => ({ ...p, cls: v }))} />
            <PickerField label="Date" value={nt.date} options={saturdays} onChange={v => setNt(p => ({ ...p, date: v }))} />
            <PickerField label="Time" value={nt.time} options={['9:00 AM', '11:00 AM', '1:00 PM']} onChange={v => setNt(p => ({ ...p, time: v }))} />
            <PickerField label="Room" value={nt.room} options={['Hall A', 'Room 4', 'Library']} onChange={v => setNt(p => ({ ...p, room: v }))} />
          </FormSheet>
        </>
      ) : null}

      {tab === 'Marks' ? (
        <>
          <InfoBanner text={`Each subject is out of ${subjects.map(x => x.max).join(' / ')}. Only candidates with paid registration fee appear.`} />
          <NoApiBanner what="Interview remarks (kept in this app)" />
          {candidates.map(r => (
            <Card key={r.regNo}>
              <Text style={adminStyles.bold}>{r.name}</Text>
              <Text style={adminStyles.small}>{r.regNo}</Text>
              <View style={s.marksRow}>
                {subjects.map(sub => {
                  const v = draft[r.regNo]?.[sub.name] ?? (r.marks?.[sub.name] !== undefined ? String(r.marks[sub.name]) : '');
                  const bad = v !== '' && (!isNum(v) || Number(v) > sub.max);
                  return (
                    <View key={sub.name} style={s.flex}>
                      <Text style={s.markLabel}>{sub.name}</Text>
                      <TextInput
                        value={v}
                        onChangeText={x => setDraft(p => ({ ...p, [r.regNo]: { ...(p[r.regNo] ?? {}), [sub.name]: x } }))}
                        keyboardType="number-pad"
                        maxLength={3}
                        style={[s.markInput, bad && s.markBad]}
                        placeholder="—"
                      />
                    </View>
                  );
                })}
              </View>
              <Field
                label="Interview remarks"
                value={remarks[r.regNo] ?? r.interview ?? ''}
                onChangeText={x => setRemarks(p => ({ ...p, [r.regNo]: x }))}
              />
            </Card>
          ))}
          {candidates.length ? (
            <Button label={busy ? 'Saving…' : 'Save marks'} onPress={guard(() => (busy ? undefined : saveMarks()))} />
          ) : (
            <InfoBanner text={test ? 'No candidates for this class yet.' : 'Schedule a test to enter marks.'} />
          )}
        </>
      ) : null}

      {tab === 'Merit list' ? (
        <>
          <Card title={`Merit list · ${cls || '—'}`}>
            {merit.length === 0 ? <Text style={adminStyles.small}>No marks entered yet.</Text> : null}
            {merit.map((m, i) => (
              <ListRow
                key={m.reg.regNo}
                title={`${m.rank}. ${m.reg.name}`}
                subtitle={`${m.total} / ${maxTotal} · ${Math.round((m.total / Math.max(1, maxTotal)) * 100)}%${m.reg.interview ? ` · ${m.reg.interview}` : ''}`}
                right={<Badge label={m.reg.decision} tone={statusTone(m.reg.decision)} />}
                onPress={() => setDecideFor(m.reg.regNo)}
                last={i === merit.length - 1}
              />
            ))}
          </Card>
          <NoApiBanner what="Publishing results and parent SMS" />
          <Button
            label={test?.published ? 'Results published · resend SMS' : 'Publish results and send SMS / WhatsApp'}
            onPress={guard(() => {
              const decided = merit.filter(m => m.reg.decision !== 'Pending');
              if (!decided.length || !test) {
                toast('Mark at least one candidate selected, waiting or rejected');
                return;
              }
              setPublished(p => ({ ...p, [test.id]: true }));
              logAudit('Entry test', `Results published for ${cls}`);
              toast(`Results marked as published. SMS/WhatsApp to ${decided.length} parents (demo).`);
            })}
          />
          <BottomSheet visible={!!decideFor} onClose={() => setDecideFor(null)}>
            <Text style={s.sheetTitle}>Decision</Text>
            <Chips
              options={['Selected', 'Waiting', 'Rejected']}
              value={regs.find(r => r.regNo === decideFor)?.decision ?? 'Pending'}
              onChange={guard((v: string) => {
                const r = regs.find(x => x.regNo === decideFor);
                if (r) {
                  decide(r.id, r.regNo, v as Decision);
                }
              })}
            />
          </BottomSheet>
        </>
      ) : null}
    </Screen>
  );
}

// ---------- Admission ----------
// Selecting a candidate creates a pending Principal approval on the server;
// /registrations/{id}/admit then creates the student, GR No. and portal logins.

export function AdminAdmission(_: ScreenProps) {
  const { guard } = useGuard();
  const { list: regs, q, patchLocal } = useRegistrations();
  const classes = useLiveClasses();
  const approvalsQ = useApi('adm:approvals', webA.approvals);
  const [rules] = useRules();
  const [role] = useStaffRole();
  const [session] = useApiSession();
  const userRole = session?.user.role ?? role;
  const canApprove = userRole === 'owner' || userRole === 'principal';
  const [tab, setTab] = useState('In progress');
  const [busy, setBusy] = useState<string | null>(null);
  const selected = regs.filter(r => r.decision === 'Selected');
  const list = selected.filter(r => (tab === 'Final' ? r.admission?.final : !r.admission?.final));
  const pendingOf = (r: Registration) =>
    (approvalsQ.data ?? []).find(a => a.entityType === 'registrations' && String(a.entityId) === r.id);

  const approve = async (r: Registration) => {
    const ap = pendingOf(r);
    if (!ap) {
      toast('No pending approval found. Refresh and try again.');
      return;
    }
    try {
      await webA.decideApproval(ap.id, 'approved');
      logAudit('Approval', `Admission approved: ${r.name}`);
      invalidate('adm:approvals');
      q.refresh();
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const admit = async (r: Registration) => {
    const a = r.admission ?? { section: '', feePaid: false, final: false };
    const section = a.section || classes.sectionsOf(r.cls)[0] || '';
    if (!section) {
      toast('Allot a section first');
      return;
    }
    setBusy(r.id);
    try {
      const res = await webA.admit(r.id, section);
      patchLocal(r.regNo, {
        admission: {
          ...a,
          gr: res.grNo,
          final: true,
          logins: { parent: r.mobile, student: res.grNo, parentPassword: res.parentPassword, studentPassword: res.studentPassword },
        },
      });
      logAudit('Admission', `Admission final: ${r.name} ${res.grNo}`);
      invalidate('adm:students');
      q.refresh();
      const sibs = siblingsOf(r.fatherCnic);
      Alert.alert(
        `Admitted · ${res.grNo}`,
        [
          res.parentPassword
            ? `Parent login: ${r.mobile} · temporary password ${res.parentPassword}`
            : `Parent login: ${r.mobile} (existing${sibs.length ? `, linked to ${sibs.length} sibling${sibs.length > 1 ? 's' : ''}` : ''})`,
          `Student login: ${res.grNo} · temporary password ${res.studentPassword ?? '—'}`,
          'Both must change the password at first sign in.',
        ].join('\n'),
      );
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      title="Admission"
      subtitle="Approval, section, admission fee, GR No. and portal logins"
      refreshing={q.refreshing}
      onRefresh={() => Promise.all([q.refresh(), approvalsQ.refresh()]).then(() => undefined)}
    >
      <ReadOnlyBanner />
      <QueryView q={q}>{() => null}</QueryView>
      <Segmented options={['In progress', 'Final']} value={tab} onChange={setTab} />
      {rules.admissionNeedsFee ? (
        <InfoBanner text="Admission becomes final only after the admission fee is paid." />
      ) : null}
      {list.length === 0 ? <InfoBanner text={tab === 'Final' ? 'No final admissions yet.' : 'No selected candidates waiting. Select candidates in Entry test.'} /> : null}
      {list.map(r => {
        const a = r.admission ?? { section: '', feePaid: false, final: false };
        const sections = classes.sectionsOf(r.cls);
        const approved = r.principal === 'approved';
        const pending = pendingOf(r);
        return (
          <Card key={r.regNo}>
            <View style={adminStyles.row}>
              <View style={s.flex}>
                <Text style={adminStyles.bold}>{r.name}</Text>
                <Text style={adminStyles.small}>{r.regNo} · {r.cls}{r.marks ? ` · test ${testTotal(r)}` : ''}</Text>
              </View>
              <Badge label={a.final ? 'Final' : approved ? 'Approved' : 'Waiting approval'} tone={a.final ? 'success' : approved ? 'info' : 'warn'} />
            </View>

            {a.final ? (
              <Text style={[adminStyles.small, s.mt]}>
                {a.gr ? `${a.gr} · section ${a.section || '—'}` : 'Admitted'}
                {a.logins ? ` · parent login ${a.logins.parent} · student login ${a.logins.student}` : ''}
              </Text>
            ) : (
              <>
                <Step n={1} title="Principal approval" done={approved}>
                  {approved ? (
                    <Text style={adminStyles.small}>Approved</Text>
                  ) : canApprove && pending ? (
                    <Button label="Approve now" icon={ShieldCheck} variant="outline" style={s.smallBtn} onPress={guard(() => approve(r))} />
                  ) : (
                    <Text style={adminStyles.small}>{pending ? 'Waiting for the Principal' : 'Sent when the candidate was selected'}</Text>
                  )}
                </Step>

                <Step n={2} title="Allot section" done={!!a.section}>
                  <Chips
                    options={sections}
                    value={a.section}
                    onChange={guard((v: string) => {
                      patchLocal(r.regNo, { admission: { ...a, section: v } });
                      logAudit('Admission', `${r.regNo}: section ${v}`);
                    })}
                  />
                </Step>

                <Step n={3} title="Admission fee" done={a.feePaid}>
                  {a.feePaid ? (
                    <Text style={adminStyles.small}>Paid</Text>
                  ) : (
                    <Button
                      label="Mark paid"
                      icon={Receipt}
                      variant="outline"
                      style={s.smallBtn}
                      onPress={guard(() => {
                        patchLocal(r.regNo, { admission: { ...a, feePaid: true } });
                        logAudit('Admission', `${r.regNo}: admission fee paid`);
                      })}
                    />
                  )}
                </Step>

                <Step n={4} title="GR No., student record and portal logins" done={false}>
                  <Button
                    label={busy === r.id ? 'Admitting…' : 'Admit and create logins'}
                    icon={KeyRound}
                    variant="outline"
                    style={s.smallBtn}
                    onPress={guard(() => {
                      if (busy) {
                        return;
                      }
                      if (!approved) {
                        toast('Waiting for Principal approval');
                        return;
                      }
                      if (rules.admissionNeedsFee && !a.feePaid) {
                        toast('Admission fee must be paid first');
                        return;
                      }
                      admit(r);
                    })}
                  />
                </Step>
                <NoApiBanner what="Admission fee voucher (marked paid in this app)" />
              </>
            )}
            {a.final ? <Badge label="Student created" tone="success" /> : null}
          </Card>
        );
      })}
    </Screen>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <View style={s.step}>
      <View style={[s.stepNo, done && s.stepDone]}>
        <Text style={[s.stepNoText, done && s.stepNoTextDone]}>{done ? '✓' : n}</Text>
      </View>
      <View style={s.flex}>
        <Text style={s.stepTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  mt: { marginTop: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  smallBtn: { height: 36, paddingHorizontal: 10, alignSelf: 'flex-start' },
  slipHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  slipNo: { fontSize: 20, fontWeight: '900', color: colors.text },
  marksRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  markLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 4 },
  markInput: {
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    backgroundColor: colors.card,
  },
  markBad: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  step: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stepNo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: { backgroundColor: colors.successSoft },
  stepNoText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  stepNoTextDone: { color: colors.success },
  stepTitle: { fontSize: 13.5, fontWeight: '800', color: colors.text, marginBottom: 4 },
});
