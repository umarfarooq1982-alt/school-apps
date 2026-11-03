// Owner / Admin app shell: sign in, role-based dashboard (S-01), module menu,
// global search, campus and session switchers (SOW 3.1).
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  Building,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  Globe,
  House,
  LayoutGrid,
  Lock,
  LogOut,
  Search,
  ShieldCheck,
  TriangleAlert,
  User,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  BellButton,
  Button,
  Card,
  Field,
  IconButton,
  InfoBanner,
  ListRow,
  Screen,
  toast,
} from '../../components/ui';
import { BottomSheet, TabShell, useTabs } from '../../components/Tabs';
import { BarChart, Kpi, KpiGrid } from '../../components/admin';
import { colors, radius } from '../../theme';
import { ScreenMap, useNav } from '../../navigation';
import { useSession } from '../../store';
import { useI18n } from '../../i18n';
import {
  ALL_CAMPUSES,
  CAMPUSES,
  roleInfo,
  useAdminSession,
  useCampus,
  useStaffRole,
} from '../../data/admin';
import { useApi, invalidate } from '../../api/hooks';
import { updateSession, useApiSession } from '../../api/session';
import { webA } from '../../api/webA';
import { Empty, Loading, NoApiBanner, QueryView } from '../../components/states';
import { Logo, SchoolCodeField, usePasswordLogin } from '../auth';
import { useAccess } from './menu';
import { AdminReportsCenter } from './reports';

const fmtM = (n: number) =>
  n >= 1000000 ? `Rs. ${(n / 1000000).toFixed(2)}M` : `Rs. ${n.toLocaleString('en-US')}`;

// Opens a module only if the signed-in role may see it.
export function useOpen() {
  const nav = useNav();
  const [role] = useStaffRole();
  const { can } = useAccess(role);
  return (route: string, params?: Record<string, unknown>) => {
    if (!can(route) && !ALWAYS_OPEN.includes(route)) {
      toast('Your role does not have access to this screen.');
      return;
    }
    nav.push(route, params);
  };
}
const ALWAYS_OPEN = ['AdminSearch', 'AdminStudentProfile', 'AdminStaffProfile', 'Notifications', 'ChangePassword', 'AdminReport'];

// ---------- Sign in ----------

function AdminSignIn() {
  const nav = useNav();
  const { login, busy } = usePasswordLogin('admin');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const submit = () => {
    if (!id.trim()) {
      toast('Enter your email or mobile');
    } else if (pw.length < 6) {
      toast('Password must be at least 6 characters');
    } else {
      login(id.trim().toLowerCase(), pw);
    }
  };
  return (
    <Screen>
      <Logo icon={ShieldCheck} />
      <Text style={s.h1}>School admin</Text>
      <Text style={s.sub}>Owner, Principal and staff. Your menu depends on your role.</Text>
      <SchoolCodeField />
      <Field label="Email or mobile" icon={User} value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address" placeholder="owner@school.com" />
      <Field label="Password" icon={Lock} value={pw} onChangeText={setPw} secureTextEntry placeholder="••••••••" />
      <Button label="Sign in" onPress={submit} loading={busy} />
      <Text style={s.forgot}>
        Forgot password?{' '}
        <Text style={s.link} onPress={() => nav.push('TeacherReset', { key: id.trim() })}>
          Reset by SMS code
        </Text>
      </Text>
      <InfoBanner icon={Lock} text="5 wrong attempts lock the account for 15 minutes." />
    </Screen>
  );
}

// ---------- Campus / session switcher (top bar) ----------

// Campuses and sessions come from the login and /api/web/context. Switching
// sends a new X-Campus-Id / X-Session-Id and reloads every screen.
function Switchers() {
  const [, setCampus] = useCampus();
  const [, setSession] = useAdminSession();
  const [role] = useStaffRole();
  const [session] = useApiSession();
  const [open, setOpen] = useState<'campus' | 'session' | null>(null);
  const ctx = useApi('adm:context', webA.context);
  const allCampuses = ctx.data?.campuses ?? session?.campuses ?? [];
  const mine =
    role === 'owner' || !session?.user.campusIds.length
      ? allCampuses
      : allCampuses.filter(c => session.user.campusIds.includes(String(c.id)));
  const campuses = role === 'owner' ? [{ id: ALL_CAMPUSES, name: 'All campuses' }, ...mine] : mine;
  const sessions = ctx.data?.sessions ?? session?.sessions ?? [];
  const campusId = session?.campusId && session.campusId !== 'all' ? session.campusId : ALL_CAMPUSES;
  const current = sessions.find(x => x.id === session?.sessionId);
  const campusLabel = campusId === ALL_CAMPUSES ? 'All campuses' : allCampuses.find(c => String(c.id) === campusId)?.name ?? 'Campus';

  const pickCampus = (id: string) => {
    setCampus(id);
    updateSession({ campusId: id === ALL_CAMPUSES ? 'all' : id });
    invalidate('adm:');
    setOpen(null);
  };
  const pickSession = (id: string) => {
    setSession(id);
    updateSession({ sessionId: id });
    invalidate('adm:');
    setOpen(null);
  };

  return (
    <>
      <View style={s.switchRow}>
        <Pill icon={Building} label={campusLabel} onPress={() => setOpen('campus')} />
        <Pill icon={CalendarDays} label={`Session ${current?.name ?? ''}`} onPress={() => setOpen('session')} />
      </View>
      {current?.isClosed ? (
        <InfoBanner tone="warn" icon={Lock} text={`Session ${current.name} is closed and read-only${role === 'owner' ? ' (Owner can still edit).' : '.'}`} />
      ) : null}
      <BottomSheet visible={open === 'campus'} onClose={() => setOpen(null)}>
        <Text style={s.sheetTitle}>Campus</Text>
        {campuses.map((c, i) => (
          <ListRow
            key={String(c.id)}
            icon={Building}
            title={c.name}
            right={String(c.id) === campusId ? <Badge label="Selected" tone="success" /> : undefined}
            onPress={() => pickCampus(String(c.id))}
            last={i === campuses.length - 1}
          />
        ))}
      </BottomSheet>
      <BottomSheet visible={open === 'session'} onClose={() => setOpen(null)}>
        <Text style={s.sheetTitle}>Session</Text>
        {sessions.map((x, i) => (
          <ListRow
            key={x.id}
            icon={CalendarDays}
            title={x.name}
            right={
              <Badge
                label={x.id === session?.sessionId ? 'Selected' : x.isClosed ? 'Closed' : x.isCurrent ? 'Active' : 'Planned'}
                tone={x.id === session?.sessionId ? 'success' : x.isCurrent ? 'info' : 'neutral'}
              />
            }
            onPress={() => pickSession(x.id)}
            last={i === sessions.length - 1}
          />
        ))}
      </BottomSheet>
    </>
  );
}

function Pill({ icon: Icon, label, onPress }: { icon: typeof Building; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.pill, pressed && s.pressed]}>
      <Icon size={14} color={colors.text} />
      <Text style={s.pillText} numberOfLines={1}>{label}</Text>
      <ChevronDown size={14} color={colors.text} />
    </Pressable>
  );
}

// ---------- Dashboard (S-01) ----------

// Web panel routes used by /api/web/dashboard, mapped to app screens.
const WEB_ROUTES: Record<string, string> = {
  '/students': 'AdminStudents',
  '/attendance': 'AdminReport',
  '/counter': 'AdminFeeCounter',
  '/vouchers': 'AdminVoucherGeneration',
  '/defaulters': 'AdminDefaulters',
  '/approvals': 'AdminApprovals',
  '/staff': 'AdminStaffDirectory',
  '/staff-attendance': 'AdminStaffAttendance',
  '/notices': 'AdminMessages',
};
const WEB_ROUTE_PARAMS: Record<string, Record<string, unknown>> = { '/attendance': { id: 'r12' } };

function AdminDashboard() {
  const [role] = useStaffRole();
  const open = useOpen();
  const [session] = useApiSession();
  const dash = useApi('adm:dashboard', webA.dashboard);
  const approvals = useApi(role === 'owner' || role === 'principal' ? 'adm:approvals' : null, webA.approvals);
  const info = roleInfo(role);
  const name = session?.user.name ?? info.user;
  const go = (route?: string) => {
    const app = route ? WEB_ROUTES[route] : undefined;
    if (app) {
      open(app, route ? WEB_ROUTE_PARAMS[route] : undefined);
    }
  };
  const pending = dash.data?.pendingApprovals ?? 0;
  const refresh = () => {
    dash.refresh();
    approvals.refresh();
  };

  return (
    <Screen
      title={`Assalam o Alaikum, ${name.split(' ')[0]}`}
      subtitle={`${info.label} · ${dash.data?.greeting.replace(/^Welcome\.\s*/, '') ?? ''}`}
      refreshing={dash.refreshing}
      onRefresh={refresh}
      right={
        <View style={s.headRight}>
          <IconButton icon={Search} onPress={() => open('AdminSearch')} />
          <BellButton count={pending} />
        </View>
      }
    >
      <Switchers />
      <QueryView q={dash}>
        {d => (
          <>
            <KpiGrid>
              {d.stats.map(k => (
                <Kpi
                  key={k.key}
                  label={k.label}
                  value={k.value}
                  sub={k.sub}
                  tone={k.key === 'dues' ? 'danger' : k.key === 'pend' ? 'warn' : undefined}
                  onPress={k.route && WEB_ROUTES[k.route] ? () => go(k.route) : undefined}
                />
              ))}
              {role === 'owner' || role === 'principal' ? (
                <Kpi label="Pending approvals" value={String(d.pendingApprovals)} sub="tap to review" tone="warn" onPress={() => open('AdminApprovals')} />
              ) : null}
            </KpiGrid>

            {d.feeTrend.length && (role === 'owner' || role === 'principal' || role === 'accounts') ? (
              <Card title="Collection trend (Rs.)" action={{ label: 'Report', onPress: () => open('AdminReport', { id: 'r6' }) }}>
                <BarChart
                  data={d.feeTrend.map((t, i) => ({ label: t.label, value: t.amount, highlight: i === d.feeTrend.length - 1 }))}
                  format={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
              </Card>
            ) : null}

            {d.alerts.length ? (
              <Card title="Alerts">
                {d.alerts.map((a, i) => (
                  <ListRow
                    key={`${a.text}-${i}`}
                    icon={TriangleAlert}
                    iconTone="primary"
                    title={a.text}
                    onPress={a.route && WEB_ROUTES[a.route] ? () => go(a.route) : undefined}
                    chevron={!!(a.route && WEB_ROUTES[a.route])}
                    last={i === d.alerts.length - 1}
                  />
                ))}
              </Card>
            ) : null}

            {d.notices.length ? (
              <Card title="Notices">
                {d.notices.slice(0, 3).map((n, i, arr) => (
                  <ListRow key={n.id} icon={Bell} title={n.title} subtitle={n.text} last={i === arr.length - 1} />
                ))}
              </Card>
            ) : null}
          </>
        )}
      </QueryView>

      {role === 'owner' || role === 'principal' ? (
        <Card title="Pending approvals" action={{ label: 'All', onPress: () => open('AdminApprovals') }}>
          {(approvals.data ?? []).length === 0 ? (
            <Empty text={approvals.loading ? 'Loading…' : 'No approvals waiting.'} />
          ) : (
            (approvals.data ?? []).slice(0, 3).map((a, i, arr) => (
              <ListRow
                key={a.id}
                icon={ShieldCheck}
                title={a.title}
                subtitle={a.type}
                onPress={() => open('AdminApprovals')}
                last={i === arr.length - 1}
              />
            ))
          )}
        </Card>
      ) : null}

      {role === 'owner' ? (
        <Card title="Campus comparison" action={{ label: 'Report', onPress: () => open('AdminReport', { id: 'r19' }) }}>
          <NoApiBanner what="Per-campus figures" />
          <BarChart
            data={CAMPUSES.map(c => ({ label: c.name.split(' ')[0], value: Math.round((c.collection / c.expected) * 100), highlight: true }))}
            format={v => `${v}%`}
          />
          {CAMPUSES.map((c, i) => (
            <ListRow
              key={c.id}
              icon={Building}
              title={c.name}
              subtitle={`${c.strength} students · ${c.attendance}% attendance · expenses ${fmtM(c.expenses)}`}
              right={<Text style={s.amount}>{fmtM(c.collection)}</Text>}
              onPress={() => open('AdminCampuses')}
              last={i === CAMPUSES.length - 1}
            />
          ))}
        </Card>
      ) : null}

      {role === 'owner' || role === 'principal' || role === 'frontdesk' ? (
        <Card title="Admissions trend" action={{ label: 'Report', onPress: () => open('AdminReport', { id: 'r2' }) }}>
          <NoApiBanner what="Monthly admissions" />
          <BarChart
            data={[
              { label: 'Apr', value: 142 },
              { label: 'May', value: 64 },
              { label: 'Jun', value: 18 },
              { label: 'Jul', value: 22 },
              { label: 'Aug', value: 57 },
              { label: 'Sep', value: 31 },
              { label: 'Oct', value: 24, highlight: true },
            ]}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

// ---------- Modules menu ----------

function AdminModules() {
  const [role] = useStaffRole();
  const open = useOpen();
  const { panels } = useAccess(role);
  return (
    <Screen title="Modules" subtitle={`${roleInfo(role).label} · ${panels.reduce((n, p) => n + p.items.length, 0)} screens`} right={<IconButton icon={Search} onPress={() => open('AdminSearch')} />}>
      {panels.map(p => (
        <View key={p.key} style={s.panel}>
          <Text style={s.panelTitle}>{p.title}</Text>
          <Card>
            {p.items.map((it, i) => (
              <ListRow
                key={it.route}
                icon={it.icon}
                title={it.title}
                subtitle={it.sub}
                onPress={() => open(it.route)}
                chevron
                last={i === p.items.length - 1}
              />
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

// ---------- Global search (3.1) ----------

function AdminSearch() {
  const open = useOpen();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  // Search after the user stops typing for a moment.
  useEffect(() => {
    const id = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);
  const res = useApi(term.length >= 2 ? `adm:search:${term}` : null, () => webA.search(term));
  const students = res.data?.students ?? [];
  const staff = res.data?.staff ?? [];
  return (
    <Screen title="Search" subtitle="Student by name, GR No., father CNIC or mobile; staff by name or ID">
      <Field icon={Search} value={q} onChangeText={setQ} placeholder="e.g. Ayesha, GR-MC-0012, 35202-1234567, EMP-0001" autoFocus />
      {term.length >= 2 && res.loading ? <Loading label="Searching…" /> : null}
      {res.error ? <InfoBanner tone="danger" text={res.error} /> : null}
      {term.length >= 2 && res.data && !students.length && !staff.length ? <InfoBanner text="No match found." /> : null}
      {students.length ? (
        <Card title={`Students (${students.length})`}>
          {students.map((st, i) => (
            <ListRow
              key={st.id}
              avatar={st.name}
              title={st.name}
              subtitle={st.sub}
              onPress={() => open('AdminStudentProfile', { id: st.id })}
              last={i === students.length - 1}
            />
          ))}
        </Card>
      ) : null}
      {staff.length ? (
        <Card title={`Staff (${staff.length})`}>
          {staff.map((x, i) => (
            <ListRow
              key={x.id}
              avatar={x.name}
              title={x.name}
              subtitle={x.sub}
              onPress={() => open('AdminStaffProfile', { id: x.id })}
              last={i === staff.length - 1}
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

// ---------- More / profile ----------

function AdminMore() {
  const nav = useNav();
  const open = useOpen();
  const { signOut } = useSession();
  const [role] = useStaffRole();
  const [session] = useApiSession();
  const { lang, setLang } = useI18n();
  const tabs = useTabs();
  const info = roleInfo(role);
  const user = session?.user;
  return (
    <Screen title="More" right={<IconButton icon={Globe} onPress={() => setLang(lang === 'en' ? 'ur' : 'en')} />}>
      <Card style={s.profile}>
        <Avatar name={user?.name ?? info.label} size={56} ring />
        <View style={s.flex}>
          <Text style={s.profileName}>{user?.name ?? '—'}</Text>
          <Text style={s.sub}>{info.label}{user?.schoolName ? ` · ${user.schoolName}` : ''}</Text>
          {user?.email ? <Text style={s.sub}>{user.email}</Text> : null}
        </View>
      </Card>
      <Switchers />
      <Card>
        <ListRow icon={Bell} title="Notifications" onPress={() => open('Notifications')} chevron />
        <ListRow icon={ChartColumn} title="Reports center" subtitle="Section 6 reports for your role" onPress={() => tabs?.go('reports')} chevron />
        <ListRow icon={Lock} title="Change password" onPress={() => open('ChangePassword')} chevron />
        <ListRow
          icon={LogOut}
          title="Sign out"
          onPress={() => {
            signOut();
            nav.reset('RoleSelect');
          }}
          last
        />
      </Card>
    </Screen>
  );
}

function AdminTabs() {
  return (
    <TabShell
      tabs={[
        { key: 'home', label: 'Dashboard', icon: House, component: AdminDashboard },
        { key: 'modules', label: 'Modules', icon: LayoutGrid, component: AdminModules },
        { key: 'reports', label: 'Reports', icon: ChartColumn, component: AdminReportsCenter },
        { key: 'more', label: 'More', icon: User, component: AdminMore },
      ]}
    />
  );
}

export const adminCoreScreens: ScreenMap = {
  AdminSignIn,
  AdminTabs,
  AdminSearch,
};

const s = StyleSheet.create({
  flex: { flex: 1 },
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
  sub: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  label: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  forgot: { textAlign: 'center', fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  link: { color: colors.primaryText, fontWeight: '800' },
  headRight: { flexDirection: 'row', gap: 8 },
  switchRow: { flexDirection: 'row', gap: 8 },
  pressed: { opacity: 0.6 },
  pill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  pillText: { flexShrink: 1, fontSize: 12.5, fontWeight: '800', color: colors.text },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 8 },
  sheetList: { maxHeight: 440 },
  amount: { fontSize: 13, fontWeight: '800', color: colors.text },
  panel: { gap: 6 },
  panelTitle: { fontSize: 13, fontWeight: '800', color: colors.textMuted, marginTop: 4 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileName: { fontSize: 17, fontWeight: '800', color: colors.text },
});
