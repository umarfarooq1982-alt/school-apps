// Front Desk: inquiries CRM (S-03), registration, entry test and admission (M-02).
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BellRing,
  ChartColumn,
  ClipboardCheck,
  KeyRound,
  Printer,
  Receipt,
  ShieldCheck,
  UserCheck,
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
import { colors, radius } from '../../../theme';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import {
  CLASSES,
  SECTIONS,
  campusName,
  logAudit,
  requestApproval,
  useApprovals,
  useRules,
  useStaffRole,
} from '../../../data/admin';
import {
  ADMISSION_FEE,
  Decision,
  FOLLOW_UP_DATES,
  FRONT_STAFF,
  INQUIRY_STATUSES,
  Inquiry,
  InquirySource,
  InquiryStatus,
  REG_FEE,
  Registration,
  SOURCES,
  TEST_MAX,
  TEST_SUBJECTS,
  campusIdByName,
  campusOptions,
  findDuplicate,
  meritList,
  nextGr,
  nextRegNo,
  siblingsOf,
  testTotal,
  useInquiries,
  useRegistrations,
  useTests,
} from '../../../data/admin-frontdesk';
import { ReadOnlyBanner, isNum, statusTone, useGuard } from './util';

const cnicOk = (v: string) => v.replace(/\D/g, '').length === 13;

// ---------- Inquiries (S-03) ----------

export function AdminInquiries(_: ScreenProps) {
  const nav = useNav();
  const { guard } = useGuard();
  const [items, setItems] = useInquiries();
  const [adding, setAdding] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({
    child: '',
    parent: '',
    mobile: '',
    cls: 'Class 1',
    source: 'Walk-in' as InquirySource,
    followUp: 'Tomorrow',
    assigned: FRONT_STAFF[0],
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
    const id = `inq${Date.now()}`;
    setItems(list => [{ id, ...form, status: 'New', notes: '' }, ...list]);
    logAudit('Inquiry', `New inquiry: ${form.child} (${form.source}, ${form.cls})`);
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
      header={
        <>
          <ReadOnlyBanner />
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
            <PickerField label="Class" value={form.cls} options={CLASSES} onChange={v => setForm(f => ({ ...f, cls: v }))} />
            <Text style={adminStyles.section}>Source</Text>
            <Chips options={SOURCES} value={form.source} onChange={v => setForm(f => ({ ...f, source: v as InquirySource }))} />
            <PickerField label="Follow-up date" value={form.followUp} options={FOLLOW_UP_DATES} onChange={v => setForm(f => ({ ...f, followUp: v }))} />
            <PickerField label="Assigned to" value={form.assigned} options={FRONT_STAFF} onChange={v => setForm(f => ({ ...f, assigned: v }))} />
          </FormSheet>
          <BottomSheet visible={!!selected} onClose={() => setSel(null)}>
            {selected ? (
              <View style={s.gap}>
                <Text style={s.sheetTitle}>{selected.child}</Text>
                <Card>
                  <KV k="Parent" v={selected.parent} />
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
                  options={FRONT_STAFF}
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
          subtitle={`${i.cls} · ${i.parent} · ${i.mobile}\n${i.source} · follow-up ${i.followUp} · ${i.assigned}`}
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
  const [regs] = useRegistrations();
  return (
    <ListScreen
      title="Registration"
      subtitle={`Registration fee ${formatRs(REG_FEE)}`}
      items={regs}
      keyOf={r => r.regNo}
      searchText={r => `${r.regNo} ${r.name} ${r.father} ${r.fatherCnic} ${r.bForm}`}
      filters={[
        { label: 'Class', options: ['All classes', ...CLASSES], get: r => r.cls },
        { label: 'Fee', options: ['All', 'Fee paid', 'Fee due'], get: r => (r.feePaid ? 'Fee paid' : 'Fee due') },
      ]}
      onAdd={guard(() => nav.push('AdminRegistrationForm'))}
      addLabel="New registration"
      header={<ReadOnlyBanner />}
      renderItem={(r, last) => (
        <ListRow
          icon={ClipboardCheck}
          title={`${r.name} · ${r.cls}`}
          subtitle={`${r.regNo} · Father ${r.father} · ${r.fatherCnic}`}
          right={<Badge label={r.feePaid ? 'Fee paid' : 'Fee due'} tone={r.feePaid ? 'success' : 'danger'} />}
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
  const [regs, setRegs] = useRegistrations();
  const [, setInquiries] = useInquiries();
  const fromInquiry = useParam<string>('fromInquiry', '');
  const [f, setF] = useState({
    name: useParam('name', ''),
    gender: 'M' as 'M' | 'F',
    dob: '',
    bForm: '',
    father: useParam('father', ''),
    fatherCnic: '',
    mobile: useParam('mobile', ''),
    prevSchool: '',
    cls: useParam('cls', 'Class 1'),
    campus: campusOptions[0],
    feePaid: true,
    mode: 'Cash',
  });
  const set = (k: keyof typeof f) => (v: string | boolean) => setF(p => ({ ...p, [k]: v }));
  const dup = findDuplicate(regs, f.name, f.bForm, f.fatherCnic);

  const save = () => {
    if (!f.name.trim() || !f.father.trim() || !f.dob.trim() || !f.prevSchool.trim()) {
      toast('Fill in student name, date of birth, father name and previous school');
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
    const regNo = nextRegNo();
    const reg: Registration = {
      regNo,
      name: f.name.trim(),
      gender: f.gender,
      dob: f.dob.trim(),
      bForm: f.bForm,
      father: f.father.trim(),
      fatherCnic: f.fatherCnic,
      mobile: f.mobile,
      prevSchool: f.prevSchool.trim(),
      cls: f.cls,
      campus: campusIdByName(f.campus),
      feePaid: f.feePaid,
      decision: 'Pending',
    };
    setRegs(list => [reg, ...list]);
    if (fromInquiry) {
      setInquiries(list => list.map(i => (i.id === fromInquiry ? { ...i, status: 'Registered' } : i)));
    }
    logAudit('Registration', `${regNo}: ${reg.name}, ${reg.cls}${f.feePaid ? `, fee ${formatRs(REG_FEE)} by ${f.mode}` : ', fee due'}`);
    toast(`Registered as ${regNo}`);
    nav.replace('AdminRegistrationSlip', { regNo });
  };

  return (
    <Screen
      title="Registration form"
      subtitle={fromInquiry ? 'Converted from inquiry · details filled in' : 'Front desk or public online form'}
      footer={<Button label="Save and print slip" icon={Printer} onPress={guard(save)} />}
    >
      <ReadOnlyBanner />
      <Text style={adminStyles.section}>Student</Text>
      <Field label="Student name" value={f.name} onChangeText={set('name')} />
      <Chips options={['M', 'F']} value={f.gender} onChange={set('gender')} />
      <Field label="Date of birth" value={f.dob} onChangeText={set('dob')} placeholder="e.g. 14 Mar 2018" />
      <Field label="B-Form number" value={f.bForm} onChangeText={set('bForm')} keyboardType="numbers-and-punctuation" placeholder="35202-1234567-1" />
      <Text style={adminStyles.section}>Guardian</Text>
      <Field label="Father name" value={f.father} onChangeText={set('father')} />
      <Field label="Father CNIC" value={f.fatherCnic} onChangeText={set('fatherCnic')} keyboardType="numbers-and-punctuation" placeholder="35202-1234567-1" />
      <Field label="Mobile" value={f.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" />
      <Text style={adminStyles.section}>School</Text>
      <Field label="Previous school" value={f.prevSchool} onChangeText={set('prevSchool')} />
      <PickerField label="Class applied for" value={f.cls} options={CLASSES} onChange={set('cls')} />
      <PickerField label="Campus" value={f.campus} options={campusOptions} onChange={set('campus')} />
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
            <Text style={adminStyles.bold}>Registration fee {formatRs(REG_FEE)}</Text>
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
  const [regs, setRegs] = useRegistrations();
  const [tests] = useTests();
  const { guard } = useGuard();
  const regNo = useParam('regNo', regs[0]?.regNo ?? '');
  const r = regs.find(x => x.regNo === regNo) ?? regs[0];
  if (!r) {
    return <Screen title="Registration slip" />;
  }
  const test = tests.find(t => t.cls === r.cls);
  return (
    <Screen
      title="Registration slip"
      subtitle={r.regNo}
      footer={
        <>
          {r.feePaid ? null : (
            <Button
              label={`Collect fee ${formatRs(REG_FEE)}`}
              icon={Receipt}
              onPress={guard(() => {
                setRegs(list => list.map(x => (x.regNo === r.regNo ? { ...x, feePaid: true } : x)));
                logAudit('Registration fee', `${r.regNo}: ${formatRs(REG_FEE)} collected`);
                toast('Fee collected. Receipt printed (demo).');
              })}
            />
          )}
          <Button label="Print slip" icon={Printer} variant="outline" onPress={() => toast('Registration slip sent to printer (demo)')} />
        </>
      }
    >
      <Card>
        <View style={s.slipHead}>
          <View style={s.flex}>
            <Text style={s.slipNo}>{r.regNo}</Text>
            <Text style={adminStyles.small}>Bright Future School · {campusName(r.campus)}</Text>
          </View>
          <QRCode value={r.regNo} size={72} />
        </View>
        <KV k="Student" v={`${r.name} (${r.gender})`} />
        <KV k="Date of birth" v={r.dob} />
        <KV k="B-Form" v={r.bForm} />
        <KV k="Father" v={`${r.father} · ${r.fatherCnic}`} />
        <KV k="Mobile" v={r.mobile} />
        <KV k="Previous school" v={r.prevSchool} />
        <KV k="Class applied" v={r.cls} />
        <KV k="Registration fee" v={<Badge label={r.feePaid ? 'Paid' : 'Due'} tone={r.feePaid ? 'success' : 'danger'} />} />
        <KV k="Entry test" v={test ? `${test.date} · ${test.time} · ${test.room}` : 'Date to be announced'} last />
      </Card>
      <InfoBanner text="Bring this slip and the child's B-Form to the entry test." />
    </Screen>
  );
}

// ---------- Entry test ----------

export function AdminEntryTest(_: ScreenProps) {
  const { guard } = useGuard();
  const [tab, setTab] = useState('Schedule');
  const [tests, setTests] = useTests();
  const [regs, setRegs] = useRegistrations();
  const classes = Array.from(new Set(tests.map(t => t.cls)));
  const [cls, setCls] = useState(classes[0] ?? 'Class 3');
  const [adding, setAdding] = useState(false);
  const [nt, setNt] = useState({ cls: 'Class 2', date: 'Sat 31 Oct', time: '9:00 AM', room: 'Hall A' });
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [decideFor, setDecideFor] = useState<string | null>(null);

  const candidates = regs.filter(r => r.cls === cls && r.feePaid);
  const merit = meritList(candidates);
  const test = tests.find(t => t.cls === cls);

  const saveMarks = () => {
    let bad = false;
    const next = regs.map(r => {
      if (r.cls !== cls || !r.feePaid) {
        return r;
      }
      const d = draft[r.regNo];
      const marks: Record<string, number> = { ...(r.marks ?? {}) };
      if (d) {
        for (const sub of TEST_SUBJECTS) {
          const v = d[sub];
          if (v === undefined || v === '') {
            continue;
          }
          if (!isNum(v) || Number(v) > TEST_MAX) {
            bad = true;
          } else {
            marks[sub] = Number(v);
          }
        }
      }
      const done = TEST_SUBJECTS.every(sub => marks[sub] !== undefined);
      return {
        ...r,
        testId: test?.id ?? r.testId,
        marks: done ? marks : r.marks,
        interview: remarks[r.regNo] ?? r.interview,
      };
    });
    if (bad) {
      toast(`Marks must be numbers from 0 to ${TEST_MAX}`);
      return;
    }
    setRegs(next);
    logAudit('Entry test', `Marks saved for ${cls}`);
    toast('Marks and interview remarks saved');
  };

  const decide = (regNo: string, d: Decision) => {
    setRegs(list => list.map(r => (r.regNo === regNo ? { ...r, decision: d } : r)));
    logAudit('Entry test', `${regNo}: ${d}`);
    setDecideFor(null);
  };

  return (
    <Screen title="Entry test" subtitle="Schedule, admit slips, marks, merit list, interview">
      <ReadOnlyBanner />
      <Segmented options={['Schedule', 'Marks', 'Merit list']} value={tab} onChange={setTab} />
      {tab !== 'Schedule' ? (
        <PickerField label="Class" value={cls} options={classes} onChange={setCls} />
      ) : null}

      {tab === 'Schedule' ? (
        <>
          <Card title="Scheduled tests">
            {tests.map((t, i) => {
              const n = regs.filter(r => r.cls === t.cls && r.feePaid).length;
              return (
                <ListRow
                  key={t.id}
                  icon={ClipboardCheck}
                  title={`${t.cls} · ${t.date}`}
                  subtitle={`${t.time} · ${t.room} · ${n} candidates`}
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
          <FormSheet
            visible={adding}
            onClose={() => setAdding(false)}
            title="Schedule entry test"
            onSubmit={() => {
              if (tests.some(t => t.cls === nt.cls)) {
                toast(`${nt.cls} already has a test scheduled`);
                return;
              }
              setTests(list => [...list, { id: `t${Date.now()}`, ...nt, published: false }]);
              logAudit('Entry test', `Scheduled ${nt.cls} on ${nt.date} ${nt.time}`);
              setAdding(false);
              toast('Test scheduled');
            }}
          >
            <PickerField label="Class" value={nt.cls} options={CLASSES} onChange={v => setNt(p => ({ ...p, cls: v }))} />
            <PickerField label="Date" value={nt.date} options={['Sat 24 Oct', 'Sat 31 Oct', 'Sat 7 Nov', 'Sat 14 Nov']} onChange={v => setNt(p => ({ ...p, date: v }))} />
            <PickerField label="Time" value={nt.time} options={['9:00 AM', '11:00 AM', '1:00 PM']} onChange={v => setNt(p => ({ ...p, time: v }))} />
            <PickerField label="Room" value={nt.room} options={['Hall A', 'Room 4', 'Library']} onChange={v => setNt(p => ({ ...p, room: v }))} />
          </FormSheet>
        </>
      ) : null}

      {tab === 'Marks' ? (
        <>
          <InfoBanner text={`Each subject is out of ${TEST_MAX}. Only candidates with paid registration fee appear.`} />
          {candidates.map(r => (
            <Card key={r.regNo}>
              <Text style={adminStyles.bold}>{r.name}</Text>
              <Text style={adminStyles.small}>{r.regNo}</Text>
              <View style={s.marksRow}>
                {TEST_SUBJECTS.map(sub => {
                  const v = draft[r.regNo]?.[sub] ?? (r.marks?.[sub] !== undefined ? String(r.marks[sub]) : '');
                  const bad = v !== '' && (!isNum(v) || Number(v) > TEST_MAX);
                  return (
                    <View key={sub} style={s.flex}>
                      <Text style={s.markLabel}>{sub}</Text>
                      <TextInput
                        value={v}
                        onChangeText={x => setDraft(p => ({ ...p, [r.regNo]: { ...(p[r.regNo] ?? {}), [sub]: x } }))}
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
          {candidates.length ? <Button label="Save marks" onPress={guard(saveMarks)} /> : <InfoBanner text="No candidates for this class yet." />}
        </>
      ) : null}

      {tab === 'Merit list' ? (
        <>
          <Card title={`Merit list · ${cls}`}>
            {merit.length === 0 ? <Text style={adminStyles.small}>No marks entered yet.</Text> : null}
            {merit.map((m, i) => (
              <ListRow
                key={m.reg.regNo}
                title={`${m.rank}. ${m.reg.name}`}
                subtitle={`${m.total} / ${TEST_MAX * TEST_SUBJECTS.length} · ${Math.round((m.total / (TEST_MAX * TEST_SUBJECTS.length)) * 100)}%${m.reg.interview ? ` · ${m.reg.interview}` : ''}`}
                right={<Badge label={m.reg.decision} tone={statusTone(m.reg.decision)} />}
                onPress={() => setDecideFor(m.reg.regNo)}
                last={i === merit.length - 1}
              />
            ))}
          </Card>
          <Button
            label={test?.published ? 'Results published · resend SMS' : 'Publish results and send SMS / WhatsApp'}
            onPress={guard(() => {
              const decided = merit.filter(m => m.reg.decision !== 'Pending');
              if (!decided.length) {
                toast('Mark at least one candidate selected, waiting or rejected');
                return;
              }
              setTests(list => list.map(t => (t.cls === cls ? { ...t, published: true } : t)));
              logAudit('Entry test', `Results published for ${cls}`);
              toast(`Published on the public result page. SMS/WhatsApp sent to ${decided.length} parents (demo).`);
            })}
          />
          <BottomSheet visible={!!decideFor} onClose={() => setDecideFor(null)}>
            <Text style={s.sheetTitle}>Decision</Text>
            <Chips
              options={['Selected', 'Waiting', 'Rejected']}
              value={regs.find(r => r.regNo === decideFor)?.decision ?? 'Pending'}
              onChange={guard((v: string) => decideFor && decide(decideFor, v as Decision))}
            />
          </BottomSheet>
        </>
      ) : null}
    </Screen>
  );
}

// ---------- Admission ----------

export function AdminAdmission(_: ScreenProps) {
  const { guard } = useGuard();
  const [regs, setRegs] = useRegistrations();
  const [approvals, setApprovals] = useApprovals();
  const [rules] = useRules();
  const [role] = useStaffRole();
  const canApprove = role === 'owner' || role === 'principal';
  const [tab, setTab] = useState('In progress');
  const selected = regs.filter(r => r.decision === 'Selected');
  const list = selected.filter(r => (tab === 'Final' ? r.admission?.final : !r.admission?.final));

  const patch = (regNo: string, fn: (r: Registration) => Registration, detail: string) => {
    setRegs(all => all.map(r => (r.regNo === regNo ? fn(r) : r)));
    logAudit('Admission', detail);
  };
  const approvalOf = (r: Registration) => approvals.find(a => a.id === r.admission?.approvalId);

  const finalize = (r: Registration): Registration => {
    const a = r.admission;
    if (!a) {
      return r;
    }
    const ok =
      approvals.find(x => x.id === a.approvalId)?.status === 'Approved' &&
      !!a.gr &&
      !!a.logins &&
      (a.feePaid || !rules.admissionNeedsFee);
    return { ...r, admission: { ...a, final: ok } };
  };

  return (
    <Screen title="Admission" subtitle="Approval, section, GR No., fee voucher, portal logins">
      <ReadOnlyBanner />
      <Segmented options={['In progress', 'Final']} value={tab} onChange={setTab} />
      {rules.admissionNeedsFee ? (
        <InfoBanner text={`Admission becomes final only after the admission fee (${formatRs(ADMISSION_FEE)}) is paid.`} />
      ) : null}
      {list.length === 0 ? <InfoBanner text={tab === 'Final' ? 'No final admissions yet.' : 'No selected candidates waiting. Select candidates in Entry test.'} /> : null}
      {list.map(r => {
        const a = r.admission;
        const ap = approvalOf(r);
        const approved = ap?.status === 'Approved';
        const sibs = siblingsOf(r.fatherCnic);
        return (
          <Card key={r.regNo}>
            <View style={adminStyles.row}>
              <View style={s.flex}>
                <Text style={adminStyles.bold}>{r.name}</Text>
                <Text style={adminStyles.small}>{r.regNo} · {r.cls} · test {testTotal(r)}/{TEST_MAX * TEST_SUBJECTS.length}</Text>
              </View>
              <Badge label={a?.final ? 'Final' : approved ? 'Approved' : a ? 'Waiting approval' : 'Selected'} tone={a?.final ? 'success' : approved ? 'info' : 'warn'} />
            </View>

            <Step n={1} title="Principal approval" done={approved}>
              {!a ? (
                <Button
                  label="Send for approval"
                  icon={ShieldCheck}
                  variant="outline"
                  style={s.smallBtn}
                  onPress={guard(() => {
                    const id = requestApproval({ type: 'Admission', title: `Admission: ${r.name}, ${r.cls}`, sub: `${r.regNo} · test ${testTotal(r)}`, by: 'Front Desk' });
                    patch(r.regNo, x => ({ ...x, admission: { approvalId: id, section: 'A', feePaid: false, final: false } }), `${r.regNo} sent for approval`);
                  })}
                />
              ) : !approved && canApprove ? (
                <Button
                  label="Approve now"
                  icon={ShieldCheck}
                  variant="outline"
                  style={s.smallBtn}
                  onPress={guard(() => {
                    setApprovals(all => all.map(x => (x.id === a.approvalId ? { ...x, status: 'Approved' } : x)));
                    logAudit('Approval', `Admission approved: ${r.name}`);
                  })}
                />
              ) : (
                <Text style={adminStyles.small}>{ap ? ap.status : 'Not sent'}</Text>
              )}
            </Step>

            <Step n={2} title="Allot section" done={!!a?.gr}>
              <Chips
                options={SECTIONS}
                value={a?.section ?? 'A'}
                onChange={guard((v: string) => {
                  if (!a || a.gr) {
                    toast(a?.gr ? 'Section is fixed after the GR No. is generated' : 'Send for approval first');
                    return;
                  }
                  patch(r.regNo, x => ({ ...x, admission: { ...a, section: v } }), `${r.regNo}: section ${v}`);
                })}
              />
            </Step>

            <Step n={3} title="GR No., roll number and admission voucher" done={!!a?.gr}>
              {a?.gr ? (
                <Text style={adminStyles.small}>{a.gr} · Roll {a.roll} · voucher {a.feeVoucher}</Text>
              ) : (
                <Button
                  label="Generate"
                  variant="outline"
                  style={s.smallBtn}
                  onPress={guard(() => {
                    if (!a || !approved) {
                      toast('Principal approval is needed first');
                      return;
                    }
                    const gr = nextGr(r.campus);
                    const roll = 31 + regs.filter(x => x.cls === r.cls && x.admission?.gr).length;
                    const voucher = `V-26-ADM-${r.regNo.slice(-4)}`;
                    patch(r.regNo, x => ({ ...x, admission: { ...a, gr, roll, feeVoucher: voucher } }), `${r.name}: ${gr}, roll ${roll}, voucher ${voucher} ${formatRs(ADMISSION_FEE)}`);
                    toast(`${gr} generated. Admission voucher ${formatRs(ADMISSION_FEE)} created.`);
                  })}
                />
              )}
            </Step>

            <Step n={4} title={`Admission fee ${formatRs(ADMISSION_FEE)}`} done={!!a?.feePaid}>
              {a?.feePaid ? (
                <Text style={adminStyles.small}>Paid</Text>
              ) : (
                <Button
                  label="Mark paid"
                  icon={Receipt}
                  variant="outline"
                  style={s.smallBtn}
                  onPress={guard(() => {
                    if (!a?.gr) {
                      toast('Generate the admission voucher first');
                      return;
                    }
                    patch(r.regNo, x => ({ ...x, admission: { ...a, feePaid: true } }), `${a.feeVoucher} paid`);
                  })}
                />
              )}
            </Step>

            <Step n={5} title="Portal logins" done={!!a?.logins}>
              {a?.logins ? (
                <Text style={adminStyles.small}>
                  Parent: {a.logins.parent}{a.logins.siblings ? ` (linked to ${a.logins.siblings} sibling${a.logins.siblings > 1 ? 's' : ''})` : ''} · Student: {a.logins.student}
                </Text>
              ) : (
                <Button
                  label="Create logins"
                  icon={KeyRound}
                  variant="outline"
                  style={s.smallBtn}
                  onPress={guard(() => {
                    if (!a?.gr) {
                      toast('Generate the GR No. first');
                      return;
                    }
                    const logins = { parent: r.mobile, student: a.gr, siblings: sibs.length };
                    patch(r.regNo, x => ({ ...x, admission: { ...a, logins } }), `Logins created for ${r.name}`);
                    toast(sibs.length ? `Parent login linked to ${sibs.length} existing children by father CNIC` : 'Parent and student logins created. SMS sent (demo).');
                  })}
                />
              )}
            </Step>

            {a && !a.final ? (
              <Button
                label="Confirm admission"
                icon={UserCheck}
                style={s.mt}
                onPress={guard(() => {
                  const next = finalize(r);
                  if (!next.admission?.final) {
                    toast(
                      !approved
                        ? 'Waiting for Principal approval'
                        : !a.gr
                        ? 'Generate the GR No. first'
                        : !a.logins
                        ? 'Create portal logins first'
                        : 'Admission fee must be paid first',
                    );
                    return;
                  }
                  patch(r.regNo, () => next, `Admission final: ${r.name} ${a.gr}`);
                  toast('Admission confirmed');
                })}
              />
            ) : null}
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
