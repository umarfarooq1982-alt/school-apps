// Owner / Admin app shell: sign in, role-based dashboard (S-01), module menu,
// global search, campus and session switchers (SOW 3.1).
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  Building,
  Briefcase,
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
  Users,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  BellButton,
  Button,
  Card,
  Chips,
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
  ADMIN_STAFF,
  ADMIN_STUDENTS,
  ALL_CAMPUSES,
  CAMPUSES,
  campusName,
  roleInfo,
  SESSIONS,
  STAFF_ROLES,
  StaffRole,
  useAdminSession,
  useApprovals,
  useCampus,
  useStaffRole,
} from '../../data/admin';
import { DEMO_CODE, checkLogin } from '../auth';
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
  const { signIn } = useSession();
  const [role, setRole] = useStaffRole();
  const [id, setId] = useState('owner@bfs.edu.pk');
  const [pw, setPw] = useState('');
  const submit = () => {
    if (!id.trim()) {
      toast('Enter your email or mobile');
    } else if (pw.length < 6) {
      toast('Password must be at least 6 characters');
    } else if (checkLogin('admin', pw === DEMO_CODE)) {
      signIn('admin');
      nav.reset('AdminTabs');
    }
  };
  return (
    <Screen>
      <View style={s.logo}>
        <ShieldCheck size={28} color={colors.text} />
      </View>
      <Text style={s.h1}>School admin</Text>
      <Text style={s.sub}>Owner, Principal and staff. Your menu depends on your role.</Text>
      <Field label="Email or mobile" icon={User} value={id} onChangeText={setId} autoCapitalize="none" />
      <Field label="Password" icon={Lock} value={pw} onChangeText={setPw} secureTextEntry placeholder="••••••••" />
      <Text style={s.label}>Demo: sign in as</Text>
      <Chips
        options={STAFF_ROLES.map(r => r.label)}
        value={roleInfo(role).label}
        onChange={label => {
          const r = STAFF_ROLES.find(x => x.label === label);
          if (r) {
            setRole(r.key);
            setId(`${r.key}@bfs.edu.pk`);
          }
        }}
      />
      <Button label="Sign in" onPress={submit} />
      <Text style={s.forgot}>
        Forgot password?{' '}
        <Text style={s.link} onPress={() => nav.push('TeacherReset')}>
          Reset by SMS code
        </Text>
      </Text>
      <InfoBanner icon={Lock} text={`Demo password: ${DEMO_CODE}. 5 wrong attempts lock the account for 15 minutes.`} />
    </Screen>
  );
}

// ---------- Campus / session switcher (top bar) ----------

function Switchers() {
  const [campus, setCampus] = useCampus();
  const [session, setSession] = useAdminSession();
  const [role] = useStaffRole();
  const [open, setOpen] = useState<'campus' | 'session' | null>(null);
  // Owner sees all campuses; others are assigned to the main campus plus one.
  const campuses = role === 'owner' ? [{ id: ALL_CAMPUSES, name: 'All campuses' }, ...CAMPUSES] : CAMPUSES.slice(0, 2);
  const closed = SESSIONS.find(x => x.id === session)?.status === 'Closed';
  return (
    <>
      <View style={s.switchRow}>
        <Pill icon={Building} label={campusName(campus)} onPress={() => setOpen('campus')} />
        <Pill icon={CalendarDays} label={`Session ${session}`} onPress={() => setOpen('session')} />
      </View>
      {closed ? (
        <InfoBanner tone="warn" icon={Lock} text={`Session ${session} is closed and read-only${role === 'owner' ? ' (Owner can still edit).' : '.'}`} />
      ) : null}
      <BottomSheet visible={open === 'campus'} onClose={() => setOpen(null)}>
        <Text style={s.sheetTitle}>Campus</Text>
        {campuses.map((c, i) => (
          <ListRow
            key={c.id}
            icon={Building}
            title={c.name}
            right={c.id === campus ? <Badge label="Selected" tone="success" /> : undefined}
            onPress={() => {
              setCampus(c.id);
              setOpen(null);
            }}
            last={i === campuses.length - 1}
          />
        ))}
      </BottomSheet>
      <BottomSheet visible={open === 'session'} onClose={() => setOpen(null)}>
        <Text style={s.sheetTitle}>Session</Text>
        {SESSIONS.map((x, i) => (
          <ListRow
            key={x.id}
            icon={CalendarDays}
            title={x.name}
            subtitle={`${x.start} – ${x.end}`}
            right={<Badge label={x.id === session ? 'Selected' : x.status} tone={x.id === session ? 'success' : x.status === 'Active' ? 'info' : 'neutral'} />}
            onPress={() => {
              setSession(x.id);
              setOpen(null);
            }}
            last={i === SESSIONS.length - 1}
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

function useCampusFigures() {
  const [campus] = useCampus();
  return useMemo(() => {
    const list = campus === ALL_CAMPUSES ? CAMPUSES : CAMPUSES.filter(c => c.id === campus);
    const sum = (f: (c: (typeof CAMPUSES)[number]) => number) => list.reduce((a, c) => a + f(c), 0);
    const strength = sum(c => c.strength);
    return {
      list,
      strength,
      staff: sum(c => c.staff),
      collection: sum(c => c.collection),
      expected: sum(c => c.expected),
      expenses: sum(c => c.expenses),
      attendance: Math.round(sum(c => c.attendance * c.strength) / Math.max(1, strength)),
      collectionToday: Math.round(sum(c => c.collection) / 22),
    };
  }, [campus]);
}

function AdminDashboard() {
  const [role] = useStaffRole();
  const open = useOpen();
  const [approvals] = useApprovals();
  const f = useCampusFigures();
  const info = roleInfo(role);
  const access = useAccess(role);
  const pending = approvals.filter(a => a.status === 'Pending').length;
  const dues = f.expected - f.collection;

  type Alert = { text: string; route: string; tone: 'danger' | 'warn' };
  const allAlerts: Alert[] = [
    { text: '3 staff contracts end within 60 days', route: 'AdminStaffDirectory', tone: 'warn' },
    { text: 'Vehicle LEA-4512 fitness expires in 12 days', route: 'AdminVehicles', tone: 'warn' },
    { text: '4 items are below the low-stock level', route: 'AdminStock', tone: 'danger' },
    { text: '2 teachers absent today, 5 periods need substitutes', route: 'AdminSubstitutions', tone: 'danger' },
    { text: '6 students absent 3 days in a row', route: 'AdminStudents', tone: 'warn' },
    { text: 'Driver Shahid Iqbal licence expires 30 Nov', route: 'AdminDrivers', tone: 'warn' },
  ];
  const alerts = allAlerts.filter(a => access.can(a.route));

  const kpis: Record<StaffRole, React.ReactNode> = {
    owner: (
      <>
        <Kpi label="Strength" value={f.strength.toLocaleString('en-US')} sub={`${f.staff} staff`} onPress={() => open('AdminStudents')} />
        <Kpi label="Attendance today" value={`${f.attendance}%`} sub="students" tone="success" onPress={() => open('AdminReport', { id: 'r12' })} />
        <Kpi label="Collection today" value={fmtM(f.collectionToday)} sub="all modes" onPress={() => open('AdminFeeCounter')} />
        <Kpi label="Collection this month" value={fmtM(f.collection)} sub={`${Math.round((f.collection / f.expected) * 100)}% of expected`} tone="success" onPress={() => open('AdminReport', { id: 'r6' })} />
        <Kpi label="Outstanding dues" value={fmtM(dues)} sub="defaulters list" tone="danger" onPress={() => open('AdminDefaulters')} />
        <Kpi label="Expenses this month" value={fmtM(f.expenses)} sub="P&L" onPress={() => open('AdminExpenses')} />
        <Kpi label="Pending approvals" value={String(pending)} sub="tap to review" tone="warn" onPress={() => open('AdminApprovals')} />
        <Kpi label="Net this month" value={fmtM(f.collection - f.expenses)} sub="collection − expenses" tone="success" onPress={() => open('AdminReport', { id: 'r34' })} />
      </>
    ),
    principal: (
      <>
        <Kpi label="Strength" value={f.strength.toLocaleString('en-US')} onPress={() => open('AdminStudents')} />
        <Kpi label="Attendance today" value={`${f.attendance}%`} tone="success" onPress={() => open('AdminReport', { id: 'r12' })} />
        <Kpi label="Collection this month" value={fmtM(f.collection)} onPress={() => open('AdminReport', { id: 'r6' })} />
        <Kpi label="Pending approvals" value={String(pending)} tone="warn" onPress={() => open('AdminApprovals')} />
        <Kpi label="Absent teachers" value="2" sub="5 periods to cover" tone="danger" onPress={() => open('AdminSubstitutions')} />
        <Kpi label="Diary not posted" value="7" sub="teachers today" tone="warn" onPress={() => open('AdminReport', { id: 'r22' })} />
      </>
    ),
    frontdesk: (
      <>
        <Kpi label="New inquiries" value="9" sub="today" onPress={() => open('AdminInquiries')} />
        <Kpi label="Follow-ups due" value="14" tone="warn" onPress={() => open('AdminInquiries')} />
        <Kpi label="Registrations" value="38" sub="this month" onPress={() => open('AdminRegistration')} />
        <Kpi label="Entry tests" value="Sat 31 Oct" sub="46 candidates" onPress={() => open('AdminEntryTest')} />
        <Kpi label="Visitors inside" value="3" onPress={() => open('AdminVisitors')} />
        <Kpi label="Certificate requests" value="5" tone="warn" onPress={() => open('AdminCertificates')} />
      </>
    ),
    accounts: (
      <>
        <Kpi label="Collection today" value={fmtM(f.collectionToday)} onPress={() => open('AdminFeeCounter')} />
        <Kpi label="This month" value={fmtM(f.collection)} sub={`of ${fmtM(f.expected)}`} onPress={() => open('AdminReport', { id: 'r6' })} />
        <Kpi label="Dues" value={fmtM(dues)} tone="danger" onPress={() => open('AdminDefaulters')} />
        <Kpi label="Online pending" value="3" sub="to reconcile" tone="warn" onPress={() => open('AdminOnlinePayments')} />
        <Kpi label="Expenses" value={fmtM(f.expenses)} onPress={() => open('AdminExpenses')} />
        <Kpi label="Cash closing" value="Open" sub="today" tone="warn" onPress={() => open('AdminCashClosing')} />
      </>
    ),
    hr: (
      <>
        <Kpi label="Staff present" value={`${f.staff - 6} / ${f.staff}`} tone="success" onPress={() => open('AdminStaffAttendance')} />
        <Kpi label="On leave" value="4" onPress={() => open('AdminLeaveManagement')} />
        <Kpi label="Leave requests" value="3" tone="warn" onPress={() => open('AdminLeaveManagement')} />
        <Kpi label="Contracts ending" value="3" sub="next 60 days" tone="warn" onPress={() => open('AdminStaffDirectory')} />
        <Kpi label="Open positions" value="2" onPress={() => open('AdminHiring')} />
        <Kpi label="Late arrivals" value="5" sub="today" tone="danger" onPress={() => open('AdminStaffAttendance')} />
      </>
    ),
    exam: (
      <>
        <Kpi label="Marks entered" value="78%" sub="final term" onPress={() => open('AdminMarksMonitor')} />
        <Kpi label="Pending teachers" value="9" tone="warn" onPress={() => open('AdminMarksMonitor')} />
        <Kpi label="Results to publish" value="2 classes" onPress={() => open('AdminResults')} />
        <Kpi label="Admit cards held" value="41" sub="fee defaulters" tone="danger" onPress={() => open('AdminAdmitCards')} />
      </>
    ),
    transport: (
      <>
        <Kpi label="Vehicles" value="12" sub="11 on road" onPress={() => open('AdminVehicles')} />
        <Kpi label="Students" value="486" sub="on transport" onPress={() => open('AdminTransportAssign')} />
        <Kpi label="Docs expiring" value="3" tone="warn" onPress={() => open('AdminVehicles')} />
        <Kpi label="Fuel this month" value="Rs. 412,000" onPress={() => open('AdminFuelMaintenance')} />
      </>
    ),
    store: (
      <>
        <Kpi label="Low stock items" value="4" tone="danger" onPress={() => open('AdminStock')} />
        <Kpi label="Sales today" value="Rs. 38,400" onPress={() => open('AdminSales')} />
        <Kpi label="Canteen today" value="Rs. 21,150" onPress={() => open('AdminCanteenPos')} />
        <Kpi label="Open POs" value="2" onPress={() => open('AdminPurchases')} />
      </>
    ),
    librarian: (
      <>
        <Kpi label="Books issued" value="318" onPress={() => open('AdminLibrary')} />
        <Kpi label="Overdue" value="27" tone="danger" onPress={() => open('AdminLibrary')} />
        <Kpi label="Fines due" value="Rs. 4,350" tone="warn" onPress={() => open('AdminLibrary')} />
        <Kpi label="Catalog" value="6,420 books" onPress={() => open('AdminLibrary')} />
      </>
    ),
  };

  return (
    <Screen
      title={`Assalam o Alaikum, ${info.user.split(' ').slice(-2)[0]}`}
      subtitle={`${info.label} · Thursday 22 Oct`}
      right={
        <View style={s.headRight}>
          <IconButton icon={Search} onPress={() => open('AdminSearch')} />
          <BellButton count={pending} />
        </View>
      }
    >
      <Switchers />
      <KpiGrid>{kpis[role]}</KpiGrid>

      {role === 'owner' || role === 'principal' || role === 'accounts' ? (
        <Card title="Collection trend (Rs. M)" action={{ label: 'Report', onPress: () => open('AdminReport', { id: 'r6' }) }}>
          <BarChart
            data={[
              { label: 'May', value: 12.1 },
              { label: 'Jun', value: 9.4 },
              { label: 'Jul', value: 8.8 },
              { label: 'Aug', value: 13.2 },
              { label: 'Sep', value: 14.0 },
              { label: 'Oct', value: +(f.collection / 1000000).toFixed(1), highlight: true },
            ]}
            format={v => v.toFixed(1)}
          />
        </Card>
      ) : null}

      {role === 'owner' ? (
        <Card title="Campus comparison" action={{ label: 'Report', onPress: () => open('AdminReport', { id: 'r19' }) }}>
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

      {alerts.length ? (
        <Card title="Alerts">
          {alerts.map((a, i) => (
            <ListRow
              key={a.text}
              icon={TriangleAlert}
              iconTone={a.tone === 'danger' ? 'danger' : 'primary'}
              title={a.text}
              onPress={() => open(a.route)}
              chevron
              last={i === alerts.length - 1}
            />
          ))}
        </Card>
      ) : null}

      {role === 'owner' || role === 'principal' ? (
        <Card title="Pending approvals" action={{ label: 'All', onPress: () => open('AdminApprovals') }}>
          {approvals
            .filter(a => a.status === 'Pending')
            .slice(0, 3)
            .map((a, i, arr) => (
              <ListRow
                key={a.id}
                icon={ShieldCheck}
                title={a.title}
                subtitle={`${a.type} · ${a.by}`}
                onPress={() => open('AdminApprovals')}
                last={i === arr.length - 1}
              />
            ))}
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
  const [role] = useStaffRole();
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const digits = needle.replace(/\D/g, '');
  const students = needle
    ? ADMIN_STUDENTS.filter(
        st =>
          st.name.toLowerCase().includes(needle) ||
          st.gr.toLowerCase().includes(needle) ||
          (digits.length >= 4 && (st.fatherCnic.replace(/\D/g, '').includes(digits) || st.mobile.replace(/\D/g, '').includes(digits))),
      ).slice(0, 20)
    : [];
  const staffAllowed = role === 'owner' || role === 'principal' || role === 'hr';
  const staff = needle && staffAllowed
    ? ADMIN_STAFF.filter(x => x.name.toLowerCase().includes(needle) || x.id.toLowerCase().includes(needle)).slice(0, 20)
    : [];
  return (
    <Screen title="Search" subtitle="Student by name, GR No., father CNIC or mobile; staff by name or ID">
      <Field icon={Search} value={q} onChangeText={setQ} placeholder="e.g. Ayesha, GR-MC-0012, 35202-1234567, EMP-0001" autoFocus />
      {needle && !students.length && !staff.length ? <InfoBanner text="No match found." /> : null}
      {students.length ? (
        <Card title={`Students (${students.length})`}>
          {students.map((st, i) => (
            <ListRow
              key={st.id}
              avatar={st.name}
              title={st.name}
              subtitle={`${st.gr} · ${st.className}-${st.section} · ${campusName(st.campus)} · Father ${st.father}`}
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
              subtitle={`${x.id} · ${x.designation} · ${campusName(x.campus)}`}
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
  const [role, setRole] = useStaffRole();
  const { lang, setLang } = useI18n();
  const [pick, setPick] = useState(false);
  const tabs = useTabs();
  const info = roleInfo(role);
  return (
    <Screen title="More" right={<IconButton icon={Globe} onPress={() => setLang(lang === 'en' ? 'ur' : 'en')} />}>
      <Card style={s.profile}>
        <Avatar name={info.user} size={56} ring />
        <View style={s.flex}>
          <Text style={s.profileName}>{info.user}</Text>
          <Text style={s.sub}>{info.label}</Text>
          <Text style={s.sub}>{role}@bfs.edu.pk</Text>
        </View>
      </Card>
      <Switchers />
      <Card>
        <ListRow icon={Briefcase} title="Switch staff role (demo)" subtitle={info.label} onPress={() => setPick(true)} chevron />
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
      <BottomSheet visible={pick} onClose={() => setPick(false)}>
        <Text style={s.sheetTitle}>Sign in as</Text>
        <ScrollView style={s.sheetList}>
          {STAFF_ROLES.map((r, i) => (
            <ListRow
              key={r.key}
              icon={Users}
              title={r.label}
              subtitle={r.user}
              right={r.key === role ? <Badge label="Current" tone="success" /> : undefined}
              onPress={() => {
                setRole(r.key);
                setPick(false);
                toast(`Now signed in as ${r.label}`);
              }}
              last={i === STAFF_ROLES.length - 1}
            />
          ))}
        </ScrollView>
      </BottomSheet>
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
