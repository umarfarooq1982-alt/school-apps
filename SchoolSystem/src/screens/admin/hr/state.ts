// Shared state for the HR panel.
import { useShared } from '../../../store';
import {
  Applicant,
  APPLICANTS,
  ExitCase,
  HrStaff,
  INITIAL_EXITS,
  INITIAL_HR_STAFF,
  INITIAL_STAFF_LEAVES,
  LEAVE_POLICIES,
  LeavePolicy,
  Opening,
  OPENINGS,
  StaffLeave,
} from '../../../data/admin-hr';

export const useHrStaff = () => useShared<HrStaff[]>('hr.staff', INITIAL_HR_STAFF);
export const useApplicants = () => useShared<Applicant[]>('hr.applicants', APPLICANTS);
export const useOpenings = () => useShared<Opening[]>('hr.openings', OPENINGS);
export const useStaffLeaves = () => useShared<StaffLeave[]>('hr.leaves', INITIAL_STAFF_LEAVES);
export const usePolicies = () => useShared<LeavePolicy[]>('hr.policies', LEAVE_POLICIES);
export const useExits = () => useShared<ExitCase[]>('hr.exits', INITIAL_EXITS);

// Months whose attendance HR has locked for payroll (yyyymm keys).
export const useAttLocked = () => useShared<Record<number, boolean>>('hr.attLocked', { 202609: true });

// Manual entries and approved corrections for today: staffId -> times.
export type Punch = { timeIn: string | null; timeOut: string | null; source: 'Device' | 'Manual' | 'Correction' };
export const usePunches = () => useShared<Record<string, Punch>>('hr.punches', {});
export const useDeviceSynced = () => useShared<boolean>('hr.synced', false);

export function staffName(list: HrStaff[], id: string) {
  return list.find(s => s.id === id)?.name ?? id;
}
