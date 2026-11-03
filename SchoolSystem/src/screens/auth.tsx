import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Briefcase,
  Building,
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
import { Role, useSession, useShared } from '../store';
import { useI18n } from '../i18n';
import { authApi, LoginResult } from '../api/mobile';
import { completeSignIn, signOutEverywhere } from '../api/auth';
import { ApiError, errorMessage } from '../api/client';
import { logoUri, lookupSchool, saveTenant, useSchoolName, useTenant } from '../api/tenant';
import { DEFAULT_SCHOOL_CODE } from '../api/config';
import { getSession, loadSchoolCode, saveSchoolCode } from '../api/session';
import { APP_NAME, getAppRole } from '../appRole';

export const HOME_ROUTE: Record<Role, string> = {
  parent: 'ParentTabs',
  student: 'StudentTabs',
  teacher: 'TeacherTabs',
  admin: 'AdminTabs',
};

const ROLE_LABEL: Record<Role, string> = {
  parent: 'Parent',
  student: 'Student',
  teacher: 'Teacher',
  admin: 'School admin',
};

// School code shared by every sign-in screen. Nothing is built in: the last
// code the user signed in with is read from the phone once, at start.
let codeLoaded = false;
export function useSchoolCode() {
  const [code, setCode] = useShared<string>('auth.schoolCode', DEFAULT_SCHOOL_CODE);
  useEffect(() => {
    if (!codeLoaded) {
      codeLoaded = true;
      loadSchoolCode('').then(saved => {
        if (saved) {
          setCode(prev => prev || saved);
        }
      });
    }
  }, [setCode]);
  return [code, setCode] as const;
}

// Looks the code up on the server and shows the school's name and logo, so the
// user knows they are signing in to the right school.
export function SchoolCodeField() {
  const { t } = useI18n();
  const [code, setCode] = useSchoolCode();
  const tenant = useTenant();
  const [state, setState] = useState<'idle' | 'checking' | 'found' | 'missing' | 'error'>('idle');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const c = code.trim();
    if (c.length < 2) {
      setState('idle');
      return;
    }
    if (tenant && tenant.code.toUpperCase() === c.toUpperCase()) {
      setState('found');
      return;
    }
    setState('checking');
    let live = true;
    const timer = setTimeout(() => {
      lookupSchool(c)
        .then(found => {
          if (live) {
            saveTenant(found);
            setState('found');
          }
        })
        .catch(e => {
          if (live) {
            setState(e instanceof ApiError && e.status === 404 ? 'missing' : 'error');
            setMessage(errorMessage(e));
          }
        });
    }, 500);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [code, tenant]);
  const logo = logoUri(tenant);
  return (
    <View style={s.codeWrap}>
      <Field
        label="School code"
        icon={Building}
        value={code}
        onChangeText={v => setCode(v.toUpperCase().replace(/\s/g, ''))}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={t('Your school code')}
      />
      {state === 'found' && tenant ? (
        <View style={s.schoolRow}>
          {logo ? <Image source={{ uri: logo }} style={s.schoolLogo} /> : <Building size={18} color={colors.success} />}
          <Text style={s.schoolName} numberOfLines={1}>{tenant.name}</Text>
        </View>
      ) : state === 'checking' ? (
        <Text style={s.codeHint}>{t('Checking school code…')}</Text>
      ) : state === 'missing' ? (
        <Text style={s.codeError}>{t('No active school has this code. Check it with your school office.')}</Text>
      ) : state === 'error' ? (
        <Text style={s.codeError}>{message}</Text>
      ) : (
        <Text style={s.codeHint}>{t('Ask your school office for the school code.')}</Text>
      )}
    </View>
  );
}

// Finishes any login: saves the session, then opens set-password (first
// sign-in) or the app that matches the server role.
export function useFinishLogin() {
  const nav = useNav();
  const { t } = useI18n();
  return async (r: LoginResult, schoolCode: string, expected?: Role) => {
    const role = await completeSignIn(r, schoolCode);
    saveSchoolCode(schoolCode);
    // Each Play Store app opens only its own role.
    const fixed = getAppRole();
    if (fixed && role !== fixed) {
      await signOutEverywhere();
      toast(`${t('This is a')} ${t(ROLE_LABEL[role])} ${t('login. Please use the')} ${t(APP_NAME[role])}.`);
      return;
    }
    if (expected && role !== expected) {
      toast(`${t('This is a')} ${t(ROLE_LABEL[role])} ${t('login. Opening that app.')}`);
    }
    if (r.user.mustChangePw) {
      nav.reset('SetPassword', { first: true });
    } else {
      nav.reset(HOME_ROUTE[role]);
    }
  };
}

// Password login shared by parent, student, teacher and admin.
export function usePasswordLogin(expected: Role) {
  const finish = useFinishLogin();
  const [schoolCode] = useSchoolCode();
  const [busy, setBusy] = useState(false);
  const login = async (key: string, password: string) => {
    if (!schoolCode.trim()) {
      toast('Enter your school code');
      return;
    }
    setBusy(true);
    try {
      const r = await authApi.login(key.trim(), password, schoolCode);
      await finish(r, schoolCode, expected);
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return { login, busy };
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

// The school's own logo once its code is known, otherwise a neutral icon.
export function Logo({ icon: Icon = GraduationCap }: { icon?: IconType }) {
  const tenant = useTenant();
  const uri = logoUri(tenant);
  if (uri) {
    return <Image source={{ uri }} style={s.logoImage} />;
  }
  return (
    <View style={s.logo}>
      <Icon size={28} color={colors.text} strokeWidth={2} />
    </View>
  );
}

// ---------- Role select ----------

function RoleSelect() {
  const schoolName = useSchoolName();
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
      <Text style={s.h1}>{schoolName}</Text>
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

// Pakistani mobile as the server stores it ("0300-1234567"); it also
// matches plain "03001234567" logins.
function normaliseMobile(input: string) {
  const digits = input.replace(/\D/g, '').replace(/^92/, '').replace(/^0/, '');
  return digits.length === 10 ? `0${digits.slice(0, 3)}-${digits.slice(3)}` : input.trim();
}

function ParentSignIn() {
  const schoolName = useSchoolName();
  const nav = useNav();
  const [schoolCode] = useSchoolCode();
  const { login, busy } = usePasswordLogin('parent');
  const [mode, setMode] = useState('Mobile + code');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (mobile.replace(/\D/g, '').length < 10) {
      toast('Enter a valid mobile number');
      return;
    }
    const phone = normaliseMobile(mobile);
    if (mode === 'Password') {
      if (password.length < 6) {
        toast('Password must be at least 6 characters');
        return;
      }
      await login(phone, password);
      return;
    }
    setSending(true);
    try {
      const r = await authApi.otpRequest(phone, schoolCode);
      nav.push('ParentOtp', { mobile: phone, demoCode: r.demoCode, hint: r.hint });
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen footer={<LanguageSwitch />}>
      <Logo />
      <Text style={s.h1}>{schoolName}</Text>
      <Text style={s.sub}>Parent app. One login for all your children.</Text>
      <SchoolCodeField />
      <Segmented
        options={['Mobile + code', 'Password']}
        value={mode}
        onChange={setMode}
      />
      <Field
        label="Mobile number"
        icon={Phone}
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
        placeholder="0300 1234567"
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
        loading={busy || sending}
      />
      <ForgotLink onPress={() => nav.push('ParentReset', { key: mobile ? normaliseMobile(mobile) : '' })} />
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
  const mobile = useParam('mobile', '');
  const firstDemo = useParam<string | undefined>('demoCode', undefined);
  const firstHint = useParam<string | undefined>('hint', undefined);
  const finish = useFinishLogin();
  const [schoolCode] = useSchoolCode();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [left, restart] = useCountdown(60);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(firstDemo);
  const [hint, setHint] = useState(firstHint);

  const verify = async () => {
    if (code.length !== 6) {
      toast('Enter all 6 digits');
      return;
    }
    setBusy(true);
    try {
      const r = await authApi.otpVerify(mobile, code, schoolCode);
      await finish(r, schoolCode, 'parent');
    } catch (e) {
      setCode('');
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const r = await authApi.otpRequest(mobile, schoolCode);
      setDemo(r.demoCode);
      setHint(r.hint);
      restart();
      toast('New code sent');
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  return (
    <Screen
      title="Enter the 6-digit code"
      subtitle={`Sent to ${mobile}`}
      footer={<Button label="Verify and sign in" onPress={verify} loading={busy} />}
    >
      <Gap h={8} />
      <OtpInput value={code} onChange={setCode} />
      {left > 0 ? (
        <Text style={s.center}>
          {t('Resend code')} in{' '}
          <Text style={s.bold}>{`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}</Text>
        </Text>
      ) : (
        <Text style={[s.center, s.forgotLink]} onPress={resend}>
          {t('Resend code')}
        </Text>
      )}
      {demo ? <InfoBanner tone="success" text={`Test server code: ${demo}`} /> : null}
      {hint ? <InfoBanner text={hint} /> : null}
      <InfoBanner icon={Lock} text="After 5 wrong attempts the account locks for 15 minutes." />
    </Screen>
  );
}

// Two steps: ask for a code, then enter it with the new password.
function ResetPassword({
  idLabel,
  idIcon,
  sentTo,
  keyboard = 'default',
}: {
  idLabel: string;
  idIcon: IconType;
  sentTo: string;
  keyboard?: 'default' | 'phone-pad' | 'email-address';
}) {
  const nav = useNav();
  const [schoolCode] = useSchoolCode();
  const [key, setKey] = useState(useParam('key', ''));
  const [step, setStep] = useState<'ask' | 'set'>('ask');
  const [demo, setDemo] = useState<string | undefined>();
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!key.trim()) {
      toast(`Enter your ${idLabel.toLowerCase()}`);
      return;
    }
    setBusy(true);
    try {
      const r = await authApi.resetRequest(key.trim(), schoolCode);
      setDemo(r.demoCode);
      setStep('set');
      toast('Reset code sent');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (code.length !== 6) {
      toast('Enter the 6-digit code');
      return;
    }
    if (pw.length < 6) {
      toast('Password must be at least 6 characters');
      return;
    }
    if (pw !== pw2) {
      toast('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await authApi.reset(key.trim(), code, pw, schoolCode);
      toast('Password changed. Please sign in again.');
      nav.pop();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Reset password"
      footer={
        step === 'ask' ? (
          <Button label="Send code" onPress={ask} loading={busy} />
        ) : (
          <Button label="Change password" onPress={save} loading={busy} />
        )
      }
    >
      <SchoolCodeField />
      <Field
        label={idLabel}
        icon={idIcon}
        value={key}
        onChangeText={setKey}
        keyboardType={keyboard}
        autoCapitalize="none"
        editable={step === 'ask'}
      />
      {step === 'set' ? (
        <>
          <Text style={s.sub}>{`We sent a 6-digit code to ${sentTo}.`}</Text>
          <OtpInput value={code} onChange={setCode} />
          {demo ? <InfoBanner tone="success" text={`Test server code: ${demo}`} /> : null}
          <Field
            label="New password"
            icon={Lock}
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            placeholder="••••••••••"
          />
          <Field
            label="Repeat new password"
            icon={Lock}
            value={pw2}
            onChangeText={setPw2}
            secureTextEntry
            placeholder="••••••••••"
          />
          <InfoBanner
            icon={Lock}
            text="At least 6 characters. You will sign in again with the new password."
          />
          <Text style={[s.center, s.forgotLink]} onPress={ask}>
            Resend code
          </Text>
        </>
      ) : null}
    </Screen>
  );
}

function ParentReset() {
  return <ResetPassword idLabel="Mobile number" idIcon={Phone} sentTo="your mobile" keyboard="phone-pad" />;
}

// ---------- Student ----------

function StudentSignIn() {
  const nav = useNav();
  const { login, busy } = usePasswordLogin('student');
  const [gr, setGr] = useState('');
  const [pw, setPw] = useState('');
  const submit = () => {
    if (!gr.trim()) {
      toast('Enter your GR No.');
    } else if (pw.length < 6) {
      toast('Password must be at least 6 characters');
    } else {
      login(gr.trim().toUpperCase(), pw);
    }
  };
  return (
    <Screen
      footer={
        <InfoBanner
          icon={Lock}
          text="First sign-in asks you to set your own password."
        />
      }
    >
      <Logo />
      <Text style={s.h1}>Hi there!{'\n'}Sign in to school</Text>
      <Text style={s.sub}>Use the GR No. on your ID card.</Text>
      <SchoolCodeField />
      <Field
        label="GR No."
        icon={User}
        value={gr}
        onChangeText={setGr}
        autoCapitalize="characters"
        placeholder="GR-MC-0012"
      />
      <Field
        label="Password"
        icon={Lock}
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        placeholder="••••••••"
      />
      <Button label="Sign in" onPress={submit} loading={busy} />
      <ForgotLink
        label="Ask for a code on parent's mobile"
        onPress={() => nav.push('StudentReset', { key: gr.trim().toUpperCase() })}
      />
    </Screen>
  );
}

// First sign-in (mustChangePw) for any role, and the student design S02.
function SetPassword() {
  const nav = useNav();
  const { role } = useSession();
  const first = useParam('first', false);
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const user = getSession()?.user;
  const long = pw.length >= 6;
  const notId = pw.length > 0 && pw.toUpperCase() !== (user?.name || '').toUpperCase() && pw !== cur;
  const save = async () => {
    if (!cur) {
      toast('Enter the current password');
      return;
    }
    if (!long || !notId) {
      toast('Choose a stronger password');
      return;
    }
    if (pw !== pw2) {
      toast('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await authApi.changePassword(cur, pw);
      toast('Password saved');
      nav.reset(role ? HOME_ROUTE[role] : 'RoleSelect');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Set your password"
      back={!first}
      right={
        first ? (
          <Text
            style={s.forgotLink}
            onPress={async () => {
              await signOutEverywhere();
              nav.reset('RoleSelect');
            }}
          >
            Sign out
          </Text>
        ) : undefined
      }
      footer={<Button label="Save password" onPress={save} loading={busy} />}
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
        <Rule ok={notId} label="Not the old one" />
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
  return <ResetPassword idLabel="GR No." idIcon={User} sentTo="your parent's mobile" />;
}

// ---------- Teacher ----------

function TeacherSignIn() {
  const schoolName = useSchoolName();
  const nav = useNav();
  const { login, busy } = usePasswordLogin('teacher');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const submit = () => {
    if (!id.trim()) {
      toast('Enter your email or mobile');
    } else if (pw.length < 6) {
      toast('Password must be at least 6 characters');
    } else {
      login(id.includes('@') ? id.trim().toLowerCase() : normaliseMobile(id), pw);
    }
  };
  return (
    <Screen
      footer={
        <InfoBanner
          icon={WifiOff}
          text="Attendance works without internet and uploads later."
        />
      }
    >
      <Logo icon={Briefcase} />
      <Text style={s.h1}>Teacher app</Text>
      <Text style={s.sub}>{schoolName}</Text>
      <SchoolCodeField />
      <Field
        label="Email or mobile"
        icon={User}
        value={id}
        onChangeText={setId}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="name@school.edu.pk"
      />
      <Field
        label="Password"
        icon={Lock}
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        placeholder="••••••••"
      />
      <Button label="Sign in" onPress={submit} loading={busy} />
      <ForgotLink onPress={() => nav.push('TeacherReset', { key: id.trim() })} />
    </Screen>
  );
}

function TeacherReset() {
  return <ResetPassword idLabel="Email or mobile" idIcon={User} sentTo="your mobile or email" keyboard="email-address" />;
}

export const authScreens: ScreenMap = {
  RoleSelect,
  ParentSignIn,
  ParentOtp,
  ParentReset,
  StudentSignIn,
  SetPassword,
  StudentSetPassword: SetPassword,
  StudentReset,
  TeacherSignIn,
  TeacherReset,
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  roleTop: { paddingTop: 40 },
  logoImage: { width: 60, height: 60, borderRadius: 16, marginTop: 24, backgroundColor: colors.card },
  codeWrap: { gap: 6 },
  schoolRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.successSoft, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 7 },
  schoolLogo: { width: 22, height: 22, borderRadius: 6 },
  schoolName: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.success },
  codeHint: { fontSize: 12, color: colors.textMuted },
  codeError: { fontSize: 12, color: colors.danger, fontWeight: '700' },
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
