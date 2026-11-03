// Approvals inbox: admissions, discounts, waivers, leaves, results, payroll.
// Server approvals come from /api/web/approvals; requests raised in panels
// without a server API stay in the app's own queue.
import React from 'react';
import { ShieldCheck } from 'lucide-react-native';
import { Badge, Button, Card, InfoBanner, ListRow, Screen, toast } from '../../../components/ui';
import { KV, ListScreen, useReasonPrompt } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { Approval, ApprovalType, logAudit, useApprovals, useStaffRole } from '../../../data/admin';
import { useShared } from '../../../store';
import { useApi } from '../../../api/hooks';
import { ApprovalRow, webA } from '../../../api/webA';
import { errorMessage } from '../../../api/client';
import { ReadOnlyBanner, useGuard } from '../owner/shared';

const TYPES: ApprovalType[] = [
  'Admission', 'Discount', 'Fine waiver', 'Leave', 'Result', 'Payroll',
  'Attendance correction', 'Refund', 'Stock adjustment', 'Voucher reversal', 'Leaving certificate',
];

const AFTER: Partial<Record<ApprovalType, string>> = {
  Admission: 'The registration is approved; admit the student from Admission.',
  Discount: 'The discount applies to vouchers generated from now on.',
  'Fine waiver': 'The fine is removed from the voucher.',
  Leave: 'The leave is approved; a teacher’s periods appear in Substitutions.',
  Result: 'Results are published to the parent and student apps.',
  Payroll: 'The payroll month is locked. Only the Owner can unlock it with a reason.',
  'Attendance correction': 'The attendance record is updated and the change is logged.',
  Refund: 'Accounts can now pay the refund.',
  'Stock adjustment': 'Stock is updated.',
  'Voucher reversal': 'The paid voucher is reversed; the receipt stays in history.',
  'Leaving certificate': 'The leaving certificate can be issued with dues.',
};

// Server approval types mapped to the app's types.
const SERVER_TYPE: Record<string, ApprovalType> = {
  Admission: 'Admission',
  'Staff leave': 'Leave',
  'Student leave': 'Leave',
  Discount: 'Discount',
  'Fee discount': 'Discount',
  'Fine waiver': 'Fine waiver',
  Waiver: 'Fine waiver',
  Refund: 'Refund',
  Result: 'Result',
  Payroll: 'Payroll',
};

export type InboxItem = Approval & { serverId?: string; serverType?: string };

type Decided = Record<string, { status: Approval['status']; note?: string; row: ApprovalRow }>;

function metaText(sub: string) {
  try {
    const meta = sub ? JSON.parse(sub) : null;
    if (meta && typeof meta === 'object') {
      return Object.entries(meta as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(' · ');
    }
  } catch {
    // plain text
  }
  return sub;
}

const fromServer = (r: ApprovalRow, decided?: { status: Approval['status']; note?: string }): InboxItem => ({
  id: `srv-${r.id}`,
  serverId: r.id,
  serverType: r.type,
  type: SERVER_TYPE[r.type] ?? 'Admission',
  title: `${r.type}: ${r.title}`,
  sub: metaText(r.sub) || (r.entityType ? `${r.entityType} #${r.entityId}` : ''),
  by: 'School server',
  when: r.at ? new Date(r.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
  status: decided?.status ?? 'Pending',
  note: decided?.note,
});

export function useInbox() {
  const q = useApi('adm:approvals', webA.approvals);
  const [local] = useApprovals();
  const [decided] = useShared<Decided>('adm.decided', {});
  const rows = q.data ?? [];
  const live = rows.map(r => fromServer(r, decided[r.id]));
  // Decided rows drop out of the server's pending list; keep showing them.
  const done = Object.entries(decided)
    .filter(([id]) => !rows.some(r => r.id === id))
    .map(([, d]) => fromServer(d.row, d));
  const list: InboxItem[] = [...live, ...done, ...local];
  return { list, q };
}

const tone = (s: Approval['status']) => (s === 'Approved' ? 'success' : s === 'Rejected' ? 'danger' : 'warn');

export function useDecide(refresh?: () => void) {
  const [, setList] = useApprovals();
  const [, setDecided] = useShared<Decided>('adm.decided', {});
  const [role] = useStaffRole();
  const { guard } = useGuard();
  const [prompt, ask] = useReasonPrompt();
  const canApprove = role === 'owner' || role === 'principal';

  // 'local' for app-only requests, 'ok' or 'failed' for server ones.
  const decide = async (a: InboxItem, status: 'approved' | 'rejected', note?: string) => {
    if (!a.serverId) {
      return 'local' as const;
    }
    try {
      await webA.decideApproval(a.serverId, status, note);
      const row: ApprovalRow = {
        id: a.serverId,
        type: a.serverType ?? a.type,
        title: a.title.replace(/^[^:]*:\s*/, ''),
        sub: a.sub,
        at: '',
        entityType: null,
        entityId: null,
      };
      setDecided(d => ({ ...d, [a.serverId as string]: { status: status === 'approved' ? 'Approved' : 'Rejected', note, row } }));
      refresh?.();
      return 'ok' as const;
    } catch (e) {
      toast(errorMessage(e));
      return 'failed' as const;
    }
  };

  const approve = (a: InboxItem) =>
    guard(async () => {
      if (!canApprove) {
        toast('Only the Principal or Owner can approve');
        return;
      }
      if (a.status !== 'Pending') {
        toast(`Already ${a.status.toLowerCase()}`);
        return;
      }
      const res = await decide(a, 'approved');
      if (res === 'failed') {
        return;
      }
      if (res === 'local') {
        setList(l => l.map(x => (x.id === a.id ? { ...x, status: 'Approved' } : x)));
      }
      logAudit('Approval', `Approved ${a.type}: ${a.title}`);
      toast(`Approved. ${AFTER[a.type] ?? ''}`);
    })();

  const reject = (a: InboxItem) =>
    guard(() => {
      if (!canApprove) {
        toast('Only the Principal or Owner can reject');
        return;
      }
      if (a.status !== 'Pending') {
        toast(`Already ${a.status.toLowerCase()}`);
        return;
      }
      ask(`Reject: ${a.title}`, async reason => {
        const res = await decide(a, 'rejected', reason);
        if (res === 'failed') {
          return;
        }
        if (res === 'local') {
          setList(l => l.map(x => (x.id === a.id ? { ...x, status: 'Rejected', note: reason } : x)));
        }
        logAudit('Approval', `Rejected ${a.type}: ${a.title}. Reason: ${reason}`);
        toast('Rejected. The requester is notified.');
      });
    })();
  return { approve, reject, prompt };
}

export function AdminApprovals(_: ScreenProps) {
  const nav = useNav();
  const { list, q } = useInbox();
  const pending = list.filter(a => a.status === 'Pending').length;
  return (
    <ListScreen
      title="Approvals inbox"
      subtitle={`${pending} pending`}
      items={list}
      keyOf={a => a.id}
      searchText={a => `${a.title} ${a.sub} ${a.by}`}
      filters={[
        { label: 'Type', options: ['All', ...TYPES], get: a => a.type },
        { label: 'Status', options: ['All', 'Pending', 'Approved', 'Rejected'], get: a => a.status },
        { label: 'Source', options: ['All', 'Server', 'App'], get: a => (a.serverId ? 'Server' : 'App') },
      ]}
      header={
        <>
          <ReadOnlyBanner />
          {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
          <InfoBanner text="Server requests (admissions, leaves, discounts, waivers) are decided on the school server. App requests come from panels that have no server API yet." />
        </>
      }
      empty={q.loading ? 'Loading…' : 'Nothing waiting for approval'}
      renderItem={(a, last) => (
        <ListRow
          icon={ShieldCheck}
          title={a.title}
          subtitle={`${a.type} · ${a.by} · ${a.when}`}
          right={<Badge label={a.status} tone={tone(a.status)} />}
          onPress={() => nav.push('AdminApprovalDetail', { id: a.id })}
          last={last}
        />
      )}
    />
  );
}

export function AdminApprovalDetail(_: ScreenProps) {
  const { list, q } = useInbox();
  const id = useParam('id', list[0]?.id ?? '');
  const a = list.find(x => x.id === id) ?? list[0];
  const { approve, reject, prompt } = useDecide(q.refresh);
  if (!a) {
    return <Screen title="Approval" />;
  }
  return (
    <Screen
      title={a.type}
      subtitle={a.when}
      footer={
        a.status === 'Pending' ? (
          <>
            <Button label="Approve" onPress={() => approve(a)} />
            <Button label="Reject" variant="danger" onPress={() => reject(a)} />
          </>
        ) : undefined
      }
    >
      <ReadOnlyBanner />
      <Card>
        <KV k="Request" v={a.title} />
        <KV k="Details" v={a.sub || '—'} />
        <KV k="Requested by" v={a.by} />
        <KV k="Status" v={<Badge label={a.status} tone={tone(a.status)} />} last={!a.note} />
        {a.note ? <KV k="Reason" v={a.note} last /> : null}
      </Card>
      {AFTER[a.type] ? <InfoBanner text={`On approval: ${AFTER[a.type]}`} /> : null}
      {prompt}
    </Screen>
  );
}
