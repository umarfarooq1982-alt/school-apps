// S-13 audit log, login history, backup and restore.
import React, { useState } from 'react';
import { View } from 'react-native';
import { DatabaseBackup, Download, FileClock, Lock, LogIn, RotateCcw } from 'lucide-react-native';
import { Badge, Button, IconButton, InfoBanner, ListRow, Segmented, toast } from '../../../components/ui';
import { adminStyles as a, ListScreen, useReasonPrompt } from '../../../components/admin';
import { ScreenProps } from '../../../navigation';
import { useShared } from '../../../store';
import { logAudit, useAudit, useStaffRole } from '../../../data/admin';
import { Backup, BACKUPS, LOGIN_HISTORY } from '../../../data/admin-owner';

export function AdminAuditLog(_: ScreenProps) {
  const [audit] = useAudit();
  const [tab, setTab] = useState('Changes');
  const actions = ['All', ...Array.from(new Set(audit.map(e => e.action)))];
  const users = ['All', ...Array.from(new Set(audit.map(e => e.user)))];
  const header = (
    <>
      <Segmented options={['Changes', 'Logins']} value={tab} onChange={setTab} />
      <InfoBanner icon={Lock} text="Audit entries are permanent. Nobody can edit or delete them, including the Owner." />
    </>
  );
  if (tab === 'Logins') {
    return (
      <ListScreen
        key="logins"
        title="Audit log & login history"
        subtitle={`${LOGIN_HISTORY.length} recent logins`}
        items={LOGIN_HISTORY}
        keyOf={l => l.id}
        searchText={l => `${l.user} ${l.ip} ${l.device}`}
        filters={[{ label: 'Result', options: ['All', 'Success', 'Failed'], get: l => (l.ok ? 'Success' : 'Failed') }]}
        header={header}
        renderItem={(l, last) => (
          <ListRow
            icon={LogIn}
            iconTone={l.ok ? 'primary' : 'danger'}
            title={l.user}
            subtitle={`${l.when} · IP ${l.ip}\n${l.device}`}
            right={<Badge label={l.ok ? 'Success' : 'Failed'} tone={l.ok ? 'success' : 'danger'} />}
            last={last}
          />
        )}
      />
    );
  }
  return (
    <ListScreen
      key="changes"
      title="Audit log & login history"
      subtitle={`${audit.length} entries · who changed what and when`}
      items={audit}
      keyOf={e => e.id}
      searchText={e => `${e.user} ${e.action} ${e.detail}`}
      filters={[
        { label: 'Action', options: actions, get: e => e.action },
        { label: 'User', options: users, get: e => e.user },
      ]}
      header={header}
      renderItem={(e, last) => (
        <ListRow
          icon={FileClock}
          title={`${e.action} · ${e.user}`}
          subtitle={`${e.when}\n${e.detail}`}
          last={last}
        />
      )}
    />
  );
}

export function AdminBackup(_: ScreenProps) {
  const [list, setList] = useShared<Backup[]>('admin.backups', BACKUPS);
  const [role] = useStaffRole();
  const [prompt, ask] = useReasonPrompt();
  const [running, setRunning] = useState(false);
  const isOwner = role === 'owner';
  const backupNow = () => {
    setRunning(true);
    setTimeout(() => {
      setList(l => [{ id: `bm${l.length + 1}`, when: 'Just now', size: '1.83 GB', kind: 'Manual', expires: 'in 30 days' }, ...l]);
      logAudit('Backup', 'Manual backup created');
      setRunning(false);
      toast('Backup complete');
    }, 1000);
  };
  const restore = (b: Backup) => {
    if (!isOwner) {
      toast('Only the Owner can restore a backup');
      return;
    }
    ask(`Restore backup of ${b.when}?`, reason => {
      logAudit('Restore', `Restored backup ${b.when} (${b.size}). Reason: ${reason}`);
      toast('Restore started. Users are signed out until it finishes (demo).');
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
            <Button label="Back up now" icon={DatabaseBackup} loading={running} onPress={backupNow} />
          </>
        }
        renderItem={(b, last) => (
          <ListRow
            icon={DatabaseBackup}
            title={b.when}
            subtitle={`${b.kind} · ${b.size} · expires ${b.expires}`}
            right={
              <View style={a.row}>
                <IconButton icon={Download} onPress={() => { logAudit('Backup', `Downloaded backup ${b.when}`); toast('Download started (demo)'); }} />
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
