// Approvals inbox: admissions, discounts, waivers, leaves, results, payroll.
import React from 'react';
import { ShieldCheck } from 'lucide-react-native';
import { Badge, Button, Card, InfoBanner, ListRow, Screen, toast } from '../../../components/ui';
import { KV, ListScreen, useReasonPrompt } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { Approval, ApprovalType, logAudit, useApprovals, useStaffRole } from '../../../data/admin';
import { ReadOnlyBanner, useGuard } from '../owner/shared';

const TYPES: ApprovalType[] = [
  'Admission', 'Discount', 'Fine waiver', 'Leave', 'Result', 'Payroll',
  'Attendance correction', 'Refund', 'Stock adjustment', 'Voucher reversal',
];

const AFTER: Partial<Record<ApprovalType, string>> = {
  Admission: 'Section allotted, GR No. generated and the admission fee voucher created.',
  Discount: 'The discount applies to vouchers generated from now on.',
  'Fine waiver': 'The fine is removed from the voucher.',
  Leave: 'The teacher’s periods now appear in Substitutions.',
  Result: 'Results are published to the parent and student apps.',
  Payroll: 'The payroll month is locked. Only the Owner can unlock it with a reason.',
  'Attendance correction': 'The attendance record is updated and the change is logged.',
  Refund: 'Accounts can now pay the refund.',
  'Stock adjustment': 'Stock is updated.',
  'Voucher reversal': 'The paid voucher is reversed; the receipt stays in history.',
};

const tone = (s: Approval['status']) => (s === 'Approved' ? 'success' : s === 'Rejected' ? 'danger' : 'warn');

export function useDecide() {
  const [, setList] = useApprovals();
  const [role] = useStaffRole();
  const { guard } = useGuard();
  const [prompt, ask] = useReasonPrompt();
  const canApprove = role === 'owner' || role === 'principal';
  const approve = (a: Approval) =>
    guard(() => {
      if (!canApprove) {
        toast('Only the Principal or Owner can approve');
        return;
      }
      if (a.status !== 'Pending') {
        toast(`Already ${a.status.toLowerCase()}`);
        return;
      }
      setList(l => l.map(x => (x.id === a.id ? { ...x, status: 'Approved' } : x)));
      logAudit('Approval', `Approved ${a.type}: ${a.title}`);
      toast(`Approved. ${AFTER[a.type] ?? ''}`);
    })();
  const reject = (a: Approval) =>
    guard(() => {
      if (!canApprove) {
        toast('Only the Principal or Owner can reject');
        return;
      }
      if (a.status !== 'Pending') {
        toast(`Already ${a.status.toLowerCase()}`);
        return;
      }
      ask(`Reject: ${a.title}`, reason => {
        setList(l => l.map(x => (x.id === a.id ? { ...x, status: 'Rejected', note: reason } : x)));
        logAudit('Approval', `Rejected ${a.type}: ${a.title}. Reason: ${reason}`);
        toast('Rejected. The requester is notified.');
      });
    })();
  return { approve, reject, prompt };
}

export function AdminApprovals(_: ScreenProps) {
  const nav = useNav();
  const [list] = useApprovals();
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
      ]}
      header={<ReadOnlyBanner />}
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
  const [list] = useApprovals();
  const id = useParam('id', list[0]?.id ?? '');
  const a = list.find(x => x.id === id) ?? list[0];
  const { approve, reject, prompt } = useDecide();
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
        <KV k="Details" v={a.sub} />
        <KV k="Requested by" v={a.by} />
        <KV k="Status" v={<Badge label={a.status} tone={tone(a.status)} />} last={!a.note} />
        {a.note ? <KV k="Reason" v={a.note} last /> : null}
      </Card>
      {AFTER[a.type] ? <InfoBanner text={`On approval: ${AFTER[a.type]}`} /> : null}
      {prompt}
    </Screen>
  );
}
