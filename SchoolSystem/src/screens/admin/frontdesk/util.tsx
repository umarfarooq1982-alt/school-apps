// Helpers shared by the Front Desk and Exam panels.
import React from 'react';
import { Lock } from 'lucide-react-native';
import { InfoBanner, toast } from '../../../components/ui';
import { useReadOnly } from '../../../data/admin';
import type { Tone } from '../../../theme';

// Closed sessions are read-only (M-01). Wrap every write action with guard().
export function useGuard() {
  const ro = useReadOnly();
  const guard =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      if (ro) {
        toast('This session is closed and read-only.');
        return;
      }
      fn(...args);
    };
  return { ro, guard };
}

export function ReadOnlyBanner() {
  const ro = useReadOnly();
  return ro ? (
    <InfoBanner tone="warn" icon={Lock} text="Viewing a closed session. Changes are disabled." />
  ) : null;
}

export function statusTone(status: string): Tone {
  switch (status) {
    case 'Selected':
    case 'Registered':
    case 'Issued':
    case 'Active':
    case 'Published':
    case 'Locked':
    case 'Pass':
    case 'Approved':
    case 'Final':
      return 'success';
    case 'Rejected':
    case 'Lost':
    case 'Left':
    case 'Struck off':
    case 'Fail':
    case 'Held':
      return 'danger';
    case 'Waiting':
    case 'Pending':
    case 'Requested':
    case 'Waiting approval':
    case 'Contacted':
    case 'Draft':
      return 'warn';
    case 'Visited':
    case 'Transferred':
    case 'New':
      return 'info';
    default:
      return 'neutral';
  }
}

export const isNum = (v: string) => /^\d+(\.\d+)?$/.test(v.trim());
