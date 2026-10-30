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
  HomeworkContent,
  HomeworkScreen,
  ReportCardScreen,
  ResultsScreen,
  TimetableScreen,
  useHomeworkStatus,
} from './academics';
export type { HwStatus } from './academics';
export { LibraryScreen, NoticesScreen, TransportScreen } from './info';
export { useChildFee, voucherLines } from './fee';
export type { Receipt } from './fee';

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
