// Dummy data for the Transport panel (SOW 3.2 G, M-14).
import { ADMIN_STUDENTS } from './admin';
import { useShared } from '../store';

// The demo "today" used across the admin app.
export const TODAY = new Date(2026, 9, 22);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) {
    return iso;
  }
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function daysLeft(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, (m || 1) - 1, d || 1).getTime();
  return Math.round((t - TODAY.getTime()) / 86400000);
}

export function isIsoDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(daysLeft(v));
}

export type ExpiryState = { label: string; tone: 'danger' | 'warn' | 'success' };

// Expired, due within 30 days, or valid.
export function expiry(iso: string): ExpiryState {
  const n = daysLeft(iso);
  if (n < 0) {
    return { label: `Expired ${-n}d ago`, tone: 'danger' };
  }
  if (n <= 30) {
    return { label: `Expires in ${n}d`, tone: 'warn' };
  }
  return { label: 'Valid', tone: 'success' };
}

// ---------- Vehicles ----------

export type Vehicle = {
  id: string;
  reg: string;
  model: string;
  capacity: number;
  routeId: string;
  fitness: string;
  insurance: string;
  permit: string;
};

export const VEHICLES: Vehicle[] = [
  { id: 'v1', reg: 'LEB-2210', model: 'Toyota Hiace', capacity: 12, routeId: 'r1', fitness: '2027-02-14', insurance: '2027-01-05', permit: '2026-12-31' },
  { id: 'v2', reg: 'LEC-7781', model: 'Toyota Coaster', capacity: 26, routeId: 'r2', fitness: '2026-12-20', insurance: '2026-11-15', permit: '2027-03-31' },
  { id: 'v3', reg: 'LEA-4512', model: 'Toyota Coaster', capacity: 24, routeId: 'r3', fitness: '2026-11-03', insurance: '2027-04-10', permit: '2027-03-31' },
  { id: 'v4', reg: 'LED-0934', model: 'Suzuki APV', capacity: 14, routeId: 'r4', fitness: '2027-05-01', insurance: '2026-10-12', permit: '2027-03-31' },
  { id: 'v5', reg: 'LEB-5528', model: 'Hino Bus', capacity: 40, routeId: 'r5', fitness: '2027-06-18', insurance: '2027-02-28', permit: '2027-03-31' },
  { id: 'v6', reg: 'LEE-1146', model: 'Toyota Hiace', capacity: 12, routeId: 'r6', fitness: '2027-01-09', insurance: '2027-01-09', permit: '2026-11-20' },
];

export function useVehicles() {
  return useShared<Vehicle[]>('admin.tr.vehicles', VEHICLES);
}

// ---------- Drivers & conductors ----------

export type Driver = {
  id: string;
  name: string;
  role: 'Driver' | 'Conductor';
  cnic: string;
  mobile: string;
  licence: string; // expiry
  vehicleId: string;
};

export const DRIVERS: Driver[] = [
  { id: 'd1', name: 'Muhammad Aslam', role: 'Driver', cnic: '35202-4455667-3', mobile: '0301 2233445', licence: '2028-03-15', vehicleId: 'v3' },
  { id: 'd2', name: 'Shahid Iqbal', role: 'Conductor', cnic: '35201-9988776-5', mobile: '0333 9988776', licence: '2026-11-30', vehicleId: 'v3' },
  { id: 'd3', name: 'Rashid Mehmood', role: 'Driver', cnic: '35202-1122334-1', mobile: '0300 1122334', licence: '2027-08-01', vehicleId: 'v1' },
  { id: 'd4', name: 'Nasir Ali', role: 'Driver', cnic: '35202-5566778-9', mobile: '0321 5566778', licence: '2026-10-05', vehicleId: 'v2' },
  { id: 'd5', name: 'Zafar Iqbal', role: 'Driver', cnic: '35201-3344556-7', mobile: '0345 3344556', licence: '2029-01-20', vehicleId: 'v4' },
  { id: 'd6', name: 'Akram Khan', role: 'Driver', cnic: '35202-7788990-2', mobile: '0312 7788990', licence: '2027-12-12', vehicleId: 'v5' },
  { id: 'd7', name: 'Ghulam Rasool', role: 'Conductor', cnic: '35202-6677889-4', mobile: '0302 6677889', licence: '2027-06-30', vehicleId: 'v5' },
  { id: 'd8', name: 'Imtiaz Ahmed', role: 'Driver', cnic: '35201-2233445-8', mobile: '0331 2233445', licence: '2027-04-04', vehicleId: 'v6' },
];

export function useDrivers() {
  return useShared<Driver[]>('admin.tr.drivers', DRIVERS);
}

// ---------- Routes & stops ----------

export type Stop = { id: string; name: string; pickup: string; drop: string; fee: number };
export type Route = {
  id: string;
  name: string;
  area: string;
  vehicleId: string;
  feeMode: 'Per route' | 'Per stop';
  fee: number;
  stops: Stop[];
};

const stop = (id: string, name: string, pickup: string, drop: string, fee: number): Stop => ({ id, name, pickup, drop, fee });

export const ROUTES: Route[] = [
  { id: 'r1', name: 'Route 1', area: 'Garden Town', vehicleId: 'v1', feeMode: 'Per route', fee: 3200, stops: [stop('s11', 'Garden Town gate', '6:55 AM', '1:55 PM', 3200), stop('s12', 'Barkat Market', '7:05 AM', '1:45 PM', 3200), stop('s13', 'Kalma Chowk', '7:15 AM', '1:35 PM', 3200)] },
  { id: 'r2', name: 'Route 2', area: 'Iqbal Town', vehicleId: 'v2', feeMode: 'Per stop', fee: 0, stops: [stop('s21', 'Moon Market', '6:45 AM', '2:00 PM', 3800), stop('s22', 'Karim Block', '6:55 AM', '1:50 PM', 3600), stop('s23', 'Wahdat Road', '7:10 AM', '1:40 PM', 3000)] },
  { id: 'r3', name: 'Route 3', area: 'Model Town', vehicleId: 'v3', feeMode: 'Per route', fee: 3500, stops: [stop('s31', 'Model Town stop', '7:05 AM', '1:40 PM', 3500), stop('s32', 'Link Road', '7:15 AM', '1:50 PM', 3500)] },
  { id: 'r4', name: 'Route 4', area: 'Faisal Town', vehicleId: 'v4', feeMode: 'Per route', fee: 3000, stops: [stop('s41', 'Faisal Town chowk', '7:00 AM', '1:45 PM', 3000), stop('s42', 'Akbar Chowk', '7:10 AM', '1:55 PM', 3000)] },
  { id: 'r5', name: 'Route 5', area: 'Johar Town', vehicleId: 'v5', feeMode: 'Per stop', fee: 0, stops: [stop('s51', 'Emporium Mall', '6:50 AM', '2:05 PM', 4200), stop('s52', 'Khokhar Chowk', '7:00 AM', '1:55 PM', 4000), stop('s53', 'Expo Centre', '7:10 AM', '1:45 PM', 3800)] },
  { id: 'r6', name: 'Route 6', area: 'DHA Phase 5', vehicleId: 'v6', feeMode: 'Per route', fee: 4500, stops: [stop('s61', 'DHA Y Block', '6:40 AM', '2:10 PM', 4500)] },
];

export function useRoutes() {
  return useShared<Route[]>('admin.tr.routes', ROUTES);
}

export function stopFee(route: Route, stopId: string) {
  if (route.feeMode === 'Per route') {
    return route.fee;
  }
  return route.stops.find(s => s.id === stopId)?.fee ?? 0;
}

// ---------- Student assignment ----------

export type Assignment = { routeId: string; stopId: string };

const ASSIGN_SEED: Record<string, Assignment> = (() => {
  const m: Record<string, Assignment> = {};
  ADMIN_STUDENTS.forEach(st => {
    if (!st.transport || st.status !== 'Active') {
      return;
    }
    const r = ROUTES.find(x => x.name === st.transport);
    if (r) {
      m[st.id] = { routeId: r.id, stopId: r.stops[0].id };
    }
  });
  return m;
})();

export function useAssignments() {
  return useShared<Record<string, Assignment>>('admin.tr.assign', ASSIGN_SEED);
}

export function seatsUsed(assign: Record<string, Assignment>, routeId: string) {
  return Object.values(assign).filter(a => a.routeId === routeId).length;
}

// ---------- Boarding log ----------

export type Trip = {
  id: string;
  routeId: string;
  trip: 'Morning' | 'Afternoon';
  date: string;
  boarded: number;
  total: number;
  absent: string[];
};

export const TRIPS: Trip[] = [
  { id: 't1', routeId: 'r3', trip: 'Morning', date: '22 Oct 2026', boarded: 1, total: 1, absent: [] },
  { id: 't2', routeId: 'r1', trip: 'Afternoon', date: '21 Oct 2026', boarded: 10, total: 11, absent: ['Ahmed Khan'] },
];

export function useTrips() {
  return useShared<Trip[]>('admin.tr.trips', TRIPS);
}

// ---------- Fuel & maintenance ----------

export type FuelLog = {
  id: string;
  vehicleId: string;
  kind: 'Fuel' | 'Maintenance';
  date: string;
  litres?: number;
  amount: number;
  odometer: number;
  workshop?: string;
  note: string;
};

export const FUEL_LOGS: FuelLog[] = [
  { id: 'f1', vehicleId: 'v3', kind: 'Fuel', date: '2026-10-20', litres: 60, amount: 16200, odometer: 84210, note: 'Diesel, full tank' },
  { id: 'f2', vehicleId: 'v5', kind: 'Fuel', date: '2026-10-19', litres: 90, amount: 24300, odometer: 120440, note: 'Diesel' },
  { id: 'f3', vehicleId: 'v2', kind: 'Maintenance', date: '2026-10-15', amount: 18500, odometer: 96500, workshop: 'Al-Madina Motors', note: 'Brake pads and oil change' },
  { id: 'f4', vehicleId: 'v1', kind: 'Fuel', date: '2026-10-14', litres: 45, amount: 12150, odometer: 61200, note: 'Diesel' },
  { id: 'f5', vehicleId: 'v3', kind: 'Maintenance', date: '2026-10-08', amount: 9800, odometer: 83800, workshop: 'Toyota Walton', note: 'AC gas refill' },
  { id: 'f6', vehicleId: 'v4', kind: 'Fuel', date: '2026-10-06', litres: 35, amount: 10150, odometer: 45320, note: 'Petrol' },
  { id: 'f7', vehicleId: 'v6', kind: 'Fuel', date: '2026-10-05', litres: 42, amount: 11340, odometer: 38110, note: 'Diesel' },
  { id: 'f8', vehicleId: 'v5', kind: 'Maintenance', date: '2026-09-28', amount: 32000, odometer: 119900, workshop: 'Hino Pak', note: 'Tyre replacement x2' },
];

export function useFuelLogs() {
  return useShared<FuelLog[]>('admin.tr.fuel', FUEL_LOGS);
}

let seq = 500;
export const trId = (p: string) => `${p}${++seq}`;
