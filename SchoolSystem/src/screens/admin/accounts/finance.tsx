// Accounts panel, money side: cash closing, online payments (S-09), expenses
// and books (S-08), payroll (M-11).
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  Banknote,
  BookOpen,
  Building,
  CheckCheck,
  CreditCard,
  Download,
  FileSpreadsheet,
  Landmark,
  Lock,
  LockOpen,
  Plus,
  Receipt as ReceiptIcon,
  RefreshCw,
  Send,
  TriangleAlert,
  Wallet,
} from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Chips,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  Segmented,
  toast,
} from '../../../components/ui';
import {
  BarChart,
  ExportButton,
  FormSheet,
  KV,
  Kpi,
  KpiGrid,
  ListScreen,
  PickerField,
  Table,
  useReasonPrompt,
} from '../../../components/admin';
import { BottomSheet } from '../../../components/Tabs';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import {
  CAMPUSES,
  campusName,
  logAudit,
  requestApproval,
  useReadOnly,
  useStaffRole,
} from '../../../data/admin';
import {
  applyPayment,
  CashTxn,
  closingDifference,
  countCash,
  DENOMINATIONS,
  Expense,
  EXPENSE_HEADS,
  GatewayTxn,
  monthLabel,
  profitAndLoss,
  reconcile,
  studentById,
} from '../../../data/admin-accounts';
import { calcPayroll, HrStaff, monthSummary } from '../../../data/admin-hr';
import { useOpen } from '../core';
import { useAttLocked, useHrStaff } from '../hr/state';
import {
  PayrollRun,
  useBanks,
  useCashTxns,
  useClosings,
  useExpenses,
  usePayrollRuns,
  usePayrollStatus,
  useTxns,
  useVouchers,
} from './state';
import { byLine, Money, Note, Right, toNumber, ws } from './widgets';

const TODAY = '22 Oct';

// Cash received at the counter before this session (seed) plus today's cash.
function useTodayCash() {
  const [vouchers] = useVouchers();
  return useMemo(
    () =>
      182500 +
      vouchers
        .flatMap(v => v.receipts)
        .filter(r => r.mode === 'Cash' && r.date === TODAY)
        .reduce((s, r) => s + r.amount, 0),
    [vouchers],
  );
}

// ---------- Cash closing ----------

export function AdminCashClosing(_: ScreenProps) {
  const ro = useReadOnly();
  const [role] = useStaffRole();
  const expected = useTodayCash();
  const [closings, setClosings] = useClosings();
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [reasonEl, askReason] = useReasonPrompt();
  const numeric = Object.fromEntries(DENOMINATIONS.map(d => [d, Math.max(0, toNumber(counts[d] ?? '0') || 0)]));
  const counted = countCash(numeric);
  const diff = closingDifference(expected, counted);
  const closedToday = closings.some(c => c.date === TODAY);

  const save = (note?: string) => {
    setClosings(prev => [
      { id: `cl${prev.length + 1}`, date: TODAY, cashier: byLine(role), expected, counted, diff: diff.diff, handedOver: true, note },
      ...prev,
    ]);
    logAudit('Cash closing', `${TODAY}: expected Rs. ${expected.toLocaleString('en-US')}, counted Rs. ${counted.toLocaleString('en-US')}, ${diff.label}${note ? ` (${note})` : ''}. Handed over to Accounts.`);
    setCounts({});
    toast(diff.flagged ? `Closed with ${diff.label.toLowerCase()} Rs. ${Math.abs(diff.diff).toLocaleString('en-US')} flagged` : 'Day closed and cash handed over');
  };

  const close = () => {
    if (ro) {
      toast('Closed session: read-only');
      return;
    }
    if (closedToday) {
      toast('Today is already closed');
      return;
    }
    if (!counted) {
      toast('Count the cash first');
      return;
    }
    if (diff.flagged) {
      askReason(`Cash is ${diff.label.toLowerCase()} by Rs. ${Math.abs(diff.diff).toLocaleString('en-US')}`, r => save(r));
    } else {
      save();
    }
  };

  return (
    <Screen
      title="Cash closing"
      subtitle={`Cashier daily closing · ${TODAY}`}
      right={<ExportButton title="Cash closing" />}
      footer={<Button label="Close day and hand over" icon={Lock} onPress={close} disabled={closedToday || ro} />}
    >
      {closedToday ? <InfoBanner tone="success" text="Today is closed and the cash was handed over to Accounts." /> : null}
      <KpiGrid>
        <Kpi label="Expected cash" value={`Rs. ${expected.toLocaleString('en-US')}`} sub="cash receipts today" />
        <Kpi label="Counted" value={`Rs. ${counted.toLocaleString('en-US')}`} sub={diff.label} tone={diff.flagged && counted ? 'danger' : 'success'} />
      </KpiGrid>
      <Card title="Count by denomination">
        {DENOMINATIONS.map(d => (
          <View key={d} style={ws.buttons}>
            <View style={ws.flex}>
              <Field
                label={`Rs. ${d.toLocaleString('en-US')} notes`}
                value={counts[d] ?? ''}
                onChangeText={v => setCounts(c => ({ ...c, [d]: v }))}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
            <View style={ws.center}>
              <Money value={d * (numeric[d] ?? 0)} tone="muted" />
            </View>
          </View>
        ))}
      </Card>
      {counted && diff.flagged ? (
        <InfoBanner tone="danger" icon={TriangleAlert} text={`Difference Rs. ${diff.diff.toLocaleString('en-US')} (${diff.label}). It is flagged and needs a reason.`} />
      ) : null}
      <Card title="Earlier closings">
        {closings.map((c, i) => (
          <ListRow
            key={c.id}
            icon={Wallet}
            title={`${c.date} · ${c.cashier}`}
            subtitle={`Expected Rs. ${c.expected.toLocaleString('en-US')} · counted Rs. ${c.counted.toLocaleString('en-US')}${c.note ? ` · ${c.note}` : ''}`}
            right={<Badge label={c.diff === 0 ? 'Balanced' : `${c.diff > 0 ? '+' : ''}${c.diff}`} tone={c.diff === 0 ? 'success' : 'danger'} />}
            last={i === closings.length - 1}
          />
        ))}
      </Card>
      {reasonEl}
    </Screen>
  );
}

// ---------- Online payments (S-09) ----------

export function AdminOnlinePayments(_: ScreenProps) {
  const [role] = useStaffRole();
  const [txns, setTxns] = useTxns();
  const [vouchers, setVouchers] = useVouchers();
  const [sel, setSel] = useState<GatewayTxn | null>(null);
  const count = (s: GatewayTxn['status']) => txns.filter(t => t.status === s).length;

  const runReconcile = (list: GatewayTxn[] = txns) => {
    const out = reconcile(list, vouchers);
    const newly = out.filter((t, i) => t.status === 'Matched' && list[i].status !== 'Matched');
    if (newly.length) {
      setVouchers(prev =>
        prev.map(v => {
          const t = newly.find(x => x.voucherId === v.id);
          if (!t) {
            return v;
          }
          const r = applyPayment(v.total, v.paid, t.amount);
          if (!r.ok) {
            return v;
          }
          return {
            ...v,
            paid: r.paid,
            status: r.status,
            receipts: [...v.receipts, { id: `R-${t.id}`, amount: t.amount, mode: 'Online', date: TODAY, by: `${t.gateway} gateway` }],
          };
        }),
      );
    }
    setTxns(out);
    logAudit('Reconciliation', `${newly.length} matched and posted; ${out.filter(t => t.status === 'Pending').length} pending; ${out.filter(t => t.status === 'Duplicate').length} duplicate`);
    toast(`${newly.length} payment(s) matched and vouchers marked paid`);
  };

  return (
    <>
      <ListScreen
        title="Online payments"
        subtitle="JazzCash, Easypaisa and 1Link"
        items={txns}
        keyOf={t => t.id}
        searchText={t => `${t.id} ${t.voucherId} ${studentById(vouchers.find(v => v.id === t.voucherId)?.studentId ?? '')?.name ?? ''}`}
        filters={[
          { label: 'Status', options: ['All', 'Matched', 'Pending', 'Failed', 'Duplicate', 'Amount mismatch'], get: t => t.status },
          { label: 'Gateway', options: ['All', 'JazzCash', 'Easypaisa', '1Link'], get: t => t.gateway },
        ]}
        header={
          <>
            <KpiGrid>
              <Kpi label="Matched" value={String(count('Matched'))} tone="success" />
              <Kpi label="Pending" value={String(count('Pending'))} tone="warn" />
              <Kpi label="Failed" value={String(count('Failed'))} tone="danger" />
              <Kpi label="Duplicate" value={String(count('Duplicate'))} tone="danger" />
            </KpiGrid>
            <InfoBanner text="A voucher is marked paid only when the gateway confirms the payment, never on the redirect alone. A voucher cannot be paid twice." />
            <Button label="Run auto-reconciliation" icon={RefreshCw} onPress={() => runReconcile()} />
          </>
        }
        renderItem={(t, last) => {
          const v = vouchers.find(x => x.id === t.voucherId);
          return (
            <ListRow
              icon={CreditCard}
              title={`${t.gateway} ${t.id} · ${studentById(v?.studentId ?? '')?.name ?? t.voucherId}`}
              subtitle={`${t.voucherId} · ${t.when} · gateway: ${t.gatewayStatus}`}
              right={
                <Right>
                  <Money value={t.amount} />
                  <Badge label={t.status} tone={t.status === 'Matched' ? 'success' : t.status === 'Pending' ? 'warn' : 'danger'} />
                </Right>
              }
              onPress={() => setSel(t)}
              last={last}
            />
          );
        }}
      />
      <BottomSheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View>
            <Text style={ws.title}>{sel.gateway} {sel.id}</Text>
            <KV k="Voucher" v={sel.voucherId} />
            <KV k="Amount" v={<Money value={sel.amount} />} />
            <KV k="Gateway status" v={sel.gatewayStatus} />
            <KV k="Reconciliation" v={sel.status} last />
            <View style={ws.gap} />
            {sel.gatewayStatus === 'Redirect only' ? (
              <Button
                label="Gateway confirmed (demo callback)"
                icon={CheckCheck}
                onPress={() => {
                  const list = txns.map(t => (t.id === sel.id ? { ...t, gatewayStatus: 'Confirmed' as const } : t));
                  setSel(null);
                  runReconcile(list);
                }}
              />
            ) : null}
            {sel.status === 'Duplicate' ? (
              <Button
                label="Refund duplicate payment"
                variant="outline"
                onPress={() => {
                  requestApproval({ type: 'Refund', title: `Refund duplicate ${sel.gateway} ${sel.id}`, sub: `${sel.voucherId} already paid · Rs. ${sel.amount.toLocaleString('en-US')}`, by: byLine(role) });
                  setSel(null);
                  toast('Refund sent for approval');
                }}
              />
            ) : null}
            {sel.status === 'Failed' ? (
              <Button
                label="Notify parent"
                icon={Send}
                variant="outline"
                onPress={() => {
                  logAudit('Payment failed notice', `${sel.id} · ${sel.voucherId}`);
                  setSel(null);
                  toast('Parent told the payment failed (demo)');
                }}
              />
            ) : null}
            {sel.status === 'Matched' ? <Note>Posted to the voucher with an online receipt.</Note> : null}
          </View>
        ) : null}
      </BottomSheet>
    </>
  );
}

// ---------- Expenses & accounts (S-08) ----------

export function AdminExpenses(_: ScreenProps) {
  const ro = useReadOnly();
  const nav = useNav();
  const [role] = useStaffRole();
  const [expenses, setExpenses] = useExpenses();
  const [cash] = useCashTxns();
  const [banks] = useBanks();
  const [formOpen, setFormOpen] = useState(false);
  const [sel, setSel] = useState<Expense | null>(null);
  const [head, setHead] = useState(EXPENSE_HEADS[1]);
  const [amount, setAmount] = useState('');
  const [campus, setCampus] = useState(CAMPUSES[0].name);
  const [paidFrom, setPaidFrom] = useState<Expense['paidFrom']>('Cash');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState('');
  const approved = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + e.amount, 0);
  const petty = pettyBalance(cash);
  const canApprove = role === 'owner' || role === 'principal';

  const add = () => {
    const n = toNumber(amount);
    if (!(n > 0) || !note.trim()) {
      toast('Enter the amount and a note');
      return;
    }
    if (paidFrom === 'Petty cash' && n > petty) {
      toast(`Petty cash has only Rs. ${petty.toLocaleString('en-US')}`);
      return;
    }
    const e: Expense = {
      id: `EX-${1047 + expenses.length}`,
      head,
      amount: n,
      campus: CAMPUSES.find(c => c.name === campus)?.id ?? 'main',
      date: TODAY,
      note: note.trim(),
      receipt: receipt || undefined,
      status: 'Pending',
      paidFrom,
    };
    setExpenses(prev => [e, ...prev]);
    logAudit('Expense', `${e.id} ${head} Rs. ${n.toLocaleString('en-US')} · ${campus} · waiting for approval`);
    setFormOpen(false);
    setAmount('');
    setNote('');
    setReceipt('');
    toast('Expense saved; waiting for approval');
  };

  const decide = (status: 'Approved' | 'Rejected') => {
    if (!sel) {
      return;
    }
    if (!canApprove) {
      toast('Only the Principal or Owner can approve expenses');
      return;
    }
    setExpenses(prev => prev.map(x => (x.id === sel.id ? { ...x, status } : x)));
    logAudit('Expense approval', `${sel.id} ${status.toLowerCase()}`);
    setSel(null);
    toast(`Expense ${status.toLowerCase()}`);
  };

  return (
    <>
      <ListScreen
        title="Expenses & accounts"
        subtitle="Expenses, cash and bank, books, profit and loss"
        items={expenses}
        keyOf={e => e.id}
        searchText={e => `${e.id} ${e.head} ${e.note}`}
        filters={[
          { label: 'Status', options: ['All', 'Pending', 'Approved', 'Rejected'], get: e => e.status },
          { label: 'Head', options: ['All', ...EXPENSE_HEADS], get: e => e.head },
          { label: 'Campus', options: ['All', ...CAMPUSES.map(c => c.name)], get: e => campusName(e.campus) },
        ]}
        onAdd={ro ? undefined : () => setFormOpen(true)}
        addLabel="Add expense"
        header={
          <>
            <KpiGrid>
              <Kpi label="Approved expenses" value={`Rs. ${approved.toLocaleString('en-US')}`} sub="October" />
              <Kpi label="Waiting approval" value={String(expenses.filter(e => e.status === 'Pending').length)} tone="warn" />
              <Kpi label="Petty cash" value={`Rs. ${petty.toLocaleString('en-US')}`} />
              <Kpi label="Bank balance" value={`Rs. ${banks.reduce((s, b) => s + b.balance, 0).toLocaleString('en-US')}`} />
            </KpiGrid>
            <View style={ws.buttons}>
              <Button label="Cash & bank" icon={Landmark} variant="outline" style={ws.flex} onPress={() => nav.push('AdminCashBank')} />
              <Button label="Income" icon={Banknote} variant="outline" style={ws.flex} onPress={() => nav.push('AdminIncome')} />
            </View>
            <View style={ws.buttons}>
              <Button label="Books" icon={BookOpen} variant="outline" style={ws.flex} onPress={() => nav.push('AdminBooks')} />
              <Button label="Profit & loss" icon={FileSpreadsheet} variant="outline" style={ws.flex} onPress={() => nav.push('AdminProfitLoss')} />
            </View>
          </>
        }
        renderItem={(e, last) => (
          <ListRow
            icon={ReceiptIcon}
            title={`${e.head} · ${e.note}`}
            subtitle={`${e.id} · ${e.date} · ${campusName(e.campus)} · ${e.paidFrom}${e.receipt ? ` · ${e.receipt}` : ' · no receipt'}`}
            right={<Right><Money value={e.amount} /><Badge label={e.status} tone={e.status === 'Approved' ? 'success' : e.status === 'Pending' ? 'warn' : 'danger'} /></Right>}
            onPress={() => setSel(e)}
            last={last}
          />
        )}
      />
      <FormSheet visible={formOpen} onClose={() => setFormOpen(false)} title="Add expense" onSubmit={add}>
        <PickerField label="Expense head" value={head} options={EXPENSE_HEADS} onChange={setHead} />
        <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
        <PickerField label="Campus" value={campus} options={CAMPUSES.map(c => c.name)} onChange={setCampus} />
        <Chips options={['Cash', 'Bank', 'Petty cash']} value={paidFrom} onChange={v => setPaidFrom(v as Expense['paidFrom'])} />
        <Field label="Note" value={note} onChangeText={setNote} />
        <Button label={receipt ? `Receipt: ${receipt}` : 'Attach receipt'} variant="outline" onPress={() => setReceipt(receipt ? '' : 'receipt-photo.jpg')} />
      </FormSheet>
      <BottomSheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View>
            <Text style={ws.title}>{sel.id} · {sel.head}</Text>
            <KV k="Amount" v={<Money value={sel.amount} />} />
            <KV k="Campus" v={campusName(sel.campus)} />
            <KV k="Paid from" v={sel.paidFrom} />
            <KV k="Receipt" v={sel.receipt ?? 'Not attached'} />
            <KV k="Status" v={sel.status} last />
            <View style={ws.gap} />
            {sel.status === 'Pending' ? (
              <View style={ws.buttons}>
                <Button label="Reject" variant="danger" style={ws.flex} onPress={() => decide('Rejected')} />
                <Button label="Approve" style={ws.flex} onPress={() => decide('Approved')} />
              </View>
            ) : (
              <Note>Approved and rejected expenses cannot be changed.</Note>
            )}
          </View>
        ) : null}
      </BottomSheet>
    </>
  );
}

function pettyBalance(cash: Array<{ kind: string; amount: number }>) {
  return (
    cash.filter(c => c.kind === 'Petty cash top-up').reduce((s, c) => s + c.amount, 0) -
    cash.filter(c => c.kind === 'Petty cash spend').reduce((s, c) => s + c.amount, 0)
  );
}

export function AdminCashBank(_: ScreenProps) {
  const ro = useReadOnly();
  const [cash, setCash] = useCashTxns();
  const [banks, setBanks] = useBanks();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('Deposit');
  const [amount, setAmount] = useState('');
  const accounts = ['Cash counter', 'Petty cash', ...banks.map(b => `${b.bank} ${b.number}`)];
  const [from, setFrom] = useState(accounts[0]);
  const [to, setTo] = useState(accounts[2]);
  const [note, setNote] = useState('');
  const petty = pettyBalance(cash);

  const save = () => {
    const n = toNumber(amount);
    if (!(n > 0)) {
      toast('Enter the amount');
      return;
    }
    if (from === to) {
      toast('From and to must be different');
      return;
    }
    if (kind === 'Petty cash spend' && n > petty) {
      toast(`Petty cash has only Rs. ${petty.toLocaleString('en-US')}`);
      return;
    }
    const fromBank = banks.find(b => `${b.bank} ${b.number}` === from);
    if (fromBank && fromBank.balance < n) {
      toast(`${from} has only Rs. ${fromBank.balance.toLocaleString('en-US')}`);
      return;
    }
    const realFrom = kind === 'Petty cash spend' ? 'Petty cash' : from;
    const realTo = kind === 'Petty cash top-up' ? 'Petty cash' : to;
    setBanks(prev =>
      prev.map(b => {
        const label = `${b.bank} ${b.number}`;
        return label === realFrom ? { ...b, balance: b.balance - n } : label === realTo ? { ...b, balance: b.balance + n } : b;
      }),
    );
    setCash(prev => [
      { id: `CT-${506 + prev.length}`, kind: kind as CashTxn['kind'], amount: n, from: realFrom, to: realTo, date: TODAY, note: note.trim() || kind },
      ...prev,
    ]);
    logAudit('Cash and bank', `${kind} Rs. ${n.toLocaleString('en-US')} ${realFrom} → ${realTo}`);
    setOpen(false);
    setAmount('');
    setNote('');
    toast(`${kind} recorded`);
  };

  return (
    <>
      <ListScreen
        title="Cash & bank"
        subtitle="Petty cash, bank accounts, deposits and transfers"
        items={cash}
        keyOf={c => c.id}
        searchText={c => `${c.id} ${c.kind} ${c.from} ${c.to} ${c.note}`}
        filters={[{ label: 'Type', options: ['All', 'Deposit', 'Transfer', 'Petty cash top-up', 'Petty cash spend', 'Other income'], get: c => c.kind }]}
        onAdd={ro ? undefined : () => setOpen(true)}
        addLabel="New entry"
        header={
          <Card title="Accounts">
            <ListRow icon={Wallet} title="Petty cash" subtitle="Float for small expenses" right={<Money value={petty} />} />
            {banks.map((b, i) => (
              <ListRow key={b.id} icon={Building} title={`${b.bank} ${b.number}`} subtitle={b.title} right={<Money value={b.balance} />} last={i === banks.length - 1} />
            ))}
          </Card>
        }
        renderItem={(c, last) => (
          <ListRow
            icon={Landmark}
            title={`${c.kind} · ${c.note}`}
            subtitle={`${c.id} · ${c.date} · ${c.from} → ${c.to}`}
            right={<Money value={c.amount} tone={c.kind === 'Petty cash spend' ? 'danger' : undefined} />}
            last={last}
          />
        )}
      />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Cash or bank entry" onSubmit={save}>
        <Chips options={['Deposit', 'Transfer', 'Petty cash top-up', 'Petty cash spend']} value={kind} onChange={setKind} />
        <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
        {kind !== 'Petty cash spend' ? <PickerField label="From" value={from} options={accounts} onChange={setFrom} /> : null}
        {kind !== 'Petty cash top-up' ? <PickerField label="To" value={to} options={accounts} onChange={setTo} /> : null}
        <Field label="Note" value={note} onChangeText={setNote} />
      </FormSheet>
    </>
  );
}

export function AdminIncome(_: ScreenProps) {
  const ro = useReadOnly();
  const [vouchers] = useVouchers();
  const [cash, setCash] = useCashTxns();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  type Row = { id: string; title: string; sub: string; amount: number; kind: 'Fee collection' | 'Other income' };
  // Fee collection is posted automatically from the Fee module receipts.
  const feeRows: Row[] = vouchers.flatMap(v =>
    v.receipts.map(r => ({ id: r.id, title: `Fee collection · ${studentById(v.studentId)?.name ?? ''}`, sub: `${v.id} · ${r.date} · ${r.mode}`, amount: r.amount, kind: 'Fee collection' as const })),
  );
  const otherRows: Row[] = cash
    .filter(c => c.kind === 'Other income')
    .map(c => ({ id: c.id, title: `${c.from}`, sub: `${c.date} · ${c.note}`, amount: c.amount, kind: 'Other income' as const }));
  const feeModuleTotal = vouchers.reduce((s, v) => s + v.paid, 0);
  const accountsFee = feeRows.reduce((s, r) => s + r.amount, 0);
  const matched = feeModuleTotal === accountsFee;

  const add = () => {
    const n = toNumber(amount);
    if (!source.trim() || !(n > 0)) {
      toast('Enter the source and amount');
      return;
    }
    setCash(prev => [{ id: `CT-${506 + prev.length}`, kind: 'Other income', amount: n, from: source.trim(), to: 'Bank', date: TODAY, note: 'Manual entry' }, ...prev]);
    logAudit('Other income', `${source.trim()} Rs. ${n.toLocaleString('en-US')}`);
    setOpen(false);
    setSource('');
    setAmount('');
  };

  return (
    <>
      <ListScreen
        title="Income"
        subtitle="Fee collection posted automatically; other income manual"
        items={[...otherRows, ...feeRows]}
        keyOf={r => r.id}
        searchText={r => `${r.title} ${r.sub}`}
        filters={[{ label: 'Type', options: ['All', 'Fee collection', 'Other income'], get: r => r.kind }]}
        onAdd={ro ? undefined : () => setOpen(true)}
        addLabel="Add other income"
        header={
          <Card title="Fee income check">
            <KV k="Fee module total (receipts)" v={<Money value={feeModuleTotal} />} />
            <KV k="Fee income in Accounts" v={<Money value={accountsFee} />} />
            <KV k="Status" v={<Badge label={matched ? 'Matched' : 'Mismatch'} tone={matched ? 'success' : 'danger'} />} last />
          </Card>
        }
        renderItem={(r, last) => (
          <ListRow icon={Banknote} title={r.title} subtitle={r.sub} right={<Right><Money value={r.amount} /><Badge label={r.kind} tone={r.kind === 'Fee collection' ? 'info' : 'neutral'} /></Right>} last={last} />
        )}
      />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Other income" onSubmit={add}>
        <Field label="Source" value={source} onChangeText={setSource} placeholder="e.g. Canteen lease, hall booking" />
        <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
      </FormSheet>
    </>
  );
}

export function AdminBooks(_: ScreenProps) {
  const [book, setBook] = useState('Day book');
  const [vouchers] = useVouchers();
  const [expenses] = useExpenses();
  const [cash] = useCashTxns();
  const receipts = vouchers.flatMap(v => v.receipts.map(r => ({ ...r, voucher: v.id })));
  const rows: Array<Array<string | number>> = [];
  if (book === 'Day book') {
    receipts.slice(0, 15).forEach(r => rows.push([r.date, `Fee ${r.voucher}`, r.mode, r.amount, '']));
    expenses.filter(e => e.status === 'Approved').forEach(e => rows.push([e.date, `${e.head}: ${e.note}`, e.paidFrom, '', e.amount]));
    cash.forEach(c => rows.push([c.date, `${c.kind}: ${c.note}`, `${c.from} → ${c.to}`, c.kind === 'Other income' ? c.amount : '', '']));
  } else if (book === 'Cash book') {
    receipts.filter(r => r.mode === 'Cash').slice(0, 15).forEach(r => rows.push([r.date, `Fee ${r.voucher}`, 'Cash', r.amount, '']));
    expenses.filter(e => e.status === 'Approved' && e.paidFrom !== 'Bank').forEach(e => rows.push([e.date, e.head, e.paidFrom, '', e.amount]));
    cash.filter(c => c.kind === 'Deposit').forEach(c => rows.push([c.date, 'Deposited to bank', c.to, '', c.amount]));
  } else {
    receipts.filter(r => r.mode !== 'Cash').slice(0, 15).forEach(r => rows.push([r.date, `Fee ${r.voucher}`, r.mode, r.amount, '']));
    cash.filter(c => c.kind === 'Deposit' || c.kind === 'Other income').forEach(c => rows.push([c.date, c.kind, c.to, c.amount, '']));
    cash.filter(c => c.kind === 'Transfer').forEach(c => rows.push([c.date, `Transfer to ${c.to}`, c.from, '', c.amount]));
    expenses.filter(e => e.status === 'Approved' && e.paidFrom === 'Bank').forEach(e => rows.push([e.date, e.head, 'Bank', '', e.amount]));
  }
  const dr = rows.reduce((s, r) => s + (typeof r[3] === 'number' ? r[3] : 0), 0);
  const cr = rows.reduce((s, r) => s + (typeof r[4] === 'number' ? r[4] : 0), 0);
  return (
    <Screen title="Books" subtitle="Day book, cash book and bank book" right={<ExportButton title={book} />}>
      <Segmented options={['Day book', 'Cash book', 'Bank book']} value={book} onChange={setBook} />
      <Card>
        <Table columns={['Date', 'Particulars', 'Account', 'Debit (in)', 'Credit (out)']} rows={rows} />
      </Card>
      <KpiGrid>
        <Kpi label="Total in" value={`Rs. ${dr.toLocaleString('en-US')}`} tone="success" />
        <Kpi label="Total out" value={`Rs. ${cr.toLocaleString('en-US')}`} tone="danger" />
      </KpiGrid>
    </Screen>
  );
}

const PL_MONTHS = [202608, 202609, 202610];

export function AdminProfitLoss(_: ScreenProps) {
  const [campus, setCampus] = useState('All campuses');
  const [month, setMonth] = useState(monthLabel(202610));
  const [expenses] = useExpenses();
  const [cash] = useCashTxns();
  const list = campus === 'All campuses' ? CAMPUSES : CAMPUSES.filter(c => c.name === campus);
  const factor = (m: number) => (m === 202608 ? 0.94 : m === 202609 ? 0.97 : 1);
  const plFor = (m: number) => {
    const f = factor(m);
    const fee = Math.round(list.reduce((s, c) => s + c.collection, 0) * f);
    const income = [
      { head: 'Tuition and fee collection', amount: Math.round(fee * 0.86) },
      { head: 'Transport fee', amount: Math.round(fee * 0.14) },
      { head: 'Other income', amount: m === 202610 ? cash.filter(c => c.kind === 'Other income').reduce((s, c) => s + c.amount, 0) : 85000 },
    ];
    const ids = list.map(c => c.id);
    const exp = [
      { head: 'Salaries', amount: Math.round(list.reduce((s, c) => s + c.expenses, 0) * 0.72 * f) },
      ...EXPENSE_HEADS.filter(h => h !== 'Salaries').map(h => ({
        head: h,
        amount: m === 202610 ? expenses.filter(e => e.head === h && e.status === 'Approved' && ids.includes(e.campus)).reduce((s, e) => s + e.amount, 0) : Math.round(list.length * 40000 * f),
      })),
    ].filter(x => x.amount > 0);
    return { income, exp, ...profitAndLoss(income, exp) };
  };
  const key = PL_MONTHS.find(m => monthLabel(m) === month) ?? 202610;
  const pl = plFor(key);
  return (
    <Screen title="Profit & loss" subtitle={`${campus} · ${month}`} right={<ExportButton title="Profit and loss" />}>
      <PickerField label="Campus" value={campus} options={['All campuses', ...CAMPUSES.map(c => c.name)]} onChange={setCampus} />
      <PickerField label="Month" value={month} options={PL_MONTHS.map(monthLabel)} onChange={setMonth} />
      <Card title="Income">
        {pl.income.map((x, i) => <KV key={x.head} k={x.head} v={<Money value={x.amount} />} last={i === pl.income.length - 1} />)}
      </Card>
      <Card title="Expenses">
        {pl.exp.map((x, i) => <KV key={x.head} k={x.head} v={<Money value={x.amount} />} last={i === pl.exp.length - 1} />)}
      </Card>
      <KpiGrid>
        <Kpi label="Total income" value={`Rs. ${pl.totalIncome.toLocaleString('en-US')}`} />
        <Kpi label="Total expenses" value={`Rs. ${pl.totalExpense.toLocaleString('en-US')}`} />
        <Kpi label="Net profit" value={`Rs. ${pl.net.toLocaleString('en-US')}`} tone={pl.net >= 0 ? 'success' : 'danger'} />
      </KpiGrid>
      <Card title="Net by month (Rs. M)">
        <BarChart data={PL_MONTHS.map(m => ({ label: monthLabel(m).slice(0, 3), value: Math.round(plFor(m).net / 100000) / 10, highlight: m === key }))} format={v => v.toFixed(1)} />
      </Card>
    </Screen>
  );
}

// ---------- Payroll (M-11) ----------

const PAY_MONTHS = [202609, 202610];

export type PayRow = { staff: HrStaff; index: number; result: ReturnType<typeof calcPayroll> };

export function usePayrollRows(month: number, run: PayrollRun | undefined): PayRow[] {
  const [staff] = useHrStaff();
  return staff
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => s.status !== 'Left')
    .map(({ s, index }) => {
      const sum = monthSummary(index);
      const att = run?.includesAttendance ?? false;
      const result = calcPayroll({
        basic: s.salary,
        allowances: s.allowances,
        deductions: s.deductions,
        lates: att ? sum.lates : 0,
        unpaidLeaveDays: att ? s.leave.Unpaid.used : 0,
        absentDays: att ? sum.absents : 0,
        loanInstallment: s.loan && s.loan.paid < s.loan.installments ? s.loan.each : 0,
        arrears: month === 202610 && index % 9 === 2 ? 1500 : 0,
        bonus: month === 202610 && index % 10 === 0 ? 2000 : 0,
        adjustments: (run?.adjustments[s.id] ?? []).map(a => ({ label: a.label, amount: a.amount })),
      });
      return { staff: s, index, result };
    });
}

export function AdminPayroll(_: ScreenProps) {
  const nav = useNav();
  const open = useOpen();
  const ro = useReadOnly();
  const [role] = useStaffRole();
  const [month, setMonth] = useState(monthLabel(202610));
  const key = PAY_MONTHS.find(m => monthLabel(m) === month) ?? 202610;
  const [runs, setRuns] = usePayrollRuns();
  const [locked] = useAttLocked();
  const run = runs[key];
  const status = usePayrollStatus(run);
  const rows = usePayrollRows(key, run);
  const [reasonEl, askReason] = useReasonPrompt();
  const net = rows.reduce((s, r) => s + r.result.net, 0);
  const editable = status === 'Draft' || status === 'Unlocked' || status === 'Rejected';

  const runPayroll = () => {
    if (ro) {
      toast('Closed session: read-only');
      return;
    }
    setRuns(prev => ({
      ...prev,
      [key]: { month: key, status: 'Draft', adjustments: prev[key]?.adjustments ?? {}, cashPaid: [], includesAttendance: !!locked[key] },
    }));
    logAudit('Payroll run', `${month}: ${rows.length} employees${locked[key] ? '' : ' (attendance not locked; late/absent deductions excluded)'}`);
    toast(`Payroll for ${month} calculated`);
  };

  const submit = () => {
    const approvalId = requestApproval({
      type: 'Payroll',
      title: `Payroll ${month}`,
      sub: `${rows.length} employees · Rs. ${net.toLocaleString('en-US')} net`,
      by: byLine(role),
    });
    setRuns(prev => ({ ...prev, [key]: { ...prev[key], status: 'Pending approval', approvalId } }));
    toast('Payroll sent for approval');
  };

  const unlock = () => {
    if (role !== 'owner') {
      toast('Only the Owner can unlock an approved payroll month');
      return;
    }
    askReason(`Unlock payroll ${month}`, reason => {
      setRuns(prev => ({ ...prev, [key]: { ...prev[key], status: 'Unlocked', approvalId: undefined } }));
      logAudit('Payroll unlocked', `${month} by Owner. Reason: ${reason}`);
      toast('Payroll unlocked for changes');
    });
  };

  return (
    <>
      <ListScreen
        title="Payroll processing"
        subtitle={`${month} · ${status}`}
        items={run ? rows : []}
        keyOf={r => r.staff.id}
        searchText={r => `${r.staff.name} ${r.staff.id} ${r.staff.designation}`}
        filters={[
          { label: 'Campus', options: ['All', ...CAMPUSES.map(c => c.name)], get: r => campusName(r.staff.campus) },
          { label: 'Pay', options: ['All', 'Bank', 'Cash'], get: r => (r.staff.bankAccount ? 'Bank' : 'Cash') },
        ]}
        empty="Run payroll for this month to see the register."
        header={
          <>
            <PickerField label="Month" value={month} options={PAY_MONTHS.map(monthLabel)} onChange={setMonth} />
            {!locked[key] ? (
              <InfoBanner tone="warn" icon={TriangleAlert} text={`HR has not locked ${month} attendance. Late and absent deductions go to payroll only after HR locks the month.`} />
            ) : (
              <InfoBanner text={`${month} attendance is locked by HR; late, absent and unpaid-leave deductions are included.`} />
            )}
            {status === 'Approved' ? (
              <InfoBanner tone="success" icon={Lock} text="Approved and locked. It cannot be changed without an Owner unlock and a reason." />
            ) : null}
            {status === 'Pending approval' ? <InfoBanner text="Waiting in the approvals inbox." /> : null}
            {run ? (
              <KpiGrid>
                <Kpi label="Employees" value={String(rows.length)} />
                <Kpi label="Net payable" value={`Rs. ${net.toLocaleString('en-US')}`} />
                <Kpi label="Deductions" value={`Rs. ${rows.reduce((s, r) => s + r.result.lateDeduction + r.result.leaveDeduction + r.result.absentDeduction + r.result.loan + r.result.fixedDeductions, 0).toLocaleString('en-US')}`} />
                <Kpi label="Cash payments" value={String(rows.filter(r => !r.staff.bankAccount).length)} />
              </KpiGrid>
            ) : null}
            {!run || editable ? <Button label={run ? 'Re-run payroll' : `Run payroll for ${month}`} icon={RefreshCw} variant={run ? 'outline' : 'primary'} onPress={runPayroll} /> : null}
            {run && editable ? <Button label="Submit for approval" icon={Send} onPress={submit} /> : null}
            {status === 'Approved' ? <Button label="Unlock (Owner only)" icon={LockOpen} variant="outline" onPress={unlock} /> : null}
            {run ? (
              <View style={ws.buttons}>
                <Button label="Bank sheet" icon={Landmark} variant="outline" style={ws.flex} onPress={() => nav.push('AdminPayrollBankSheet', { month: key })} />
                <Button label="All slips" icon={Download} variant="outline" style={ws.flex} onPress={() => toast(`${rows.length} salary slips (PDF) ready (demo)`)} />
              </View>
            ) : null}
            <Button label="Final settlements (leavers)" variant="outline" onPress={() => open('AdminExitClearance')} />
          </>
        }
        renderItem={(r, last) => (
          <ListRow
            avatar={r.staff.name}
            title={r.staff.name}
            subtitle={`${r.staff.id} · ${r.staff.designation} · gross Rs. ${r.result.gross.toLocaleString('en-US')}${r.result.lateDays ? ` · ${r.result.lateDays} late day(s)` : ''}`}
            right={<Right><Money value={r.result.net} />{run?.cashPaid.includes(r.staff.id) ? <Badge label="Paid cash" tone="success" /> : null}</Right>}
            onPress={() => nav.push('AdminPayrollSlip', { month: key, id: r.staff.id })}
            last={last}
          />
        )}
      />
      {reasonEl}
    </>
  );
}

export function AdminPayrollSlip(_: ScreenProps) {
  const month = useParam('month', 202610);
  const id = useParam('id', 'EMP-0001');
  const [runs, setRuns] = usePayrollRuns();
  const run = runs[month];
  const status = usePayrollStatus(run);
  const rows = usePayrollRows(month, run);
  const row = rows.find(r => r.staff.id === id) ?? rows[0];
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const editable = !!run && (status === 'Draft' || status === 'Unlocked' || status === 'Rejected');

  const addAdj = () => {
    const n = toNumber(amount);
    if (!label.trim() || !Number.isFinite(n) || n === 0 || !reason.trim()) {
      toast('Label, amount (+ or −) and reason are required');
      return;
    }
    setRuns(prev => {
      const r = prev[month];
      const list = r.adjustments[row.staff.id] ?? [];
      return { ...prev, [month]: { ...r, adjustments: { ...r.adjustments, [row.staff.id]: [...list, { label: label.trim(), amount: n, reason: reason.trim() }] } } };
    });
    logAudit('Payroll adjustment', `${row.staff.name} ${monthLabel(month)}: ${label.trim()} ${n}. Reason: ${reason.trim()}`);
    setOpen(false);
    setLabel('');
    setAmount('');
    setReason('');
  };

  if (!row) {
    return <Screen title="Salary slip"><InfoBanner text="No staff found." /></Screen>;
  }
  return (
    <Screen title="Salary slip" subtitle={`${row.staff.name} · ${monthLabel(month)}`} right={<ExportButton title="Salary slip" />}>
      {!run ? <InfoBanner tone="warn" text="Payroll has not been run for this month; figures are an estimate." /> : null}
      <Card>
        <KV k="Employee" v={`${row.staff.name} · ${row.staff.id}`} />
        <KV k="Designation" v={row.staff.designation} />
        <KV k="Pay by" v={row.staff.bankAccount ? `Bank ${row.staff.bankAccount}` : 'Cash'} last />
      </Card>
      <Card title="Breakdown">
        {row.result.lines.map((l, i) => (
          <KV key={`${l.label}-${i}`} k={l.label} v={<Money value={l.amount} tone={l.amount < 0 ? 'danger' : undefined} />} last={i === row.result.lines.length - 1} />
        ))}
        <View style={ws.totalRow}>
          <Text style={ws.bold}>Net salary</Text>
          <Money value={row.result.net} />
        </View>
      </Card>
      {(run?.adjustments[row.staff.id] ?? []).map(a => (
        <Note key={`${a.label}-${a.amount}`}>Adjustment {a.label}: {a.reason}</Note>
      ))}
      {editable ? <Button label="Add adjustment" icon={Plus} variant="outline" onPress={() => setOpen(true)} /> : <Note>Adjustments are allowed only before approval or after an Owner unlock.</Note>}
      {run && !row.staff.bankAccount && !run.cashPaid.includes(row.staff.id) ? (
        <Button
          label="Record cash payment"
          icon={Wallet}
          variant="outline"
          onPress={() => {
            setRuns(prev => ({ ...prev, [month]: { ...prev[month], cashPaid: [...prev[month].cashPaid, row.staff.id] } }));
            logAudit('Salary paid in cash', `${row.staff.name} ${monthLabel(month)} Rs. ${row.result.net.toLocaleString('en-US')}`);
            toast('Cash payment recorded');
          }}
        />
      ) : null}
      <Button label="Download slip (PDF)" icon={Download} onPress={() => toast('Salary slip PDF ready (demo)')} />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Payroll adjustment" onSubmit={addAdj}>
        <Field label="Label" value={label} onChangeText={setLabel} placeholder="e.g. Overtime, uniform" />
        <Field label="Amount (use − for a deduction)" value={amount} onChangeText={setAmount} keyboardType="numbers-and-punctuation" />
        <Field label="Reason" value={reason} onChangeText={setReason} multiline />
      </FormSheet>
    </Screen>
  );
}

export function AdminPayrollBankSheet(_: ScreenProps) {
  const month = useParam('month', 202610);
  const [runs] = usePayrollRuns();
  const rows = usePayrollRows(month, runs[month]);
  const bank = rows.filter(r => r.staff.bankAccount);
  const cash = rows.filter(r => !r.staff.bankAccount);
  return (
    <Screen title="Bank transfer sheet" subtitle={monthLabel(month)} right={<ExportButton title="Bank transfer sheet" />}>
      <Card title={`Bank transfers (${bank.length})`}>
        <Table columns={['Employee', 'ID', 'Account', 'Amount']} rows={bank.map(r => [r.staff.name, r.staff.id, r.staff.bankAccount ?? '', r.result.net.toLocaleString('en-US')])} />
        <KV k="Total" v={<Money value={bank.reduce((s, r) => s + r.result.net, 0)} />} last />
      </Card>
      <Card title={`Cash payments (${cash.length})`}>
        {cash.map((r, i) => (
          <ListRow key={r.staff.id} avatar={r.staff.name} title={r.staff.name} subtitle={r.staff.designation} right={<Money value={r.result.net} />} last={i === cash.length - 1} />
        ))}
      </Card>
      <Button label="Send sheet to bank (demo)" icon={Send} onPress={() => { logAudit('Bank sheet', `${monthLabel(month)} sent to bank`); toast('Bank transfer file sent (demo)'); }} />
    </Screen>
  );
}
