import { ScreenMap } from '../../../navigation';
import { transportScreens as legacy } from './screens';
import {
  AdminFuelMaintenanceLive,
  AdminRoutesLive,
  AdminTransportAssignLive,
  AdminTransportAttendanceLive,
  AdminVehiclesLive,
} from './live';
import { sampleScreen } from '../accounts/live-kit';

// Contract routes open the server-backed screens; the earlier sample screens
// stay reachable as "tools" for rules the server has no API for yet.
export const adminTransportScreens: ScreenMap = {
  AdminVehicles: AdminVehiclesLive,
  AdminVehicleDetail: sampleScreen(legacy.AdminVehicleDetail, 'document expiry'),
  AdminDrivers: sampleScreen(legacy.AdminDrivers, 'drivers, conductors and licence expiry'),
  AdminRoutes: AdminRoutesLive,
  AdminRouteDetail: sampleScreen(legacy.AdminRouteDetail, 'stop order and timings'),
  AdminTransportAssign: AdminTransportAssignLive,
  AdminTransportAssignTools: sampleScreen(legacy.AdminTransportAssign, 'transport fee posting to vouchers'),
  AdminTransportAttendance: AdminTransportAttendanceLive,
  AdminFuelMaintenance: AdminFuelMaintenanceLive,
  AdminVehiclesTools: sampleScreen(legacy.AdminVehicles, 'fitness, insurance and permit expiry'),
  AdminRoutesTools: sampleScreen(legacy.AdminRoutes, 'stops and timings'),
  AdminTransportAttendanceTools: sampleScreen(legacy.AdminTransportAttendance, 'per-student boarding'),
  AdminFuelMaintenanceTools: sampleScreen(legacy.AdminFuelMaintenance, 'monthly cost per vehicle'),
};
