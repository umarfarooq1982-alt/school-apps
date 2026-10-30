import React from 'react';
import { Check, File, House, LayoutGrid, Pencil } from 'lucide-react-native';
import { ScreenMap } from '../../navigation';
import { TabShell } from '../../components/Tabs';
import { TAB } from './state';
import { TeacherTimetable, TeacherToday } from './today';
import {
  TeacherAttendance,
  TeacherLateEarly,
  TeacherOfflineAttendance,
  TeacherPeriodAttendance,
} from './attendance';
import { TeacherClassDiary, TeacherPostDiary } from './diary';
import {
  TeacherAssignHomework,
  TeacherCheckHomework,
  TeacherHomeworkList,
} from './homework';
import { TeacherMarks } from './marks';
import {
  TeacherBehavior,
  TeacherStudentLeaves,
  TeacherStudentProfile,
  TeacherStudents,
} from './students';
import {
  TeacherApplyLeave,
  TeacherLessonPlan,
  TeacherMessageParents,
  TeacherMyAttendance,
  TeacherNotices,
  TeacherReports,
  TeacherSalary,
  TeacherSyllabus,
} from './me';
import { TeacherMore } from './more';

function TeacherTabs() {
  return React.createElement(TabShell, {
    tabs: [
      { key: TAB.today, label: 'Today', icon: House, component: TeacherToday },
      {
        key: TAB.attendance,
        label: 'Attendance',
        icon: Check,
        component: TeacherAttendance,
      },
      { key: TAB.diary, label: 'Diary', icon: File, component: TeacherPostDiary },
      { key: TAB.marks, label: 'Marks', icon: Pencil, component: TeacherMarks },
      { key: TAB.more, label: 'More', icon: LayoutGrid, component: TeacherMore },
    ],
  });
}

export const teacherScreens: ScreenMap = {
  TeacherTabs,
  TeacherTimetable,
  TeacherOfflineAttendance,
  TeacherPeriodAttendance,
  TeacherLateEarly,
  TeacherPostDiary,
  TeacherClassDiary,
  TeacherAssignHomework,
  TeacherHomeworkList,
  TeacherCheckHomework,
  TeacherMarks,
  TeacherStudents,
  TeacherStudentProfile,
  TeacherBehavior,
  TeacherStudentLeaves,
  TeacherLessonPlan,
  TeacherSyllabus,
  TeacherMyAttendance,
  TeacherApplyLeave,
  TeacherSalary,
  TeacherMessageParents,
  TeacherNotices,
  TeacherReports,
  TeacherMore,
};
