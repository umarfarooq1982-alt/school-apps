// Which of the four apps is running. Set from the Android product flavor
// (launch property `appRole`); null means the combined app (tests, dev).
import type { Role } from './store';

let fixedRole: Role | null = null;

const ROLES: Role[] = ['parent', 'student', 'teacher', 'admin'];

export function setAppRole(value: unknown) {
  fixedRole = ROLES.includes(value as Role) ? (value as Role) : null;
}

export function getAppRole(): Role | null {
  return fixedRole;
}

export const SIGN_IN_ROUTE: Record<Role, string> = {
  parent: 'ParentSignIn',
  student: 'StudentSignIn',
  teacher: 'TeacherSignIn',
  admin: 'AdminSignIn',
};

export const APP_NAME: Record<Role, string> = {
  parent: 'Parent app',
  student: 'Student app',
  teacher: 'Teacher app',
  admin: 'School Admin app',
};
