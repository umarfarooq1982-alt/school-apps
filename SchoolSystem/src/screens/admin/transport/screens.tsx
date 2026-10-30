// Transport panel (SOW 3.2 G, M-14): vehicles, drivers, routes, student
// assignment with capacity check, boarding log, fuel and maintenance.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Bus,
  Fuel,
  IdCard,
  Lock,
  MapPin,
  Plus,
  Wrench,
} from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  InfoBanner,
  ListRow,
  Screen,
  Segmented,
  Toggle,
  formatRs,
  toast,
} from '../../../components/ui';
import {
  BarChart,
  FormSheet,
  KV,
  ListScreen,
  PickerField,
} from '../../../components/admin';
import { colors, radius } from '../../../theme';
import { ScreenMap, ScreenProps, useNav, useParam } from '../../../navigation';
import { ADMIN_STUDENTS, CLASSES, logAudit, useReadOnly } from '../../../data/admin';
import {
  Driver,
  ExpiryState,
  FuelLog,
  Route,
  Vehicle,
  expiry,
  fmtDate,
  isIsoDate,
  seatsUsed,
  stopFee,
  trId,
  useAssignments,
  useDrivers,
  useFuelLogs,
  useRoutes,
  useTrips,
  useVehicles,
} from '../../../data/admin-transport';
import { useOpen } from '../core';

const cnicOk = (v: string) => v.replace(/\D/g, '').length === 13;

export function ReadOnlyBanner() {
  return (
    <InfoBanner tone="warn" icon={Lock} text="This session is closed. Records are read-only." />
  );
}

export function SmallBtn({
  label,
  onPress,
  tone = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'outline' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        s.small,
        tone === 'primary' && s.smallPrimary,
        tone === 'danger' && s.smallDanger,
        (pressed || disabled) && s.dim,
      ]}
    >
      <Text style={[s.smallText, tone === 'danger' && s.smallTextDanger]}>{label}</Text>
    </Pressable>
  );
}

function worst(v: Vehicle): ExpiryState {
  const list = [v.fitness, v.insurance, v.permit].map(expiry);
  return list.find(e => e.tone === 'danger') ?? list.find(e => e.tone === 'warn') ?? list[0];
}

function docState(v: Vehicle) {
  const w = worst(v);
  return w.tone === 'danger' ? 'Expired' : w.tone === 'warn' ? 'Expiring' : 'Valid';
}

// ---------- Vehicles ----------

function VehicleForm({
  visible,
  onClose,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: Vehicle;
}) {
  const [vehicles, setVehicles] = useVehicles();
  const [routes] = useRoutes();
  const [assign] = useAssignments();
  const [reg, setReg] = useState(initial?.reg ?? '');
  const [model, setModel] = useState(initial?.model ?? 'Toyota Hiace');
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 12));
  const [route, setRoute] = useState(routes.find(r => r.id === initial?.routeId)?.name ?? routes[0].name);
  const [fitness, setFitness] = useState(initial?.fitness ?? '2027-10-22');
  const [insurance, setInsurance] = useState(initial?.insurance ?? '2027-10-22');
  const [permit, setPermit] = useState(initial?.permit ?? '2027-03-31');

  const submit = () => {
    const cap = Number(capacity);
    const r = routes.find(x => x.name === route);
    if (!reg.trim()) {
      toast('Enter the registration number');
      return;
    }
    if (vehicles.some(v => v.reg.toUpperCase() === reg.trim().toUpperCase() && v.id !== initial?.id)) {
      toast('A vehicle with this registration already exists');
      return;
    }
    if (!Number.isInteger(cap) || cap <= 0) {
      toast('Capacity must be a whole number above 0');
      return;
    }
    const used = r ? seatsUsed(assign, r.id) : 0;
    if (cap < used) {
      toast(`${used} students are on ${route}. Capacity cannot be below that.`);
      return;
    }
    if (![fitness, insurance, permit].every(isIsoDate)) {
      toast('Dates must be in YYYY-MM-DD format');
      return;
    }
    const v: Vehicle = {
      id: initial?.id ?? trId('v'),
      reg: reg.trim().toUpperCase(),
      model: model.trim(),
      capacity: cap,
      routeId: r?.id ?? routes[0].id,
      fitness,
      insurance,
      permit,
    };
    setVehicles(list => (initial ? list.map(x => (x.id === v.id ? v : x)) : [v, ...list]));
    logAudit('Vehicle', `${initial ? 'Updated' : 'Added'} ${v.reg} (${v.model}, ${v.capacity} seats)`);
    toast(initial ? 'Vehicle updated' : 'Vehicle added');
    onClose();
  };

  return (
    <FormSheet visible={visible} onClose={onClose} title={initial ? `Edit ${initial.reg}` : 'Add vehicle'} onSubmit={submit}>
      <Field label="Registration no." value={reg} onChangeText={setReg} autoCapitalize="characters" placeholder="LEA-0000" />
      <Field label="Model" value={model} onChangeText={setModel} />
      <Field label="Seats / capacity" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
      <PickerField label="Route" value={route} options={routes.map(r => r.name)} onChange={setRoute} />
      <Field label="Fitness expiry (YYYY-MM-DD)" value={fitness} onChangeText={setFitness} />
      <Field label="Insurance expiry (YYYY-MM-DD)" value={insurance} onChangeText={setInsurance} />
      <Field label="Route permit expiry (YYYY-MM-DD)" value={permit} onChangeText={setPermit} />
    </FormSheet>
  );
}

export function AdminVehicles(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [vehicles] = useVehicles();
  const [routes] = useRoutes();
  const [assign] = useAssignments();
  const [form, setForm] = useState(false);
  const due = vehicles.filter(v => worst(v).tone !== 'success');
  return (
    <>
      <ListScreen
        title="Vehicles"
        subtitle={`${vehicles.length} vehicles · reminders 30 days before expiry`}
        items={vehicles}
        keyOf={v => v.id}
        searchText={v => `${v.reg} ${v.model} ${routes.find(r => r.id === v.routeId)?.name ?? ''}`}
        filters={[{ label: 'Documents', options: ['All', 'Expiring', 'Expired', 'Valid'], get: docState }]}
        header={
          <>
            {ro ? <ReadOnlyBanner /> : null}
            {due.length ? (
              <InfoBanner
                tone="warn"
                icon={Bell}
                text={`${due.length} vehicles have a fitness, insurance or route permit expiring or expired.`}
              />
            ) : null}
          </>
        }
        renderItem={(v, last) => {
          const w = worst(v);
          const r = routes.find(x => x.id === v.routeId);
          return (
            <ListRow
              icon={Bus}
              title={v.reg}
              subtitle={`${v.model} · ${seatsUsed(assign, v.routeId)}/${v.capacity} seats · ${r?.name ?? '—'}`}
              right={<Badge label={w.label} tone={w.tone} />}
              onPress={() => nav.push('AdminVehicleDetail', { id: v.id })}
              last={last}
            />
          );
        }}
        onAdd={ro ? undefined : () => setForm(true)}
        addLabel="Add vehicle"
      />
      {form ? <VehicleForm visible={form} onClose={() => setForm(false)} /> : null}
    </>
  );
}

export function AdminVehicleDetail(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const id = useParam('id', 'v3');
  const [vehicles] = useVehicles();
  const [routes] = useRoutes();
  const [drivers] = useDrivers();
  const [assign] = useAssignments();
  const [edit, setEdit] = useState(false);
  const v = vehicles.find(x => x.id === id) ?? vehicles[0];
  const r = routes.find(x => x.id === v.routeId);
  const crew = drivers.filter(d => d.vehicleId === v.id);
  const docs: Array<[string, string]> = [
    ['Fitness certificate', v.fitness],
    ['Insurance', v.insurance],
    ['Route permit', v.permit],
  ];
  return (
    <Screen title={v.reg} subtitle={`${v.model} · ${v.capacity} seats`}>
      {ro ? <ReadOnlyBanner /> : null}
      <Card title="Vehicle">
        <KV k="Registration" v={v.reg} />
        <KV k="Model" v={v.model} />
        <KV k="Capacity" v={`${v.capacity} seats`} />
        <KV k="Seats used" v={`${seatsUsed(assign, v.routeId)} of ${v.capacity}`} />
        <KV k="Route" v={r ? `${r.name} · ${r.area}` : '—'} last />
      </Card>
      <Card title="Documents and reminders">
        {docs.map(([k, d], i) => {
          const e = expiry(d);
          return (
            <ListRow
              key={k}
              icon={IdCard}
              title={k}
              subtitle={`Expires ${fmtDate(d)}`}
              right={<Badge label={e.label} tone={e.tone} />}
              last={i === docs.length - 1}
            />
          );
        })}
      </Card>
      <Card title="Crew">
        {crew.length ? (
          crew.map((d, i) => (
            <ListRow key={d.id} avatar={d.name} title={d.name} subtitle={`${d.role} · ${d.mobile}`} last={i === crew.length - 1} />
          ))
        ) : (
          <Text style={s.muted}>No driver assigned.</Text>
        )}
      </Card>
      <Button
        label="Send expiry reminder"
        icon={Bell}
        variant="outline"
        onPress={() => {
          logAudit('Reminder', `Expiry reminder sent for ${v.reg}`);
          toast('Reminder sent to the Transport Manager');
        }}
      />
      {r ? (
        <Button label="Open route" icon={MapPin} variant="outline" onPress={() => nav.push('AdminRouteDetail', { id: r.id })} />
      ) : null}
      {ro ? null : <Button label="Edit vehicle" onPress={() => setEdit(true)} />}
      {edit ? <VehicleForm visible={edit} onClose={() => setEdit(false)} initial={v} /> : null}
    </Screen>
  );
}

// ---------- Drivers & conductors ----------

function DriverForm({
  visible,
  onClose,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: Driver;
}) {
  const [drivers, setDrivers] = useDrivers();
  const [vehicles] = useVehicles();
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState<string>(initial?.role ?? 'Driver');
  const [cnic, setCnic] = useState(initial?.cnic ?? '');
  const [mobile, setMobile] = useState(initial?.mobile ?? '');
  const [licence, setLicence] = useState(initial?.licence ?? '2028-01-01');
  const [vehicle, setVehicle] = useState(vehicles.find(v => v.id === initial?.vehicleId)?.reg ?? vehicles[0].reg);
  const submit = () => {
    if (!name.trim()) {
      toast('Enter the name');
    } else if (!cnicOk(cnic)) {
      toast('CNIC must have 13 digits');
    } else if (drivers.some(d => d.cnic.replace(/\D/g, '') === cnic.replace(/\D/g, '') && d.id !== initial?.id)) {
      toast('This CNIC is already registered');
    } else if (mobile.replace(/\D/g, '').length < 10) {
      toast('Enter a valid mobile number');
    } else if (!isIsoDate(licence)) {
      toast('Licence expiry must be YYYY-MM-DD');
    } else {
      const d: Driver = {
        id: initial?.id ?? trId('d'),
        name: name.trim(),
        role: role === 'Conductor' ? 'Conductor' : 'Driver',
        cnic,
        mobile,
        licence,
        vehicleId: vehicles.find(v => v.reg === vehicle)?.id ?? vehicles[0].id,
      };
      setDrivers(list => (initial ? list.map(x => (x.id === d.id ? d : x)) : [d, ...list]));
      logAudit('Driver', `${initial ? 'Updated' : 'Added'} ${d.role} ${d.name}`);
      toast(initial ? 'Record updated' : 'Record added');
      onClose();
    }
  };
  return (
    <FormSheet visible={visible} onClose={onClose} title={initial ? `Edit ${initial.name}` : 'Add driver or conductor'} onSubmit={submit}>
      <Field label="Full name" value={name} onChangeText={setName} />
      <Segmented options={['Driver', 'Conductor']} value={role} onChange={setRole} />
      <Field label="CNIC" value={cnic} onChangeText={setCnic} keyboardType="number-pad" placeholder="35202-1234567-1" />
      <Field label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      <Field label="Licence expiry (YYYY-MM-DD)" value={licence} onChangeText={setLicence} />
      <PickerField label="Vehicle" value={vehicle} options={vehicles.map(v => v.reg)} onChange={setVehicle} />
    </FormSheet>
  );
}

export function AdminDrivers(_: ScreenProps) {
  const ro = useReadOnly();
  const [drivers] = useDrivers();
  const [vehicles] = useVehicles();
  const [form, setForm] = useState<Driver | 'new' | null>(null);
  const expiring = drivers.filter(d => expiry(d.licence).tone !== 'success');
  return (
    <>
      <ListScreen
        title="Drivers & conductors"
        subtitle={`${drivers.length} records`}
        items={drivers}
        keyOf={d => d.id}
        searchText={d => `${d.name} ${d.cnic} ${d.mobile}`}
        filters={[
          { label: 'Role', options: ['All', 'Driver', 'Conductor'], get: d => d.role },
          {
            label: 'Licence',
            options: ['All', 'Expiring', 'Expired', 'Valid'],
            get: d => {
              const t = expiry(d.licence).tone;
              return t === 'danger' ? 'Expired' : t === 'warn' ? 'Expiring' : 'Valid';
            },
          },
        ]}
        header={
          <>
            {ro ? <ReadOnlyBanner /> : null}
            {expiring.length ? (
              <InfoBanner tone="warn" icon={Bell} text={`${expiring.length} licences are expiring or expired.`} />
            ) : null}
          </>
        }
        renderItem={(d, last) => {
          const e = expiry(d.licence);
          return (
            <ListRow
              avatar={d.name}
              title={d.name}
              subtitle={`${d.role} · ${d.cnic} · ${vehicles.find(v => v.id === d.vehicleId)?.reg ?? '—'} · licence ${fmtDate(d.licence)}`}
              right={<Badge label={e.label} tone={e.tone} />}
              onPress={ro ? undefined : () => setForm(d)}
              last={last}
            />
          );
        }}
        onAdd={ro ? undefined : () => setForm('new')}
        addLabel="Add driver or conductor"
      />
      {form ? (
        <DriverForm visible onClose={() => setForm(null)} initial={form === 'new' ? undefined : form} />
      ) : null}
    </>
  );
}

// ---------- Routes & stops ----------

function RouteForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [routes, setRoutes] = useRoutes();
  const [vehicles] = useVehicles();
  const [name, setName] = useState(`Route ${routes.length + 1}`);
  const [area, setArea] = useState('');
  const [vehicle, setVehicle] = useState(vehicles[0].reg);
  const [mode, setMode] = useState<string>('Per route');
  const [fee, setFee] = useState('3000');
  const submit = () => {
    if (!name.trim() || !area.trim()) {
      toast('Enter the route name and area');
      return;
    }
    if (mode === 'Per route' && !(Number(fee) > 0)) {
      toast('Enter the route fee');
      return;
    }
    const r: Route = {
      id: trId('r'),
      name: name.trim(),
      area: area.trim(),
      vehicleId: vehicles.find(v => v.reg === vehicle)?.id ?? vehicles[0].id,
      feeMode: mode === 'Per stop' ? 'Per stop' : 'Per route',
      fee: mode === 'Per route' ? Number(fee) : 0,
      stops: [],
    };
    setRoutes(list => [...list, r]);
    logAudit('Route', `Added ${r.name} (${r.area})`);
    toast('Route added. Add its stops next.');
    onClose();
  };
  return (
    <FormSheet visible={visible} onClose={onClose} title="Add route" onSubmit={submit}>
      <Field label="Route name" value={name} onChangeText={setName} />
      <Field label="Area" value={area} onChangeText={setArea} placeholder="e.g. Wapda Town" />
      <PickerField label="Vehicle" value={vehicle} options={vehicles.map(v => v.reg)} onChange={setVehicle} />
      <Segmented options={['Per route', 'Per stop']} value={mode} onChange={setMode} />
      {mode === 'Per route' ? (
        <Field label="Monthly fee (Rs.)" value={fee} onChangeText={setFee} keyboardType="number-pad" />
      ) : null}
    </FormSheet>
  );
}

export function AdminRoutes(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [routes] = useRoutes();
  const [vehicles] = useVehicles();
  const [assign] = useAssignments();
  const [form, setForm] = useState(false);
  return (
    <>
      <ListScreen
        title="Routes & stops"
        subtitle={`${routes.length} routes`}
        items={routes}
        keyOf={r => r.id}
        searchText={r => `${r.name} ${r.area} ${r.stops.map(x => x.name).join(' ')}`}
        filters={[{ label: 'Fee', options: ['All', 'Per route', 'Per stop'], get: r => r.feeMode }]}
        header={ro ? <ReadOnlyBanner /> : null}
        renderItem={(r, last) => {
          const v = vehicles.find(x => x.id === r.vehicleId);
          return (
            <ListRow
              icon={MapPin}
              title={`${r.name} · ${r.area}`}
              subtitle={`${r.stops.length} stops · ${v?.reg ?? '—'} · ${seatsUsed(assign, r.id)}/${v?.capacity ?? 0} seats`}
              right={<Text style={s.amount}>{r.feeMode === 'Per route' ? formatRs(r.fee) : 'Per stop'}</Text>}
              onPress={() => nav.push('AdminRouteDetail', { id: r.id })}
              chevron
              last={last}
            />
          );
        }}
        onAdd={ro ? undefined : () => setForm(true)}
        addLabel="Add route"
      />
      {form ? <RouteForm visible={form} onClose={() => setForm(false)} /> : null}
    </>
  );
}

export function AdminRouteDetail(_: ScreenProps) {
  const ro = useReadOnly();
  const id = useParam('id', 'r3');
  const [routes, setRoutes] = useRoutes();
  const [vehicles] = useVehicles();
  const [assign] = useAssignments();
  const route = routes.find(r => r.id === id) ?? routes[0];
  const v = vehicles.find(x => x.id === route.vehicleId);
  const [mode, setMode] = useState<string>(route.feeMode);
  const [fee, setFee] = useState(String(route.fee || ''));
  const [stopForm, setStopForm] = useState<{ index: number } | null>(null);
  const [stopName, setStopName] = useState('');
  const [pickup, setPickup] = useState('7:00 AM');
  const [drop, setDrop] = useState('1:45 PM');
  const [stopFeeText, setStopFeeText] = useState('3000');

  const update = (next: Route, detail: string) => {
    setRoutes(list => list.map(r => (r.id === next.id ? next : r)));
    logAudit('Route', detail);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= route.stops.length) {
      return;
    }
    const stops = [...route.stops];
    [stops[i], stops[j]] = [stops[j], stops[i]];
    update({ ...route, stops }, `${route.name}: moved stop ${route.stops[i].name}`);
  };

  const openStop = (index: number) => {
    const st = route.stops[index];
    setStopName(st?.name ?? '');
    setPickup(st?.pickup ?? '7:00 AM');
    setDrop(st?.drop ?? '1:45 PM');
    setStopFeeText(String(st?.fee ?? route.fee ?? 3000));
    setStopForm({ index });
  };

  const timeOk = (t: string) => /^\d{1,2}:\d{2} (AM|PM)$/i.test(t.trim());

  const saveStop = () => {
    if (!stopName.trim()) {
      toast('Enter the stop name');
      return;
    }
    if (!timeOk(pickup) || !timeOk(drop)) {
      toast('Times must look like 7:05 AM');
      return;
    }
    const f = Number(stopFeeText);
    if (route.feeMode === 'Per stop' && !(f > 0)) {
      toast('Enter the stop fee');
      return;
    }
    const idx = stopForm?.index ?? -1;
    const existing = route.stops[idx];
    const st = {
      id: existing?.id ?? trId('s'),
      name: stopName.trim(),
      pickup: pickup.trim().toUpperCase(),
      drop: drop.trim().toUpperCase(),
      fee: route.feeMode === 'Per stop' ? f : route.fee,
    };
    const stops = existing ? route.stops.map((x, i) => (i === idx ? st : x)) : [...route.stops, st];
    update({ ...route, stops }, `${route.name}: ${existing ? 'updated' : 'added'} stop ${st.name}`);
    setStopForm(null);
    toast(existing ? 'Stop updated' : 'Stop added');
  };

  const saveFee = () => {
    const f = Number(fee);
    if (mode === 'Per route' && !(f > 0)) {
      toast('Enter the route fee');
      return;
    }
    update(
      { ...route, feeMode: mode === 'Per stop' ? 'Per stop' : 'Per route', fee: mode === 'Per route' ? f : 0 },
      `${route.name}: fee set ${mode === 'Per route' ? formatRs(f) + ' per route' : 'per stop'}`,
    );
    toast('Fee saved. New vouchers use this fee.');
  };

  return (
    <Screen title={route.name} subtitle={`${route.area} · ${v?.reg ?? 'no vehicle'}`}>
      {ro ? <ReadOnlyBanner /> : null}
      <Card title="Route">
        <KV k="Vehicle" v={v ? `${v.reg} · ${v.model}` : '—'} />
        <KV k="Seats used" v={`${seatsUsed(assign, route.id)} of ${v?.capacity ?? 0}`} />
        <KV k="Stops" v={String(route.stops.length)} last />
      </Card>
      <Card title="Stops in order">
        {route.stops.length === 0 ? <Text style={s.muted}>No stops yet.</Text> : null}
        {route.stops.map((st, i) => (
          <ListRow
            key={st.id}
            icon={MapPin}
            title={`${i + 1}. ${st.name}`}
            subtitle={`Pick-up ${st.pickup} · Drop ${st.drop}${route.feeMode === 'Per stop' ? ` · ${formatRs(st.fee)}` : ''}`}
            onPress={ro ? undefined : () => openStop(i)}
            right={
              ro ? undefined : (
                <View style={s.row}>
                  <IconButton icon={ArrowUp} onPress={() => move(i, -1)} style={s.iconSm} />
                  <IconButton icon={ArrowDown} onPress={() => move(i, 1)} style={s.iconSm} />
                </View>
              )
            }
            last={i === route.stops.length - 1}
          />
        ))}
      </Card>
      {ro ? null : (
        <>
          <Button label="Add stop" icon={Plus} variant="outline" onPress={() => openStop(route.stops.length)} />
          <Card title="Transport fee">
            <Segmented options={['Per route', 'Per stop']} value={mode} onChange={setMode} />
            <View style={s.gap} />
            {mode === 'Per route' ? (
              <Field label="Monthly fee for the whole route (Rs.)" value={fee} onChangeText={setFee} keyboardType="number-pad" />
            ) : (
              <Text style={s.muted}>Each stop has its own fee. Tap a stop to change it.</Text>
            )}
            <View style={s.gap} />
            <Button label="Save fee" onPress={saveFee} />
          </Card>
        </>
      )}
      {stopForm ? (
        <FormSheet
          visible
          onClose={() => setStopForm(null)}
          title={route.stops[stopForm.index] ? 'Edit stop' : 'Add stop'}
          onSubmit={saveStop}
        >
          <Field label="Stop name" value={stopName} onChangeText={setStopName} />
          <Field label="Pick-up time" value={pickup} onChangeText={setPickup} placeholder="7:05 AM" />
          <Field label="Drop time" value={drop} onChangeText={setDrop} placeholder="1:40 PM" />
          {route.feeMode === 'Per stop' ? (
            <Field label="Monthly fee for this stop (Rs.)" value={stopFeeText} onChangeText={setStopFeeText} keyboardType="number-pad" />
          ) : null}
        </FormSheet>
      ) : null}
    </Screen>
  );
}

// ---------- Student assignment (capacity check) ----------

export function AdminTransportAssign(_: ScreenProps) {
  const ro = useReadOnly();
  const [routes] = useRoutes();
  const [vehicles] = useVehicles();
  const [assign, setAssign] = useAssignments();
  const [routeName, setRouteName] = useState('Route 3');
  const route = routes.find(r => r.name === routeName) ?? routes[0];
  const [stopName, setStopName] = useState(route.stops[0]?.name ?? '');
  const stop = route.stops.find(x => x.name === stopName) ?? route.stops[0];
  const v = vehicles.find(x => x.id === route.vehicleId);
  const used = seatsUsed(assign, route.id);
  const cap = v?.capacity ?? 0;
  const students = useMemo(() => ADMIN_STUDENTS.filter(st => st.status === 'Active'), []);

  const statusOf = (id: string) => {
    const a = assign[id];
    if (!a) {
      return 'Not assigned';
    }
    return a.routeId === route.id ? 'On this route' : 'Other route';
  };

  const doAssign = (id: string, name: string) => {
    if (!stop) {
      toast('This route has no stops yet');
      return;
    }
    const current = assign[id];
    if (current?.routeId === route.id && current.stopId === stop.id) {
      return;
    }
    // A vehicle cannot carry more students than its capacity (M-14).
    if (current?.routeId !== route.id && used >= cap) {
      toast(`${v?.reg ?? 'Vehicle'} is full (${used}/${cap}). Choose another route or a bigger vehicle.`);
      return;
    }
    const fee = stopFee(route, stop.id);
    setAssign(prev => ({ ...prev, [id]: { routeId: route.id, stopId: stop.id } }));
    logAudit('Transport', `${name} assigned to ${route.name} · ${stop.name}; transport fee ${formatRs(fee)} added to voucher`);
    toast(`${name} assigned. Transport fee ${formatRs(fee)} is added to the next voucher.`);
  };

  const remove = (id: string, name: string) => {
    setAssign(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    logAudit('Transport', `${name} removed from transport`);
    toast(`${name} removed. Transport fee stops from the next voucher.`);
  };

  return (
    <ListScreen
      title="Student assignment"
      subtitle={`${Object.keys(assign).length} students on transport`}
      items={students}
      keyOf={st => st.id}
      searchText={st => `${st.name} ${st.gr} ${st.className}`}
      filters={[
        { label: 'Status', options: ['All', 'On this route', 'Not assigned', 'Other route'], get: st => statusOf(st.id) },
        { label: 'Class', options: ['All', ...CLASSES.slice(3)], get: st => st.className },
      ]}
      header={
        <>
          {ro ? <ReadOnlyBanner /> : null}
          <PickerField
            label="Route"
            value={routeName}
            options={routes.map(r => r.name)}
            onChange={n => {
              setRouteName(n);
              setStopName(routes.find(r => r.name === n)?.stops[0]?.name ?? '');
            }}
          />
          <PickerField label="Stop" value={stop?.name ?? ''} options={route.stops.map(x => x.name)} onChange={setStopName} placeholder="No stops" />
          <Card>
            <KV k="Vehicle" v={v ? `${v.reg} · ${v.model}` : '—'} />
            <KV k="Seats used" v={<Badge label={`${used} / ${cap}`} tone={used >= cap ? 'danger' : used >= cap - 2 ? 'warn' : 'success'} />} />
            <KV k="Fee for this stop" v={stop ? formatRs(stopFee(route, stop.id)) : '—'} last />
          </Card>
        </>
      }
      renderItem={(st, last) => {
        const a = assign[st.id];
        const r = a ? routes.find(x => x.id === a.routeId) : undefined;
        const where = a && r ? `${r.name} · ${r.stops.find(x => x.id === a.stopId)?.name ?? ''}` : 'No transport';
        return (
          <ListRow
            avatar={st.name}
            title={st.name}
            subtitle={`${st.gr} · ${st.className}-${st.section} · ${where}`}
            right={
              ro ? undefined : a?.routeId === route.id ? (
                <SmallBtn label="Remove" tone="danger" onPress={() => remove(st.id, st.name)} />
              ) : (
                <SmallBtn label={a ? 'Move here' : 'Assign'} onPress={() => doAssign(st.id, st.name)} />
              )
            }
            last={last}
          />
        );
      }}
    />
  );
}

// ---------- Transport attendance (boarding log) ----------

export function AdminTransportAttendance(_: ScreenProps) {
  const ro = useReadOnly();
  const [routes] = useRoutes();
  const [assign] = useAssignments();
  const [trips, setTrips] = useTrips();
  const [routeName, setRouteName] = useState('Route 1');
  const [trip, setTrip] = useState<string>('Morning');
  const [absent, setAbsent] = useState<Record<string, boolean>>({});
  const route = routes.find(r => r.name === routeName) ?? routes[0];
  const riders = ADMIN_STUDENTS.filter(st => assign[st.id]?.routeId === route.id);
  const boarded = riders.filter(st => !absent[st.id]).length;
  const recent = trips.filter(t => t.routeId === route.id).slice(0, 4);

  const save = () => {
    if (!riders.length) {
      toast('No students are assigned to this route');
      return;
    }
    const t = {
      id: trId('t'),
      routeId: route.id,
      trip: trip === 'Afternoon' ? ('Afternoon' as const) : ('Morning' as const),
      date: '22 Oct 2026',
      boarded,
      total: riders.length,
      absent: riders.filter(st => absent[st.id]).map(st => st.name),
    };
    setTrips(list => [t, ...list]);
    logAudit('Boarding log', `${route.name} ${t.trip}: ${boarded}/${riders.length} boarded`);
    toast(`Trip saved: ${boarded} of ${riders.length} boarded`);
    setAbsent({});
  };

  return (
    <ListScreen
      title="Transport attendance"
      subtitle="Boarding log per trip"
      items={riders}
      keyOf={st => st.id}
      searchText={st => `${st.name} ${st.gr}`}
      empty="No students on this route"
      header={
        <>
          {ro ? <ReadOnlyBanner /> : null}
          <PickerField
            label="Route"
            value={routeName}
            options={routes.map(r => r.name)}
            onChange={n => {
              setRouteName(n);
              setAbsent({});
            }}
          />
          <Segmented options={['Morning', 'Afternoon']} value={trip} onChange={setTrip} />
          <Card title="Recent trips">
            {recent.length ? (
              recent.map((t, i) => (
                <ListRow
                  key={t.id}
                  icon={Bus}
                  title={`${t.trip} · ${t.date}`}
                  subtitle={t.absent.length ? `Not boarded: ${t.absent.join(', ')}` : 'Everyone boarded'}
                  right={<Badge label={`${t.boarded}/${t.total}`} tone={t.boarded === t.total ? 'success' : 'warn'} />}
                  last={i === recent.length - 1}
                />
              ))
            ) : (
              <Text style={s.muted}>No trips logged for this route yet.</Text>
            )}
          </Card>
          <Text style={s.muted}>
            Boarded {boarded} of {riders.length}. Switch off students who did not board.
          </Text>
        </>
      }
      renderItem={(st, last) => (
        <ListRow
          avatar={st.name}
          title={st.name}
          subtitle={`${st.className}-${st.section} · ${absent[st.id] ? 'Not boarded' : 'Boarded'}`}
          right={
            <Toggle
              value={!absent[st.id]}
              onChange={on => setAbsent(p => ({ ...p, [st.id]: !on }))}
            />
          }
          last={last}
        />
      )}
      footer={ro ? undefined : <Button label={`Save ${trip.toLowerCase()} trip`} onPress={save} />}
    />
  );
}

// ---------- Fuel & maintenance ----------

function FuelForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [vehicles] = useVehicles();
  const [logs, setLogs] = useFuelLogs();
  const [vehicle, setVehicle] = useState(vehicles[0].reg);
  const [kind, setKind] = useState<string>('Fuel');
  const [date, setDate] = useState('2026-10-22');
  const [litres, setLitres] = useState('');
  const [amount, setAmount] = useState('');
  const [odo, setOdo] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [note, setNote] = useState('');
  const submit = () => {
    const v = vehicles.find(x => x.reg === vehicle) ?? vehicles[0];
    const amt = Number(amount);
    const km = Number(odo);
    const last = Math.max(0, ...logs.filter(l => l.vehicleId === v.id).map(l => l.odometer));
    if (!isIsoDate(date)) {
      toast('Date must be YYYY-MM-DD');
    } else if (kind === 'Fuel' && !(Number(litres) > 0)) {
      toast('Enter litres');
    } else if (!(amt > 0)) {
      toast('Enter the amount');
    } else if (!(km > 0)) {
      toast('Enter the odometer reading');
    } else if (km < last) {
      toast(`Odometer cannot be below the last reading (${last.toLocaleString('en-US')} km)`);
    } else if (kind === 'Maintenance' && !workshop.trim()) {
      toast('Enter the workshop');
    } else {
      const log: FuelLog = {
        id: trId('f'),
        vehicleId: v.id,
        kind: kind === 'Maintenance' ? 'Maintenance' : 'Fuel',
        date,
        litres: kind === 'Fuel' ? Number(litres) : undefined,
        amount: amt,
        odometer: km,
        workshop: kind === 'Maintenance' ? workshop.trim() : undefined,
        note: note.trim() || kind,
      };
      setLogs(list => [log, ...list]);
      logAudit('Expense posted', `Transport ${log.kind.toLowerCase()} ${v.reg} ${formatRs(amt)} posted to Accounts expenses`);
      toast(`Saved and posted as an expense of ${formatRs(amt)} in Accounts`);
      onClose();
    }
  };
  return (
    <FormSheet visible={visible} onClose={onClose} title="Add fuel or maintenance" onSubmit={submit} submitLabel="Save and post expense">
      <PickerField label="Vehicle" value={vehicle} options={vehicles.map(v => v.reg)} onChange={setVehicle} />
      <Segmented options={['Fuel', 'Maintenance']} value={kind} onChange={setKind} />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      {kind === 'Fuel' ? <Field label="Litres" value={litres} onChangeText={setLitres} keyboardType="decimal-pad" /> : null}
      <Field label="Amount (Rs.)" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
      <Field label="Odometer (km)" value={odo} onChangeText={setOdo} keyboardType="number-pad" />
      {kind === 'Maintenance' ? <Field label="Workshop" value={workshop} onChangeText={setWorkshop} /> : null}
      <Field label="Note" value={note} onChangeText={setNote} />
    </FormSheet>
  );
}

export function AdminFuelMaintenance(_: ScreenProps) {
  const open = useOpen();
  const ro = useReadOnly();
  const [logs] = useFuelLogs();
  const [vehicles] = useVehicles();
  const [form, setForm] = useState(false);
  const reg = (id: string) => vehicles.find(v => v.id === id)?.reg ?? id;
  const oct = logs.filter(l => l.date.startsWith('2026-10'));
  const total = oct.reduce((a, l) => a + l.amount, 0);
  const chart = vehicles.map(v => ({
    label: v.reg.split('-')[1] ?? v.reg,
    value: Math.round(oct.filter(l => l.vehicleId === v.id).reduce((a, l) => a + l.amount, 0) / 1000),
    highlight: true,
  }));
  return (
    <>
      <ListScreen
        title="Fuel & maintenance"
        subtitle="Every log is posted as an expense in Accounts"
        items={logs}
        keyOf={l => l.id}
        searchText={l => `${reg(l.vehicleId)} ${l.note} ${l.workshop ?? ''}`}
        filters={[
          { label: 'Type', options: ['All', 'Fuel', 'Maintenance'], get: l => l.kind },
          { label: 'Vehicle', options: ['All', ...vehicles.map(v => v.reg)], get: l => reg(l.vehicleId) },
        ]}
        header={
          <>
            {ro ? <ReadOnlyBanner /> : null}
            <Card title={`October cost per vehicle (Rs. 000) · total ${formatRs(total)}`}>
              <BarChart data={chart} />
            </Card>
            <Button label="Open expenses in Accounts" variant="outline" onPress={() => open('AdminExpenses')} />
          </>
        }
        renderItem={(l, last) => (
          <ListRow
            icon={l.kind === 'Fuel' ? Fuel : Wrench}
            title={`${reg(l.vehicleId)} · ${l.kind}`}
            subtitle={`${fmtDate(l.date)} · ${l.kind === 'Fuel' ? `${l.litres} L · ` : `${l.workshop} · `}${l.odometer.toLocaleString('en-US')} km · ${l.note}`}
            right={
              <View style={s.right}>
                <Text style={s.amount}>{formatRs(l.amount)}</Text>
                <Badge label="Posted" tone="success" />
              </View>
            }
            last={last}
          />
        )}
        onAdd={ro ? undefined : () => setForm(true)}
        addLabel="Add fuel or maintenance"
      />
      {form ? <FuelForm visible={form} onClose={() => setForm(false)} /> : null}
    </>
  );
}

export const transportScreens: ScreenMap = {
  AdminVehicles,
  AdminVehicleDetail,
  AdminDrivers,
  AdminRoutes,
  AdminRouteDetail,
  AdminTransportAssign,
  AdminTransportAttendance,
  AdminFuelMaintenance,
};

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  right: { alignItems: 'flex-end', gap: 4 },
  gap: { height: 10 },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  amount: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  iconSm: { width: 32, height: 32, borderRadius: 9 },
  dim: { opacity: 0.55 },
  small: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
  },
  smallPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  smallDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  smallText: { fontSize: 12, fontWeight: '800', color: colors.text },
  smallTextDanger: { color: colors.danger },
});
