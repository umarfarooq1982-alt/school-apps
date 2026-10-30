// Shared state for the Accounts panel. Survives navigation, reset on sign out.
import { useShared } from '../../../store';
import { useApprovals } from '../../../data/admin';
import {
  BANK_ACCOUNTS,
  BankAccount,
  CashTxn,
  CURRENT_MONTH,
  Discount,
  Expense,
  FEE_HEADS,
  FEE_STRUCTURE,
  FeeHead,
  GatewayTxn,
  INITIAL_CASH_TXNS,
  INITIAL_EXPENSES,
  INITIAL_TXNS,
  INITIAL_VOUCHERS,
  Structure,
  Voucher,
} from '../../../data/admin-accounts';

export const useVouchers = () => useShared<Voucher[]>('acc.vouchers', INITIAL_VOUCHERS);
export const useHeads = () => useShared<FeeHead[]>('acc.heads', FEE_HEADS);
export const useStructure = () => useShared<Structure>('acc.structure', FEE_STRUCTURE);
export const useTxns = () => useShared<GatewayTxn[]>('acc.txns', INITIAL_TXNS);
export const useExpenses = () => useShared<Expense[]>('acc.expenses', INITIAL_EXPENSES);
export const useCashTxns = () => useShared<CashTxn[]>('acc.cash', INITIAL_CASH_TXNS);
export const useBanks = () => useShared<BankAccount[]>('acc.banks', BANK_ACCOUNTS);

export type Hold = { admit: boolean; result: boolean; certificate: boolean };
export const useHolds = () => useShared<Record<string, Hold>>('acc.holds', {});
export const useInstallments = () =>
  useShared<Record<string, number[]>>('acc.installments', {});

export type Override = {
  id: string;
  studentId: string;
  head: string;
  amount: number;
  reason: string;
  approvalId: string;
};
export const useOverrides = () => useShared<Override[]>('acc.overrides', []);

export type GenerationRun = { id: string; title: string; count: number; total: number; when: string };
export const useRuns = () =>
  useShared<GenerationRun[]>('acc.runs', [
    { id: 'run1', title: 'November 2026 · bulk monthly · all classes · Main Campus', count: 1240, total: 9_652_300, when: '1 Nov' },
    { id: 'run2', title: 'Annual trip fund · Class 8 · custom', count: 64, total: 192_000, when: '28 Oct' },
  ]);

export type Closing = {
  id: string;
  date: string;
  cashier: string;
  expected: number;
  counted: number;
  diff: number;
  handedOver: boolean;
  note?: string;
};
export const useClosings = () =>
  useShared<Closing[]>('acc.closings', [
    { id: 'cl1', date: '21 Oct', cashier: 'Kamran Yousaf', expected: 640000, counted: 640000, diff: 0, handedOver: true },
    { id: 'cl2', date: '20 Oct', cashier: 'Kamran Yousaf', expected: 512300, counted: 511800, diff: -500, handedOver: true, note: 'Rs. 500 short; cashier to recover' },
  ]);

// Discounts with their approval state taken from the approvals inbox.
const SEED_DISCOUNTS: Discount[] = [
  { id: 'dc1', studentId: 'st2', type: 'Sibling', mode: '%', value: 25, heads: ['tuition'], from: 202604, to: 202703, status: 'Approved', approvedAt: 202604, reason: 'Auto: 3 children linked by father CNIC', auto: true },
  { id: 'dc2', studentId: 'st12', type: 'Need-based', mode: '%', value: 40, heads: ['tuition'], from: 202611, to: 202703, status: 'Pending', approvalId: 'ap2', reason: 'Father lost job; documents attached', attachment: 'income-proof.pdf' },
  { id: 'dc3', studentId: 'st5', type: 'Staff child', mode: '%', value: 50, heads: ['tuition'], from: 202604, to: 202611, status: 'Approved', approvedAt: 202604, reason: 'Auto: mother is staff EMP-0007', auto: true },
  { id: 'dc4', studentId: 'st9', type: 'Merit', mode: 'Fixed', value: 2000, heads: ['tuition'], from: 202604, to: 202612, status: 'Approved', approvedAt: 202604, reason: '1st position Class 8 annual' },
];
export const useDiscountsRaw = () => useShared<Discount[]>('acc.discounts', SEED_DISCOUNTS);

export function useDiscounts() {
  const [raw, setRaw] = useDiscountsRaw();
  const [approvals] = useApprovals();
  const list = raw.map(d => {
    if (d.status !== 'Pending' || !d.approvalId) {
      return d;
    }
    const a = approvals.find(x => x.id === d.approvalId);
    if (a?.status === 'Approved') {
      // Vouchers for the current month already exist, so it starts next month.
      return { ...d, status: 'Approved' as const, approvedAt: CURRENT_MONTH + 1 };
    }
    if (a?.status === 'Rejected') {
      return { ...d, status: 'Rejected' as const };
    }
    return d;
  });
  return [list, setRaw] as const;
}

// Payroll runs per month. Approval state comes from the approvals inbox.
export type PayrollRun = {
  month: number;
  status: 'Draft' | 'Pending approval' | 'Approved' | 'Unlocked';
  approvalId?: string;
  adjustments: Record<string, Array<{ label: string; amount: number; reason: string }>>;
  cashPaid: string[];
  includesAttendance: boolean;
};

export const usePayrollRuns = () =>
  useShared<Record<number, PayrollRun>>('acc.payroll', {
    202609: { month: 202609, status: 'Approved', approvalId: 'ap6', adjustments: {}, cashPaid: [], includesAttendance: true },
  });

export function usePayrollStatus(run: PayrollRun | undefined) {
  const [approvals] = useApprovals();
  if (!run) {
    return 'Not run' as const;
  }
  if (run.status === 'Pending approval' && run.approvalId) {
    const a = approvals.find(x => x.id === run.approvalId);
    if (a?.status === 'Approved') {
      return 'Approved' as const;
    }
    if (a?.status === 'Rejected') {
      return 'Rejected' as const;
    }
  }
  return run.status;
}
