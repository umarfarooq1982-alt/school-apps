import { ScreenMap } from '../../../navigation';
import {
  AdminHiringLive,
  AdminLeaveManagementLive,
  AdminStaffAttendanceLive,
  AdminStaffDirectoryLive,
  AdminStaffEnrollLive,
  AdminStaffIdCardsLive,
  makeStaffProfile,
} from './live';
import { notAvailableScreen as na } from '../accounts/live-kit';

// Every route shows server data. Where the server has no API yet the screen
// says so plainly; no sample data is ever shown.
export const adminHrScreens: ScreenMap = {
  AdminStaffDirectory: AdminStaffDirectoryLive,
  AdminStaffProfile: makeStaffProfile(na('Staff profile', 'Staff member not found', 'Open a staff member from the staff directory.')),
  AdminHiring: AdminHiringLive,
  AdminStaffEnroll: AdminStaffEnrollLive,
  AdminStaffAttendance: AdminStaffAttendanceLive,
  AdminStaffAttSheet: na('Monthly sheet', 'Monthly attendance sheet and month lock'),
  AdminLeaveManagement: AdminLeaveManagementLive,
  AdminLeaveBalances: na('Leave balances', 'Leave balances and carry-forward'),
  AdminSalarySetup: na('Salary setup', 'Salary structures, loans and increments'),
  AdminExitClearance: na('Exit & clearance', 'Resignation and clearance checklist'),
  AdminExitCase: na('Exit case', 'Final settlement and experience letter'),
  AdminStaffIdCards: AdminStaffIdCardsLive,
  AdminStaffDirectoryTools: na('Contract reminders', 'Contract and probation reminders'),
  AdminHiringTools: na('Offer letters', 'Openings and offer letters'),
  AdminStaffEnrollTools: na('Teaching assignment', 'Teaching assignment and login creation'),
  AdminStaffAttendanceTools: na('Attendance rules', 'Device sync, corrections and timing rules'),
  AdminLeaveManagementTools: na('Leave policies', 'Leave policies and balance checks'),
  AdminStaffIdCardsTools: na('ID card designs', 'ID card designs'),
};
