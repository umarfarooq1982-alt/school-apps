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
import {
  AdminHiringLive,
  AdminLeaveManagementLive,
  AdminStaffAttendanceLive,
  AdminStaffDirectoryLive,
  AdminStaffEnrollLive,
  AdminStaffIdCardsLive,
  makeStaffProfile,
} from './live';
import { sampleScreen } from '../accounts/live-kit';

// Contract routes open the server-backed screens; the earlier sample screens
// stay reachable as "tools" for rules the server has no API for yet.
export const adminHrScreens: ScreenMap = {
  AdminStaffDirectory: AdminStaffDirectoryLive,
  AdminStaffProfile: makeStaffProfile(sampleScreen(AdminStaffProfile, 'sample staff record')),
  AdminHiring: AdminHiringLive,
  AdminStaffEnroll: AdminStaffEnrollLive,
  AdminStaffAttendance: AdminStaffAttendanceLive,
  AdminStaffAttSheet: sampleScreen(AdminStaffAttSheet, 'monthly sheet and month lock'),
  AdminLeaveManagement: AdminLeaveManagementLive,
  AdminLeaveBalances: sampleScreen(AdminLeaveBalances, 'leave balances and carry-forward'),
  AdminSalarySetup: sampleScreen(AdminSalarySetup, 'salary structures, loans and increments'),
  AdminExitClearance: sampleScreen(AdminExitClearance, 'resignation and clearance checklist'),
  AdminExitCase: sampleScreen(AdminExitCase, 'final settlement and experience letter'),
  AdminStaffIdCards: AdminStaffIdCardsLive,
  AdminStaffDirectoryTools: sampleScreen(AdminStaffDirectory, 'contract and probation reminders'),
  AdminHiringTools: sampleScreen(AdminHiring, 'openings and offer letters'),
  AdminStaffEnrollTools: sampleScreen(AdminStaffEnroll, 'teaching assignment and login creation'),
  AdminStaffAttendanceTools: sampleScreen(AdminStaffAttendance, 'device sync, corrections and timing rules'),
  AdminLeaveManagementTools: sampleScreen(AdminLeaveManagement, 'leave policies and balance checks'),
  AdminStaffIdCardsTools: sampleScreen(AdminStaffIdCards, 'sample ID cards'),
};
