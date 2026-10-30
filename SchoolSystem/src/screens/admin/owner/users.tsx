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
  Toggle,
} from '../../../components/ui';
import { adminStyles as a, FormSheet, ListScreen } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { useShared } from '../../../store';
import { CAMPUSES, logAudit } from '../../../data/admin';
import { AdminUser, Perm, PERMS, ROLE_DEFS, RoleDef, USERS } from '../../../data/admin-owner';
import { colors, radius } from '../../../theme';
import { defaultPerms, PANELS, useMatrix } from '../menu';
import { localId, ReadOnlyBanner, useGuard } from './shared';

export const useUsers = () => useShared<AdminUser[]>('admin.users', USERS);
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

function UserForm({ initial, onClose }: { initial: AdminUser; onClose: () => void }) {
  const [, setUsers] = useUsers();
  const [roles] = useRoleDefs();
  const [f, setF] = useState(initial);
  const save = () => {
    if (!f.name.trim() || !/\S+@\S+/.test(f.email)) {
      toast('Enter a name and a valid email');
      return;
    }
    if (!f.roles.length || !f.campuses.length) {
      toast('Assign at least one role and one campus');
      return;
    }
    if (f.id) {
      setUsers(l => l.map(u => (u.id === f.id ? f : u)));
      logAudit('Users', `Edited ${f.name}: roles ${f.roles.join(', ')}; campuses ${f.campuses.join(', ')}`);
    } else {
      setUsers(l => [{ ...f, id: localId('u') }, ...l]);
      logAudit('Users', `Created user ${f.name} (${f.email}) as ${f.roles.join(', ')}`);
    }
    toast('User saved. Login details sent by SMS and email.');
    onClose();
  };
  return (
    <FormSheet visible onClose={onClose} title={f.id ? 'Edit user' : 'Create user'} onSubmit={save}>
      <Field label="Full name" value={f.name} onChangeText={v => setF(p => ({ ...p, name: v }))} />
      <Field label="Email or mobile" value={f.email} onChangeText={v => setF(p => ({ ...p, email: v }))} autoCapitalize="none" />
      <Text style={a.bold}>Roles</Text>
      <MultiChips
        options={roles.map(r => ({ key: r.name, label: r.name }))}
        value={f.roles}
        onChange={v => setF(p => ({ ...p, roles: v }))}
      />
      <Text style={a.bold}>Campuses</Text>
      <MultiChips
        options={CAMPUSES.map(c => ({ key: c.id, label: c.name }))}
        value={f.campuses}
        onChange={v => setF(p => ({ ...p, campuses: v }))}
      />
      <View style={a.row}>
        <Text style={[a.bold, a.flex]}>Login enabled</Text>
        <Toggle value={f.active} onChange={v => setF(p => ({ ...p, active: v }))} />
      </View>
    </FormSheet>
  );
}

export function AdminUsersRoles(_: ScreenProps) {
  const nav = useNav();
  const [users, setUsers] = useUsers();
  const { guard } = useGuard();
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const toggle = (u: AdminUser) =>
    guard(() => {
      if (u.roles.includes('Owner / Super Admin')) {
        toast('The Owner account cannot be disabled');
        return;
      }
      setUsers(l => l.map(x => (x.id === u.id ? { ...x, active: !x.active } : x)));
      logAudit('Users', `${u.name} ${u.active ? 'disabled' : 'enabled'}`);
    })();
  return (
    <>
      <ListScreen
        title="Users & roles"
        subtitle={`${users.length} users`}
        items={users}
        keyOf={u => u.id}
        searchText={u => `${u.name} ${u.email} ${u.roles.join(' ')}`}
        filters={[
          { label: 'Status', options: ['All', 'Active', 'Disabled'], get: u => (u.active ? 'Active' : 'Disabled') },
          { label: 'Campus', options: ['All', ...CAMPUSES.map(c => c.name)], get: u => (u.campuses.length > 1 ? 'All' : CAMPUSES.find(c => c.id === u.campuses[0])?.name ?? '') },
        ]}
        onAdd={guard(() => setEditing({ id: '', name: '', email: '', roles: [], campuses: ['main'], active: true, lastLogin: 'Never' }))}
        addLabel="Create user"
        header={
          <>
            <ReadOnlyBanner />
            <Button label="Roles & permission matrix" variant="outline" icon={ShieldCheck} onPress={() => nav.push('AdminRoles')} />
          </>
        }
        renderItem={(u, last) => (
          <ListRow
            avatar={u.name}
            title={u.name}
            subtitle={`${u.email}\n${u.roles.join(', ')} · ${u.campuses.map(c => CAMPUSES.find(x => x.id === c)?.name.split(' ')[0]).join(', ')} · last login ${u.lastLogin}`}
            right={
              <View style={a.right}>
                <Badge label={u.active ? 'Active' : 'Disabled'} tone={u.active ? 'success' : 'neutral'} />
                <Text style={s.link} onPress={() => toggle(u)}>
                  {u.active ? 'Disable' : 'Enable'}
                </Text>
              </View>
            }
            onPress={guard(() => setEditing(u))}
            last={last}
          />
        )}
      />
      {editing ? <UserForm initial={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

export function AdminRoles(_: ScreenProps) {
  const nav = useNav();
  const [roles, setRoles] = useRoleDefs();
  const [, setMatrix] = useMatrix();
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
        renderItem={(r, last) => (
          <ListRow
            icon={UserCog}
            title={r.name}
            subtitle={`${r.users} users · tap to edit permissions`}
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
