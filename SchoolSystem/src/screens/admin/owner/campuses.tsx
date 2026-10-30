// S-02 Multi-campus management: campuses, settings, transfers, tenant.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ArrowLeftRight, Building, ShieldCheck } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  Segmented,
  toast,
  Toggle,
} from '../../../components/ui';
import {
  adminStyles as a,
  FormSheet,
  KV,
  ListScreen,
  PickerField,
} from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { useShared } from '../../../store';
import {
  ADMIN_STAFF,
  ADMIN_STUDENTS,
  Campus,
  CAMPUSES,
  logAudit,
  useStaffRole,
} from '../../../data/admin';
import { Transfer, TRANSFERS } from '../../../data/admin-owner';
import { localId, ReadOnlyBanner, useGuard } from './shared';

type CampusRow = Campus & { logoOnVoucher: boolean; feeStructure: string };

const SEED: CampusRow[] = CAMPUSES.map(c => ({
  ...c,
  logoOnVoucher: true,
  feeStructure: `${c.name} fee structure 2026-27`,
}));

export function useCampuses() {
  return useShared<CampusRow[]>('admin.campusList', SEED);
}

const fmt = (n: number) => `Rs. ${(n / 1000000).toFixed(2)}M`;

const blank = (): CampusRow => ({
  id: '',
  name: '',
  city: 'Lahore',
  address: '',
  timings: '7:45 AM – 1:40 PM',
  bank: '',
  strength: 0,
  capacity: 500,
  staff: 0,
  collection: 0,
  expected: 0,
  expenses: 0,
  attendance: 0,
  active: true,
  logoOnVoucher: true,
  feeStructure: 'Copy from Main Campus',
});

function CampusForm({
  visible,
  onClose,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  initial: CampusRow;
}) {
  const [, setList] = useCampuses();
  const [f, setF] = useState(initial);
  const set = (k: keyof CampusRow) => (v: string) => setF(p => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.name.trim() || !f.address.trim()) {
      toast('Name and address are required');
      return;
    }
    if (f.id) {
      setList(l => l.map(c => (c.id === f.id ? f : c)));
      logAudit('Campus', `Edited ${f.name}: address, timings, bank, voucher logo`);
    } else {
      const id = localId('cmp');
      setList(l => [...l, { ...f, id }]);
      logAudit('Campus', `Added campus ${f.name}`);
    }
    toast('Campus saved');
    onClose();
  };
  return (
    <FormSheet visible={visible} onClose={onClose} title={f.id ? 'Edit campus' : 'Add campus'} onSubmit={save}>
      <Field label="Campus name" value={f.name} onChangeText={set('name')} placeholder="e.g. DHA Campus" />
      <Field label="City" value={f.city} onChangeText={set('city')} />
      <Field label="Address" value={f.address} onChangeText={set('address')} />
      <Field label="Timings" value={f.timings} onChangeText={set('timings')} />
      <Field label="Bank account (on vouchers)" value={f.bank} onChangeText={set('bank')} placeholder="Bank and account no." />
      <PickerField
        label="Fee structure"
        value={f.feeStructure}
        options={['Copy from Main Campus', 'Copy from Girls Campus', 'Separate structure', f.feeStructure].filter((x, i, arr) => arr.indexOf(x) === i)}
        onChange={v => setF(p => ({ ...p, feeStructure: v }))}
      />
      <View style={a.row}>
        <Text style={[a.bold, a.flex]}>Campus logo on vouchers</Text>
        <Toggle value={f.logoOnVoucher} onChange={v => setF(p => ({ ...p, logoOnVoucher: v }))} />
      </View>
    </FormSheet>
  );
}

export function AdminCampuses(_: ScreenProps) {
  const nav = useNav();
  const [list] = useCampuses();
  const [role] = useStaffRole();
  const { guard } = useGuard();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <ListScreen
        title="Campuses"
        subtitle={`${list.length} campuses · tenant BFS-001`}
        items={list}
        keyOf={c => c.id}
        searchText={c => `${c.name} ${c.city} ${c.address}`}
        filters={[{ label: 'Status', options: ['All', 'Active', 'Inactive'], get: c => (c.active ? 'Active' : 'Inactive') }]}
        onAdd={role === 'owner' ? guard(() => setAdding(true)) : undefined}
        addLabel="Add campus"
        header={
          <>
            <ReadOnlyBanner />
            <InfoBanner
              icon={ShieldCheck}
              text="Each campus sees only its own data; the Owner sees combined figures. This school is tenant BFS-001 with fully isolated data."
            />
            <Button label="Transfers between campuses" variant="outline" icon={ArrowLeftRight} onPress={() => nav.push('AdminCampusTransfers')} />
          </>
        }
        renderItem={(c, last) => (
          <ListRow
            icon={Building}
            title={c.name}
            subtitle={`${c.address}, ${c.city} · ${c.strength} students · ${c.staff} staff`}
            right={<Badge label={c.active ? 'Active' : 'Inactive'} tone={c.active ? 'success' : 'neutral'} />}
            onPress={() => nav.push('AdminCampusDetail', { id: c.id })}
            last={last}
          />
        )}
      />
      {adding ? <CampusForm visible onClose={() => setAdding(false)} initial={blank()} /> : null}
    </>
  );
}

export function AdminCampusDetail(_: ScreenProps) {
  const nav = useNav();
  const [list, setList] = useCampuses();
  const id = useParam('id', list[0]?.id ?? 'main');
  const c = list.find(x => x.id === id) ?? list[0];
  const { guard } = useGuard();
  const [role] = useStaffRole();
  const [editing, setEditing] = useState(false);
  if (!c) {
    return <Screen title="Campus" />;
  }
  const toggleActive = guard(() => {
    if (role !== 'owner') {
      toast('Only the Owner can activate or deactivate a campus');
      return;
    }
    setList(l => l.map(x => (x.id === c.id ? { ...x, active: !x.active } : x)));
    logAudit('Campus', `${c.name} ${c.active ? 'deactivated' : 'activated'}`);
  });
  return (
    <Screen
      title={c.name}
      subtitle={`${c.city} · ${c.active ? 'Active' : 'Inactive'}`}
      footer={<Button label="Edit campus" onPress={guard(() => setEditing(true))} />}
    >
      <ReadOnlyBanner />
      <Card title="Settings">
        <KV k="Address" v={c.address} />
        <KV k="Timings" v={c.timings} />
        <KV k="Bank account" v={c.bank || '—'} />
        <KV k="Logo on vouchers" v={c.logoOnVoucher ? 'Yes' : 'No'} />
        <KV k="Fee structure" v={c.feeStructure} />
        <KV k="Capacity" v={`${c.strength} / ${c.capacity}`} last />
      </Card>
      <Card title="This month">
        <KV k="Collection" v={fmt(c.collection)} />
        <KV k="Expected" v={fmt(c.expected)} />
        <KV k="Expenses" v={fmt(c.expenses)} />
        <KV k="Attendance today" v={`${c.attendance}%`} last />
      </Card>
      <Card>
        <View style={a.row}>
          <Text style={[a.bold, a.flex]}>Campus active</Text>
          <Toggle value={c.active} onChange={toggleActive} />
        </View>
        <Text style={a.small}>
          A campus with students, vouchers or staff can only be deactivated, never deleted.
        </Text>
      </Card>
      <Button label="Transfer students or staff" variant="outline" icon={ArrowLeftRight} onPress={() => nav.push('AdminCampusTransfers')} />
      {editing ? <CampusForm visible onClose={() => setEditing(false)} initial={c} /> : null}
    </Screen>
  );
}

export function AdminCampusTransfers(_: ScreenProps) {
  const [list, setList] = useShared<Transfer[]>('admin.transfers', TRANSFERS);
  const [campuses] = useCampuses();
  const { guard } = useGuard();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'Student' | 'Staff'>('Student');
  const [who, setWho] = useState('');
  const [to, setTo] = useState('');
  const people =
    kind === 'Student'
      ? ADMIN_STUDENTS.filter(s => s.status === 'Active').slice(0, 30).map(s => `${s.name} (${s.gr})`)
      : ADMIN_STAFF.filter(s => s.status !== 'Left').map(s => `${s.name} (${s.id})`);
  const findFrom = () => {
    const camp =
      kind === 'Student'
        ? ADMIN_STUDENTS.find(s => who.includes(s.gr))?.campus
        : ADMIN_STAFF.find(s => who.includes(s.id))?.campus;
    return campuses.find(c => c.id === camp)?.name ?? 'Main Campus';
  };
  const save = () => {
    if (!who || !to) {
      toast('Choose the person and the new campus');
      return;
    }
    const from = findFrom();
    if (from === to) {
      toast('Already in that campus');
      return;
    }
    const t: Transfer = {
      id: localId('tr'),
      who,
      kind,
      from,
      to,
      when: 'Today',
      note: kind === 'Student' ? 'Fee adjusted to the new campus structure; history kept' : 'Payroll moved to the new campus; history kept',
    };
    setList(l => [t, ...l]);
    logAudit('Transfer', `${kind} ${who}: ${from} → ${to}`);
    toast('Transfer saved with history');
    setOpen(false);
    setWho('');
    setTo('');
  };
  return (
    <>
      <ListScreen
        title="Campus transfers"
        subtitle="Students and staff, with history"
        items={list}
        keyOf={t => t.id}
        searchText={t => `${t.who} ${t.from} ${t.to}`}
        filters={[{ label: 'Type', options: ['All', 'Student', 'Staff'], get: t => t.kind }]}
        onAdd={guard(() => setOpen(true))}
        addLabel="New transfer"
        header={<ReadOnlyBanner />}
        renderItem={(t, last) => (
          <ListRow
            icon={ArrowLeftRight}
            title={t.who}
            subtitle={`${t.from} → ${t.to} · ${t.when}\n${t.note}`}
            right={<Badge label={t.kind} tone="info" />}
            last={last}
          />
        )}
      />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="New transfer" onSubmit={save} submitLabel="Transfer">
        <Segmented options={['Student', 'Staff']} value={kind} onChange={v => { setKind(v as 'Student' | 'Staff'); setWho(''); }} />
        <PickerField label={kind === 'Student' ? 'Student' : 'Staff member'} value={who} options={people} onChange={setWho} />
        <PickerField label="New campus" value={to} options={campuses.filter(c => c.active).map(c => c.name)} onChange={setTo} />
        <Text style={a.small}>The fee is adjusted to the new campus structure and the full history is kept.</Text>
      </FormSheet>
    </>
  );
}
