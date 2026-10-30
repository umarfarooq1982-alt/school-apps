import { useCallback, useSyncExternalStore } from 'react';

// Tiny in-memory store shared by every screen. Values survive navigation
// (screens mounting and unmounting) and are wiped on sign out.
const values = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  listeners.get(key)?.forEach(l => l());
}

export function getShared<T>(key: string, initial: T): T {
  if (!values.has(key)) {
    values.set(key, initial);
  }
  return values.get(key) as T;
}

export function setShared<T>(key: string, next: T | ((prev: T) => T)) {
  const prev = values.get(key) as T;
  const value =
    typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
  values.set(key, value);
  emit(key);
}

export function useShared<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(cb);
      return () => {
        set?.delete(cb);
      };
    },
    [key],
  );
  const value = useSyncExternalStore(subscribe, () => getShared(key, initial));
  const update = useCallback(
    (next: T | ((prev: T) => T)) => setShared(key, next),
    [key],
  );
  return [value, update];
}

export function clearShared(keep: string[] = []) {
  const keys = Array.from(values.keys());
  keys.forEach(k => {
    if (!keep.includes(k)) {
      values.delete(k);
      emit(k);
    }
  });
}

export type Role = 'parent' | 'student' | 'teacher' | 'admin';

export function useSession() {
  const [role, setRole] = useShared<Role | null>('session.role', null);
  const signIn = useCallback((r: Role) => setRole(r), [setRole]);
  const signOut = useCallback(() => {
    clearShared(['session.lang']);
    setShared('session.role', null);
  }, []);
  return { role, signIn, signOut };
}
