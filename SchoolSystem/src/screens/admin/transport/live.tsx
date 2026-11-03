// Transport screens backed by /api/web/modules/{vehicles,routes,boarding,fuel,
// transport-assign}.
import React, { useState } from 'react';
import { View } from 'react-native';
import { Bus, ClipboardCheck, Fuel, MapPin, Trash2 } from 'lucide-react-native';
import { Badge, Button, Card, Field, InfoBanner, ListRow, toast } from '../../../components/ui';
import { BarChart, Kpi, KpiGrid, PickerField } from '../../../components/admin';
import { QueryView } from '../../../components/states';
import { useMutation } from '../../../api/hooks';
import { modulesApi, num, WebStudentRow } from '../../../api/webB';
import { ScreenProps } from '../../../navigation';
import { logAudit, useReadOnly } from '../../../data/admin';
import { StudentPicker } from '../accounts/live';
import {
  fmtDate,
  LiveScreen,
  liveStyles as ls,
  Money,
  ModuleRecordsScreen,
  SearchBox,
  StatusBadge,
  todayIso,
  useFiltered,
  useModule,
} from '../accounts/live-kit';

type VehicleRow = { id: number; plate: string; type: string | null; capacity: number; driver_name: string | null; driver_phone: string | null; status: string };
type RouteRow = { id: number; name: string; vehicle_id: number | null; fare: string | number };
type BoardRow = { id: number; title: string; status: string; recordDate: string; route?: string; trip?: string; boarded?: number; absent?: number };
type FuelRow = { id: number; title: string; status: string; recordDate: string; vehicle?: string; kind?: string; litres?: number; amount?: number; odometer?: number; workshop?: string };

export function AdminVehiclesLive(_: ScreenProps) {
  return (
    <ModuleRecordsScreen<VehicleRow>
      moduleKey="vehicles"
      title="Vehicles"
      subtitle="Registration, capacity and driver"
      icon={Bus}
      rowTitle={r => `${r.plate}${r.type ? ` · ${r.type}` : ''}`}
      rowSub={r => `${r.capacity} seats · ${r.driver_name ?? 'no driver'}${r.driver_phone ? ` · ${r.driver_phone}` : ''}`}
      renderRight={r => <StatusBadge status={r.status} />}
      searchText={r => `${r.plate} ${r.type ?? ''} ${r.driver_name ?? ''}`}
      fields={[
        { key: 'plate', label: 'Registration no.', required: true, placeholder: 'LEA-4512' },
        { key: 'type', label: 'Type', kind: 'pick', options: ['Coaster', 'Hiace', 'Bus', 'Van', 'Car'] },
        { key: 'capacity', label: 'Seats', kind: 'number', required: true },
        { key: 'driverName', label: 'Driver name' },
        { key: 'driverPhone', label: 'Driver mobile' },
      ]}
      toBody={v => {
        if (!(Number(v.capacity) > 0)) {
          return 'Seats must be more than 0';
        }
        logAudit('Vehicle', `Added ${v.plate}`);
        return { plate: v.plate.trim().toUpperCase(), type: v.type || null, capacity: Number(v.capacity), driverName: v.driverName?.trim(), driverPhone: v.driverPhone?.trim() };
      }}
      addLabel="Add vehicle"
      toolsRoute="AdminVehiclesTools"
      renderHeader={rows => (
        <>
          <KpiGrid>
            <Kpi label="Vehicles" value={String(rows.length)} />
            <Kpi label="Seats" value={String(rows.reduce((a, r) => a + num(r.capacity), 0))} />
          </KpiGrid>
          <InfoBanner text="Fitness, insurance and route-permit expiry are tracked on the tools screen (no API yet)." />
        </>
      )}
    />
  );
}

export function AdminRoutesLive(_: ScreenProps) {
  const vehicles = useModule<VehicleRow>('vehicles');
  const plates = (vehicles.data ?? []).map(v => v.plate);
  const plateOf = (id: number | null) => (vehicles.data ?? []).find(v => v.id === id)?.plate;
  return (
    <ModuleRecordsScreen<RouteRow>
      moduleKey="routes"
      title="Routes & stops"
      subtitle="Route, vehicle and monthly fare"
      icon={MapPin}
      rowTitle={r => r.name}
      rowSub={r => (plateOf(r.vehicle_id) ? `Vehicle ${plateOf(r.vehicle_id)}` : 'No vehicle')}
      renderRight={r => <Money value={num(r.fare)} />}
      searchText={r => r.name}
      fields={[
        { key: 'name', label: 'Route name', required: true, placeholder: 'Route 3 · Model Town' },
        { key: 'vehicle', label: 'Vehicle', kind: 'pick', options: plates },
        { key: 'fare', label: 'Monthly fare (Rs.)', kind: 'number', required: true },
      ]}
      toBody={v => {
        const veh = (vehicles.data ?? []).find(x => x.plate === v.vehicle);
        return { name: v.name.trim(), vehicleId: veh?.id ?? null, fare: Number(v.fare) };
      }}
      addLabel="Add route"
      toolsRoute="AdminRoutesTools"
      renderHeader={() => <InfoBanner text="Stop order and pick-up / drop timings are on the tools screen (no API yet)." />}
    />
  );
}

export function AdminTransportAttendanceLive(_: ScreenProps) {
  const routes = useModule<RouteRow>('routes');
  return (
    <ModuleRecordsScreen<BoardRow>
      moduleKey="boarding"
      title="Transport attendance"
      subtitle="Boarding log per trip"
      icon={ClipboardCheck}
      rowTitle={r => `${r.route ?? r.title} · ${r.trip ?? ''}`}
      rowSub={r => `${fmtDate(r.recordDate)} · boarded ${num(r.boarded)} · not boarded ${num(r.absent)}`}
      renderRight={r => <StatusBadge status={r.status} />}
      searchText={r => `${r.route ?? ''} ${r.title} ${r.trip ?? ''}`}
      fields={[
        { key: 'route', label: 'Route', kind: 'pick', options: (routes.data ?? []).map(r => r.name) },
        { key: 'trip', label: 'Trip', kind: 'pick', options: ['Morning', 'Afternoon'] },
        { key: 'date', label: 'Date', kind: 'date', placeholder: todayIso() },
        { key: 'boarded', label: 'Boarded', kind: 'number', required: true },
        { key: 'absent', label: 'Not boarded', kind: 'number' },
      ]}
      toBody={v =>
        v.route
          ? { title: v.route, route: v.route, trip: v.trip || 'Morning', date: v.date || todayIso(), boarded: Number(v.boarded), absent: Number(v.absent || 0), status: 'done' }
          : 'Pick a route'
      }
      addLabel="Log trip"
      toolsRoute="AdminTransportAttendanceTools"
    />
  );
}

export function AdminFuelMaintenanceLive(_: ScreenProps) {
  const vehicles = useModule<VehicleRow>('vehicles');
  return (
    <ModuleRecordsScreen<FuelRow>
      moduleKey="fuel"
      title="Fuel & maintenance"
      subtitle="Logs posted as expenses"
      icon={Fuel}
      rowTitle={r => `${r.vehicle ?? r.title} · ${r.kind ?? 'Fuel'}`}
      rowSub={r => `${fmtDate(r.recordDate)}${r.litres ? ` · ${r.litres} L` : ''}${r.odometer ? ` · ${r.odometer} km` : ''}${r.workshop ? ` · ${r.workshop}` : ''}`}
      renderRight={r => <Money value={num(r.amount)} />}
      searchText={r => `${r.vehicle ?? ''} ${r.kind ?? ''} ${r.workshop ?? ''}`}
      fields={[
        { key: 'vehicle', label: 'Vehicle', kind: 'pick', options: (vehicles.data ?? []).map(v => v.plate) },
        { key: 'kind', label: 'Type', kind: 'pick', options: ['Fuel', 'Maintenance'] },
        { key: 'litres', label: 'Litres', kind: 'number' },
        { key: 'amount', label: 'Amount (Rs.)', kind: 'number', required: true },
        { key: 'odometer', label: 'Odometer (km)', kind: 'number' },
        { key: 'workshop', label: 'Pump / workshop' },
        { key: 'date', label: 'Date', kind: 'date', placeholder: todayIso() },
      ]}
      toBody={v => {
        if (!v.vehicle) {
          return 'Pick a vehicle';
        }
        if (!(Number(v.amount) > 0)) {
          return 'Amount must be more than 0';
        }
        logAudit('Expense posted', `${v.kind || 'Fuel'} ${v.vehicle} Rs. ${v.amount}`);
        return {
          title: v.vehicle,
          vehicle: v.vehicle,
          kind: v.kind || 'Fuel',
          litres: v.litres ? Number(v.litres) : undefined,
          amount: Number(v.amount),
          odometer: v.odometer ? Number(v.odometer) : undefined,
          workshop: v.workshop?.trim(),
          date: v.date || todayIso(),
          status: 'posted',
        };
      }}
      addLabel="Add log"
      toolsRoute="AdminFuelMaintenanceTools"
      renderHeader={rows => {
        const by: Record<string, number> = {};
        rows.forEach(r => {
          const k = r.vehicle ?? r.title;
          by[k] = (by[k] || 0) + num(r.amount);
        });
        const data = Object.entries(by).slice(0, 6).map(([label, value]) => ({ label: label.slice(0, 8), value, highlight: true }));
        return (
          <View style={ls.wrapCol}>
            <KpiGrid>
              <Kpi label="Logs" value={String(rows.length)} />
              <Kpi label="Total cost" value={`Rs. ${rows.reduce((a, r) => a + num(r.amount), 0).toLocaleString('en-US')}`} />
            </KpiGrid>
            {data.length ? <BarChart data={data} format={v => `${Math.round(v / 1000)}k`} /> : null}
            <Badge label="Fuel and maintenance are posted to Accounts as expenses" tone="info" />
          </View>
        );
      }}
    />
  );
}

// ---------- Student assignment (records read by the parent app) ----------

type AssignRow = {
  id: number;
  title: string;
  status: string;
  recordDate: string;
  studentId?: number | string;
  routeId?: number | string;
  stop?: string;
  studentName?: string;
  grNo?: string;
};

export function AdminTransportAssignLive(_: ScreenProps) {
  const routes = useModule<RouteRow>('routes');
  const vehicles = useModule<VehicleRow>('vehicles');
  const q = useModule<AssignRow>('transport-assign');
  const readOnly = useReadOnly();
  const [student, setStudent] = useState<WebStudentRow | null>(null);
  const [routeName, setRouteName] = useState('');
  const [stop, setStop] = useState('');
  const [term, setTerm] = useState('');
  const add = useMutation((b: Record<string, unknown>) => modulesApi.create('transport-assign', b), 'Assigned to the route');
  const remove = useMutation((id: number) => modulesApi.remove('transport-assign', id), 'Removed from transport');
  const rows = q.data ?? [];
  const routeById = (id: unknown) => (routes.data ?? []).find(r => String(r.id) === String(id));
  const vehicleOf = (r?: RouteRow) => (vehicles.data ?? []).find(v => v.id === r?.vehicle_id);
  // Seats used on a vehicle = students on every route that uses it.
  const used = (vehicleId?: number) =>
    rows.filter(a => {
      const r = routeById(a.routeId);
      return !!r && !!vehicleId && r.vehicle_id === vehicleId;
    }).length;
  const list = useFiltered(rows, term, a => `${a.studentName ?? ''} ${a.grNo ?? ''} ${a.stop ?? ''} ${routeById(a.routeId)?.name ?? ''}`);

  const assign = async () => {
    if (!student) {
      toast('Pick a student');
      return;
    }
    const route = (routes.data ?? []).find(r => r.name === routeName);
    if (!route) {
      toast('Pick a route');
      return;
    }
    if (!stop.trim()) {
      toast('Enter the stop');
      return;
    }
    if (rows.some(a => String(a.studentId) === student.id)) {
      toast(`${student.name} already has a route. Remove it first.`);
      return;
    }
    const veh = vehicleOf(route);
    // M-14 key rule: a vehicle cannot carry more students than its seats.
    if (veh && used(veh.id) >= veh.capacity) {
      toast(`${veh.plate} is full (${veh.capacity} seats). Choose another route or vehicle.`);
      return;
    }
    const out = await add.run({
      title: student.name,
      studentId: Number(student.id),
      routeId: Number(route.id),
      stop: stop.trim(),
      studentName: student.name,
      grNo: student.grNo,
      status: 'active',
    });
    if (out !== undefined) {
      logAudit('Transport', `${student.grNo} to ${route.name} (${stop.trim()}), fare Rs. ${num(route.fare)}`);
      setStudent(null);
      setStop('');
      q.refresh();
    }
  };

  return (
    <LiveScreen
      title="Student assignment"
      subtitle="Route and stop per student, with seat check"
      q={q}
      toolsRoute="AdminTransportAssignTools"
      toolsLabel="Transport fee on vouchers (sample)"
      exportTitle="Transport students"
    >
      <QueryView q={routes} isEmpty={d => !d.length} emptyText="Add a route first (Routes & stops).">
        {d => (
          <Card title="Seats">
            {d.map((r, i) => {
              const v = vehicleOf(r);
              const n = rows.filter(a => String(a.routeId) === String(r.id)).length;
              const full = !!v && used(v.id) >= v.capacity;
              return (
                <ListRow
                  key={r.id}
                  icon={MapPin}
                  title={r.name}
                  subtitle={v ? `${v.plate} · ${used(v.id)}/${v.capacity} seats used` : 'No vehicle'}
                  right={<Badge label={`${n} students`} tone={full ? 'danger' : 'success'} />}
                  last={i === d.length - 1}
                />
              );
            })}
          </Card>
        )}
      </QueryView>
      <Card title="Assign a student">
        <StudentPicker value={student} onChange={setStudent} />
        <PickerField label="Route" value={routeName} options={(routes.data ?? []).map(r => r.name)} onChange={setRouteName} />
        <Field label="Stop" value={stop} onChangeText={setStop} placeholder="e.g. Model Town stop" />
        <Button label="Assign" icon={Bus} onPress={assign} loading={add.busy} disabled={readOnly} />
      </Card>
      <SearchBox value={term} onChange={setTerm} placeholder="Student, GR No., stop" />
      <QueryView q={q} isEmpty={() => !list.length} emptyText="No students on transport yet. Parents see no route.">
        {() => (
          <Card>
            {list.map((a, i) => (
              <ListRow
                key={a.id}
                avatar={a.studentName ?? a.title}
                title={a.studentName ?? a.title}
                subtitle={`${a.grNo ?? ''} · ${routeById(a.routeId)?.name ?? `Route ${String(a.routeId)}`} · ${a.stop ?? ''}`}
                right={
                  <Button
                    label="Remove"
                    icon={Trash2}
                    variant="danger"
                    disabled={readOnly}
                    onPress={async () => {
                      if ((await remove.run(a.id)) !== undefined) {
                        logAudit('Transport', `${a.grNo ?? a.title} removed from transport`);
                        q.refresh();
                      }
                    }}
                  />
                }
                last={i === list.length - 1}
              />
            ))}
          </Card>
        )}
      </QueryView>
    </LiveScreen>
  );
}
