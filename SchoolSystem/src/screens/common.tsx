import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Briefcase, ChevronLeft, GraduationCap, Lock } from 'lucide-react-native';
import { Button, Field, IconButton, InfoBanner, Screen, toast } from '../components/ui';
import { colors } from '../theme';
import { ScreenMap, useNav } from '../navigation';
import { useSession } from '../store';
import { useI18n } from '../i18n';
import {
  PARENT_PUSH,
  SCHOOL,
  STUDENT_PUSH,
  TODAY_LABEL,
} from '../data/school';

const TEACHER_PUSH = [
  { text: 'Substitution today: period 5, Class 7-B Science', when: 'now' },
  { text: 'Attendance for 5-A is not marked yet (cut-off 10:00)', when: '7:20' },
  { text: "Leave request from Ahmed Khan's parent", when: 'Yesterday' },
  { text: 'Lesson plan for week of 19 Oct approved', when: 'Mon' },
  { text: 'Salary slip for September is ready', when: '1 Oct' },
];

const ADMIN_PUSH = [
  { text: '5 approvals are waiting: admission, discount, fine waiver, leave, result', when: 'now' },
  { text: 'Collection today Rs. 682,400 across 3 campuses', when: '1:45' },
  { text: '2 teachers absent today; 5 periods need substitutes', when: '8:05' },
  { text: 'Low stock: uniform shirt size 28 (6 left)', when: 'Yesterday' },
  { text: 'Vehicle LEA-4512 fitness certificate expires in 12 days', when: 'Mon' },
];

// Push notifications, shown the way they appear on the phone lock screen.
function Notifications() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { role } = useSession();
  const { t } = useI18n();
  const items =
    role === 'admin'
      ? ADMIN_PUSH
      : role === 'teacher'
      ? TEACHER_PUSH
      : role === 'student'
      ? STUDENT_PUSH
      : PARENT_PUSH;
  const Icon = role === 'teacher' ? Briefcase : GraduationCap;
  const time = role === 'teacher' ? '7:31' : '9:41';
  return (
    <View style={[s.lock, { paddingTop: insets.top + 8 }]}>
      <View style={s.lockTop}>
        <IconButton
          icon={ChevronLeft}
          onPress={nav.pop}
          style={s.lockBack}
          color={colors.white}
        />
        <Text style={s.lockTitle}>{t('Notifications')}</Text>
      </View>
      <ScrollView contentContainerStyle={s.lockBody}>
        <Text style={s.clock}>{time}</Text>
        <Text style={s.date}>{TODAY_LABEL}</Text>
        {items.map((n, i) => (
          <View key={i} style={s.note}>
            <View style={s.noteIcon}>
              <Icon size={16} color={colors.text} />
            </View>
            <View style={s.flex}>
              <View style={s.noteHead}>
                <Text style={s.noteApp}>{SCHOOL}</Text>
                <Text style={s.noteWhen}>{n.when}</Text>
              </View>
              <Text style={s.noteText}>{n.text}</Text>
            </View>
          </View>
        ))}
        <Text style={s.lockHint}>
          Real push alerts arrive once the school server is connected.
        </Text>
      </ScrollView>
    </View>
  );
}

function ChangePassword() {
  const nav = useNav();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const save = () => {
    if (!cur) {
      toast('Enter the current password');
    } else if (pw.length < 6) {
      toast('Password must be at least 6 characters');
    } else if (pw !== pw2) {
      toast('Passwords do not match');
    } else {
      toast('Password changed');
      nav.pop();
    }
  };
  return (
    <Screen
      title="Change password"
      footer={<Button label="Change password" onPress={save} />}
    >
      <Field label="Current password" icon={Lock} value={cur} onChangeText={setCur} secureTextEntry />
      <Field label="New password" icon={Lock} value={pw} onChangeText={setPw} secureTextEntry />
      <Field label="Repeat new password" icon={Lock} value={pw2} onChangeText={setPw2} secureTextEntry />
      <InfoBanner
        icon={Lock}
        text="At least 6 characters. You will sign in again with the new password."
      />
    </Screen>
  );
}

export const commonScreens: ScreenMap = { Notifications, ChangePassword };

const s = StyleSheet.create({
  flex: { flex: 1 },
  lock: { flex: 1, backgroundColor: '#1B1310' },
  lockTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  lockBack: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' },
  lockTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  lockBody: { padding: 14, gap: 10, paddingBottom: 40 },
  clock: {
    color: colors.white,
    fontSize: 64,
    fontWeight: '300',
    textAlign: 'center',
    marginTop: 20,
  },
  date: {
    color: '#D9D2CB',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 18,
  },
  note: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#E6E3E1',
    borderRadius: 18,
    padding: 12,
  },
  noteIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between' },
  noteApp: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  noteWhen: { fontSize: 11.5, color: colors.textMuted },
  noteText: { fontSize: 13, color: colors.text, marginTop: 1 },
  lockHint: {
    color: '#8F8781',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
  },
});
