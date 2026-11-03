// Users, roles and the permission matrix editor (SOW 3.2 A, S-13).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, User, UserCog } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  toast,
} from '../../../components/ui';
import { adminStyles as a, FormSheet, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { useShared } from '../../../store';
import { logAudit } from '../../../data/admin';
import { Perm, PERMS, ROLE_DEFS, RoleDef } from '../../../data/admin-owner';
import { useApi, useMutation } from '../../../api/hooks';
import { SERVER_PERMISSIONS, WebUser, webA } from '../../../api/webA';
import { getSession } from '../../../api/session';
import { NoApiBanner } from '../../../components/states';
import { colors, radius } from '../../../theme';
import { defaultPerms, PANELS, useMatrix } from '../menu';
import { localId, ReadOnlyBanner, useGuard } from './shared';

export const useRoleDefs = () => useShared<RoleDef[]>('admin.roleDefs', ROLE_DEFS);

function MultiChips({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: string; label: string }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <View style={a.rowWrap}>
      {options.map(o => {
        const on = value.includes(o.key);
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(on ? value.filter(x => x !== o.key) : [...value, o.key])}
            style={[s.chip, on && s.chipOn]}
          >
            <Text style={[s.chipText, on && s.chipTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const SERVER_ROLES = ['principal', 'frontdesk', 'accounts', 'hr', 'exam', 'transport', 'store', 'librarian', 'teacher'];

type UserDraft = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  campusIds: string[];
  permissions: string[];
  staffId: string;
};

function UserForm({ initial, onClose, onSaved }: { initial: UserDraft; onClose: () => void; onSaved: () => void }) {
  const ctx = useApi('adm:context', webA.context);
  const staff = useApi('adm:staff:all', webA.staff);
  const staffOptions = (staff.data ?? []).map(x => ({ id: String(x.id), label: `${x.name} (${x.empId})` }));
  const [f, setF] = useState(initial);
  const staffLabel = staffOptions.find(o => o.id === f.staffId)?.label ?? '';
  const editing = !!f.id;
  const { run, busy } = useMutation(async () => {
    if (editing) {
      return webA.saveAccess(f.id, { permissions: f.permissions, campusIds: f.campusIds, ...(f.staffId ? { staffId: f.staffId } : {}) });
    }
    return webA.createUser({
      name: f.name.trim(),
      email: f.email.trim().toLowerCase(),
      phone: f.phone || undefined,
      role: f.role,
      password: f.password,
      campusIds: f.campusIds,
      permissions: f.permissions.length ? f.permissions : undefined,
      staffId: f.staffId || undefined,
    });
  }, editing ? 'Access saved' : 'User created');
  const save = async () => {
    if (!editing) {
      if (!f.name.trim() || !/\S+@\S+\.\S+/.test(f.email)) {
        toast('Enter a name and a valid email');
        return;
      }
      if (f.password.length < 6) {
        toast('First password needs at least 6 characters');
        return;
      }
    }
    if (f.role === 'teacher' && !f.staffId) {
      toast('Link the teacher to a staff record');
      return;
    }
    if (!f.campusIds.length) {
      toast('Assign at least one campus');
      return;
    }
    if (busy) {
      return;
    }
    if ((await run()) !== undefined) {
      logAudit('Users', editing ? `Access changed for ${f.name}` : `Created user ${f.name} (${f.email}) as ${f.role}`);
      onSaved();
      onClose();
    }
  };
  return (
    <FormSheet visible onClose={onClose} title={editing ? `Access · ${f.name}` : 'Create user'} onSubmit={save} submitLabel={busy ? 'Saving…' : 'Save'}>
      {editing ? null : (
        <>
          <Field label="Full name" value={f.name} onChangeText={v => setF(p => ({ ...p, name: v }))} />
          <Field label="Email" value={f.email} onChangeText={v => setF(p => ({ ...p, email: v }))} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Mobile" value={f.phone} onChangeText={v => setF(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
          <Field label="First password" value={f.password} onChangeText={v => setF(p => ({ ...p, password: v }))} secureTextEntry />
          <Text style={a.bold}>Role</Text>
          <MultiChips
            options={SERVER_ROLES.map(r => ({ key: r, label: r }))}
            value={[f.role]}
            onChange={v => setF(p => ({ ...p, role: v.filter(x => x !== p.role)[0] ?? p.role }))}
          />
        </>
      )}
      {f.role === 'parent' || f.role === 'student' ? null : (
        <>
          <PickerField label="Linked staff record" value={staffLabel} options={staffOptions.map(o => o.label)} onChange={v => setF(p => ({ ...p, staffId: staffOptions.find(o => o.label === v)?.id ?? '' }))} placeholder="Choose the staff member" />
          <Text style={a.small}>A teacher login must be linked to its staff record, or the teacher app cannot load classes. One login per staff member.</Text>
        </>
      )}
      <Text style={a.bold}>Campuses</Text>
      <MultiChips
        options={(ctx.data?.campuses ?? []).map(c => ({ key: String(c.id), label: c.name }))}
        value={f.campusIds}
        onChange={v => setF(p => ({ ...p, campusIds: v }))}
      />
      <Text style={a.bold}>Permissions (empty = role default)</Text>
      <MultiChips
        options={SERVER_PERMISSIONS.map(x => ({ key: x, label: x }))}
        value={f.permissions}
        onChange={v => setF(p => ({ ...p, permissions: v }))}
      />
    </FormSheet>
  );
}

const fmtLogin = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never');

export function AdminUsersRoles(_: ScreenProps) {
  const nav = useNav();
  const q = useApi('adm:users', webA.users);
  const { guard } = useGuard();
  const [editing, setEditing] = useState<UserDraft | null>(null);
  const toggleRun = useMutation((id: string) => webA.toggleUser(id));
  const toggle = (u: WebUser) =>
    guard(async () => {
      if (u.role === 'owner') {
        toast('The Owner account cannot be disabled');
        return;
      }
      if ((await toggleRun.run(u.id)) !== undefined) {
        logAudit('Users', `${u.name} ${u.disabled ? 'enabled' : 'disabled'}`);
        q.refresh();
      }
    })();
  const sessionCampus = getSession()?.campusId;
  const fresh = (): UserDraft => ({
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'teacher',
    password: '',
    campusIds: sessionCampus && sessionCampus !== 'all' ? [sessionCampus] : [],
    permissions: [],
    staffId: '',
  });
  const users = q.data ?? [];
  return (
    <>
      <ListScreen
        title="Users & roles"
        subtitle={`${users.length} users`}
        items={users}
        keyOf={u => u.id}
        searchText={u => `${u.name} ${u.email} ${u.role} ${u.phone ?? ''}`}
        filters={[
          { label: 'Status', options: ['All', 'Active', 'Disabled'], get: u => (u.disabled ? 'Disabled' : 'Active') },
          { label: 'Role', options: ['All', 'owner', ...SERVER_ROLES, 'parent', 'student'], get: u => u.role },
        ]}
        onAdd={guard(() => setEditing(fresh()))}
        addLabel="Create user"
        empty={q.loading ? 'Loading…' : q.error ?? 'No users'}
        header={
          <>
            <ReadOnlyBanner />
            {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
            <Button label="Roles & permission matrix" variant="outline" icon={ShieldCheck} onPress={() => nav.push('AdminRoles')} />
          </>
        }
        renderItem={(u, last) => (
          <ListRow
            avatar={u.name}
            title={u.name}
            subtitle={`${u.email}${u.phone ? ` · ${u.phone}` : ''}\n${u.role}${u.staffId ? ` · linked to staff #${u.staffId}` : ''}${u.permissions?.length ? ` · ${u.permissions.length} custom permissions` : ''} · last login ${fmtLogin(u.lastLogin)}`}
            right={
              <View style={a.right}>
                <Badge label={u.disabled ? 'Disabled' : 'Active'} tone={u.disabled ? 'neutral' : 'success'} />
                {u.role === 'owner' ? null : (
                  <Text style={s.link} onPress={() => toggle(u)}>
                    {u.disabled ? 'Enable' : 'Disable'}
                  </Text>
                )}
              </View>
            }
            onPress={
              u.role === 'owner'
                ? undefined
                : guard(() =>
                    setEditing({
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      phone: u.phone ?? '',
                      role: u.role,
                      password: '',
                      campusIds: sessionCampus && sessionCampus !== 'all' ? [sessionCampus] : [],
                      permissions: u.permissions ?? [],
                      staffId: u.staffId ?? '',
                    }),
                  )
            }
            last={last}
          />
        )}
      />
      {editing ? <UserForm initial={editing} onClose={() => setEditing(null)} onSaved={q.refresh} /> : null}
    </>
  );
}

export function AdminRoles(_: ScreenProps) {
  const nav = useNav();
  const [roles, setRoles] = useRoleDefs();
  const [, setMatrix] = useMatrix();
  const users = useApi('adm:users', webA.users);
  const countOf = (r: RoleDef) => (users.data ? users.data.filter(u => u.role === (r.base ?? r.id)).length : null);
  const { guard } = useGuard();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const create = () => {
    if (!name.trim()) {
      toast('Enter a role name');
      return;
    }
    if (roles.some(r => r.name.toLowerCase() === name.trim().toLowerCase())) {
      toast('A role with this name exists');
      return;
    }
    const r: RoleDef = { id: localId('role'), name: name.trim(), custom: true, users: 0 };
    setRoles(l => [...l, r]);
    setMatrix(m => ({ ...m, [r.id]: defaultPerms(r) }));
    logAudit('Roles', `Created custom role ${r.name}`);
    setOpen(false);
    setName('');
    nav.push('AdminRoleEditor', { id: r.id });
  };
  return (
    <>
      <ListScreen
        title="Roles"
        subtitle="Built-in and custom roles"
        items={roles}
        keyOf={r => r.id}
        searchText={r => r.name}
        filters={[{ label: 'Type', options: ['All', 'Built-in', 'Custom'], get: r => (r.custom ? 'Custom' : 'Built-in') }]}
        onAdd={guard(() => setOpen(true))}
        addLabel="Create custom role"
        header={<NoApiBanner what="Roles and the per-screen matrix are kept on this phone; per-user permissions are saved on the server from Users" />}
        renderItem={(r, last) => (
          <ListRow
            icon={UserCog}
            title={r.name}
            subtitle={`${r.custom ? 'Custom role' : countOf(r) === null ? '…' : `${countOf(r)} users`} · tap to edit permissions`}
            right={<Badge label={r.custom ? 'Custom' : 'Built-in'} tone={r.custom ? 'info' : 'neutral'} />}
            onPress={() => nav.push('AdminRoleEditor', { id: r.id })}
            last={last}
          />
        )}
      />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Custom role" onSubmit={create} submitLabel="Create and set permissions">
        <Field label="Role name" value={name} onChangeText={setName} placeholder="e.g. Academic Coordinator" />
      </FormSheet>
    </>
  );
}

export function AdminRoleEditor(_: ScreenProps) {
  const [roles] = useRoleDefs();
  const id = useParam('id', roles[0].id);
  const role = roles.find(r => r.id === id) ?? roles[0];
  const [matrix, setMatrix] = useMatrix();
  const { guard, ro } = useGuard();
  const [draft, setDraft] = useState<Record<string, Perm[]>>(() => matrix[role.id] ?? defaultPerms(role));
  const locked = role.id === 'owner';
  // One panel open at a time keeps the matrix readable on a phone.
  const [openPanel, setOpenPanel] = useState(PANELS[0].key);
  const flip = (route: string, p: Perm) => {
    if (locked) {
      toast('The Owner always has every permission');
      return;
    }
    if (ro) {
      toast('This session is closed and read-only.');
      return;
    }
    setDraft(d => {
      const cur = d[route] ?? [];
      let next = cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p];
      // Any permission needs View; removing View removes everything.
      if (p === 'View' && cur.includes('View')) {
        next = [];
      } else if (p !== 'View' && !next.includes('View') && next.length) {
        next = ['View', ...next];
      }
      return { ...d, [route]: next };
    });
  };
  const save = guard(() => {
    setMatrix(m => ({ ...m, [role.id]: draft }));
    const count = Object.values(draft).reduce((n, v) => n + v.length, 0);
    logAudit('Permissions', `${role.name}: matrix saved (${count} permissions)`);
    toast('Permissions saved');
  });
  return (
    <Screen
      title={role.name}
      subtitle="Permission matrix · view, add, edit, delete, approve"
      footer={<Button label="Save permissions" onPress={save} />}
    >
      <ReadOnlyBanner />
      {locked ? <InfoBanner icon={ShieldCheck} text="The Owner role always has every permission." /> : null}
      {PANELS.map(p => (
        <Card key={p.key}>
          <ListRow
            title={p.title}
            subtitle={`${p.items.reduce((n, it) => n + (locked ? PERMS.length : (draft[it.route] ?? []).length), 0)} permissions · ${p.items.length} screens`}
            onPress={() => setOpenPanel(k => (k === p.key ? '' : p.key))}
            chevron
            last={openPanel !== p.key}
          />
          {openPanel !== p.key ? null : p.items.map((it, i) => (
            <View key={it.route} style={[s.mRow, i < p.items.length - 1 && s.mDivider]}>
              <Text style={s.mTitle}>{it.title}</Text>
              <View style={s.mPerms}>
                {PERMS.map(perm => {
                  const on = locked || (draft[it.route] ?? []).includes(perm);
                  return (
                    <Pressable key={perm} onPress={() => flip(it.route, perm)} style={[s.perm, on && s.permOn]} hitSlop={2}>
                      <Text style={[s.permText, on && s.permTextOn]}>{perm}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>
      ))}
      <ListRow icon={User} title="Tip" subtitle="A role sees a screen in its menu only when View is on." last />
    </Screen>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  chipTextOn: { fontWeight: '800' },
  link: { fontSize: 12, fontWeight: '800', color: colors.primaryText },
  mRow: { paddingVertical: 9, gap: 6 },
  mDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  mTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  mPerms: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  perm: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  permOn: { backgroundColor: colors.successSoft, borderColor: colors.success },
  permText: { fontSize: 11, fontWeight: '700', color: colors.textFaint },
  permTextOn: { color: colors.success },
});
