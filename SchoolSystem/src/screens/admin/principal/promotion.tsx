// S-04 Promotion wizard, section/campus transfer, school leaving, alumni.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ArrowLeftRight, Check, DoorOpen, GraduationCap, Users, X } from 'lucide-react-native';
import { Badge, Button, Card, formatRs as formatDue, InfoBanner, ListRow, Screen, Segmented, toast, Toggle } from '../../../components/ui';
import { adminStyles as a, KV, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps, useNav } from '../../../navigation';
import { useShared } from '../../../store';
import { ADMIN_STUDENTS, CAMPUSES, CLASSES, logAudit, requestApproval, useApprovals } from '../../../data/admin';
import { ALUMNI, Alumnus, PROMOTION_CANDIDATES } from '../../../data/admin-principal';
import { localId, ReadOnlyBanner, useGuard } from '../owner/shared';

export function AdminPromotion(_: ScreenProps) {
  const nav = useNav();
  const [alumni] = useAlumni();
  const items = [
    { route: 'AdminPromoWizard', icon: GraduationCap, title: 'Promotion wizard', sub: 'Year-end: promote or detain, map to new class, carry dues' },
    { route: 'AdminPromoTransfer', icon: ArrowLeftRight, title: 'Section and campus transfer', sub: 'With history and fee adjustment' },
    { route: 'AdminPromoLeaving', icon: DoorOpen, title: 'School leaving', sub: 'Clearance check, leaving certificate, status left' },
    { route: 'AdminPromoAlumni', icon: Users, title: 'Alumni', sub: `${alumni.length} passed-out and left students` },
  ];
  return (
    <Screen title="Promotion & transfer">
      <ReadOnlyBanner />
      <Card>
        {items.map((it, i) => (
          <ListRow key={it.route} icon={it.icon} title={it.title} subtitle={it.sub} onPress={() => nav.push(it.route)} chevron last={i === items.length - 1} />
        ))}
      </Card>
    </Screen>
  );
}

export const useAlumni = () => useShared<Alumnus[]>('admin.alumni', ALUMNI);

const STEPS = ['Class', 'Results', 'Decide', 'Map', 'Confirm'];

export function AdminPromoWizard(_: ScreenProps) {
  const { guard } = useGuard();
  const [, setAlumni] = useAlumni();
  const [done, setDone] = useShared<string[]>('admin.promoted', []);
  const [step, setStep] = useState(0);
  const [cls, setCls] = useState('Class 5');
  const [decide, setDecide] = useState<Record<string, boolean>>({});
  const [section, setSection] = useState('Same section');
  const list = PROMOTION_CANDIDATES(cls);
  const idx = CLASSES.indexOf(cls);
  const next = idx === CLASSES.length - 1 ? 'Passed out (alumni)' : CLASSES[idx + 1];
  const promote = (id: string, pass: boolean) => decide[id] ?? pass;
  const promoted = list.filter(s => promote(s.id, s.pass));
  const detained = list.filter(s => !promote(s.id, s.pass));
  const dues = list.reduce((n, s) => n + s.due, 0);
  const go = (n: number) => {
    if (n === 1 && done.includes(cls)) {
      toast(`${cls} is already promoted into 2027-28`);
      return;
    }
    if (n === 1 && !list.length) {
      toast('No active students in this class');
      return;
    }
    setStep(n);
  };
  const confirm = guard(() => {
    setDone(d => [...d, cls]);
    if (next.startsWith('Passed out')) {
      setAlumni(al => [...promoted.map(s => ({ id: localId('al'), name: s.name, batch: 'Matric 2027', status: 'Passed out' as const, contact: '—', now: '—' })), ...al]);
    }
    logAudit('Promotion', `${cls}: ${promoted.length} promoted to ${next} (${section}), ${detained.length} detained, dues Rs. ${dues.toLocaleString('en-US')} carried forward`);
    toast('Promotion done for session 2027-28');
    setStep(0);
    setDecide({});
  });
  return (
    <Screen
      title="Promotion wizard"
      subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
      footer={
        <View style={a.row}>
          {step > 0 ? <Button label="Back" variant="outline" onPress={() => setStep(step - 1)} style={a.flex} /> : null}
          {step < STEPS.length - 1 ? (
            <Button label="Next" onPress={() => go(step + 1)} style={a.flex} />
          ) : (
            <Button label="Confirm promotion" onPress={confirm} style={a.flex} />
          )}
        </View>
      }
    >
      <ReadOnlyBanner />
      <Segmented options={STEPS} value={STEPS[step]} onChange={v => go(STEPS.indexOf(v))} />
      {step === 0 ? (
        <>
          <PickerField label="Class" value={cls} options={CLASSES.slice(3)} onChange={v => { setCls(v); setDecide({}); }} />
          <Card>
            <KV k="From session" v="2026-27" />
            <KV k="Into session" v="2027-28" />
            <KV k="Active students" v={String(list.length)} />
            <KV k="Next class" v={next} last />
          </Card>
          {done.includes(cls) ? <InfoBanner tone="success" icon={Check} text={`${cls} is already promoted.`} /> : null}
        </>
      ) : null}
      {step === 1 ? (
        <Card title={`Final results · ${list.filter(s => s.pass).length} pass, ${list.filter(s => !s.pass).length} fail`}>
          {list.map((s, i) => (
            <ListRow key={s.id} avatar={s.name} title={s.name} subtitle={`${s.gr} · ${s.section} · ${s.result}%`} right={<Badge label={s.pass ? 'Pass' : 'Fail'} tone={s.pass ? 'success' : 'danger'} />} last={i === list.length - 1} />
          ))}
        </Card>
      ) : null}
      {step === 2 ? (
        <Card title={`${promoted.length} promote · ${detained.length} detain`}>
          {list.map((s, i) => (
            <ListRow
              key={s.id}
              title={s.name}
              subtitle={`${s.result}% · ${s.pass ? 'passed' : 'failed'}`}
              right={
                <View style={a.row}>
                  <Text style={a.small}>{promote(s.id, s.pass) ? 'Promote' : 'Detain'}</Text>
                  <Toggle value={promote(s.id, s.pass)} onChange={v => setDecide(d => ({ ...d, [s.id]: v }))} />
                </View>
              }
              last={i === list.length - 1}
            />
          ))}
        </Card>
      ) : null}
      {step === 3 ? (
        <>
          <Card>
            <KV k="Promoted students go to" v={next} />
            <KV k="Detained students stay in" v={cls} last />
          </Card>
          <PickerField label="New section" value={section} options={['Same section', 'A', 'B', 'C', 'Balance by merit']} onChange={setSection} />
        </>
      ) : null}
      {step === 4 ? (
        <Card title="Summary">
          <KV k="Promoted" v={`${promoted.length} → ${next}`} />
          <KV k="Detained" v={`${detained.length} stay in ${cls}`} />
          <KV k="Section" v={section} />
          <KV k="Dues carried forward" v={formatDue(dues)} last />
        </Card>
      ) : null}
    </Screen>
  );
}

type Move = { id: string; student: string; kind: 'Section' | 'Campus'; from: string; to: string; when: string; fee: string };

export function AdminPromoTransfer(_: ScreenProps) {
  const [list, setList] = useShared<Move[]>('admin.sectionMoves', [
    { id: 'mv1', student: 'Hira Saleem (GR-MC-0045)', kind: 'Section', from: 'Class 5-B', to: 'Class 5-A', when: '2 Oct', fee: 'No change' },
  ]);
  const { guard } = useGuard();
  const [kind, setKind] = useState<'Section' | 'Campus'>('Section');
  const [student, setStudent] = useState('');
  const [to, setTo] = useState('');
  const students = ADMIN_STUDENTS.filter(s => s.status === 'Active').slice(0, 30);
  const st = students.find(s => `${s.name} (${s.gr})` === student);
  const options = kind === 'Section'
    ? ['A', 'B', 'C'].filter(x => x !== st?.section).map(x => `${st?.className ?? 'Class'}-${x}`)
    : CAMPUSES.filter(c => c.id !== st?.campus).map(c => c.name);
  const save = guard(() => {
    if (!st || !to) {
      toast('Choose the student and where to move');
      return;
    }
    const from = kind === 'Section' ? `${st.className}-${st.section}` : CAMPUSES.find(c => c.id === st.campus)?.name ?? '';
    const fee = kind === 'Campus' ? 'Next voucher uses the new campus fee structure' : 'No change';
    setList(l => [{ id: localId('mv'), student, kind, from, to, when: 'Today', fee }, ...l]);
    logAudit('Transfer', `${student}: ${kind} ${from} → ${to}. ${fee}`);
    toast('Transfer saved with history');
    setStudent('');
    setTo('');
  });
  return (
    <ListScreen
      title="Section and campus transfer"
      items={list}
      keyOf={m => m.id}
      searchText={m => `${m.student} ${m.from} ${m.to}`}
      filters={[{ label: 'Type', options: ['All', 'Section', 'Campus'], get: m => m.kind }]}
      header={
        <>
          <ReadOnlyBanner />
          <Card title="New transfer">
            <Segmented options={['Section', 'Campus']} value={kind} onChange={v => { setKind(v as 'Section' | 'Campus'); setTo(''); }} />
            <View style={a.flex}>
              <PickerField label="Student" value={student} options={students.map(s => `${s.name} (${s.gr})`)} onChange={v => { setStudent(v); setTo(''); }} />
              <PickerField label={kind === 'Section' ? 'New section' : 'New campus'} value={to} options={options} onChange={setTo} />
            </View>
            <Button label="Transfer" icon={ArrowLeftRight} onPress={save} />
          </Card>
          <Text style={a.section}>History</Text>
        </>
      }
      renderItem={(m, last) => (
        <ListRow icon={ArrowLeftRight} title={m.student} subtitle={`${m.kind}: ${m.from} → ${m.to} · ${m.when}\nFee: ${m.fee}`} last={last} />
      )}
    />
  );
}

// Dummy clearance status for a student.
function clearance(id: string, due: number) {
  const n = Number(id.replace(/\D/g, '')) || 0;
  return [
    { what: 'Fee', ok: due === 0, note: due ? `${formatDue(due)} due` : 'No dues' },
    { what: 'Library', ok: n % 5 !== 0, note: n % 5 !== 0 ? 'No books issued' : '1 book not returned' },
    { what: 'Store', ok: n % 7 !== 0, note: n % 7 !== 0 ? 'No dues' : 'Uniform Rs. 1,200 unpaid' },
  ];
}

export function AdminPromoLeaving(_: ScreenProps) {
  const { guard } = useGuard();
  const [, setAlumni] = useAlumni();
  const [left, setLeft] = useShared<string[]>('admin.leftStudents', []);
  // studentId -> approval request id. Issuing with dues needs that request to
  // be Approved in the Approvals inbox (S-04).
  const [requested, setRequested] = useShared<Record<string, string>>('admin.leavingRequested', {});
  const [approvals] = useApprovals();
  const students = ADMIN_STUDENTS.filter(s => s.status === 'Active' && !left.includes(s.id)).slice(0, 30);
  const [pick, setPick] = useState(students[1] ? `${students[1].name} (${students[1].gr})` : '');
  const st = students.find(s => `${s.name} (${s.gr})` === pick);
  const checks = st ? clearance(st.id, st.due) : [];
  const clear = checks.every(c => c.ok);
  const request = st ? approvals.find(x => x.id === requested[st.id]) : undefined;
  const issue = guard(() => {
    if (!st) {
      toast('Choose a student');
      return;
    }
    if (!clear && request?.status !== 'Approved') {
      toast(
        request?.status === 'Pending'
          ? 'Waiting for approval in the Approvals inbox'
          : request?.status === 'Rejected'
          ? 'The request to issue with dues was rejected'
          : 'Clear the dues first, or ask for approval',
      );
      return;
    }
    setLeft(l => [...l, st.id]);
    setAlumni(al => [{ id: localId('al'), name: st.name, batch: `${st.className} · 2026`, status: 'Left', contact: st.mobile, now: '—' }, ...al]);
    logAudit('School leaving', `${st.name} (${st.gr}) left. Leaving certificate issued. Status set to Left.`);
    toast('Leaving certificate issued. Status set to Left.');
    setPick('');
  });
  const ask = guard(() => {
    if (!st) {
      return;
    }
    const id = requestApproval({ type: 'Leaving certificate', title: `Leaving certificate with dues · ${st.name}`, sub: checks.filter(c => !c.ok).map(c => `${c.what}: ${c.note}`).join(' · '), by: 'Principal office' });
    setRequested(r => ({ ...r, [st.id]: id }));
    toast('Sent to the Approvals inbox');
  });
  return (
    <Screen title="School leaving" subtitle="Clearance check before the leaving certificate">
      <ReadOnlyBanner />
      <PickerField label="Student" value={pick} options={students.map(s => `${s.name} (${s.gr})`)} onChange={setPick} />
      {st ? (
        <>
          <Card title="Clearance">
            {checks.map((c, i) => (
              <ListRow key={c.what} icon={c.ok ? Check : X} iconTone={c.ok ? 'success' : 'danger'} title={c.what} subtitle={c.note} right={<Badge label={c.ok ? 'Clear' : 'Pending'} tone={c.ok ? 'success' : 'danger'} />} last={i === checks.length - 1} />
            ))}
          </Card>
          {clear ? null : (
            <InfoBanner tone="warn" text="A leaving certificate is issued only after dues are cleared, unless it is approved." />
          )}
          {!clear && request ? (
            <InfoBanner
              tone={request.status === 'Approved' ? 'success' : request.status === 'Rejected' ? 'danger' : 'info'}
              text={`Approval to issue with dues: ${request.status}`}
            />
          ) : null}
          {!clear && (!request || request.status === 'Rejected') ? <Button label="Ask approval to issue with dues" variant="outline" onPress={ask} /> : null}
          <Button label="Issue leaving certificate" icon={DoorOpen} onPress={issue} />
        </>
      ) : null}
    </Screen>
  );
}

export function AdminPromoAlumni(_: ScreenProps) {
  const [list] = useAlumni();
  return (
    <ListScreen
      title="Alumni"
      subtitle="Passed-out and left students"
      items={list}
      keyOf={x => x.id}
      searchText={x => `${x.name} ${x.batch} ${x.now}`}
      filters={[{ label: 'Status', options: ['All', 'Passed out', 'Left'], get: x => x.status }]}
      renderItem={(x, last) => (
        <ListRow avatar={x.name} title={x.name} subtitle={`${x.batch} · ${x.contact}\nNow: ${x.now}`} right={<Badge label={x.status} tone={x.status === 'Left' ? 'neutral' : 'success'} />} last={last} />
      )}
    />
  );
}
