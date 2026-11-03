import { ScreenMap } from '../../../navigation';
import {
  AdminFuelMaintenanceLive,
  AdminRoutesLive,
  AdminTransportAssignLive,
  AdminTransportAttendanceLive,
  AdminVehiclesLive,
} from './live';
import { notAvailableScreen as na } from '../accounts/live-kit';

// Every route shows server data. Where the server has no API yet the screen
// says so plainly; no sample data is ever shown.
export const adminTransportScreens: ScreenMap = {
  AdminVehicles: AdminVehiclesLive,
  AdminVehicleDetail: na('Vehicle', 'Vehicle document expiry'),
  AdminDrivers: na('Drivers & conductors', 'Drivers, conductors and licence expiry'),
  AdminRoutes: AdminRoutesLive,
  AdminRouteDetail: na('Route', 'Stop order and timings'),
  AdminTransportAssign: AdminTransportAssignLive,
  AdminTransportAssignTools: na('Transport fee', 'Transport fee posting to vouchers'),
  AdminTransportAttendance: AdminTransportAttendanceLive,
  AdminFuelMaintenance: AdminFuelMaintenanceLive,
  AdminVehiclesTools: na('Vehicle documents', 'Fitness, insurance and permit expiry'),
  AdminRoutesTools: na('Stops & timings', 'Stops and timings'),
  AdminTransportAttendanceTools: na('Boarding by student', 'Per-student boarding'),
  AdminFuelMaintenanceTools: na('Cost per vehicle', 'Monthly cost per vehicle'),
};
