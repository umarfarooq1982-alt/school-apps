import { ScreenMap } from '../../../navigation';
import {
  AdminHiring,
  AdminStaffDirectory,
  AdminStaffEnroll,
  AdminStaffIdCards,
  AdminStaffProfile,
} from './staff';
import {
  AdminLeaveBalances,
  AdminLeaveManagement,
  AdminStaffAttSheet,
  AdminStaffAttendance,
} from './attendance';
import { AdminExitCase, AdminExitClearance, AdminSalarySetup } from './pay';

export const adminHrScreens: ScreenMap = {
  AdminStaffDirectory,
  AdminStaffProfile,
  AdminHiring,
  AdminStaffEnroll,
  AdminStaffAttendance,
  AdminStaffAttSheet,
  AdminLeaveManagement,
  AdminLeaveBalances,
  AdminSalarySetup,
  AdminExitClearance,
  AdminExitCase,
  AdminStaffIdCards,
};
