// Teacher state kept on the phone between screens (reset on sign out).
import { useShared } from '../../store';

export type AttendancePayload = {
  classId: number;
  section: string;
  date: string;
  marks: Record<string, string>;
};

// Attendance saved while offline (T06), uploaded later to the server.
export type QueueItem = {
  id: string;
  title: string;
  sub: string;
  status: 'Waiting' | 'Uploaded' | 'Failed';
  payload: AttendancePayload;
};

export const useOffline = () => useShared<boolean>('teacher.offline', false);
export const useQueue = () => useShared<QueueItem[]>('teacher.queue', []);

let seq = 100;
export const newId = (p: string) => `${p}${++seq}`;

export const TAB = {
  today: 'today',
  attendance: 'attendance',
  diary: 'diary',
  marks: 'marks',
  more: 'more',
};
