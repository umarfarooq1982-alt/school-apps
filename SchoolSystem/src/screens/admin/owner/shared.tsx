// Helpers shared by the Owner and Principal panels.
import React from 'react';
import { Lock } from 'lucide-react-native';
import { InfoBanner, toast } from '../../../components/ui';
import { useReadOnly } from '../../../data/admin';

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
