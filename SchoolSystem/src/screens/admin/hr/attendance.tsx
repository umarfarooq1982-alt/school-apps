// HR panel: staff attendance (M-10) and leave management (M-16).
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ClipboardList, Lock, LockOpen, RefreshCw, Repeat, Users } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Chips,
  Field,
  InfoBanner,
  ListRow,
  MonthCalendar,
  Screen,
  toast,
} from '../../../components/ui';
import {
  ExportButton,
  FormSheet,
  KV,
  Kpi,
  KpiGrid,
  ListScreen,
  PickerField,
  Table,
  useReasonPrompt,
} from '../../../components/admin';
import { BottomSheet } from '../../../components/Tabs';
import { ScreenProps, useNav } from '../../../navigation';
import { campusName, logAudit, requestApproval, useReadOnly, useStaffRole } from '../../../data/admin';
import { monthLabel } from '../../../data/admin-accounts';
import {
  classifyAttendance,
  HrStaff,
  LeaveType,
  monthSummary,
  splitLeave,
  StaffDayStatus,
  StaffLeave,
  TIMING_RULES,
  todayPunch,
} from '../../../data/admin-hr';
import { useOpen } from '../core';
import { byLine, Note, toNumber, ws } from '../accounts/widgets';
import {
  staffName,
  useAttLocked,
  useDeviceSynced,
  useHrStaff,
  usePolicies,
  usePunches,
  useStaffLeaves,
} from './state';

const TODAY = '22 Oct';
const THIS_MONTH = 202610;
const TIMES = ['07:30', '07:40', '07:45', '07:55', '08:05', '08:20', '09:00', '10:15', '11:00', '12:15', '13:20', '13:40', '14:00'];

type AttRow = { staff: HrStaff; index: number; timeIn: string | null; timeOut: string | null; source: string; status: StaffDayStatus };

function tone(s: StaffDayStatus) {
  return s === 'Present' ? 'success' : s === 'Absent' ? 'danger' : s === 'Leave' ? 'info' : 'warn';
}

export function AdminStaffAttendance(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [role] = useStaffRole();
  const [staff] = useHrStaff();
  const [leaves] = useStaffLeaves();
  const [punches, setPunches] = usePunches();
  const [synced, setSynced] = useDeviceSynced();
  const [locked] = useAttLocked();
  const [sel, setSel] = useState<AttRow | null>(null);
  const [tin, setTin] = useState('07:40');
  const [tout, setTout] = useState('13:40');
  const [reasonEl, askReason] = useReasonPrompt();
  const monthLocked = !!locked[THIS_MONTH];

  const rows: AttRow[] = staff
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => s.status !== 'Left')
    .map(({ s, index }) => {
      const onLeave = leaves.some(l => l.staffId === s.id && l.status === 'Approved' && l.from === TODAY);
      const manual = punches[s.id];
      const device = synced ? todayPunch(index) : { timeIn: null, timeOut: null };
      const p = manual ?? device;
      return {
        staff: s,
        index,
        timeIn: p.timeIn,
        timeOut: p.timeOut,
        source: manual ? manual.source : synced ? 'Device' : 'Not synced',
        status: classifyAttendance(p.timeIn, p.timeOut, TIMING_RULES, onLeave),
      };
    });
  const count = (st: StaffDayStatus) => rows.filter(r => r.status === st).length;

  const saveManual = () => {
    if (!sel) {
      return;
    }
    if (monthLocked) {
      const r = sel;
      setSel(null);
      askReason(`Correction for ${r.staff.name} (month is locked)`, reason => {
        requestApproval({ type: 'Attendance correction', title: `Staff attendance correction · ${r.staff.name} · ${TODAY}`, sub: `${tin}–${tout}. ${reason}`, by: byLine(role) });
        toast('Correction sent to HR / Principal for approval');
      });
      return;
    }
    const wasDevice = sel.source === 'Device';
    const r = sel;
    if (wasDevice) {
      setSel(null);
      askReason(`Correct device time for ${r.staff.name}`, reason => {
        setPunches(prev => ({ ...prev, [r.staff.id]: { timeIn: tin, timeOut: tout, source: 'Correction' } }));
        logAudit('Staff attendance correction', `${r.staff.name} ${TODAY}: ${r.timeIn ?? '—'} → ${tin}, out ${tout}. Reason: ${reason}`);
        toast('Correction saved and logged');
      });
      return;
    }
    setPunches(prev => ({ ...prev, [r.staff.id]: { timeIn: tin, timeOut: tout, source: 'Manual' } }));
    logAudit('Staff attendance', `Manual entry ${r.staff.name} ${TODAY}: ${tin}–${tout}`);
    setSel(null);
    toast('Manual entry saved');
  };

  return (
    <>
      <ListScreen
        title="Staff attendance"
        subtitle={`Thursday ${TODAY} · ${synced ? 'device synced' : 'device not synced'}`}
        items={rows}
        keyOf={r => r.staff.id}
        searchText={r => `${r.staff.name} ${r.staff.id}`}
        filters={[{ label: 'Status', options: ['All', 'Present', 'Late', 'Half day', 'Short leave', 'Early leave', 'Absent', 'Leave'], get: r => r.status }]}
        header={
          <>
            <KpiGrid>
              <Kpi label="Present" value={String(count('Present'))} tone="success" />
              <Kpi label="Late" value={String(count('Late'))} tone="warn" />
              <Kpi label="Absent" value={String(count('Absent'))} tone="danger" />
              <Kpi label="On leave" value={String(count('Leave'))} />
            </KpiGrid>
            <Card title="Timing rules (from settings)">
              <Note>
                Start {TIMING_RULES.start} with {TIMING_RULES.graceMins} min grace · after {TIMING_RULES.halfDayAfter} = half day · end {TIMING_RULES.end} · leaving up to 30 min early = early leave, up to {TIMING_RULES.shortLeaveMaxMins / 60} h = short leave, more = half day. Approved leaves show automatically.
              </Note>
            </Card>
            {monthLocked ? <InfoBanner tone="warn" icon={Lock} text={`${monthLabel(THIS_MONTH)} is locked by HR. Changes need an approved correction.`} /> : null}
            <View style={ws.buttons}>
              <Button
                label={synced ? 'Sync again' : 'Sync device'}
                icon={RefreshCw}
                variant="outline"
                style={ws.flex}
                onPress={() => {
                  setSynced(true);
                  logAudit('Staff attendance', `Biometric device sync ${TODAY}: ${rows.length} employees`);
                  toast('Imported time in/out from the biometric device (demo)');
                }}
              />
              <Button label="Monthly sheet" icon={ClipboardList} variant="outline" style={ws.flex} onPress={() => nav.push('AdminStaffAttSheet')} />
            </View>
          </>
        }
        renderItem={(r, last) => (
          <ListRow
            avatar={r.staff.name}
            title={r.staff.name}
            subtitle={`${r.staff.id} · in ${r.timeIn ?? '—'} · out ${r.timeOut ?? '—'} · ${r.source}`}
            right={<Badge label={r.status} tone={tone(r.status)} />}
            onPress={() => {
              if (ro) {
                toast('Closed session: read-only');
                return;
              }
              setSel(r);
              setTin(r.timeIn ?? '07:40');
              setTout(r.timeOut ?? '13:40');
            }}
            last={last}
          />
        )}
      />
      <BottomSheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View>
            <Text style={ws.title}>{sel.staff.name}</Text>
            <Text style={ws.small}>{sel.source === 'Device' ? 'Device time; changing it is a correction with a reason.' : 'Manual entry (no device record).'}</Text>
            <View style={ws.gap} />
            <PickerField label="Time in" value={tin} options={TIMES} onChange={setTin} />
            <PickerField label="Time out" value={tout} options={TIMES} onChange={setTout} />
            <Note>Will be marked: {classifyAttendance(tin, tout)}</Note>
            <View style={ws.gap} />
            <Button label={monthLocked ? 'Request correction' : sel.source === 'Device' ? 'Save correction' : 'Save manual entry'} onPress={saveManual} />
          </View>
        ) : null}
      </BottomSheet>
      {reasonEl}
    </>
  );
}

const SHEET_MONTHS = [202609, 202610];

export function AdminStaffAttSheet(_: ScreenProps) {
  const [role] = useStaffRole();
  const [staff] = useHrStaff();
  const [locked, setLocked] = useAttLocked();
  const [month, setMonth] = useState(monthLabel(THIS_MONTH));
  const key = SHEET_MONTHS.find(m => monthLabel(m) === month) ?? THIS_MONTH;
  const [reasonEl, askReason] = useReasonPrompt();
  const active = staff.map((s, i) => ({ s, i })).filter(({ s }) => s.status !== 'Left');
  const isLocked = !!locked[key];
  return (
    <Screen title="Monthly attendance sheet" subtitle={`${month} · ${isLocked ? 'locked for payroll' : 'open'}`} right={<ExportButton title={`Staff attendance ${month}`} />}>
      <PickerField label="Month" value={month} options={SHEET_MONTHS.map(monthLabel)} onChange={setMonth} />
      <Card>
        <Table
          columns={['Employee', 'Present', 'Late', 'Absent', 'Leave', 'Half day']}
          rows={active.map(({ s, i }) => {
            const m = monthSummary(i);
            return [s.name, m.present, m.lates, m.absents, m.leaves, m.halfDays];
          })}
        />
      </Card>
      {isLocked ? (
        <>
          <InfoBanner tone="success" icon={Lock} text="Locked. Late and absent deductions now go to payroll." />
          <Button
            label="Unlock month"
            icon={LockOpen}
            variant="outline"
            onPress={() => {
              if (role !== 'hr' && role !== 'owner') {
                toast('Only HR or the Owner can unlock');
                return;
              }
              askReason(`Unlock ${month} attendance`, reason => {
                setLocked(prev => ({ ...prev, [key]: false }));
                logAudit('Attendance unlocked', `${month}. Reason: ${reason}`);
              });
            }}
          />
        </>
      ) : (
        <Button
          label="Lock month for payroll"
          icon={Lock}
          onPress={() => {
            if (role !== 'hr' && role !== 'owner' && role !== 'principal') {
              toast('Only HR can lock the month');
              return;
            }
            setLocked(prev => ({ ...prev, [key]: true }));
            logAudit('Attendance locked', `${month} staff attendance locked for payroll`);
            toast(`${month} locked for payroll`);
          }}
        />
      )}
      {reasonEl}
    </Screen>
  );
}

// ---------- Leave management (M-16) ----------

const LEAVE_TYPES: LeaveType[] = ['Casual', 'Sick', 'Annual', 'Maternity', 'Unpaid'];
const FROM_DATES = ['22 Oct', '26 Oct', '2 Nov', '9 Nov', '16 Nov'];

export function AdminLeaveManagement(_: ScreenProps) {
  const nav = useNav();
  const open = useOpen();
  const ro = useReadOnly();
  const [staff, setStaff] = useHrStaff();
  const [leaves, setLeaves] = useStaffLeaves();
  const [policies, setPolicies] = usePolicies();
  const [sel, setSel] = useState<StaffLeave | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [polOpen, setPolOpen] = useState(false);
  const [who, setWho] = useState(staff[0]?.name ?? '');
  const [type, setType] = useState<LeaveType>('Casual');
  const [from, setFrom] = useState(FROM_DATES[2]);
  const [days, setDays] = useState('1');
  const [reason, setReason] = useState('');
  const [polType, setPolType] = useState<LeaveType>('Casual');
  const [polQuota, setPolQuota] = useState('');
  const [polCarry, setPolCarry] = useState('');
  const [lastApproved, setLastApproved] = useState<StaffLeave | null>(null);

  const person = staff.find(s => s.name === who);
  const n = Math.max(0, Math.floor(toNumber(days) || 0));
  const left = person ? person.leave[type].total - person.leave[type].used : 0;
  const split = splitLeave(left, n, type);

  const apply = () => {
    if (!person || !n || !reason.trim()) {
      toast('Choose the employee, days and a reason');
      return;
    }
    setLeaves(prev => [{ id: `sl${prev.length + 10}`, staffId: person.id, type, from, days: n, reason: reason.trim(), status: 'Pending', unpaidDays: split.unpaid && type !== 'Unpaid' ? split.unpaid : undefined }, ...prev]);
    logAudit('Staff leave', `${person.name}: ${n} ${type} day(s) from ${from}${split.unpaid && type !== 'Unpaid' ? ` (${split.unpaid} as unpaid, beyond balance)` : ''}`);
    setApplyOpen(false);
    setReason('');
    toast('Leave request added');
  };

  const decide = (status: 'Approved' | 'Rejected') => {
    if (!sel) {
      return;
    }
    const s = staff.find(x => x.id === sel.staffId);
    if (status === 'Approved' && s) {
      const available = s.leave[sel.type].total - s.leave[sel.type].used;
      const sp = splitLeave(available, sel.days, sel.type);
      setStaff(prev =>
        prev.map(x =>
          x.id === s.id
            ? {
                ...x,
                leave: {
                  ...x.leave,
                  [sel.type]: { ...x.leave[sel.type], used: x.leave[sel.type].used + (sel.type === 'Unpaid' ? sel.days : sp.paid) },
                  Unpaid: { ...x.leave.Unpaid, used: x.leave.Unpaid.used + (sel.type === 'Unpaid' ? 0 : sp.unpaid) },
                },
              }
            : x,
        ),
      );
      setLeaves(prev => prev.map(l => (l.id === sel.id ? { ...l, status, unpaidDays: sel.type === 'Unpaid' ? sel.days : sp.unpaid || undefined } : l)));
      logAudit('Staff leave approved', `${s.name}: ${sel.days} ${sel.type} from ${sel.from}; balance updated${sp.unpaid && sel.type !== 'Unpaid' ? `; ${sp.unpaid} day(s) unpaid (deducted in payroll)` : ''}`);
      setLastApproved(s.department === 'Academics' ? sel : null);
      toast(s.department === 'Academics' ? 'Approved. The teacher’s periods now appear in Substitutions.' : 'Leave approved');
    } else {
      setLeaves(prev => prev.map(l => (l.id === sel.id ? { ...l, status } : l)));
      logAudit('Staff leave rejected', `${staffName(staff, sel.staffId)}: ${sel.type} from ${sel.from}`);
    }
    setSel(null);
  };

  const savePolicy = () => {
    const q = toNumber(polQuota);
    const c = toNumber(polCarry);
    if (!(q >= 0) || !(c >= 0)) {
      toast('Enter the quota and carry-forward days');
      return;
    }
    setPolicies(prev => prev.map(p => (p.type === polType ? { ...p, quota: q, carryForward: c } : p)));
    logAudit('Leave policy', `${polType}: quota ${q}, carry forward ${c}`);
    setPolOpen(false);
  };

  // Approved leaves in October for the calendar view.
  const marks: Record<number, 'leave'> = {};
  leaves
    .filter(l => l.status === 'Approved' && l.from.endsWith('Oct'))
    .forEach(l => {
      const d = Number(l.from.split(' ')[0]);
      for (let i = 0; i < l.days && d + i <= 31; i++) {
        marks[d + i] = 'leave';
      }
    });

  return (
    <>
      <ListScreen
        title="Leave management"
        subtitle="Policies, balances and staff leave approvals"
        items={leaves}
        keyOf={l => l.id}
        searchText={l => `${staffName(staff, l.staffId)} ${l.type} ${l.reason}`}
        filters={[
          { label: 'Status', options: ['All', 'Pending', 'Approved', 'Rejected'], get: l => l.status },
          { label: 'Type', options: ['All', ...LEAVE_TYPES], get: l => l.type },
        ]}
        onAdd={ro ? undefined : () => setApplyOpen(true)}
        addLabel="Apply for leave"
        header={
          <>
            <Card title="Leave policies" action={{ label: 'Edit', onPress: () => setPolOpen(true) }}>
              {policies.map((p, i) => (
                <KV key={p.type} k={p.type} v={p.type === 'Unpaid' ? 'Beyond balance' : `${p.quota} days · carry ${p.carryForward}`} last={i === policies.length - 1} />
              ))}
            </Card>
            <InfoBanner text="Leave beyond the balance is allowed only as unpaid leave and is deducted in payroll." />
            {lastApproved ? (
              <Button label="Open substitutions for approved teacher leave" icon={Repeat} variant="outline" onPress={() => open('AdminSubstitutions')} />
            ) : null}
            <Card title="Leave calendar · October 2026">
              <MonthCalendar year={2026} month={9} marks={marks} selected={22} />
            </Card>
            <Button label="Leave balances" icon={Users} variant="outline" onPress={() => nav.push('AdminLeaveBalances')} />
          </>
        }
        renderItem={(l, last) => (
          <ListRow
            avatar={staffName(staff, l.staffId)}
            title={`${staffName(staff, l.staffId)} · ${l.type}`}
            subtitle={`${l.days} day(s) from ${l.from} · ${l.reason}${l.unpaidDays ? ` · ${l.unpaidDays} unpaid` : ''}`}
            right={<Badge label={l.status} tone={l.status === 'Approved' ? 'success' : l.status === 'Pending' ? 'warn' : 'danger'} />}
            onPress={() => setSel(l)}
            last={last}
          />
        )}
      />
      <BottomSheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View>
            <Text style={ws.title}>{staffName(staff, sel.staffId)} · {sel.type}</Text>
            {(() => {
              const s = staff.find(x => x.id === sel.staffId);
              const avail = s ? s.leave[sel.type].total - s.leave[sel.type].used : 0;
              const sp = splitLeave(avail, sel.days, sel.type);
              return (
                <>
                  <KV k="Days" v={`${sel.days} from ${sel.from}`} />
                  <KV k="Balance" v={sel.type === 'Unpaid' ? '—' : `${avail} ${sel.type} left`} />
                  <KV k="Paid / unpaid" v={`${sp.paid} / ${sp.unpaid}`} />
                  <KV k="Reason" v={sel.reason} last />
                </>
              );
            })()}
            <View style={ws.gap} />
            {sel.status === 'Pending' ? (
              <View style={ws.buttons}>
                <Button label="Reject" variant="danger" style={ws.flex} onPress={() => decide('Rejected')} />
                <Button label="Approve" style={ws.flex} onPress={() => decide('Approved')} />
              </View>
            ) : (
              <Note>Already {sel.status.toLowerCase()}.</Note>
            )}
          </View>
        ) : null}
      </BottomSheet>
      <FormSheet visible={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for leave" submitLabel="Send request" onSubmit={apply}>
        <PickerField label="Employee" value={who} options={staff.filter(s => s.status !== 'Left').map(s => s.name)} onChange={setWho} />
        <Chips options={LEAVE_TYPES} value={type} onChange={v => setType(v as LeaveType)} />
        <PickerField label="From" value={from} options={FROM_DATES} onChange={setFrom} />
        <Field label="Days" value={days} onChangeText={setDays} keyboardType="number-pad" />
        <Field label="Reason" value={reason} onChangeText={setReason} />
        {person && n ? (
          <InfoBanner
            tone={split.unpaid && type !== 'Unpaid' ? 'warn' : 'info'}
            text={type === 'Unpaid' ? `${n} unpaid day(s), deducted in payroll.` : split.unpaid ? `Only ${left} ${type} day(s) left: ${split.paid} paid + ${split.unpaid} unpaid.` : `${n} ${type} day(s); ${left - n} left after this.`}
          />
        ) : null}
      </FormSheet>
      <FormSheet visible={polOpen} onClose={() => setPolOpen(false)} title="Leave policy" onSubmit={savePolicy}>
        <Chips options={LEAVE_TYPES.filter(t => t !== 'Unpaid')} value={polType} onChange={v => setPolType(v as LeaveType)} />
        <Field label="Yearly quota (days)" value={polQuota} onChangeText={setPolQuota} keyboardType="number-pad" />
        <Field label="Carry forward (max days)" value={polCarry} onChangeText={setPolCarry} keyboardType="number-pad" />
      </FormSheet>
    </>
  );
}

export function AdminLeaveBalances(_: ScreenProps) {
  const nav = useNav();
  const [staff] = useHrStaff();
  return (
    <ListScreen
      title="Leave balances"
      subtitle="Per employee"
      items={staff.filter(s => s.status !== 'Left')}
      keyOf={s => s.id}
      searchText={s => `${s.name} ${s.id}`}
      filters={[{ label: 'Campus', options: ['All', 'Main Campus', 'Girls Campus', 'Johar Town Campus'], get: s => campusName(s.campus) }]}
      renderItem={(s, last) => (
        <ListRow
          avatar={s.name}
          title={s.name}
          subtitle={`Casual ${s.leave.Casual.total - s.leave.Casual.used}/${s.leave.Casual.total} · Sick ${s.leave.Sick.total - s.leave.Sick.used}/${s.leave.Sick.total} · Annual ${s.leave.Annual.total - s.leave.Annual.used}/${s.leave.Annual.total} · Unpaid ${s.leave.Unpaid.used}`}
          onPress={() => nav.push('AdminStaffProfile', { id: s.id })}
          last={last}
        />
      )}
    />
  );
}
