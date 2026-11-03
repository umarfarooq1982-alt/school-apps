// S-13 audit log, login history (live), backup and restore.
import React, { useState } from 'react';
import { View } from 'react-native';
import { DatabaseBackup, Download, FileClock, Lock, LogIn, RotateCcw } from 'lucide-react-native';
import { Badge, Button, IconButton, InfoBanner, ListRow, Segmented, toast } from '../../../components/ui';
import { adminStyles as a, ListScreen, useReasonPrompt } from '../../../components/admin';
import { ScreenProps } from '../../../navigation';
import { useShared } from '../../../store';
import { logAudit, useStaffRole } from '../../../data/admin';
import { Backup, BACKUPS } from '../../../data/admin-owner';
import { useApi, useMutation } from '../../../api/hooks';
import { AuditRow, webA } from '../../../api/webA';
import { NoApiBanner } from '../../../components/states';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const LOGIN_ACTIONS = ['login', 'impersonate', 'logout'];

export function AdminAuditLog(_: ScreenProps) {
  const q = useApi('adm:audit', () => webA.audit());
  const users = useApi('adm:users', webA.users);
  const [tab, setTab] = useState('Changes');
  const names = new Map((users.data ?? []).map(u => [Number(u.id), u.name]));
  const who = (e: AuditRow) => (e.user_id ? names.get(e.user_id) ?? `User ${e.user_id}` : 'System');
  const rows = q.data ?? [];
  const logins = rows.filter(e => LOGIN_ACTIONS.includes(e.action));
  const changes = rows.filter(e => !LOGIN_ACTIONS.includes(e.action));
  const detail = (e: AuditRow) => {
    const meta = e.meta ? ` · ${typeof e.meta === 'string' ? e.meta : JSON.stringify(e.meta)}` : '';
    return `${e.entity ?? ''}${e.entity_id ? ` #${e.entity_id}` : ''}${meta}`;
  };
  const header = (
    <>
      <Segmented options={['Changes', 'Logins']} value={tab} onChange={setTab} />
      <InfoBanner icon={Lock} text="Audit entries are permanent. Nobody can edit or delete them, including the Owner." />
      {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
    </>
  );
  if (tab === 'Logins') {
    return (
      <ListScreen
        key="logins"
        title="Audit log & login history"
        subtitle={`${logins.length} recent logins`}
        items={logins}
        keyOf={l => String(l.id)}
        searchText={l => `${who(l)} ${String((l as AuditRow & { ip?: string }).ip ?? '')}`}
        filters={[{ label: 'Type', options: ['All', ...LOGIN_ACTIONS], get: l => l.action }]}
        header={header}
        empty={q.loading ? 'Loading…' : 'No logins yet'}
        renderItem={(l, last) => (
          <ListRow
            icon={LogIn}
            title={who(l)}
            subtitle={`${when(l.created_at)}${(l as AuditRow & { ip?: string }).ip ? ` · IP ${(l as AuditRow & { ip?: string }).ip}` : ''}`}
            right={<Badge label={l.action} tone={l.action === 'impersonate' ? 'warn' : 'success'} />}
            last={last}
          />
        )}
      />
    );
  }
  const actions = ['All', ...Array.from(new Set(changes.map(e => e.action)))];
  return (
    <ListScreen
      key="changes"
      title="Audit log & login history"
      subtitle={`${changes.length} entries · who changed what and when`}
      items={changes}
      keyOf={e => String(e.id)}
      searchText={e => `${who(e)} ${e.action} ${detail(e)}`}
      filters={[{ label: 'Action', options: actions, get: e => e.action }]}
      header={header}
      empty={q.loading ? 'Loading…' : 'No changes recorded'}
      renderItem={(e, last) => (
        <ListRow
          icon={FileClock}
          title={`${e.action} · ${who(e)}`}
          subtitle={`${when(e.created_at)}\n${detail(e)}`}
          last={last}
        />
      )}
    />
  );
}

type LiveBackup = Backup & { records?: unknown[] };

export function AdminBackup(_: ScreenProps) {
  const [list, setList] = useShared<LiveBackup[]>('admin.backups', BACKUPS);
  const [role] = useStaffRole();
  const [prompt, ask] = useReasonPrompt();
  const isOwner = role === 'owner';
  const backup = useMutation(webA.backup, 'Backup complete');
  const restoreRun = useMutation(webA.restore, 'Restore finished');
  const backupNow = async () => {
    if (!isOwner) {
      toast('Only the Owner can take a backup');
      return;
    }
    const res = await backup.run();
    if (res) {
      const c = res.counts ?? {};
      const payload = res as unknown as { records?: unknown[] };
      setList(l => [
        {
          id: `bm${Date.now()}`,
          when: when(res.exportedAt),
          size: `${c.students ?? 0} students · ${c.staff ?? 0} staff · ${c.vouchers ?? 0} vouchers · ${c.records ?? 0} records`,
          kind: 'Manual',
          expires: 'in 30 days',
          records: payload.records ?? [],
        },
        ...l,
      ]);
      logAudit('Backup', 'Manual backup created');
    }
  };
  const restore = (b: LiveBackup) => {
    if (!isOwner) {
      toast('Only the Owner can restore a backup');
      return;
    }
    if (!b.records) {
      toast('This backup is kept on the server; restore it from the web panel.');
      return;
    }
    ask(`Restore backup of ${b.when}?`, async reason => {
      if ((await restoreRun.run({ records: b.records ?? [] })) !== undefined) {
        logAudit('Restore', `Restored backup ${b.when}. Reason: ${reason}`);
      }
    });
  };
  return (
    <>
      <ListScreen
        title="Backup & restore"
        subtitle="Daily automatic backups kept 30 days"
        items={list}
        keyOf={b => b.id}
        searchText={b => `${b.when} ${b.kind}`}
        filters={[{ label: 'Kind', options: ['All', 'Automatic', 'Manual'], get: b => b.kind }]}
        header={
          <>
            <InfoBanner icon={DatabaseBackup} text="A backup runs every night at 2:00 AM and is kept for 30 days. Only the Owner can restore." />
            <NoApiBanner what="The nightly backup list (the server only makes a backup on request)" />
            <Button label="Back up now" icon={DatabaseBackup} loading={backup.busy} onPress={backupNow} />
          </>
        }
        renderItem={(b, last) => (
          <ListRow
            icon={DatabaseBackup}
            title={b.when}
            subtitle={`${b.kind} · ${b.size} · expires ${b.expires}`}
            right={
              <View style={a.row}>
                <IconButton icon={Download} onPress={() => { logAudit('Backup', `Downloaded backup ${b.when}`); toast('Download the backup file from the web panel (no app API).'); }} />
                <IconButton icon={RotateCcw} onPress={() => restore(b)} />
              </View>
            }
            last={last}
          />
        )}
      />
      {prompt}
    </>
  );
}
