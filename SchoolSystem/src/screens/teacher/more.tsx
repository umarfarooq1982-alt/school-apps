import React from 'react';
import {
  Bell,
  Calendar,
  Check,
  ChartColumn,
  Clock,
  File,
  Globe,
  Heart,
  Layers,
  Lock,
  LogOut,
  MessageCircle,
  Paperclip,
  Receipt,
  Users,
} from 'lucide-react-native';
import { Card, IconButton, IconType, ListRow, Screen, toast } from '../../components/ui';
import { useNav } from '../../navigation';
import { useSession } from '../../store';
import { useI18n } from '../../i18n';
import { useApi } from '../../api/hooks';
import { teacherApi } from '../../api/mobile';
import { getSession } from '../../api/session';

type Item = { icon: IconType; label: string; route?: string; sub?: string; onPress?: () => void };

// T28
export function TeacherMore() {
  const nav = useNav();
  const { t, lang, setLang } = useI18n();
  const { signOut } = useSession();
  const leaves = useApi('teacher.leaves', teacherApi.leaves);
  const pending = (leaves.data || []).filter(l => l.status === 'pending').length;
  const user = getSession()?.user;

  const sections: Item[][] = [
    [
      { icon: Calendar, label: 'My timetable', route: 'TeacherTimetable' },
      { icon: Paperclip, label: 'Homework', route: 'TeacherHomeworkList' },
      { icon: Users, label: 'My students', route: 'TeacherStudents' },
      {
        icon: Clock,
        label: 'Student leaves',
        route: 'TeacherStudentLeaves',
        sub: pending ? `${pending} pending` : 'No pending',
      },
      { icon: Layers, label: 'Curriculum and lesson plans', route: 'TeacherLessonPlan' },
      { icon: Layers, label: 'Syllabus coverage', route: 'TeacherSyllabus' },
    ],
    [
      { icon: Clock, label: 'Late and early', route: 'TeacherLateEarly' },
      { icon: File, label: 'Class diary', route: 'TeacherClassDiary' },
      { icon: Heart, label: 'Behavior and sick bay', route: 'TeacherBehavior' },
      { icon: ChartColumn, label: 'Reports', route: 'TeacherReports' },
    ],
    [
      { icon: Check, label: 'My attendance and leave', route: 'TeacherMyAttendance' },
      { icon: Receipt, label: 'Salary slips', route: 'TeacherSalary' },
      { icon: MessageCircle, label: 'Message parents', route: 'TeacherMessageParents' },
      { icon: Bell, label: 'Notices', route: 'TeacherNotices' },
    ],
    [
      { icon: Lock, label: 'Change password', route: 'ChangePassword' },
      {
        icon: LogOut,
        label: 'Sign out',
        onPress: () => {
          signOut();
          nav.reset('RoleSelect');
        },
      },
    ],
  ];

  return (
    <Screen
      title="More"
      subtitle={`${user?.name || t('Teacher')}${user?.staffId ? ` · Staff #${user.staffId}` : ''}`}
      right={
        <IconButton
          icon={Globe}
          onPress={() => {
            const next = lang === 'en' ? 'ur' : 'en';
            setLang(next);
            toast(next === 'ur' ? 'اردو' : 'English');
          }}
        />
      }
    >
      {sections.map((items, si) => (
        <Card key={si}>
          {items.map((it, i) => (
            <ListRow
              key={it.label}
              icon={it.icon}
              title={t(it.label)}
              subtitle={it.sub ? t(it.sub) : undefined}
              onPress={it.onPress ?? (() => it.route && nav.push(it.route))}
              chevron={!!it.route}
              last={i === items.length - 1}
            />
          ))}
        </Card>
      ))}
    </Screen>
  );
}
