import { useShared } from '../../store';
import { Child, RECEIPTS, Voucher, VOUCHERS, VOUCHER_LINES } from '../../data/school';

export type Receipt = {
  childId: string;
  id: string;
  date: string;
  mode: string;
  amount: number;
};

export type VoucherLine = { title: string; sub: string; amount: number };

// Vouchers for one child. Ayesha's come straight from the design; the other
// children get a similar set with their own amounts and ids.
function baseVouchers(child: Child): Voucher[] {
  if (child.id === 'ayesha') {
    return VOUCHERS;
  }
  const prefix = `V-26-00${child.roll}`;
  const nov: Voucher =
    child.due > 0
      ? { id: `${prefix}18`, month: 'November 2026', amount: child.due, status: 'Unpaid', note: 'Due 10 Nov', dueDate: '10 Nov' }
      : { id: `${prefix}18`, month: 'November 2026', amount: 9800, status: 'Paid', note: 'Paid 5 Nov', dueDate: '10 Nov' };
  return [
    nov,
    ...VOUCHERS.slice(1).map((v, i) => ({
      ...v,
      id: `${prefix}${i + 2}0`,
      amount: child.due > 0 ? Math.round(v.amount * 0.5) : v.amount + 1300,
    })),
  ];
}

export function voucherLines(child: Child, v: Voucher): VoucherLine[] {
  if (child.id === 'ayesha' && v.id === VOUCHERS[0].id) {
    return VOUCHER_LINES;
  }
  if (v.month === 'Annual charges') {
    return [
      { title: 'Annual charges', sub: 'Session 2026-27', amount: v.amount - 1500 },
      { title: 'Exam and lab fee', sub: 'Full session', amount: 1500 },
    ];
  }
  const month = v.month.split(' ')[0];
  return [{ title: 'Tuition fee', sub: month, amount: v.amount }];
}

export function useChildFee(child: Child) {
  const [paid, setPaid] = useShared<Record<string, boolean>>('fee.paid', {});
  const [extra, setExtra] = useShared<Receipt[]>('fee.receipts', []);
  const vouchers = baseVouchers(child).map(v =>
    paid[v.id] && v.status === 'Unpaid'
      ? { ...v, status: 'Paid' as const, note: 'Paid online today' }
      : v,
  );
  const due = vouchers
    .filter(v => v.status === 'Unpaid')
    .reduce((sum, v) => sum + v.amount, 0);
  const mine = extra.filter(r => r.childId === child.id);
  const baseReceipts: Receipt[] =
    child.id === 'ayesha'
      ? RECEIPTS.map(r => ({ ...r, childId: child.id }))
      : vouchers
          .filter(v => v.status === 'Paid')
          .map((v, i) => ({
            childId: child.id,
            id: `R-26-00${child.roll}${i}${i}`,
            date: v.note.replace('Paid ', ''),
            mode: i % 2 ? 'Cash at counter' : 'JazzCash online',
            amount: v.amount,
          }));
  const receipts = [...mine, ...baseReceipts];
  const paidSession =
    (child.id === 'ayesha'
      ? 52500
      : baseReceipts.reduce((s, r) => s + r.amount, 0)) +
    mine.reduce((s, r) => s + r.amount, 0);

  const pay = (voucherId: string, amount: number, mode: string) => {
    const id = `R-26-000${612 + extra.length}`;
    setPaid(p => ({ ...p, [voucherId]: true }));
    setExtra(list => [
      { childId: child.id, id, date: '22 Oct', mode, amount },
      ...list,
    ]);
    return id;
  };

  return { vouchers, due, receipts, paidSession, pay };
}
