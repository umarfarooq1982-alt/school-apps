// HR screens backed by the school server (/api/web/staff, attendance/staff,
// leave, modules/hiring). Parts without an API show a "not available" state.
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { CalendarDays, Check, IdCard, LogOut, Pencil, Plus, Printer, UserPlus, Users, X } from 'lucide-react-native';
import { Avatar, Badge, Button, Card, Chips, Field, InfoBanner, ListRow, QRCode, Segmented, toast } from '../../../components/ui';
import { FormSheet, KV, Kpi, KpiGrid, PickerField, useReasonPrompt } from '../../../components/admin';
import { Empty, QueryView } from '../../../components/states';
import { useApi, useMutation } from '../../../api/hooks';
import { num, staffApi, StaffInput, usersApi, WebStaff, WebStaffDay } from '../../../api/webB';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { logAudit, useReadOnly } from '../../../data/admin';
import { validCnic } from '../../../data/admin-hr';
import { fmtDate, LiveScreen, liveStyles as ls, ModuleRecordsScreen, SearchBox, StatusBadge, todayIso, useFiltered } from '../accounts/live-kit';

const TYPES = ['Permanent', 'Contract', 'Visiting'];
const STATUSES = ['active', 'probation', 'left'];

function useStaffList() {
  return useApi('web:staff:list', () => staffApi.list());
}

// ---------- Directory ----------

export function AdminStaffDirectoryLive(_: ScreenProps) {
  const nav = useNav();
  const q = useStaffList();
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const base = (q.data ?? []).filter(s => (status === 'All' || s.status === status) && (type === 'All' || s.type === type));
  const list = useFiltered(base, term, s => `${s.name} ${s.empId} ${s.cnic ?? ''} ${s.designation ?? ''} ${s.department ?? ''}`);
  return (
    <LiveScreen
      title="Staff directory"
      subtitle="Every employee; staff who leave are marked left, never deleted"
      q={q}
      exportTitle="Staff directory"
      footer={<Button label="Add employee" icon={UserPlus} onPress={() => nav.push('AdminStaffEnroll')} />}
    >
      <SearchBox value={term} onChange={setTerm} placeholder="Name, employee ID, CNIC" />
      <Chips options={['All', ...STATUSES]} value={status} onChange={setStatus} />
      <Chips options={['All', ...TYPES]} value={type} onChange={setType} />
      <QueryView q={q}>
        {() =>
          list.length ? (
            <Card>
              {list.map((s, i) => (
                <ListRow
                  key={s.id}
                  avatar={s.name}
                  title={s.name}
                  subtitle={`${s.empId} · ${s.designation ?? '—'} · ${s.department ?? '—'} · ${s.type}`}
                  right={<StatusBadge status={s.status} />}
                  onPress={() => nav.push('AdminStaffProfile', { id: s.id })}
                  last={i === list.length - 1}
                />
              ))}
            </Card>
          ) : (
            <Empty text="No staff found." />
          )
        }
      </QueryView>
    </LiveScreen>
  );
}

// ---------- Profile ----------

export function makeStaffProfile(Fallback: React.ComponentType<ScreenProps>) {
  return function AdminStaffProfileLive(props: ScreenProps) {
    const id = String(useParam('id', ''));
    if (!/^\d+$/.test(id)) {
      return <Fallback {...props} />;
    }
    return <StaffProfile id={id} />;
  };
}

function StaffProfile({ id }: { id: string }) {
  const nav = useNav();
  const q = useApi(`web:staff:${id}`, () => staffApi.get(id));
  const readOnly = useReadOnly();
  const [tab, setTab] = useState('Personal');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<StaffInput>>({});
  const save = useMutation((b: Partial<StaffInput>) => staffApi.update(id, b), 'Saved');
  const [reasonEl, ask] = useReasonPrompt();
  const s = q.data;
  const edit = () => {
    if (!s) {
      return;
    }
    setForm({
      designation: s.designation ?? '',
      department: s.department ?? '',
      mobile: s.mobile ?? '',
      email: s.email ?? '',
      type: s.type,
      contractEnd: s.contractEnd ?? '',
      basic: num(s.basic),
    });
    setOpen(true);
  };
  const submit = async () => {
    if (form.contractEnd && !/^\d{4}-\d{2}-\d{2}$/.test(form.contractEnd)) {
      toast('Contract end: use YYYY-MM-DD');
      return;
    }
    if ((await save.run({ ...form, basic: Number(form.basic || 0) })) !== undefined) {
      logAudit('Staff record', `${s?.empId}: profile updated`);
      setOpen(false);
      q.refresh();
    }
  };
  return (
    <LiveScreen title={s?.name ?? 'Staff'} subtitle={s ? `${s.empId} · ${s.designation ?? ''}` : undefined} q={q}>
      <QueryView q={q}>
        {st => (
          <>
            <Card>
              <View style={ls.row}>
                <Avatar name={st.name} size={56} ring />
                <View style={ls.flex}>
                  <Text style={ls.label}>{st.name}</Text>
                  <Text style={ls.small}>{`${st.empId} · ${st.department ?? '—'}`}</Text>
                </View>
                <StatusBadge status={st.status} />
              </View>
            </Card>
            <Segmented options={['Personal', 'Job', 'Salary']} value={tab} onChange={setTab} />
            {tab === 'Personal' ? (
              <Card>
                <KV k="CNIC" v={st.cnic ?? '—'} />
                <KV k="Mobile" v={st.mobile ?? '—'} />
                <KV k="Email" v={st.email ?? '—'} />
                <KV k="App login" v={<LoginStatus staff={st} />} last />
              </Card>
            ) : tab === 'Job' ? (
              <Card>
                <KV k="Employee ID" v={st.empId} />
                <KV k="Designation" v={st.designation ?? '—'} />
                <KV k="Department" v={st.department ?? '—'} />
                <KV k="Joined" v={fmtDate(st.joinDate)} />
                <KV k="Type" v={st.type} />
                <KV k="Contract end" v={st.contractEnd ? fmtDate(st.contractEnd) : '—'} last />
              </Card>
            ) : (
              <Card>
                <KV k="Basic salary" v={`Rs. ${num(st.basic).toLocaleString('en-US')}`} last />
              </Card>
            )}
            <View style={ls.wrap}>
              <Button label="Edit" icon={Pencil} variant="outline" disabled={readOnly} onPress={edit} />
              <Button label="ID card" icon={IdCard} variant="outline" onPress={() => nav.push('AdminStaffIdCards')} />
              {st.status !== 'left' ? (
                <Button
                  label="Mark as left"
                  icon={LogOut}
                  variant="danger"
                  disabled={readOnly}
                  onPress={() =>
                    ask(`Mark ${st.name} as left`, async reason => {
                      if ((await save.run({ status: 'left' })) !== undefined) {
                        logAudit('Staff exit', `${st.empId} marked left: ${reason}`);
                        q.refresh();
                      }
                    })
                  }
                />
              ) : null}
            </View>
            {st.status === 'left' ? <InfoBanner text="This employee has left. The record is kept; it is never deleted." /> : null}
          </>
        )}
      </QueryView>
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Edit employee" onSubmit={submit}>
        <Field label="Designation" value={form.designation ?? ''} onChangeText={v => setForm(f => ({ ...f, designation: v }))} />
        <Field label="Department" value={form.department ?? ''} onChangeText={v => setForm(f => ({ ...f, department: v }))} />
        <Field label="Mobile" value={form.mobile ?? ''} onChangeText={v => setForm(f => ({ ...f, mobile: v }))} keyboardType="phone-pad" />
        <Field label="Email" value={form.email ?? ''} onChangeText={v => setForm(f => ({ ...f, email: v }))} autoCapitalize="none" />
        <PickerField label="Type" value={form.type ?? ''} options={TYPES} onChange={v => setForm(f => ({ ...f, type: v }))} />
        <Field label="Contract end" value={form.contractEnd ?? ''} onChangeText={v => setForm(f => ({ ...f, contractEnd: v }))} placeholder="YYYY-MM-DD" />
        <Field label="Basic salary (Rs.)" value={String(form.basic ?? '')} onChangeText={v => setForm(f => ({ ...f, basic: Number(v.replace(/\D/g, '')) }))} keyboardType="numeric" />
      </FormSheet>
      {reasonEl}
    </LiveScreen>
  );
}

// Read-only: whether this employee has an app login. Uses the user's staff
// link when the server sends it, otherwise matches by mobile or email.
function LoginStatus({ staff }: { staff: WebStaff }) {
  const q = useApi('web:users', () => usersApi.list());
  if (!q.data) {
    return <Badge label={q.error ? 'Unknown' : '…'} tone="neutral" />;
  }
  const digits = (v?: string | null) => (v ?? '').replace(/\D/g, '');
  const user = q.data.find(
    u =>
      (u.staffId != null && String(u.staffId) === staff.id) ||
      (!!staff.mobile && digits(u.phone) === digits(staff.mobile) && u.role !== 'parent' && u.role !== 'student') ||
      (!!staff.email && u.email === staff.email),
  );
  return user ? (
    <Badge label={`Yes · ${user.role}${user.disabled ? ' · disabled' : ''}`} tone={user.disabled ? 'warn' : 'success'} />
  ) : (
    <Badge label="No login" tone="neutral" />
  );
}

// ---------- Enrollment ----------

export function AdminStaffEnrollLive(_: ScreenProps) {
  const nav = useNav();
  // Opened from a hiring record: the applicant's name comes as a param.
  const applicantName = String(useParam('name', ''));
  const applicant = applicantName ? { name: applicantName } : undefined;
  const readOnly = useReadOnly();
  const [f, setF] = useState<Record<string, string>>(() => ({
    name: applicant?.name ?? '',
    designation: applicant ? 'Teacher' : '',
    department: 'Academics',
    type: 'Permanent',
    joinDate: todayIso(),
  }));
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const create = useMutation(staffApi.create, 'Employee added');
  const submit = async () => {
    if (!f.name?.trim()) {
      toast('Enter the name');
      return;
    }
    if (!f.cnic || !validCnic(f.cnic)) {
      toast('Enter a valid CNIC (e.g. 35202-1234567-1)');
      return;
    }
    if (f.joinDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.joinDate)) {
      toast('Joining date: use YYYY-MM-DD');
      return;
    }
    if (f.contractEnd && !/^\d{4}-\d{2}-\d{2}$/.test(f.contractEnd)) {
      toast('Contract end: use YYYY-MM-DD');
      return;
    }
    const r = await create.run({
      name: f.name.trim(),
      cnic: f.cnic.trim(),
      mobile: f.mobile?.trim(),
      email: f.email?.trim(),
      designation: f.designation?.trim(),
      department: f.department?.trim(),
      joinDate: f.joinDate,
      type: f.type,
      contractEnd: f.contractEnd || undefined,
      basic: Number(f.basic || 0),
    });
    if (r) {
      logAudit('Staff enrollment', `${r.empId} ${r.name}`);
      nav.replace('AdminStaffProfile', { id: r.id });
    }
  };
  return (
    <LiveScreen
      title="Staff enrollment"
      subtitle="Employee ID is generated; CNIC must be unique"
      footer={<Button label="Save employee" icon={Check} onPress={submit} loading={create.busy} disabled={readOnly} />}
     
     
    >
      {applicant ? <InfoBanner tone="success" text={`From hiring: ${applicant.name}`} /> : null}
      <Field label="Full name *" value={f.name} onChangeText={v => set('name', v)} />
      <Field label="CNIC *" value={f.cnic ?? ''} onChangeText={v => set('cnic', v)} placeholder="35202-1234567-1" keyboardType="numbers-and-punctuation" />
      <Field label="Mobile" value={f.mobile ?? ''} onChangeText={v => set('mobile', v)} keyboardType="phone-pad" />
      <Field label="Email" value={f.email ?? ''} onChangeText={v => set('email', v)} autoCapitalize="none" />
      <Field label="Designation" value={f.designation ?? ''} onChangeText={v => set('designation', v)} />
      <Field label="Department" value={f.department ?? ''} onChangeText={v => set('department', v)} />
      <PickerField label="Employment type" value={f.type} options={TYPES} onChange={v => set('type', v)} />
      <Field label="Joining date" value={f.joinDate ?? ''} onChangeText={v => set('joinDate', v)} placeholder="YYYY-MM-DD" />
      <Field label="Contract end" value={f.contractEnd ?? ''} onChangeText={v => set('contractEnd', v)} placeholder="YYYY-MM-DD" />
      <Field label="Basic salary (Rs.)" value={f.basic ?? ''} onChangeText={v => set('basic', v.replace(/\D/g, ''))} keyboardType="numeric" />
    </LiveScreen>
  );
}

// ---------- Staff attendance ----------

const MARKS: Array<{ key: string; label: string }> = [
  { key: 'present', label: 'P' },
  { key: 'late', label: 'Late' },
  { key: 'absent', label: 'A' },
  { key: 'leave', label: 'Leave' },
  { key: 'half-day', label: 'Half' },
];

const lastDays = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + 5 * 3600 * 1000 - i * 86400000);
    return d.toISOString().slice(0, 10);
  });

export function AdminStaffAttendanceLive(_: ScreenProps) {
  const [date, setDate] = useState(todayIso());
  const q = useApi(`web:staffday:${date}`, () => staffApi.day(date));
  const readOnly = useReadOnly();
  const [edits, setEdits] = useState<Record<string, { status: string; timeIn: string }>>({});
  const save = useMutation(staffApi.saveDay, 'Attendance saved');
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const value = (r: WebStaffDay) => edits[r.id] ?? { status: r.status ?? '', timeIn: r.timeIn ?? '' };
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach(r => {
      const st = (edits[r.id]?.status ?? r.status) || 'unmarked';
      c[st] = (c[st] || 0) + 1;
    });
    return c;
  }, [rows, edits]);
  const submit = async () => {
    const marks = Object.entries(edits)
      .filter(([, v]) => v.status)
      .map(([staffId, v]) => ({ staffId: Number(staffId), status: v.status, timeIn: v.timeIn || undefined }));
    if (!marks.length) {
      toast('Mark at least one employee');
      return;
    }
    if (marks.some(m => m.timeIn && !/^\d{2}:\d{2}$/.test(m.timeIn))) {
      toast('Time in must be HH:MM');
      return;
    }
    if ((await save.run(date, marks)) !== undefined) {
      logAudit('Staff attendance', `${date}: ${marks.length} marked`);
      setEdits({});
      q.refresh();
    }
  };
  return (
    <LiveScreen
      title="Staff attendance"
      subtitle="Manual entry; device sync and corrections are on the tools screen"
      q={q}
     
     
      footer={<Button label="Save attendance" icon={Check} onPress={submit} loading={save.busy} disabled={readOnly || !Object.keys(edits).length} />}
    >
      <PickerField label="Date" value={date} options={lastDays()} onChange={d => { setDate(d); setEdits({}); }} />
      <KpiGrid>
        <Kpi label="Present" value={String(counts.present || 0)} tone="success" />
        <Kpi label="Late" value={String(counts.late || 0)} tone="warn" />
        <Kpi label="Absent" value={String(counts.absent || 0)} tone="danger" />
        <Kpi label="Unmarked" value={String(counts.unmarked || 0)} />
      </KpiGrid>
      <QueryView q={q} isEmpty={d => !d.length} emptyText="No staff on this campus.">
        {() => (
          <Card>
            {rows.map((r, i) => {
              const v = value(r);
              return (
                <View key={r.id} style={[ls.wrapCol, i < rows.length - 1 && ls.divider]}>
                  <ListRow avatar={r.name} title={r.name} subtitle={`${r.empId} · ${r.designation ?? ''}`} right={<StatusBadge status={v.status || 'unmarked'} />} last />
                  <Chips
                    options={MARKS.map(m => m.label)}
                    value={MARKS.find(m => m.key === v.status)?.label ?? ''}
                    onChange={label => {
                      const key = MARKS.find(m => m.label === label)?.key ?? '';
                      setEdits(p => ({ ...p, [r.id]: { ...v, status: key } }));
                    }}
                  />
                  {v.status === 'present' || v.status === 'late' || v.status === 'half-day' ? (
                    <Field label="Time in" value={v.timeIn} onChangeText={t => setEdits(p => ({ ...p, [r.id]: { ...v, timeIn: t } }))} placeholder="07:45" />
                  ) : null}
                </View>
              );
            })}
          </Card>
        )}
      </QueryView>
    </LiveScreen>
  );
}

// ---------- Leave management ----------

const LEAVE_TYPES = ['Casual', 'Sick', 'Annual', 'Maternity', 'Unpaid'];

export function AdminLeaveManagementLive(_: ScreenProps) {
  const q = useApi('web:leave', () => staffApi.leave());
  const staff = useStaffList();
  const [kind, setKind] = useState('Staff');
  const [status, setStatus] = useState('pending');
  const month = todayIso().slice(0, 7);
  const cal = useApi(`web:leavecal:${month}`, () => staffApi.leaveCalendar(month));
  const decide = useMutation(staffApi.decideLeave);
  const apply = useMutation(staffApi.applyLeave, 'Leave sent for approval');
  const [reasonEl, ask] = useReasonPrompt();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Record<string, string>>({ type: 'Casual', from: todayIso(), to: todayIso() });
  const items = (q.data?.items ?? []).filter(l => l.kind === kind.toLowerCase() && (status === 'all' || l.status === status));
  const act = async (id: string, st: 'approved' | 'rejected', name?: string) => {
    if ((await decide.run(id, st)) !== undefined) {
      toast(st === 'approved' ? 'Approved. Teacher leave appears in Substitutions.' : 'Rejected');
      logAudit('Leave decision', `${name ?? id}: ${st}`);
      q.refresh();
    }
  };
  const days = (a: string, b: string) => {
    const d = (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000 + 1;
    return Number.isFinite(d) ? d : 0;
  };
  const submit = async () => {
    const st = (staff.data ?? []).find(x => `${x.name} · ${x.empId}` === f.staff);
    if (!st) {
      toast('Pick an employee');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.from) || !/^\d{4}-\d{2}-\d{2}$/.test(f.to)) {
      toast('Dates: use YYYY-MM-DD');
      return;
    }
    const n = days(f.from, f.to);
    if (n < 1) {
      toast('"To" must be on or after "From"');
      return;
    }
    if (!f.reason?.trim()) {
      toast('A reason is required');
      return;
    }
    const r = await apply.run({ kind: 'staff', staffId: Number(st.id), type: f.type, from: f.from, to: f.to, days: n, reason: f.reason.trim(), name: st.name });
    if (r !== undefined) {
      setOpen(false);
      q.refresh();
    }
  };
  return (
    <LiveScreen
      title="Leave management"
      subtitle="Staff and student leave requests"
      q={q}
     
     
      footer={<Button label="Apply staff leave" icon={Plus} onPress={() => setOpen(true)} />}
    >
      <Segmented options={['Staff', 'Student']} value={kind} onChange={setKind} />
      <Chips options={['pending', 'approved', 'rejected', 'all']} value={status} onChange={setStatus} />
      <QueryView q={q} isEmpty={() => !items.length} emptyText="No leave requests here.">
        {() => (
          <Card>
            {items.map((l, i) => (
              <View key={l.id} style={[ls.wrapCol, i < items.length - 1 && ls.divider]}>
                <ListRow
                  icon={CalendarDays}
                  title={`${l.name ?? '—'} · ${l.type}`}
                  subtitle={`${fmtDate(l.from)} – ${fmtDate(l.to)} · ${l.days} day(s)${l.reason ? ` · ${l.reason}` : ''}`}
                  right={<StatusBadge status={l.status} />}
                  last
                />
                {l.status === 'pending' ? (
                  <View style={ls.wrap}>
                    <Button label="Approve" icon={Check} onPress={() => act(l.id, 'approved', l.name)} loading={decide.busy} />
                    <Button label="Reject" icon={X} variant="danger" onPress={() => ask('Reason for rejecting', () => act(l.id, 'rejected', l.name))} />
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        )}
      </QueryView>
      <Card title={`Leave calendar · ${month}`}>
        <QueryView q={cal} isEmpty={d => !d.length} emptyText="No leave this month.">
          {d =>
            d.map((l, i) => (
              <ListRow key={l.id} icon={CalendarDays} title={`${l.kind} · ${l.leave_type}`} subtitle={`${fmtDate(l.from_date)} – ${fmtDate(l.to_date)}`} right={<StatusBadge status={l.status} />} last={i === d.length - 1} />
            ))
          }
        </QueryView>
      </Card>
      {(q.data?.policies ?? []).length ? (
        <Card title="Policies">
          {(q.data?.policies ?? []).map((p, i, arr) => (
            <KV key={p.id} k={String(p.leave_type ?? p.name ?? 'Leave')} v={`${num(p.quota ?? p.days)} days`} last={i === arr.length - 1} />
          ))}
        </Card>
      ) : null}
      <InfoBanner text="Leave beyond the balance is allowed only as unpaid leave." />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Apply staff leave" submitLabel="Send for approval" onSubmit={submit}>
        <PickerField label="Employee" value={f.staff ?? ''} options={(staff.data ?? []).map(s => `${s.name} · ${s.empId}`)} onChange={v => setF(p => ({ ...p, staff: v }))} />
        <PickerField label="Type" value={f.type} options={LEAVE_TYPES} onChange={v => setF(p => ({ ...p, type: v }))} />
        <Field label="From" value={f.from} onChangeText={v => setF(p => ({ ...p, from: v }))} placeholder="YYYY-MM-DD" />
        <Field label="To" value={f.to} onChangeText={v => setF(p => ({ ...p, to: v }))} placeholder="YYYY-MM-DD" />
        <Field label="Reason *" value={f.reason ?? ''} onChangeText={v => setF(p => ({ ...p, reason: v }))} multiline />
      </FormSheet>
      {reasonEl}
    </LiveScreen>
  );
}

// ---------- Hiring ----------

type HiringRow = { id: number; title: string; status: string; recordDate: string; position?: string; remarks?: string; mobile?: string };

export function AdminHiringLive(_: ScreenProps) {
  return (
    <ModuleRecordsScreen<HiringRow>
      moduleKey="hiring"
      title="Hiring"
      subtitle="Applicants, interviews and offers"
      icon={Users}
      rowTitle={r => `${r.title}${r.position ? ` · ${r.position}` : ''}`}
      rowSub={r => `${fmtDate(r.recordDate)}${r.remarks ? ` · ${r.remarks}` : ''}`}
      renderRight={r => <StatusBadge status={r.status} />}
      searchText={r => `${r.title} ${r.position ?? ''} ${r.remarks ?? ''}`}
      fields={[
        { key: 'name', label: 'Applicant name', required: true },
        { key: 'position', label: 'Position', required: true },
        { key: 'mobile', label: 'Mobile' },
        { key: 'status', label: 'Stage', kind: 'pick', options: ['applied', 'interview', 'demo', 'offered', 'hired', 'rejected'] },
        { key: 'remarks', label: 'Interview / demo remarks' },
      ]}
      toBody={v => ({ name: v.name.trim(), title: v.name.trim(), position: v.position.trim(), mobile: v.mobile?.trim(), status: v.status || 'applied', remarks: v.remarks?.trim() })}
      addLabel="Add applicant"
     
    />
  );
}

// ---------- Staff ID cards (real staff list) ----------

export function AdminStaffIdCardsLive(_: ScreenProps) {
  const q = useStaffList();
  const active = (q.data ?? []).filter((s: WebStaff) => s.status !== 'left');
  return (
    <LiveScreen
      title="Staff ID cards"
      subtitle="Bulk print with photo and QR"
      q={q}
      footer={<Button label={`Print ${active.length} cards`} icon={Printer} onPress={() => toast('Print preview ready (demo)')} />}
    >
      <QueryView q={q} isEmpty={() => !active.length} emptyText="No active staff.">
        {() =>
          active.map(s => (
            <Card key={s.id}>
              <View style={ls.row}>
                <Avatar name={s.name} size={52} ring />
                <View style={ls.flex}>
                  <Text style={ls.label}>{s.name}</Text>
                  <Text style={ls.small}>{`${s.empId} · ${s.designation ?? ''}`}</Text>
                  <Badge label={s.type} tone="neutral" />
                </View>
                <QRCode value={`sms:staff:${s.empId}`} size={72} />
              </View>
            </Card>
          ))
        }
      </QueryView>
    </LiveScreen>
  );
}
