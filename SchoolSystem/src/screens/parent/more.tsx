import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Bell,
  BookOpen,
  Bus,
  CalendarDays,
  Check,
  Clock,
  File,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  Lock,
  LogOut,
  MessageCircle,
  Receipt,
  Settings,
  Shield,
  Star,
  User,
} from 'lucide-react-native';
import {
  Card,
  IconButton,
  IconType,
  ListRow,
  Screen,
  Segmented,
  Toggle,
} from '../../components/ui';
import { ScreenProps, useNav } from '../../navigation';
import { useSession, useShared } from '../../store';
import { useI18n } from '../../i18n';

type Item = { label: string; icon: IconType; route: string };

const GROUPS: Item[][] = [
  [
    { label: 'Attendance', icon: Check, route: 'Attendance' },
    { label: 'Timetable and calendar', icon: CalendarDays, route: 'Timetable' },
    { label: 'Exams and results', icon: GraduationCap, route: 'Exams' },
    { label: 'Leave', icon: Clock, route: 'ParentLeave' },
    { label: 'Transport', icon: Bus, route: 'Transport' },
    { label: 'Library', icon: BookOpen, route: 'Library' },
  ],
  [
    { label: 'Complaints and surveys', icon: MessageCircle, route: 'ParentComplaints' },
    { label: 'Pickup persons', icon: Shield, route: 'ParentPickup' },
    { label: 'Certificates', icon: File, route: 'ParentCertificates' },
    { label: 'Child profile', icon: User, route: 'ParentProfile' },
  ],
  [
    { label: 'Notices and messages', icon: Bell, route: 'Notices' },
    { label: 'Behavior and health', icon: Heart, route: 'ParentBehavior' },
    { label: 'Feedback survey', icon: Star, route: 'ParentSurvey' },
    { label: 'Payment history', icon: Receipt, route: 'ParentPaymentHistory' },
    { label: 'Settings', icon: Settings, route: 'ParentSettings' },
  ],
];

function useSignOut() {
  const nav = useNav();
  const { signOut } = useSession();
  return () => {
    signOut();
    nav.reset('RoleSelect');
  };
}

export function ParentMore(_: ScreenProps) {
  const nav = useNav();
  const { t, lang, setLang } = useI18n();
  const signOut = useSignOut();
  return (
    <Screen
      title="More"
      right={
        <IconButton icon={Globe} onPress={() => setLang(lang === 'en' ? 'ur' : 'en')} />
      }
    >
      {GROUPS.map((g, gi) => (
        <Card key={gi}>
          {g.map((it, i) => (
            <ListRow
              key={it.route}
              icon={it.icon}
              title={t(it.label)}
              onPress={() => nav.push(it.route)}
              last={i === g.length - 1}
            />
          ))}
        </Card>
      ))}
      <Card>
        <ListRow icon={FileText} title={t('Homework')} onPress={() => nav.push('Homework')} />
        <ListRow icon={LogOut} iconTone="danger" title={t('Sign out')} onPress={signOut} last />
      </Card>
    </Screen>
  );
}

const NOTIFS = [
  { key: 'absent', label: 'Absent alerts', icon: Bell },
  { key: 'fee', label: 'Fee and payments', icon: Receipt },
  { key: 'diary', label: 'Diary and homework', icon: File },
  { key: 'results', label: 'Results and exams', icon: GraduationCap },
  { key: 'notices', label: 'School notices', icon: MessageCircle },
];

export function ParentSettings(_: ScreenProps) {
  const nav = useNav();
  const { t, lang, setLang } = useI18n();
  const signOut = useSignOut();
  const [prefs, setPrefs] = useShared<Record<string, boolean>>(
    'parent.notifPrefs',
    { absent: true, fee: true, diary: true, results: true, notices: true },
  );
  return (
    <Screen title="Settings">
      <Card>
        <ListRow
          icon={Globe}
          title={t('Language')}
          subtitle={lang === 'en' ? 'English' : 'اردو'}
          right={
            <View style={s.lang}>
              <Segmented
                options={['EN', 'اردو']}
                value={lang === 'en' ? 'EN' : 'اردو'}
                onChange={v => setLang(v === 'EN' ? 'en' : 'ur')}
              />
            </View>
          }
          last
        />
      </Card>
      <Card title="Notifications">
        {NOTIFS.map((n, i) => (
          <ListRow
            key={n.key}
            icon={n.icon}
            title={t(n.label)}
            right={
              <Toggle
                value={prefs[n.key] ?? true}
                onChange={v => setPrefs(p => ({ ...p, [n.key]: v }))}
              />
            }
            last={i === NOTIFS.length - 1}
          />
        ))}
      </Card>
      <Card>
        <ListRow icon={Lock} title={t('Change password')} onPress={() => nav.push('ChangePassword')} />
        <ListRow icon={LogOut} title={t('Sign out')} onPress={signOut} last />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  lang: { width: 130 },
});
