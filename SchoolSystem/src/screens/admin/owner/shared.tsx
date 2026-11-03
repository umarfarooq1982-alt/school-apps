// Helpers shared by the Owner and Principal panels.
import React, { useCallback, useRef } from 'react';
import { Lock } from 'lucide-react-native';
import { InfoBanner, toast } from '../../../components/ui';
import { useReadOnly } from '../../../data/admin';
import { Query, useApi } from '../../../api/hooks';
import { ModuleRow, webA } from '../../../api/webA';
import { errorMessage } from '../../../api/client';

// Closed sessions are read-only except for the Owner (M-01).
export function useGuard() {
  const ro = useReadOnly();
  const guard = (fn: () => void) => () => {
    if (ro) {
      toast('This session is closed and read-only.');
      return;
    }
    fn();
  };
  return { ro, guard };
}

export function ReadOnlyBanner() {
  const ro = useReadOnly();
  return ro ? (
    <InfoBanner
      tone="warn"
      icon={Lock}
      text="You are viewing a closed session. It is read-only; only the Owner can change it."
    />
  ) : null;
}

let seq = 0;
export const localId = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

// A list kept in a server module (/api/web/modules/{key}). Screens use it like
// useState: setList(fn) works out which items are new or changed and saves
// them (POST for new, PUT for changed), then reloads from the server.
export function useModuleList<T extends { id: string }>(
  key: string,
  fromRow: (r: ModuleRow) => T,
  toPayload: (t: T) => Record<string, unknown>,
): [T[], (next: T[] | ((prev: T[]) => T[])) => void, Query<ModuleRow[]>] {
  const q = useApi(`adm:mod:${key}`, () => webA.modules(key));
  const list = (q.data ?? []).map(fromRow);
  const ref = useRef(list);
  ref.current = list;
  const set = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      const prev = ref.current;
      const out = typeof next === 'function' ? (next as (p: T[]) => T[])(prev) : next;
      const known = new Map(prev.map(x => [x.id, JSON.stringify(x)]));
      const jobs: Array<Promise<unknown>> = [];
      out.forEach(item => {
        const before = known.get(item.id);
        if (before === undefined) {
          jobs.push(webA.addModule(key, toPayload(item)));
        } else if (before !== JSON.stringify(item)) {
          jobs.push(webA.updateModule(key, item.id, toPayload(item)));
        }
      });
      // Show the change at once; the reload brings server ids and values.
      q.setData(() => out.map(x => ({ ...toPayload(x), id: x.id as unknown as number })) as ModuleRow[]);
      Promise.all(jobs)
        .then(() => q.refresh())
        .catch(e => {
          toast(errorMessage(e));
          q.refresh();
        });
    },
    [key, q, toPayload],
  );
  return [list, set, q];
}
