// S-04 Promotion wizard, section transfer, school leaving, alumni.
// Live: students, results and dues from /api/web; moves via
// POST /api/web/students/promote and PUT /api/web/students/{id}.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ArrowLeftRight, Check, DoorOpen, GraduationCap, Users, X } from 'lucide-react-native';
import { Badge, Button, Card, formatRs as formatDue, InfoBanner, ListRow, Screen, Segmented, toast, Toggle } from '../../../components/ui';
import { adminStyles as a, KV, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps, useNav } from '../../../navigation';
import { useShared } from '../../../store';
import { logAudit, requestApproval, useApprovals } from '../../../data/admin';
import { invalidate, useApi, useMutation } from '../../../api/hooks';
import { webA, WebStudent } from '../../../api/webA';
import { Loading, NoApiBanner } from '../../../components/states';
import { localId, ReadOnlyBanner, useGuard } from '../owner/shared';

const PASS_PCT = 33;

function useClasses() {
  const ctx = useApi('adm:context', webA.context);
  return ctx.data?.classes ?? [];
}

// Latest exam's result cards, keyed by student id.
function useLatestResults() {
  const exams = useApi('adm:mod:exams', () => webA.modules('exams'));
  const examId = exams.data?.[0]?.id;
  const res = useApi(examId ? `adm:results:${examId}` : null, () => webA.results(examId ?? 0));
  const map = new Map((res.data?.cards ?? []).map(c => [String(c.studentId), c]));
  return { map, exam: res.data?.exam, loading: exams.loading || res.loading };
}

function useDues() {
  const q = useApi('adm:defaulters', webA.defaulters);
  return new Map((q.data ?? []).map(d => [String(d.id), d.amount]));
}

export function AdminPromotion(_: ScreenProps) {
  const nav = useNav();
  const items = [
    { route: 'AdminPromoWizard', icon: GraduationCap, title: 'Promotion wizard', sub: 'Year-end: promote or detain, map to new class, carry dues' },
    { route: 'AdminPromoTransfer', icon: ArrowLeftRight, title: 'Section and campus transfer', sub: 'With history and fee adjustment' },
    { route: 'AdminPromoLeaving', icon: DoorOpen, title: 'School leaving', sub: 'Clearance check, leaving certificate, status left' },
    { route: 'AdminPromoAlumni', icon: Users, title: 'Alumni', sub: 'Passed-out and left students' },
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

const STEPS = ['Class', 'Results', 'Decide', 'Map', 'Confirm'];

export function AdminPromoWizard(_: ScreenProps) {
  const { guard } = useGuard();
  const classes = useClasses();
  const [step, setStep] = useState(0);
  const [clsName, setClsName] = useState('');
  const cls = classes.find(c => c.name === clsName) ?? classes[0];
  const idx = cls ? classes.indexOf(cls) : -1;
  const nextCls = idx >= 0 && idx < classes.length - 1 ? classes[idx + 1] : undefined;
  const next = nextCls ? nextCls.name : 'Passed out (alumni)';
  const studentsQ = useApi(cls ? `adm:students:class:${cls.id}` : null, () => webA.students({ classId: cls?.id, pageSize: 200, status: 'active' }));
  const results = useLatestResults();
  const dueMap = useDues();
  const [decide, setDecide] = useState<Record<string, boolean>>({});
  const [section, setSection] = useState('Same section');
  const list = (studentsQ.data?.items ?? []).filter(s => s.status === 'active').map(s => {
    const card = results.map.get(s.id);
    return { ...s, pct: card?.pct ?? null, pass: card ? card.pct >= PASS_PCT : true, due: dueMap.get(s.id) ?? 0 };
  });
  const promote = (id: string, pass: boolean) => decide[id] ?? pass;
  const promoted = list.filter(s => promote(s.id, s.pass));
  const detained = list.filter(s => !promote(s.id, s.pass));
  const dues = list.reduce((n, s) => n + s.due, 0);
  const run = useMutation(async () => {
    const ids = promoted.map(s => s.id);
    if (!ids.length) {
      return { updated: 0 };
    }
    const res = nextCls
      ? await webA.promote({ studentIds: ids, toClassId: nextCls.id, action: 'promote' })
      : await webA.promote({ studentIds: ids, action: 'leave' });
    if (nextCls && section !== 'Same section' && section.length === 1) {
      for (const id of ids) {
        await webA.updateStudent(id, { section });
      }
    }
    return res;
  }, 'Promotion saved');
  const go = (n: number) => {
    if (n >= 1 && !list.length) {
      toast(studentsQ.loading ? 'Loading students…' : 'No active students in this class');
      return;
    }
    setStep(n);
  };
  const confirm = guard(async () => {
    if (!cls) {
      return;
    }
    const res = await run.run();
    if (res !== undefined) {
      logAudit('Promotion', `${cls.name}: ${promoted.length} → ${next} (${section}), ${detained.length} detained, dues ${formatDue(dues)} carried forward`);
      invalidate('adm:students');
      setStep(0);
      setDecide({});
    }
  });
  if (!cls) {
    return (
      <Screen title="Promotion wizard">
        <Loading />
      </Screen>
    );
  }
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
            <Button label="Confirm promotion" onPress={confirm} loading={run.busy} style={a.flex} />
          )}
        </View>
      }
    >
      <ReadOnlyBanner />
      <Segmented options={STEPS} value={STEPS[step]} onChange={v => go(STEPS.indexOf(v))} />
      {step === 0 ? (
        <>
          <PickerField label="Class" value={cls.name} options={classes.map(c => c.name)} onChange={v => { setClsName(v); setDecide({}); }} />
          <Card>
            <KV k="Active students" v={studentsQ.loading ? '…' : String(list.length)} />
            <KV k="Results from" v={results.exam?.name ?? (results.loading ? '…' : 'No exam yet')} />
            <KV k="Next class" v={next} last />
          </Card>
          <InfoBanner text="Dues stay on each student's vouchers and carry forward automatically." />
        </>
      ) : null}
      {step === 1 ? (
        <Card title={`${results.exam?.name ?? 'Results'} · ${list.filter(s => s.pass).length} pass, ${list.filter(s => !s.pass).length} fail`}>
          {list.map((s, i) => (
            <ListRow
              key={s.id}
              avatar={s.name}
              title={s.name}
              subtitle={`${s.grNo} · ${s.section} · ${s.pct === null ? 'no result' : `${s.pct}%`}`}
              right={<Badge label={s.pass ? 'Pass' : 'Fail'} tone={s.pass ? 'success' : 'danger'} />}
              last={i === list.length - 1}
            />
          ))}
        </Card>
      ) : null}
      {step === 2 ? (
        <Card title={`${promoted.length} promote · ${detained.length} detain`}>
          {list.map((s, i) => (
            <ListRow
              key={s.id}
              title={s.name}
              subtitle={`${s.pct === null ? 'no result' : `${s.pct}%`} · ${s.pass ? 'passed' : 'failed'}`}
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
            <KV k="Detained students stay in" v={cls.name} last />
          </Card>
          <PickerField label="New section" value={section} options={['Same section', ...(nextCls?.sections ?? ['A'])]} onChange={setSection} />
        </>
      ) : null}
      {step === 4 ? (
        <Card title="Summary">
          <KV k="Promoted" v={`${promoted.length} → ${next}`} />
          <KV k="Detained" v={`${detained.length} stay in ${cls.name}`} />
          <KV k="Section" v={section} />
          <KV k="Dues carried forward" v={formatDue(dues)} last />
        </Card>
      ) : null}
    </Screen>
  );
}

type Move = { id: string; student: string; kind: 'Section' | 'Campus'; from: string; to: string; when: string; fee: string };

export function AdminPromoTransfer(_: ScreenProps) {
  // The server keeps no transfer history, so the history is kept on the phone.
  const [list, setList] = useShared<Move[]>('admin.sectionMoves', []);
  const { guard } = useGuard();
  const classes = useClasses();
  const studentsQ = useApi('adm:students:all', () => webA.students({ pageSize: 200 }));
  const [kind, setKind] = useState<'Section' | 'Campus'>('Section');
  const [student, setStudent] = useState('');
  const [to, setTo] = useState('');
  const students = (studentsQ.data?.items ?? []).filter(s => s.status === 'active');
  const st = students.find(s => `${s.name} (${s.grNo})` === student);
  const sections = classes.find(c => c.id === st?.classId)?.sections ?? [];
  const options = kind === 'Section' ? sections.filter(x => x !== st?.section).map(x => `${st?.className ?? 'Class'}-${x}`) : [];
  const run = useMutation((s: WebStudent, section: string) => webA.updateStudent(s.id, { section }), 'Transfer saved');
  const save = guard(async () => {
    if (!st || !to) {
      toast('Choose the student and where to move');
      return;
    }
    const section = to.split('-').pop() ?? '';
    const from = `${st.className}-${st.section}`;
    if ((await run.run(st, section)) !== undefined) {
      setList(l => [{ id: localId('mv'), student, kind, from, to, when: 'Today', fee: 'No change' }, ...l]);
      logAudit('Transfer', `${student}: Section ${from} → ${to}`);
      invalidate('adm:students');
      setStudent('');
      setTo('');
    }
  });
  return (
    <ListScreen
      title="Section and campus transfer"
      items={list}
      keyOf={m => m.id}
      searchText={m => `${m.student} ${m.from} ${m.to}`}
      filters={[{ label: 'Type', options: ['All', 'Section', 'Campus'], get: m => m.kind }]}
      empty="No transfers made from this phone yet"
      header={
        <>
          <ReadOnlyBanner />
          <Card title="New transfer">
            <Segmented options={['Section', 'Campus']} value={kind} onChange={v => { setKind(v as 'Section' | 'Campus'); setTo(''); }} />
            {kind === 'Campus' ? (
              <NoApiBanner what="Moving a student to another campus (use Campuses → Transfers to record it)" />
            ) : (
              <View style={a.flex}>
                <PickerField label="Student" value={student} options={students.map(s => `${s.name} (${s.grNo})`)} onChange={v => { setStudent(v); setTo(''); }} />
                <PickerField label="New section" value={to} options={options} onChange={setTo} />
                <Button label="Transfer" icon={ArrowLeftRight} onPress={save} loading={run.busy} />
              </View>
            )}
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

export function AdminPromoLeaving(_: ScreenProps) {
  const { guard } = useGuard();
  // studentId -> approval request id. Issuing with dues needs that request to
  // be Approved in the Approvals inbox (S-04).
  const [requested, setRequested] = useShared<Record<string, string>>('admin.leavingRequested', {});
  const [approvals] = useApprovals();
  const studentsQ = useApi('adm:students:all', () => webA.students({ pageSize: 200 }));
  const students = (studentsQ.data?.items ?? []).filter(s => s.status === 'active');
  const [pick, setPick] = useState('');
  const st = students.find(s => `${s.name} (${s.grNo})` === pick);
  const detail = useApi(st ? `adm:student:${st.id}` : null, () => webA.student(st?.id ?? ''));
  const library = useApi('adm:library:issues', () => webA.libraryIssues());
  const due = detail.data?.dues ?? 0;
  const books = (library.data ?? []).filter(b => !b.returned_on && st && String(b.borrower ?? '').toLowerCase().includes(st.name.toLowerCase())).length;
  const checks = st
    ? [
        { what: 'Fee', ok: due === 0, note: detail.loading ? 'Checking…' : due ? `${formatDue(due)} due` : 'No dues' },
        { what: 'Library', ok: books === 0, note: books ? `${books} book(s) not returned` : 'No books issued' },
        { what: 'Store', ok: true, note: 'No store API yet — check at the counter' },
      ]
    : [];
  const clear = checks.every(c => c.ok);
  const request = st ? approvals.find(x => x.id === requested[st.id]) : undefined;
  const run = useMutation(async (s: WebStudent) => {
    await webA.promote({ studentIds: [s.id], action: 'leave' });
    return webA.printCertificate(s.id, 'leaving');
  }, 'Leaving certificate issued. Status set to Left.');
  const issue = guard(async () => {
    if (!st) {
      toast('Choose a student');
      return;
    }
    if (detail.loading) {
      toast('Checking clearance…');
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
    if ((await run.run(st)) !== undefined) {
      logAudit('School leaving', `${st.name} (${st.grNo}) left. Leaving certificate issued. Status set to Left.`);
      invalidate('adm:students');
      setPick('');
    }
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
      {studentsQ.error ? <InfoBanner tone="danger" text={studentsQ.error} /> : null}
      <PickerField label="Student" value={pick} options={students.map(s => `${s.name} (${s.grNo})`)} onChange={setPick} />
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
          <Button label="Issue leaving certificate" icon={DoorOpen} onPress={issue} loading={run.busy} />
        </>
      ) : null}
    </Screen>
  );
}

export function AdminPromoAlumni(_: ScreenProps) {
  const left = useApi('adm:students:left', () => webA.students({ status: 'left', pageSize: 200 }));
  const list = left.data?.items ?? [];
  return (
    <ListScreen
      title="Alumni"
      subtitle="Passed-out and left students"
      items={list}
      keyOf={x => x.id}
      searchText={x => `${x.name} ${x.grNo} ${x.className}`}
      empty={left.loading ? 'Loading…' : left.error ?? 'No alumni yet'}
      renderItem={(x, last) => (
        <ListRow avatar={x.name} title={x.name} subtitle={`${x.grNo} · ${x.className}-${x.section} · ${x.mobile ?? '—'}`} right={<Badge label="Left" tone="neutral" />} last={last} />
      )}
    />
  );
}
