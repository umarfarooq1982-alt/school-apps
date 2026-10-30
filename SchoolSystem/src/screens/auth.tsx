import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Briefcase,
  ChevronRight,
  GraduationCap,
  Lock,
  Phone,
  ShieldCheck,
  User,
  Users,
  WifiOff,
} from 'lucide-react-native';
import {
  Button,
  Field,
  Gap,
  IconType,
  InfoBanner,
  OtpInput,
  Screen,
  Segmented,
  toast,
} from '../components/ui';
import { colors, radius } from '../theme';
import { ScreenMap, useNav, useParam } from '../navigation';
import { Role, useSession } from '../store';
import { useI18n } from '../i18n';
import { PARENT, SCHOOL, STUDENT } from '../data/school';

export const HOME_ROUTE: Record<Role, string> = {
  parent: 'ParentTabs',
  student: 'StudentTabs',
  teacher: 'TeacherTabs',
  admin: 'AdminTabs',
};

// Demo credentials until the API is connected.
export const DEMO_CODE = '123456';

// SOW 7.4: the account locks for 15 minutes after 5 failed logins.
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const guards: Record<string, { fails: number; until: number }> = {};

export function checkLogin(key: string, ok: boolean): boolean {
  const g = (guards[key] ??= { fails: 0, until: 0 });
  const now = Date.now();
  if (g.until > now) {
    const mins = Math.ceil((g.until - now) / 60000);
    toast(`Account locked. Try again in ${mins} min.`);
    return false;
  }
  if (ok) {
    g.fails = 0;
    return true;
  }
  g.fails += 1;
  if (g.fails >= MAX_FAILS) {
    g.fails = 0;
    g.until = now + LOCK_MS;
    toast('5 wrong attempts. The account is locked for 15 minutes.');
  } else {
    toast(`Wrong code or password. ${MAX_FAILS - g.fails} attempts left.`);
  }
  return false;
}

function useEnter() {
  const nav = useNav();
  const { signIn } = useSession();
  return (role: Role) => {
    signIn(role);
    nav.reset(HOME_ROUTE[role]);
  };
}

function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <View style={s.langRow}>
      <Pressable onPress={() => setLang('en')} hitSlop={8}>
        <Text style={[s.lang, lang === 'en' && s.langOn]}>English</Text>
      </Pressable>
      <Text style={s.lang}>·</Text>
      <Pressable onPress={() => setLang('ur')} hitSlop={8}>
        <Text style={[s.lang, lang === 'ur' && s.langOn]}>اردو</Text>
      </Pressable>
    </View>
  );
}

function Logo({ icon: Icon = GraduationCap }: { icon?: IconType }) {
  return (
    <View style={s.logo}>
      <Icon size={28} color={colors.text} strokeWidth={2} />
    </View>
  );
}

// ---------- Role select ----------

function RoleSelect() {
  const nav = useNav();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const roles: Array<{
    key: Role;
    title: string;
    sub: string;
    icon: IconType;
    route: string;
  }> = [
    {
      key: 'parent',
      title: 'Parent',
      sub: 'Fee, attendance, results for all your children',
      icon: Users,
      route: 'ParentSignIn',
    },
    {
      key: 'student',
      title: 'Student',
      sub: 'Timetable, homework, results with your GR No.',
      icon: BookOpen,
      route: 'StudentSignIn',
    },
    {
      key: 'teacher',
      title: 'Teacher',
      sub: 'Attendance, diary, marks and your classes',
      icon: Briefcase,
      route: 'TeacherSignIn',
    },
    {
      key: 'admin',
      title: 'School admin / Owner',
      sub: 'Owner, Principal, Accounts, HR, Exam and all staff panels',
      icon: ShieldCheck,
      route: 'AdminSignIn',
    },
  ];
  return (
    <Screen
      header={<View />}
      footer={<LanguageSwitch />}
      contentStyle={insets.top ? s.roleTopInset : s.roleTop}
    >
      <Logo />
      <Text style={s.h1}>{SCHOOL}</Text>
      <Text style={s.lead}>{t('Who is signing in?')}</Text>
      <Text style={s.sub}>{t('Choose your app to continue.')}</Text>
      <Gap h={4} />
      {roles.map(r => (
        <Pressable
          key={r.key}
          onPress={() => nav.push(r.route)}
          style={({ pressed }) => [s.roleCard, pressed && s.pressed]}
        >
          <View style={s.roleIcon}>
            <r.icon size={24} color={colors.primaryText} />
          </View>
          <View style={s.flex}>
            <Text style={s.roleTitle}>{t(r.title)}</Text>
            <Text style={s.roleSub}>{t(r.sub)}</Text>
          </View>
          <ChevronRight size={20} color={colors.text} />
        </Pressable>
      ))}
    </Screen>
  );
}

// ---------- Parent ----------

function ParentSignIn() {
  const nav = useNav();
  const enter = useEnter();
  const [mode, setMode] = useState('Mobile + code');
  const [mobile, setMobile] = useState('300 441 0000');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (mobile.replace(/\D/g, '').length < 10) {
      toast('Enter a valid mobile number');
      return;
    }
    if (mode === 'Mobile + code') {
      nav.push('ParentOtp', { mobile: `+92 ${mobile}` });
    } else if (password.length < 6) {
      toast('Password must be at least 6 characters');
    } else if (checkLogin('parent', password === DEMO_CODE)) {
      enter('parent');
    }
  };

  return (
    <Screen footer={<LanguageSwitch />}>
      <Logo />
      <Text style={s.h1}>{SCHOOL}</Text>
      <Text style={s.sub}>Parent app. One login for all your children.</Text>
      <Segmented
        options={['Mobile + code', 'Password']}
        value={mode}
        onChange={setMode}
      />
      <Field
        label="Mobile number"
        icon={Phone}
        prefix="+92"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
      />
      {mode === 'Password' ? (
        <Field
          label="Password"
          icon={Lock}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
      ) : null}
      <Button
        label={mode === 'Password' ? 'Sign in' : 'Send code'}
        icon={mode === 'Password' ? undefined : ChevronRight}
        onPress={submit}
      />
      <ForgotLink onPress={() => nav.push('ParentReset')} />
      <InfoBanner text={`Demo: the SMS code and the password are ${DEMO_CODE}.`} />
    </Screen>
  );
}

function ForgotLink({
  onPress,
  label = 'Reset by SMS code',
}: {
  onPress: () => void;
  label?: string;
}) {
  const { t } = useI18n();
  return (
    <Text style={s.forgot}>
      {t('Forgot password?')}{' '}
      <Text style={s.forgotLink} onPress={onPress}>
        {t(label)}
      </Text>
    </Text>
  );
}

function useCountdown(start: number) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (left <= 0) {
      return;
    }
    const id = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, () => setLeft(start)] as const;
}

function ParentOtp() {
  const mobile = useParam('mobile', '+92 300 441 0000');
  const enter = useEnter();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [left, restart] = useCountdown(42);

  const verify = () => {
    if (code.length !== 6) {
      toast('Enter all 6 digits');
      return;
    }
    if (checkLogin('parent', code === DEMO_CODE)) {
      enter('parent');
    } else {
      setCode('');
    }
  };

  return (
    <Screen
      title="Enter the 6-digit code"
      subtitle={`Sent to ${mobile}`}
      footer={<Button label="Verify and sign in" onPress={verify} />}
    >
      <Gap h={8} />
      <OtpInput value={code} onChange={setCode} />
      {left > 0 ? (
        <Text style={s.center}>
          {t('Resend code')} in{' '}
          <Text style={s.bold}>0:{String(left).padStart(2, '0')}</Text>
        </Text>
      ) : (
        <Text
          style={[s.center, s.forgotLink]}
          onPress={() => {
            restart();
            toast('New code sent');
          }}
        >
          {t('Resend code')}
        </Text>
      )}
      <InfoBanner
        icon={Lock}
        text={`After 5 wrong attempts the account locks for 15 minutes. Demo code: ${DEMO_CODE}`}
      />
    </Screen>
  );
}

function ResetPassword({
  sentTo,
  askId,
}: {
  sentTo: string;
  askId?: boolean;
}) {
  const nav = useNav();
  const [id, setId] = useState('0300 555 1212');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const save = () => {
    if (code.length !== 6) {
      toast('Enter the 6-digit code');
    } else if (pw.length < 6) {
      toast('Password must be at least 6 characters');
    } else if (!askId && pw !== pw2) {
      toast('Passwords do not match');
    } else {
      toast('Password changed. Please sign in again.');
      nav.pop();
    }
  };
  return (
    <Screen
      title="Reset password"
      footer={<Button label="Change password" onPress={save} />}
    >
      {askId ? (
        <Field
          label="Email or mobile"
          icon={User}
          value={id}
          onChangeText={setId}
        />
      ) : null}
      <Text style={s.sub}>
        {askId ? `Code sent to ${id}.` : `We sent a 6-digit code to ${sentTo}.`}
      </Text>
      <OtpInput value={code} onChange={setCode} />
      <Field
        label="New password"
        icon={Lock}
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        placeholder="••••••••••"
      />
      {askId ? null : (
        <Field
          label="Repeat new password"
          icon={Lock}
          value={pw2}
          onChangeText={setPw2}
          secureTextEntry
          placeholder="••••••••••"
        />
      )}
      {askId ? null : (
        <InfoBanner
          icon={Lock}
          text="At least 6 characters. You will sign in again with the new password."
        />
      )}
    </Screen>
  );
}

function ParentReset() {
  return <ResetPassword sentTo={PARENT.mobile} />;
}

// ---------- Student ----------

let studentPasswordSet = false;
let studentPassword = DEMO_CODE; // the school's first password

function StudentSignIn() {
  const nav = useNav();
  const enter = useEnter();
  const [gr, setGr] = useState(STUDENT.gr);
  const [pw, setPw] = useState('');
  const submit = () => {
    if (!gr.trim()) {
      toast('Enter your GR No.');
    } else if (pw.length < 6) {
      toast('Password must be at least 6 characters');
    } else if (!checkLogin('student', pw === studentPassword)) {
      return;
    } else if (!studentPasswordSet) {
      nav.push('StudentSetPassword', { current: pw });
    } else {
      enter('student');
    }
  };
  return (
    <Screen
      footer={
        <InfoBanner
          icon={Lock}
          text={`First sign-in asks you to set your own password. Demo first password: ${DEMO_CODE}`}
        />
      }
    >
      <Logo />
      <Text style={s.h1}>Hi there!{'\n'}Sign in to school</Text>
      <Text style={s.sub}>Use the GR No. on your ID card.</Text>
      <Field
        label="GR No."
        icon={User}
        value={gr}
        onChangeText={setGr}
        autoCapitalize="characters"
      />
      <Field
        label="Password"
        icon={Lock}
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        placeholder="••••••••"
      />
      <Button label="Sign in" onPress={submit} />
      <ForgotLink
        label="Ask for a code on parent's mobile"
        onPress={() => nav.push('StudentReset')}
      />
    </Screen>
  );
}

function StudentSetPassword() {
  const enter = useEnter();
  const current = useParam('current', '');
  const [cur, setCur] = useState(current);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const long = pw.length >= 6;
  const notGr = pw.length > 0 && pw.toUpperCase() !== STUDENT.gr;
  const save = () => {
    if (!cur) {
      toast('Enter the current password');
    } else if (!long || !notGr) {
      toast('Choose a stronger password');
    } else if (pw !== pw2) {
      toast('Passwords do not match');
    } else {
      studentPasswordSet = true;
      studentPassword = pw;
      toast('Password saved');
      enter('student');
    }
  };
  return (
    <Screen
      title="Set your password"
      footer={<Button label="Save password" onPress={save} />}
    >
      <Text style={s.sub}>
        The school gave you a first password. Make your own now.
      </Text>
      <Field
        label="Current password"
        icon={Lock}
        value={cur}
        onChangeText={setCur}
        secureTextEntry
      />
      <Field
        label="New password"
        icon={Lock}
        value={pw}
        onChangeText={setPw}
        secureTextEntry
      />
      <Field
        label="Repeat new password"
        icon={Lock}
        value={pw2}
        onChangeText={setPw2}
        secureTextEntry
      />
      <View style={s.rules}>
        <Rule ok={long} label="6+ characters" />
        <Rule ok={notGr} label="Not your GR No." />
      </View>
    </Screen>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={[s.rule, ok ? s.ruleOk : s.ruleOff]}>
      <Text style={[s.ruleText, { color: ok ? colors.success : colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

function StudentReset() {
  return (
    <ResetPassword sentTo={`your parent's mobile ${PARENT.mobile}`} />
  );
}

// ---------- Teacher ----------

function TeacherSignIn() {
  const nav = useNav();
  const enter = useEnter();
  const [id, setId] = useState('sadia.anwar@bfs.edu.pk');
  const [pw, setPw] = useState('');
  const submit = () => {
    if (!id.trim()) {
      toast('Enter your email or mobile');
    } else if (pw.length < 6) {
      toast('Password must be at least 6 characters');
    } else if (checkLogin('teacher', pw === DEMO_CODE)) {
      enter('teacher');
    }
  };
  return (
    <Screen
      footer={
        <InfoBanner
          icon={WifiOff}
          text={`Attendance works without internet and uploads later. Demo password: ${DEMO_CODE}`}
        />
      }
    >
      <Logo icon={Briefcase} />
      <Text style={s.h1}>Teacher app</Text>
      <Text style={s.sub}>{SCHOOL}</Text>
      <Field
        label="Email or mobile"
        icon={User}
        value={id}
        onChangeText={setId}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field
        label="Password"
        icon={Lock}
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        placeholder="••••••••"
      />
      <Button label="Sign in" onPress={submit} />
      <ForgotLink onPress={() => nav.push('TeacherReset')} />
    </Screen>
  );
}

function TeacherReset() {
  return <ResetPassword sentTo="" askId />;
}

export const authScreens: ScreenMap = {
  RoleSelect,
  ParentSignIn,
  ParentOtp,
  ParentReset,
  StudentSignIn,
  StudentSetPassword,
  StudentReset,
  TeacherSignIn,
  TeacherReset,
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  roleTop: { paddingTop: 40 },
  roleTopInset: { paddingTop: 24 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  h1: { fontSize: 27, fontWeight: '900', color: colors.text, marginTop: 8 },
  lead: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 },
  sub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  center: { textAlign: 'center', fontSize: 13, color: colors.textMuted },
  bold: { fontWeight: '800', color: colors.text },
  forgot: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  forgotLink: { color: colors.primaryText, fontWeight: '800' },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  lang: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  langOn: { color: colors.text, fontWeight: '800' },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  roleSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  rules: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  rule: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  ruleOk: { backgroundColor: colors.successSoft },
  ruleOff: { backgroundColor: colors.neutralSoft },
  ruleText: { fontSize: 11.5, fontWeight: '800' },
});
