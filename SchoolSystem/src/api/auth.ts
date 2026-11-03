// Turns a login response into the app session and decides which app opens.
import { authApi, LoginResult, settingsApi } from './mobile';
import { saveSession, tokenExpiry, getSession, ServerRole } from './session';
import { clearShared, Role, setShared } from '../store';
import type { StaffRole } from '../data/admin';

const STAFF_ROLES: ServerRole[] = ['owner', 'principal', 'frontdesk', 'accounts', 'hr', 'exam', 'transport', 'store', 'librarian'];

export function appRoleFor(role: ServerRole): Role | null {
  if (role === 'parent' || role === 'student' || role === 'teacher') {
    return role;
  }
  if (STAFF_ROLES.includes(role)) {
    return 'admin';
  }
  return null; // super_admin uses the web platform panel
}

export async function completeSignIn(r: LoginResult, schoolCode: string): Promise<Role> {
  const role = appRoleFor(r.user.role);
  if (!role) {
    throw new Error('This login is for the platform web panel, not the school app.');
  }
  // Keep the in-app language across sign out.
  clearShared(['session.lang']);
  await saveSession({
    token: r.accessToken,
    exp: tokenExpiry(r.accessToken),
    refreshToken: r.refreshToken,
    refreshExp: r.refreshToken ? tokenExpiry(r.refreshToken) : undefined,
    user: {
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      role: r.user.role,
      schoolId: r.user.schoolId,
      schoolName: r.user.schoolName,
      campusIds: r.user.campusIds || [],
      staffId: r.user.staffId,
      mustChangePw: !!r.user.mustChangePw,
      permissions: r.user.permissions || [],
      brandColor: r.user.brandColor,
    },
    schoolCode,
    campusId: r.campusId,
    sessionId: r.sessionId,
    campuses: r.campuses || [],
    sessions: r.sessions || [],
  });
  if (role === 'admin') {
    setShared<StaffRole>('admin.role', r.user.role as StaffRole);
    setShared('admin.campus', r.campusId && r.user.role === 'owner' ? 'all' : r.campusId || 'all');
    if (r.sessionId) {
      setShared('admin.session', r.sessionId);
    }
  }
  setShared('session.role', role);
  // Language and notification flags live on the server (P33/P34).
  settingsApi
    .get()
    .then(s => setShared('session.lang', s.locale === 'ur' ? 'ur' : 'en'))
    .catch(() => undefined);
  return role;
}

// Signs out on the server (best effort) and wipes local state.
export async function signOutEverywhere() {
  const s = getSession();
  if (s) {
    authApi.logout(s.refreshToken).catch(() => undefined);
  }
  await saveSession(null);
  clearShared(['session.lang']);
  setShared('session.role', null);
}
