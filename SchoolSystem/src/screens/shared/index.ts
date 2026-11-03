import { ScreenMap } from '../../navigation';
import {
  AdmitCardScreen,
  AttendanceScreen,
  CalendarScreen,
  DiaryScreen,
  ExamsScreen,
  HomeworkScreen,
  ReportCardScreen,
  ResultsScreen,
  TimetableScreen,
} from './academics';
import { LibraryScreen, NoticesScreen, TransportScreen } from './info';

export {
  AdmitCardScreen,
  AttendanceScreen,
  CalendarScreen,
  DiaryContent,
  DiaryScreen,
  EventsCard,
  ExamsScreen,
  gradeFor,
  HomeworkContent,
  HomeworkScreen,
  hwBucket,
  ReportCardScreen,
  ResultsScreen,
  TimetableScreen,
  useCalendar,
  useHomework,
  useNotices,
  useTimetable,
} from './academics';
export type { HwStatus } from './academics';
export { LibraryScreen, NoticesScreen, TransportScreen } from './info';
export * from './data';

export const sharedScreens: ScreenMap = {
  Attendance: AttendanceScreen,
  Diary: DiaryScreen,
  Homework: HomeworkScreen,
  Timetable: TimetableScreen,
  Calendar: CalendarScreen,
  Exams: ExamsScreen,
  Results: ResultsScreen,
  AdmitCard: AdmitCardScreen,
  ReportCard: ReportCardScreen,
  Library: LibraryScreen,
  Transport: TransportScreen,
  Notices: NoticesScreen,
};
