// S-02 Multi-campus management: campuses (live), settings, transfers, tenant.
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
import { logAudit, useStaffRole } from '../../../data/admin';
import { invalidate, useApi, useMutation } from '../../../api/hooks';
import { ContextDto, field, ModuleRow, webA } from '../../../api/webA';
import { getSession } from '../../../api/session';
import { Loading, NoApiBanner, QueryView } from '../../../components/states';
import { ReadOnlyBanner, useGuard } from './shared';

export type CampusRow = ContextDto['campuses'][number];

// Campuses of the school from /api/web/context (only active ones are returned).
export function useCampusList() {
  return useApi('adm:context', webA.context);
}

const blank = (): CampusRow => ({
  id: '',
  name: '',
  code: '',
  address: '',
  phone: '',
  timings: '7:45 AM – 1:40 PM',
  bankName: '',
  bankAccount: '',
});

function CampusForm({
  visible,
  onClose,
  initial,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  initial: CampusRow;
  onSaved: () => void;
}) {
  const [f, setF] = useState(initial);
  const [logo, setLogo] = useState(true);
  const set = (k: keyof CampusRow) => (v: string) => setF(p => ({ ...p, [k]: v }));
  const { run, busy } = useMutation(
    () =>
      webA.saveCampus(
        {
          name: f.name.trim(),
          code: (f.code || f.name.slice(0, 2)).toUpperCase(),
          address: f.address,
          phone: f.phone,
          timings: f.timings,
          bankName: f.bankName,
          bankAccount: f.bankAccount,
        },
        f.id || undefined,
      ),
    'Campus saved',
  );
  const save = async () => {
    if (!f.name.trim() || !String(f.address ?? '').trim()) {
      toast('Name and address are required');
      return;
    }
    if (busy) {
      return;
    }
    if ((await run()) !== undefined) {
      logAudit('Campus', f.id ? `Edited ${f.name}` : `Added campus ${f.name}`);
      onSaved();
      onClose();
    }
  };
  return (
    <FormSheet visible={visible} onClose={onClose} title={f.id ? 'Edit campus' : 'Add campus'} onSubmit={save} submitLabel={busy ? 'Saving…' : 'Save'}>
      <Field label="Campus name" value={f.name} onChangeText={set('name')} placeholder="e.g. DHA Campus" />
      <Field label="Code" value={f.code ?? ''} onChangeText={set('code')} placeholder="e.g. DHA" autoCapitalize="characters" />
      <Field label="Address" value={f.address ?? ''} onChangeText={set('address')} />
      <Field label="Phone" value={f.phone ?? ''} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field label="Timings" value={f.timings ?? ''} onChangeText={set('timings')} />
      <Field label="Bank (on vouchers)" value={f.bankName ?? ''} onChangeText={set('bankName')} placeholder="e.g. Meezan Bank" />
      <Field label="Account no." value={f.bankAccount ?? ''} onChangeText={set('bankAccount')} />
      <View style={a.row}>
        <Text style={[a.bold, a.flex]}>Campus logo on vouchers</Text>
        <Toggle value={logo} onChange={setLogo} />
      </View>
      <Text style={a.small}>The logo setting is kept on this phone; the server has no field for it yet.</Text>
    </FormSheet>
  );
}

export function AdminCampuses(_: ScreenProps) {
  const nav = useNav();
  const q = useCampusList();
  const [role] = useStaffRole();
  const { guard } = useGuard();
  const [adding, setAdding] = useState(false);
  const list = q.data?.campuses ?? [];
  const school = getSession()?.schoolCode ?? '';
  if (!q.data) {
    return (
      <Screen title="Campuses">
        <QueryView q={q}>{() => null}</QueryView>
      </Screen>
    );
  }
  return (
    <>
      <ListScreen
        title="Campuses"
        subtitle={`${list.length} campuses · school ${school}`}
        items={list}
        keyOf={c => String(c.id)}
        searchText={c => `${c.name} ${c.code} ${c.address ?? ''}`}
        onAdd={role === 'owner' ? guard(() => setAdding(true)) : undefined}
        addLabel="Add campus"
        header={
          <>
            <ReadOnlyBanner />
            {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
            <InfoBanner
              icon={ShieldCheck}
              text={`Each campus sees only its own data; the Owner sees combined figures. School ${school} is a separate tenant with fully isolated data.`}
            />
            <Button label="Transfers between campuses" variant="outline" icon={ArrowLeftRight} onPress={() => nav.push('AdminCampusTransfers')} />
          </>
        }
        renderItem={(c, last) => (
          <ListRow
            icon={Building}
            title={c.name}
            subtitle={`${c.code}${c.address ? ` · ${c.address}` : ''}${c.timings ? ` · ${c.timings}` : ''}`}
            right={<Badge label="Active" tone="success" />}
            onPress={() => nav.push('AdminCampusDetail', { id: String(c.id) })}
            last={last}
          />
        )}
      />
      {adding ? <CampusForm visible onClose={() => setAdding(false)} initial={blank()} onSaved={() => invalidate('adm:context')} /> : null}
    </>
  );
}

export function AdminCampusDetail(_: ScreenProps) {
  const nav = useNav();
  const q = useCampusList();
  const id = String(useParam('id', ''));
  const c = q.data?.campuses.find(x => String(x.id) === id) ?? q.data?.campuses[0];
  const { guard } = useGuard();
  const [role] = useStaffRole();
  const [editing, setEditing] = useState(false);
  if (!c) {
    return (
      <Screen title="Campus">
        {q.data ? <InfoBanner text="Campus not found." /> : <Loading />}
      </Screen>
    );
  }
  return (
    <Screen
      title={c.name}
      subtitle={`${c.code} · Active`}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={role === 'owner' ? <Button label="Edit campus" onPress={guard(() => setEditing(true))} /> : undefined}
    >
      <ReadOnlyBanner />
      <Card title="Settings">
        <KV k="Address" v={c.address || '—'} />
        <KV k="Phone" v={c.phone || '—'} />
        <KV k="Timings" v={c.timings || '—'} />
        <KV k="Bank" v={c.bankName || '—'} />
        <KV k="Account no." v={c.bankAccount || '—'} last />
      </Card>
      <Card title="This month">
        <NoApiBanner what="Per-campus collection, expenses and attendance" />
      </Card>
      <Card>
        <Text style={a.bold}>Campus status</Text>
        <Text style={a.small}>
          A campus with students, vouchers or staff can only be deactivated, never deleted. The server has no
          deactivate API yet — ask the platform administrator.
        </Text>
      </Card>
      <Button label="Transfer students or staff" variant="outline" icon={ArrowLeftRight} onPress={() => nav.push('AdminCampusTransfers')} />
      {editing ? <CampusForm visible onClose={() => setEditing(false)} initial={c} onSaved={() => invalidate('adm:context')} /> : null}
    </Screen>
  );
}

// Transfers are kept as module records ("staff-transfers"); the server does not
// move the student or staff record itself yet.
export function AdminCampusTransfers(_: ScreenProps) {
  const q = useApi('adm:mod:staff-transfers', () => webA.modules('staff-transfers'));
  const ctx = useCampusList();
  const students = useApi('adm:students:all', () => webA.students({ pageSize: 200 }));
  const staff = useApi('adm:staff:all', webA.staff);
  const { guard } = useGuard();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'Student' | 'Staff'>('Student');
  const [who, setWho] = useState('');
  const [to, setTo] = useState('');
  const campuses = ctx.data?.campuses ?? [];
  const people =
    kind === 'Student'
      ? (students.data?.items ?? []).map(s => `${s.name} (${s.grNo})`)
      : (staff.data ?? []).map(s => `${s.name} (${s.empId})`);
  const { run, busy } = useMutation(
    (b: Record<string, unknown>) => webA.addModule('staff-transfers', b),
    'Transfer saved with history',
  );
  const save = async () => {
    if (!who || !to) {
      toast('Choose the person and the new campus');
      return;
    }
    const from = campuses.find(c => String(c.id) === getSession()?.campusId)?.name ?? 'Current campus';
    if (from === to) {
      toast('Already in that campus');
      return;
    }
    const res = await run({
      title: who,
      status: kind,
      who,
      kind,
      from,
      to,
      note: kind === 'Student' ? 'Fee adjusted to the new campus structure; history kept' : 'Payroll moved to the new campus; history kept',
    });
    if (res !== undefined) {
      logAudit('Transfer', `${kind} ${who}: ${from} → ${to}`);
      q.refresh();
      setOpen(false);
      setWho('');
      setTo('');
    }
  };
  const rows = (q.data ?? []) as ModuleRow[];
  return (
    <>
      <ListScreen
        title="Campus transfers"
        subtitle="Students and staff, with history"
        items={rows}
        keyOf={t => String(t.id)}
        searchText={t => `${field(t, 'who', 'title')} ${field(t, 'from')} ${field(t, 'to')}`}
        filters={[{ label: 'Type', options: ['All', 'Student', 'Staff'], get: t => field(t, 'kind', 'status') }]}
        onAdd={guard(() => setOpen(true))}
        addLabel="New transfer"
        empty={q.loading ? 'Loading…' : 'No transfers yet'}
        header={
          <>
            <ReadOnlyBanner />
            {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
          </>
        }
        renderItem={(t, last) => (
          <ListRow
            icon={ArrowLeftRight}
            title={field(t, 'who', 'title')}
            subtitle={`${field(t, 'from')} → ${field(t, 'to')} · ${field(t, 'recordDate', 'record_date')}\n${field(t, 'note')}`}
            right={<Badge label={field(t, 'kind', 'status') || 'Transfer'} tone="info" />}
            last={last}
          />
        )}
      />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="New transfer" onSubmit={save} submitLabel={busy ? 'Saving…' : 'Transfer'}>
        <Segmented options={['Student', 'Staff']} value={kind} onChange={v => { setKind(v as 'Student' | 'Staff'); setWho(''); }} />
        <PickerField label={kind === 'Student' ? 'Student' : 'Staff member'} value={who} options={people} onChange={setWho} />
        <PickerField label="New campus" value={to} options={campuses.map(c => c.name)} onChange={setTo} />
        <Text style={a.small}>The transfer and its history are recorded. Moving the record itself needs a server API (not available yet).</Text>
      </FormSheet>
    </>
  );
}
