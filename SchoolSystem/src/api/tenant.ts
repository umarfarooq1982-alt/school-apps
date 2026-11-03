// The school (tenant) the app signs in to. Looked up from the school code via
// the public API, remembered on the phone, never hard-coded.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { request } from './client';
import { API_BASE_URL } from './config';
import { getShared, setShared, useShared } from '../store';
import { useApiSession } from './session';

export type Tenant = {
  id: string;
  name: string;
  code: string;
  brandColor?: string;
  logoUrl?: string | null;
};

const KEY = 'auth.tenant';
const STORAGE_KEY = 'bfs.tenant.v1';

export async function lookupSchool(code: string): Promise<Tenant> {
  const d = await request<Tenant>('GET', `/api/public/${encodeURIComponent(code.trim())}`, { auth: false });
  return { id: String(d.id), name: d.name, code: d.code, brandColor: d.brandColor, logoUrl: d.logoUrl };
}

export function logoUri(t?: Tenant | null) {
  if (!t?.logoUrl) {
    return null;
  }
  return /^https?:\/\//.test(t.logoUrl) ? t.logoUrl : `${API_BASE_URL}${t.logoUrl}`;
}

export function saveTenant(t: Tenant | null) {
  setShared(KEY, t);
  try {
    if (t) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // best effort
  }
}

export async function restoreTenant() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw && !getShared<Tenant | null>(KEY, null)) {
      setShared(KEY, JSON.parse(raw) as Tenant);
    }
  } catch {
    // ignore
  }
}

export function useTenant() {
  const [tenant] = useShared<Tenant | null>(KEY, null);
  useEffect(() => {
    if (!tenant) {
      restoreTenant();
    }
  }, [tenant]);
  return tenant;
}

// The school name to show: from the signed-in session, else the school the
// code was looked up for, else a neutral label.
export function useSchoolName(fallback = 'School app') {
  const [session] = useApiSession();
  const tenant = useTenant();
  return session?.user.schoolName || tenant?.name || fallback;
}
