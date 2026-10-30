// HR panel: staff directory and profile, hiring, enrollment, ID cards (M-09).
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import {
  Briefcase,
  Download,
  FileText,
  IdCard,
  LogOut,
  Plus,
  Printer,
  Upload,
  UserCheck,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chips,
  Field,
  InfoBanner,
  ListRow,
  QRCode,
  Screen,
  Toggle,
  toast,
} from '../../../components/ui';
import {
  FormSheet,
  KV,
  ListScreen,
  PickerField,
} from '../../../components/admin';
import { BottomSheet } from '../../../components/Tabs';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import {
  CAMPUSES,
  campusName,
  logAudit,
  SUBJECTS,
  useReadOnly,
} from '../../../data/admin';
import {
  Applicant,
  HrStaff,
  nextEmployeeId,
  normCnic,
  validCnic,
} from '../../../data/admin-hr';
import { MultiChips, Note, toNumber, ws } from '../accounts/widgets';
import { useApplicants, useHrStaff, useOpenings } from './state';

const DEPARTMENTS = ['Academics', 'Accounts', 'Front Desk', 'Transport', 'Library', 'Administration'];
const TYPES: Array<HrStaff['type']> = ['Permanent', 'Contract', 'Visiting'];
const CLASS_SECTIONS = ['3-B', '5-A', '5-B', '6-A', '7-B', '8-A', '9-A', '10-A'];
const LOGIN_ROLES = ['No login', 'Teacher Portal', 'Admin Panel · Accounts', 'Admin Panel · Front Desk', 'Admin Panel · HR', 'Admin Panel · Exam', 'Admin Panel · Transport', 'Admin Panel · Store', 'Admin Panel · Library'];
const DATES = ['1 Nov 2026', '15 Nov 2026', '1 Dec 2026', '31 Dec 2026', '31 Jan 2027', '28 Feb 2027', '31 Mar 2027', '30 Jun 2027'];

function statusTone(s: HrStaff['status']) {
  return s === 'Active' ? 'success' : s === 'Left' ? 'neutral' : 'warn';
}

// ---------- Directory ----------

export function AdminStaffDirectory(_: ScreenProps) {
  const nav = useNav();
  const [staff] = useHrStaff();
  const contracts = staff.filter(s => s.contractEnd && s.status !== 'Left').length;
  const probation = staff.filter(s => s.status === 'On probation').length;
  return (
    <ListScreen
      title="Staff directory"
      subtitle={`${staff.filter(s => s.status !== 'Left').length} active staff`}
      items={staff}
      keyOf={s => s.id}
      searchText={s => `${s.name} ${s.id} ${s.cnic} ${s.mobile} ${s.designation}`}
      filters={[
        { label: 'Department', options: ['All', ...Array.from(new Set(staff.map(s => s.department)))], get: s => s.department },
        { label: 'Campus', options: ['All', ...CAMPUSES.map(c => c.name)], get: s => campusName(s.campus) },
        { label: 'Type', options: ['All', ...TYPES], get: s => s.type },
        { label: 'Status', options: ['All', 'Active', 'On probation', 'Left'], get: s => s.status },
      ]}
      onAdd={() => nav.push('AdminStaffEnroll')}
      addLabel="Add employee"
      header={
        contracts || probation ? (
          <InfoBanner tone="warn" text={`Reminders: ${contracts} contract(s) end on record and ${probation} probation(s) are running.`} />
        ) : null
      }
      renderItem={(s, last) => (
        <ListRow
          avatar={s.name}
          title={s.name}
          subtitle={`${s.id} · ${s.designation} · ${campusName(s.campus)}${s.contractEnd ? ` · contract ends ${s.contractEnd}` : ''}`}
          right={<Badge label={s.status} tone={statusTone(s.status)} />}
          onPress={() => nav.push('AdminStaffProfile', { id: s.id })}
          last={last}
        />
      )}
    />
  );
}

// ---------- Profile ----------

const TABS = ['Personal', 'Job', 'Qualification', 'Salary', 'Documents', 'Leave'];

export function AdminStaffProfile(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const id = useParam('id', 'EMP-0001');
  const [staff, setStaff] = useHrStaff();
  const [tab, setTab] = useState(TABS[0]);
  const s = staff.find(x => x.id === id);
  if (!s) {
    return (
      <Screen title="Staff profile">
        <InfoBanner tone="warn" text={`No staff member with ID ${id}.`} />
      </Screen>
    );
  }
  const allowances = s.allowances.reduce((a, x) => a + x.amount, 0);
  const deductions = s.deductions.reduce((a, x) => a + x.amount, 0);
  return (
    <Screen title={s.name} subtitle={`${s.id} · ${s.designation}`}>
      <Card style={ws.center}>
        <Avatar name={s.name} size={60} ring />
        <Text style={ws.title}>{s.name}</Text>
        <Text style={ws.small}>{s.department} · {campusName(s.campus)} · {s.type}</Text>
        <Badge label={s.status} tone={statusTone(s.status)} />
      </Card>
      <Chips options={TABS} value={tab} onChange={setTab} />
      {tab === 'Personal' ? (
        <Card>
          <KV k="CNIC" v={s.cnic} />
          <KV k="Mobile" v={s.mobile} />
          <KV k="Emergency contact" v={s.emergency} last />
        </Card>
      ) : null}
      {tab === 'Job' ? (
        <Card>
          <KV k="Employee ID" v={s.id} />
          <KV k="Designation" v={s.designation} />
          <KV k="Department" v={s.department} />
          <KV k="Campus" v={campusName(s.campus)} />
          <KV k="Joining date" v={s.joined} />
          <KV k="Employment type" v={s.type} />
          <KV k="Probation ends" v={s.probationEnd ?? '—'} />
          <KV k="Contract ends" v={s.contractEnd ?? '—'} />
          <KV k="Subjects" v={s.subjects ?? '—'} />
          <KV k="Classes" v={s.classes ?? '—'} />
          <KV k="Login" v={s.login ?? 'No login'} last />
        </Card>
      ) : null}
      {tab === 'Qualification' ? (
        <Card>
          <KV k="Qualification" v={s.qualification} />
          <KV k="Experience" v={s.experience} last />
        </Card>
      ) : null}
      {tab === 'Salary' ? (
        <Card>
          <KV k="Basic salary" v={`Rs. ${s.salary.toLocaleString('en-US')}`} />
          {s.allowances.map(a => <KV key={a.name} k={a.name} v={`Rs. ${a.amount.toLocaleString('en-US')}`} />)}
          {s.deductions.map(d => <KV key={d.name} k={d.name} v={`- Rs. ${d.amount.toLocaleString('en-US')}`} />)}
          <KV k="Loan" v={s.loan ? `Rs. ${s.loan.amount.toLocaleString('en-US')} · ${s.loan.paid}/${s.loan.installments} paid` : 'None'} />
          <KV k="Net before attendance" v={`Rs. ${(s.salary + allowances - deductions).toLocaleString('en-US')}`} last />
          {s.increments.map(inc => <Note key={inc.date + inc.to}>Increment {inc.date}: Rs. {inc.from.toLocaleString('en-US')} → Rs. {inc.to.toLocaleString('en-US')} ({inc.note})</Note>)}
        </Card>
      ) : null}
      {tab === 'Documents' ? (
        <>
          <Card>
            {s.docs.map((d, i) => (
              <ListRow key={`${d}-${i}`} icon={FileText} title={d} right={<Download size={18} color="#141210" />} onPress={() => toast(`${d} (demo)`)} last={i === s.docs.length - 1} />
            ))}
          </Card>
          <Button
            label="Upload document"
            icon={Upload}
            variant="outline"
            disabled={ro}
            onPress={() => {
              const name = `Document ${s.docs.length + 1}.pdf`;
              setStaff(prev => prev.map(x => (x.id === s.id ? { ...x, docs: [...x.docs, name] } : x)));
              logAudit('Staff document', `${s.name}: uploaded ${name}`);
            }}
          />
        </>
      ) : null}
      {tab === 'Leave' ? (
        <Card>
          {(Object.keys(s.leave) as Array<keyof HrStaff['leave']>).map((k, i, arr) => (
            <KV key={k} k={k} v={k === 'Unpaid' ? `${s.leave[k].used} taken` : `${s.leave[k].total - s.leave[k].used} of ${s.leave[k].total} left`} last={i === arr.length - 1} />
          ))}
        </Card>
      ) : null}
      <View style={ws.buttons}>
        <Button label="ID card" icon={IdCard} variant="outline" style={ws.flex} onPress={() => nav.push('AdminStaffIdCards')} />
        <Button label="Exit" icon={LogOut} variant="outline" style={ws.flex} onPress={() => nav.push('AdminExitClearance')} />
      </View>
    </Screen>
  );
}

// ---------- Hiring ----------

const STAGES: Array<Applicant['stage']> = ['Applied', 'Interview', 'Demo class', 'Offered', 'Hired', 'Rejected'];

export function AdminHiring(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [openings, setOpenings] = useOpenings();
  const [applicants, setApplicants] = useApplicants();
  const [sel, setSel] = useState<Applicant | null>(null);
  const [interview, setInterview] = useState('');
  const [demo, setDemo] = useState('');
  const [opOpen, setOpOpen] = useState(false);
  const [opTitle, setOpTitle] = useState('');
  const [opCampus, setOpCampus] = useState(CAMPUSES[0].name);
  const [opCount, setOpCount] = useState('1');
  const [apOpen, setApOpen] = useState(false);
  const [apName, setApName] = useState('');
  const [apCnic, setApCnic] = useState('');
  const [apMobile, setApMobile] = useState('');
  const [apOpening, setApOpening] = useState(openings[0]?.title ?? '');
  const [apQual, setApQual] = useState('');

  const titleOf = (opId: string) => openings.find(o => o.id === opId)?.title ?? opId;

  const update = (patch: Partial<Applicant>, note: string) => {
    if (!sel) {
      return;
    }
    const next = { ...sel, ...patch };
    setApplicants(prev => prev.map(a => (a.id === sel.id ? next : a)));
    setSel(next);
    logAudit('Hiring', `${sel.name}: ${note}`);
  };

  const addOpening = () => {
    if (!opTitle.trim() || !(toNumber(opCount) > 0)) {
      toast('Enter the title and number of positions');
      return;
    }
    setOpenings(prev => [...prev, { id: `op${prev.length + 1}`, title: opTitle.trim(), campus: CAMPUSES.find(c => c.name === opCampus)?.id ?? 'main', positions: toNumber(opCount), closes: '30 Nov', status: 'Open' }]);
    logAudit('Hiring', `Opening added: ${opTitle.trim()}`);
    setOpOpen(false);
    setOpTitle('');
  };

  const addApplicant = () => {
    if (!apName.trim() || !validCnic(apCnic)) {
      toast('Enter the name and a valid CNIC (35202-1234567-1)');
      return;
    }
    const op = openings.find(o => o.title === apOpening);
    setApplicants(prev => [...prev, { id: `apl${prev.length + 1}`, name: apName.trim(), opening: op?.id ?? 'op1', cnic: apCnic.trim(), mobile: apMobile.trim(), qualification: apQual.trim() || '—', experience: '—', stage: 'Applied' }]);
    logAudit('Hiring', `Applicant added: ${apName.trim()}`);
    setApOpen(false);
    setApName('');
    setApCnic('');
    setApMobile('');
    setApQual('');
  };

  return (
    <>
      <ListScreen
        title="Hiring"
        subtitle="Openings, applicants, interviews and offers"
        items={applicants}
        keyOf={a => a.id}
        searchText={a => `${a.name} ${a.cnic} ${titleOf(a.opening)}`}
        filters={[
          { label: 'Stage', options: ['All', ...STAGES], get: a => a.stage },
          { label: 'Opening', options: ['All', ...openings.map(o => o.title)], get: a => titleOf(a.opening) },
        ]}
        onAdd={ro ? undefined : () => setApOpen(true)}
        addLabel="Add applicant"
        header={
          <>
            <Card title="Openings">
              {openings.map((o, i) => (
                <ListRow
                  key={o.id}
                  icon={Briefcase}
                  title={o.title}
                  subtitle={`${campusName(o.campus)} · ${o.positions} position(s) · closes ${o.closes} · ${applicants.filter(a => a.opening === o.id).length} applicants`}
                  right={<Badge label={o.status} tone={o.status === 'Open' ? 'success' : 'neutral'} />}
                  last={i === openings.length - 1}
                />
              ))}
            </Card>
            <Button label="Add opening" icon={Plus} variant="outline" onPress={() => setOpOpen(true)} disabled={ro} />
          </>
        }
        renderItem={(a, last) => (
          <ListRow
            avatar={a.name}
            title={a.name}
            subtitle={`${titleOf(a.opening)} · ${a.qualification} · ${a.experience}`}
            right={<Badge label={a.stage} tone={a.stage === 'Hired' ? 'success' : a.stage === 'Rejected' ? 'danger' : a.stage === 'Offered' ? 'info' : 'warn'} />}
            onPress={() => {
              setSel(a);
              setInterview(a.interview ?? '');
              setDemo(a.demo ?? '');
            }}
            last={last}
          />
        )}
      />
      <BottomSheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View>
            <Text style={ws.title}>{sel.name}</Text>
            <Text style={ws.small}>{titleOf(sel.opening)} · {sel.cnic} · {sel.mobile}</Text>
            <View style={ws.gap} />
            <Chips options={STAGES} value={sel.stage} onChange={v => update({ stage: v as Applicant['stage'] }, `stage → ${v}`)} />
            <View style={ws.gap} />
            <Field label="Interview remarks" value={interview} onChangeText={setInterview} />
            <Field label="Demo class remarks" value={demo} onChangeText={setDemo} />
            <View style={ws.gap} />
            <View style={ws.buttons}>
              <Button label="Save remarks" variant="outline" style={ws.flex} onPress={() => update({ interview, demo }, 'remarks updated')} />
              <Button
                label="Offer letter"
                icon={FileText}
                variant="outline"
                style={ws.flex}
                onPress={() => {
                  update({ stage: 'Offered' }, 'offer letter issued');
                  toast('Offer letter PDF ready (demo)');
                }}
              />
            </View>
            <View style={ws.gap} />
            <Button
              label="Convert to employee"
              icon={UserCheck}
              onPress={() => {
                const a = sel;
                update({ stage: 'Hired' }, 'converted to employee');
                setSel(null);
                nav.push('AdminStaffEnroll', { applicantId: a.id });
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
      <FormSheet visible={opOpen} onClose={() => setOpOpen(false)} title="New opening" onSubmit={addOpening}>
        <Field label="Title" value={opTitle} onChangeText={setOpTitle} />
        <PickerField label="Campus" value={opCampus} options={CAMPUSES.map(c => c.name)} onChange={setOpCampus} />
        <Field label="Positions" value={opCount} onChangeText={setOpCount} keyboardType="number-pad" />
      </FormSheet>
      <FormSheet visible={apOpen} onClose={() => setApOpen(false)} title="New applicant" onSubmit={addApplicant}>
        <Field label="Name" value={apName} onChangeText={setApName} />
        <Field label="CNIC" value={apCnic} onChangeText={setApCnic} placeholder="35202-1234567-1" />
        <Field label="Mobile" value={apMobile} onChangeText={setApMobile} keyboardType="phone-pad" />
        <PickerField label="Opening" value={apOpening} options={openings.map(o => o.title)} onChange={setApOpening} />
        <Field label="Qualification" value={apQual} onChangeText={setApQual} />
      </FormSheet>
    </>
  );
}

// ---------- Enrollment ----------

export function AdminStaffEnroll(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const applicantId = useParam('applicantId', '');
  const [staff, setStaff] = useHrStaff();
  const [applicants] = useApplicants();
  const [openings] = useOpenings();
  const applicant = applicants.find(a => a.id === applicantId);
  const opening = openings.find(o => o.id === applicant?.opening);
  const newId = nextEmployeeId(staff.map(s => s.id));
  const [name, setName] = useState(applicant?.name ?? '');
  const [cnic, setCnic] = useState(applicant?.cnic ?? '');
  const [mobile, setMobile] = useState(applicant?.mobile ?? '');
  const [emergency, setEmergency] = useState('');
  const [qualification, setQualification] = useState(applicant?.qualification ?? '');
  const [designation, setDesignation] = useState(opening?.title.split(' (')[0] ?? 'Teacher');
  const [department, setDepartment] = useState(opening?.title.includes('Accountant') ? 'Accounts' : 'Academics');
  const [campus, setCampus] = useState(campusName(opening?.campus ?? 'main'));
  const [joined, setJoined] = useState(DATES[0]);
  const [type, setType] = useState<HrStaff['type']>('Permanent');
  const [probation, setProbation] = useState(DATES[4]);
  const [contractEnd, setContractEnd] = useState(DATES[7]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [salary, setSalary] = useState('');
  const [login, setLogin] = useState(department === 'Academics' ? 'Teacher Portal' : 'No login');

  const save = () => {
    if (ro) {
      toast('Closed session: read-only');
      return;
    }
    if (!name.trim()) {
      toast('Enter the name');
      return;
    }
    if (!validCnic(cnic)) {
      toast('Enter a valid CNIC (35202-1234567-1)');
      return;
    }
    if (staff.some(s => normCnic(s.cnic) === normCnic(cnic))) {
      toast('This CNIC already belongs to an employee. CNIC must be unique.');
      return;
    }
    if (!mobile.trim()) {
      toast('Enter the mobile number');
      return;
    }
    const basic = toNumber(salary);
    if (!(basic > 0)) {
      toast('Enter the basic salary');
      return;
    }
    const s: HrStaff = {
      id: newId,
      name: name.trim(),
      designation,
      department,
      campus: CAMPUSES.find(c => c.name === campus)?.id ?? 'main',
      cnic: cnic.trim(),
      mobile: mobile.trim(),
      joined,
      type,
      salary: basic,
      status: 'On probation',
      contractEnd: type === 'Permanent' ? undefined : contractEnd,
      subjects: subjects.join(', ') || undefined,
      emergency: emergency.trim() || '—',
      qualification: qualification.trim() || '—',
      experience: applicant?.experience ?? '—',
      probationEnd: probation,
      classes: classes.join(', ') || undefined,
      login: login === 'No login' ? undefined : login,
      docs: ['CNIC copy'],
      allowances: [{ name: 'House rent allowance', amount: Math.round(basic * 0.1) }],
      deductions: [{ name: 'EOBI', amount: 370 }],
      increments: [],
      leave: {
        Casual: { total: 10, used: 0 },
        Sick: { total: 8, used: 0 },
        Annual: { total: 14, used: 0 },
        Maternity: { total: 90, used: 0 },
        Unpaid: { total: 0, used: 0 },
      },
      bankAccount: undefined,
    };
    setStaff(prev => [...prev, s]);
    logAudit('Staff enrollment', `${s.id} ${s.name} · ${designation} · ${campus}${s.login ? ` · login created: ${s.login}` : ''}`);
    toast(`${s.id} created${s.login ? `; ${s.login} login sent by SMS` : ''}`);
    nav.replace('AdminStaffProfile', { id: s.id });
  };

  return (
    <Screen title="Staff enrollment" subtitle={`New employee ID ${newId} (auto)`} footer={<Button label="Save employee" onPress={save} disabled={ro} />}>
      {applicant ? <InfoBanner tone="success" text={`Prefilled from applicant ${applicant.name}.`} /> : null}
      <Field label="Full name" value={name} onChangeText={setName} />
      <Field label="CNIC (unique)" value={cnic} onChangeText={setCnic} placeholder="35202-1234567-1" />
      <Field label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      <Field label="Emergency contact" value={emergency} onChangeText={setEmergency} />
      <Field label="Qualification" value={qualification} onChangeText={setQualification} />
      <Field label="Designation" value={designation} onChangeText={setDesignation} />
      <PickerField label="Department" value={department} options={DEPARTMENTS} onChange={setDepartment} />
      <PickerField label="Campus" value={campus} options={CAMPUSES.map(c => c.name)} onChange={setCampus} />
      <PickerField label="Joining date" value={joined} options={DATES} onChange={setJoined} />
      <Text style={ws.bold}>Employment type</Text>
      <Chips options={TYPES} value={type} onChange={v => setType(v as HrStaff['type'])} />
      <PickerField label="Probation ends (reminder)" value={probation} options={DATES} onChange={setProbation} />
      {type !== 'Permanent' ? <PickerField label="Contract ends (reminder)" value={contractEnd} options={DATES} onChange={setContractEnd} /> : null}
      {department === 'Academics' ? (
        <>
          <Text style={ws.bold}>Subjects (used by timetable and marks entry)</Text>
          <MultiChips options={SUBJECTS.map(s => s.name)} value={subjects} onChange={setSubjects} />
          <Text style={ws.bold}>Classes</Text>
          <MultiChips options={CLASS_SECTIONS} value={classes} onChange={setClasses} />
        </>
      ) : null}
      <Field label="Basic salary" value={salary} onChangeText={setSalary} keyboardType="number-pad" />
      <PickerField label="Create login" value={login} options={LOGIN_ROLES} onChange={setLogin} />
      <Note>Employee ID and CNIC are unique. A staff member who leaves is marked Left, never deleted.</Note>
    </Screen>
  );
}

// ---------- Staff ID cards ----------

export function AdminStaffIdCards(_: ScreenProps) {
  const [staff] = useHrStaff();
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<HrStaff | null>(null);
  const active = staff.filter(s => s.status !== 'Left');
  return (
    <>
      <ListScreen
        title="Staff ID cards"
        subtitle="Bulk print with photo and QR"
        items={active}
        keyOf={s => s.id}
        searchText={s => `${s.name} ${s.id} ${s.designation}`}
        filters={[{ label: 'Campus', options: ['All', ...CAMPUSES.map(c => c.name)], get: s => campusName(s.campus) }]}
        header={
          <View style={ws.buttons}>
            <Button label={selected.length === active.length ? 'Clear' : 'Select all'} variant="outline" style={ws.flex} onPress={() => setSelected(selected.length === active.length ? [] : active.map(s => s.id))} />
            <Button
              label={`Print (${selected.length})`}
              icon={Printer}
              style={ws.flex}
              onPress={() => {
                if (!selected.length) {
                  toast('Select staff to print');
                  return;
                }
                logAudit('Staff ID cards', `Printed ${selected.length} ID cards`);
                toast(`${selected.length} ID cards sent to printer (demo)`);
              }}
            />
          </View>
        }
        renderItem={(s, last) => (
          <ListRow
            avatar={s.name}
            title={s.name}
            subtitle={`${s.id} · ${s.designation}`}
            right={<Toggle value={selected.includes(s.id)} onChange={on => setSelected(p => (on ? [...p, s.id] : p.filter(x => x !== s.id)))} />}
            onPress={() => setPreview(s)}
            last={last}
          />
        )}
      />
      <BottomSheet visible={!!preview} onClose={() => setPreview(null)}>
        {preview ? (
          <View style={ws.idCard}>
            <View style={ws.idBand}>
              <Text style={ws.bold}>Bright Future School · Staff</Text>
            </View>
            <Avatar name={preview.name} size={72} ring />
            <Text style={ws.title}>{preview.name}</Text>
            <Text style={ws.small}>{preview.designation} · {campusName(preview.campus)}</Text>
            <QRCode value={preview.id} size={110} />
            <Text style={ws.small}>{preview.id} · valid till 31 Mar 2027</Text>
            <Button label="Print this card" icon={Printer} onPress={() => { logAudit('Staff ID cards', `Printed ${preview.id}`); toast('Sent to printer (demo)'); }} />
          </View>
        ) : null}
      </BottomSheet>
    </>
  );
}
