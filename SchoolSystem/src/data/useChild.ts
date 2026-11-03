import { useCallback } from 'react';
import { invalidate } from '../api/hooks';
import { updateSession } from '../api/session';
import type { StudentDto } from '../api/mobile';
import { useChildId, useChildren } from '../screens/shared/data';

// The child the screens show, from the server: the parent's selected child or
// the signed-in student.
export type ChildView = {
  id: number;
  name: string;
  className: string; // "Class 5-A"
  classOnly: string;
  section: string;
  gr: string;
  roll: string;
  campusId: number;
  father: string;
  mother: string;
  mobile: string;
  address: string;
  dob: string;
  gender: string;
  photoUrl: string | null;
  loaded: boolean;
};

export function toChildView(s?: StudentDto | null): ChildView {
  return {
    id: s?.id ?? 0,
    name: s?.name ?? '',
    className: s ? `${s.className}${s.section ? `-${s.section}` : ''}` : '',
    classOnly: s?.className ?? '',
    section: s?.section ?? '',
    gr: s?.grNo ?? '',
    roll: s?.rollNo ?? '—',
    campusId: s?.campusId ?? 0,
    father: s?.father ?? '',
    mother: s?.mother ?? '',
    mobile: s?.mobile ?? '',
    address: s?.address ?? '',
    dob: s?.dob ?? '',
    gender: s?.gender ?? '',
    photoUrl: s?.photoUrl ?? null,
    loaded: !!s,
  };
}

export function useCurrentChild(): ChildView {
  const id = useChildId();
  const { data } = useChildren();
  const list = data ?? [];
  return toChildView(list.find(c => c.id === id) ?? list[0]);
}

// Selecting a child sends X-Child-Id on every request and reloads the screens.
export function useSelectChild() {
  const id = useChildId();
  const { data } = useChildren();
  const current = id ?? data?.[0]?.id;
  const select = useCallback((childId: number) => {
    updateSession({ childId });
    invalidate('fam:');
  }, []);
  return [current, select] as const;
}
