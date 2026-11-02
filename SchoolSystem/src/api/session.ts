// Signed-in session: JWT plus the switcher context, kept in memory and on the
// phone (AsyncStorage) so the user stays signed in until the token expires.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getShared, setShared, useShared } from '../store';

const STORAGE_KEY = 'bfs.session.v1';
const SCHOOL_KEY = 'bfs.schoolCode';

export type ServerRole =
  | 'parent'
  | 'student'
  | 'teacher'
  | 'owner'
  | 'principal'
  | 'frontdesk'
  | 'accounts'
  | 'hr'
  | 'exam'
  | 'transport'
  | 'store'
  | 'librarian'
  | 'super_admin';

export type SessionUser = {
  id: string;
  name: string;
  email?: string;
  role: ServerRole;
  schoolId?: string;
  schoolName?: string;
  campusIds: string[];
  staffId: string | null;
  mustChangePw: boolean;
  permissions: string[];
  brandColor?: string;
};

export type Campus = { id: string; name: string; code?: string; activeSessionId?: string };
export type AcademicSession = { id: string; name: string; isCurrent: boolean; isClosed: boolean };

export type ApiSession = {
  token: string;
  exp: number; // unix seconds
  user: SessionUser;
  schoolCode: string;
  campusId?: string;
  sessionId?: string;
  childId?: number;
  campuses: Campus[];
  sessions: AcademicSession[];
};

const KEY = 'api.session';

export function getSession(): ApiSession | null {
  return getShared<ApiSession | null>(KEY, null);
}

export function useApiSession() {
  return useShared<ApiSession | null>(KEY, null);
}

export function tokenExpiry(token: string): number {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(decodeBase64(part));
    return Number(json.exp) || 0;
  } catch {
    return 0;
  }
}

// Small base64 decoder; atob is not guaranteed on every JS engine.
function decodeBase64(s: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const c of s.replace(/[=]+$/, '')) {
    const v = chars.indexOf(c);
    if (v < 0) {
      continue;
    }
    // eslint-disable-next-line no-bitwise
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      // eslint-disable-next-line no-bitwise
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

export function isExpired(s: ApiSession | null, marginSec = 30) {
  return !s || s.exp * 1000 < Date.now() + marginSec * 1000;
}

export async function saveSession(s: ApiSession | null) {
  setShared(KEY, s);
  try {
    if (s) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage is best effort; the in-memory session still works.
  }
}

export function updateSession(patch: Partial<ApiSession>) {
  const s = getSession();
  if (s) {
    saveSession({ ...s, ...patch });
  }
}

export async function restoreSession(): Promise<ApiSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const s = raw ? (JSON.parse(raw) as ApiSession) : null;
    if (s && !isExpired(s)) {
      setShared(KEY, s);
      return s;
    }
    if (s) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return null;
}

export async function loadSchoolCode(fallback: string): Promise<string> {
  try {
    return (await AsyncStorage.getItem(SCHOOL_KEY)) || fallback;
  } catch {
    return fallback;
  }
}

export async function saveSchoolCode(code: string) {
  try {
    await AsyncStorage.setItem(SCHOOL_KEY, code);
  } catch {
    // ignore
  }
}
