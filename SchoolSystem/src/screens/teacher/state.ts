// Shared, mutable teacher state (in-memory, reset on sign out).
import { useShared } from '../../store';
import {
  BEHAVIOR,
  BehaviorRecord,
  CHAPTERS,
  EARLY_LEAVES,
  EarlyLeave,
  LESSON_PLANS,
  LessonPlan,
  MARKS_INITIAL,
  QueueItem,
  SICK_BAY,
  STUDENT_LEAVES,
  StudentLeave,
  SUBMISSIONS,
  Submission,
  T_HOMEWORK,
  THomework,
  UPLOAD_QUEUE,
} from '../../data/teacher';

export const useOffline = () => useShared<boolean>('teacher.offline', false);
export const useQueue = () => useShared<QueueItem[]>('teacher.queue', UPLOAD_QUEUE);
export const useAttendanceMarked = () =>
  useShared<boolean>('teacher.attMarked', false);
export const useDiaryPosted = () =>
  useShared<Record<string, boolean>>('teacher.diaryPosted', {
    '5-A English': true,
  });
export const useStudentLeaves = () =>
  useShared<StudentLeave[]>('teacher.leaves', STUDENT_LEAVES);
export const useHomework = () =>
  useShared<THomework[]>('teacher.homework', T_HOMEWORK);
export const useSubmissions = () =>
  useShared<Submission[]>('teacher.submissions', SUBMISSIONS);
export const useMarks = () =>
  useShared<Record<string, string>>('teacher.marks', MARKS_INITIAL);
export const useMarksComplete = () =>
  useShared<boolean>('teacher.marksComplete', false);
export const useBehavior = () =>
  useShared<BehaviorRecord[]>('teacher.behavior', BEHAVIOR);
export const useSickBay = () => useShared('teacher.sickbay', SICK_BAY);
export const useLessonPlans = () =>
  useShared<LessonPlan[]>('teacher.lessonPlans', LESSON_PLANS);
export const useChapters = () =>
  useShared<Record<string, string | undefined>>(
    'teacher.chapters',
    Object.fromEntries(CHAPTERS.map(c => [c.id, c.done])),
  );
export const useEarlyLeaves = () =>
  useShared<EarlyLeave[]>('teacher.early', EARLY_LEAVES);

let seq = 100;
export const newId = (p: string) => `${p}${++seq}`;

export const TAB = {
  today: 'today',
  attendance: 'attendance',
  diary: 'diary',
  marks: 'marks',
  more: 'more',
};
