// Accounts panel (SOW 3.2 D): fee heads, vouchers, fines, discounts,
// payments, cash closing, reconciliation and expenses. The calculation
// functions are pure so they can be unit tested (SOW 7.2, 10.4).
import { ADMIN_STUDENTS, AdminStudent, CAMPUSES, CLASSES } from './admin';

// ---------- Months ----------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Month key: yyyymm, e.g. 202611 = November 2026.
export function monthLabel(key: number) {
  return `${MONTHS[(key % 100) - 1]} ${Math.floor(key / 100)}`;
}

export function addMonths(key: number, n: number) {
  const y = Math.floor(key / 100);
  const m = (key % 100) - 1 + n;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return yy * 100 + mm + 1;
}

export const CURRENT_MONTH = 202611; // vouchers being collected now
export const SESSION_MONTHS = Array.from({ length: 12 }, (_, i) => addMonths(202604, i));

// ---------- Fee heads and structure (M-03) ----------

export type HeadKey = 'tuition' | 'admission' | 'annual' | 'exam' | 'transport' | 'lab' | 'other';

export type FeeHead = {
  key: HeadKey;
  name: string;
  frequency: 'Monthly' | 'One-time';
};

export const FEE_HEADS: FeeHead[] = [
  { key: 'tuition', name: 'Tuition fee', frequency: 'Monthly' },
  { key: 'admission', name: 'Admission fee', frequency: 'One-time' },
  { key: 'annual', name: 'Annual charges', frequency: 'One-time' },
  { key: 'exam', name: 'Exam fee', frequency: 'One-time' },
  { key: 'transport', name: 'Transport fee', frequency: 'Monthly' },
  { key: 'lab', name: 'Lab fee', frequency: 'Monthly' },
  { key: 'other', name: 'Other', frequency: 'One-time' },
];

const TUITION = [3500, 3800, 4200, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 10000, 11000];

export type Structure = Record<string, Record<HeadKey, number>>;

export const FEE_STRUCTURE: Structure = Object.fromEntries(
  CLASSES.map((c, i) => [
    c,
    {
      tuition: TUITION[i],
      admission: 15000,
      annual: 8000,
      exam: 1500,
      transport: 3500,
      lab: i >= 8 ? 600 : 0,
      other: 0,
    },
  ]),
) as Structure;

// ---------- Discounts (M-04) ----------

export type DiscountType = 'Sibling' | 'Staff child' | 'Merit' | 'Need-based' | 'Management';

export type Discount = {
  id: string;
  studentId: string;
  type: DiscountType;
  mode: '%' | 'Fixed';
  value: number;
  heads: HeadKey[];
  from: number; // month key
  to: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Removed';
  approvedAt?: number; // month key of the first voucher it may apply to
  approvalId?: string;
  reason: string;
  attachment?: string;
  auto?: boolean;
};

// Amount one discount takes off the given base amounts.
export function discountAmount(
  base: Partial<Record<HeadKey, number>>,
  d: Pick<Discount, 'mode' | 'value' | 'heads'>,
): number {
  const scoped = d.heads.reduce((s, h) => s + (base[h] ?? 0), 0);
  if (d.mode === '%') {
    return Math.round((scoped * d.value) / 100);
  }
  return Math.min(d.value, scoped);
}

// Is the discount live for a voucher of this month? It must be approved,
// inside its period, and approved before the voucher (M-04 key rule).
export function discountApplies(d: Discount, monthKey: number) {
  return (
    d.status === 'Approved' &&
    d.from <= monthKey &&
    monthKey <= d.to &&
    (d.approvedAt ?? 0) <= monthKey
  );
}

// Combined discount as a percentage of the heads the discounts touch.
export function combinedDiscountPct(
  base: Partial<Record<HeadKey, number>>,
  discounts: Array<Pick<Discount, 'mode' | 'value' | 'heads'>>,
) {
  const heads = Array.from(new Set(discounts.flatMap(d => d.heads)));
  const scoped = heads.reduce((s, h) => s + (base[h] ?? 0), 0);
  if (!scoped) {
    return 0;
  }
  const total = discounts.reduce((s, d) => s + discountAmount(base, d), 0);
  return Math.round((total / scoped) * 1000) / 10;
}

// Combined discounts may not exceed the limit set in settings.
export function checkDiscountCap(
  base: Partial<Record<HeadKey, number>>,
  existing: Array<Pick<Discount, 'mode' | 'value' | 'heads'>>,
  candidate: Pick<Discount, 'mode' | 'value' | 'heads'>,
  maxPct: number,
) {
  const pct = combinedDiscountPct(base, [...existing, candidate]);
  return { ok: pct <= maxPct, pct };
}

// ---------- Late fine ----------

export function lateFine(days: number, perDay: number, cap: number) {
  if (days <= 0) {
    return 0;
  }
  return Math.min(days * perDay, cap);
}

// Days between the due date and the payment date (both {month, day}).
export function daysLate(due: { month: number; day: number }, paid: { month: number; day: number }) {
  const toDate = (k: number, d: number) =>
    Date.UTC(Math.floor(k / 100), (k % 100) - 1, d);
  return Math.max(0, Math.round((toDate(paid.month, paid.day) - toDate(due.month, due.day)) / 86400000));
}

// ---------- Vouchers ----------

export type VoucherLine = {
  head: HeadKey | 'discount' | 'arrears' | 'fine' | 'store' | 'custom';
  label: string;
  sub?: string;
  amount: number;
};

export type Receipt = {
  id: string;
  amount: number;
  mode: 'Cash' | 'Bank' | 'Online';
  date: string;
  by: string;
};

export type Voucher = {
  id: string;
  studentId: string;
  monthKey: number;
  title: string;
  kind: 'Monthly' | 'Advance' | 'Custom' | 'Single';
  lines: VoucherLine[];
  total: number;
  paid: number;
  dueDay: number;
  status: 'Unpaid' | 'Partially paid' | 'Paid' | 'Reversal requested' | 'Carried forward';
  receipts: Receipt[];
};

export function sumLines(lines: VoucherLine[]) {
  return lines.reduce((s, l) => s + l.amount, 0);
}

// Builds the voucher lines: monthly heads, transport, arrears, store sales
// and the discounts that apply to this month (M-03).
export function buildVoucherLines(opts: {
  className: string;
  monthKey: number;
  structure?: Structure;
  transport?: boolean;
  transportRoute?: string;
  arrears?: number;
  storeSales?: Array<{ label: string; amount: number }>;
  discounts?: Discount[];
  months?: number; // advance vouchers cover several months
  oneTime?: HeadKey[];
}): VoucherLine[] {
  const structure = opts.structure ?? FEE_STRUCTURE;
  const fee = structure[opts.className] ?? structure[CLASSES[0]];
  const months = opts.months ?? 1;
  const base: Partial<Record<HeadKey, number>> = {};
  const lines: VoucherLine[] = [];
  const month = monthLabel(opts.monthKey).split(' ')[0];
  const span = months > 1 ? `${month} + ${months - 1} months` : month;

  FEE_HEADS.filter(h => h.frequency === 'Monthly').forEach(h => {
    if (h.key === 'transport' && !opts.transport) {
      return;
    }
    const amount = (fee[h.key] ?? 0) * months;
    if (amount > 0) {
      base[h.key] = amount;
      lines.push({
        head: h.key,
        label: h.name,
        sub: h.key === 'transport' ? opts.transportRoute ?? 'Transport' : span,
        amount,
      });
    }
  });
  (opts.oneTime ?? []).forEach(k => {
    const h = FEE_HEADS.find(x => x.key === k);
    if (h && fee[k]) {
      base[k] = (base[k] ?? 0) + fee[k];
      lines.push({ head: k, label: h.name, sub: 'One-time', amount: fee[k] });
    }
  });
  (opts.discounts ?? [])
    .filter(d => discountApplies(d, opts.monthKey))
    .forEach(d => {
      const amount = discountAmount(base, d);
      if (amount > 0) {
        lines.push({
          head: 'discount',
          label: `${d.type} discount ${d.mode === '%' ? `${d.value}%` : ''}`.trim(),
          sub: `${d.heads.map(h => FEE_HEADS.find(x => x.key === h)?.name.replace(' fee', '')).join(', ')} only`,
          amount: -amount,
        });
      }
    });
  (opts.storeSales ?? []).forEach(s =>
    lines.push({ head: 'store', label: `Store: ${s.label}`, amount: s.amount }),
  );
  if (opts.arrears && opts.arrears > 0) {
    lines.push({ head: 'arrears', label: 'Arrears', sub: 'Unpaid balance carried forward', amount: opts.arrears });
  }
  return lines;
}

// Any unpaid balance carries forward to the next voucher.
export function carryForward(v: Pick<Voucher, 'total' | 'paid'>) {
  return Math.max(0, v.total - v.paid);
}

export type PaymentResult =
  | { ok: true; paid: number; balance: number; status: 'Paid' | 'Partially paid' }
  | { ok: false; error: string };

// Full or partial payment against a voucher. A paid voucher takes nothing.
export function applyPayment(total: number, paidSoFar: number, amount: number): PaymentResult {
  const balance = total - paidSoFar;
  if (balance <= 0) {
    return { ok: false, error: 'This voucher is already paid. It cannot be paid twice.' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter an amount greater than zero.' };
  }
  if (amount > balance) {
    return { ok: false, error: `Amount is more than the balance of Rs. ${balance.toLocaleString('en-US')}.` };
  }
  const paid = paidSoFar + amount;
  return { ok: true, paid, balance: total - paid, status: paid >= total ? 'Paid' : 'Partially paid' };
}

// Split a due amount into installments that add up exactly.
export function splitInstallments(amount: number, n: number) {
  const parts = Math.max(1, Math.floor(n));
  const each = Math.floor(amount / parts);
  return Array.from({ length: parts }, (_, i) =>
    i === parts - 1 ? amount - each * (parts - 1) : each,
  );
}

// ---------- Cash closing ----------

export const DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10];

export function countCash(counts: Record<number, number>) {
  return DENOMINATIONS.reduce((s, d) => s + d * (counts[d] ?? 0), 0);
}

export function closingDifference(expected: number, counted: number) {
  const diff = counted - expected;
  return { diff, flagged: diff !== 0, label: diff === 0 ? 'Balanced' : diff > 0 ? 'Excess' : 'Short' };
}

// ---------- Online payments (S-09) ----------

export type GatewayTxn = {
  id: string;
  gateway: 'JazzCash' | 'Easypaisa' | '1Link';
  voucherId: string;
  amount: number;
  when: string;
  gatewayStatus: 'Confirmed' | 'Redirect only' | 'Failed';
  status: 'Matched' | 'Pending' | 'Failed' | 'Duplicate' | 'Amount mismatch';
};

// Match gateway transactions to vouchers. A voucher is paid only on gateway
// confirmation (never on redirect alone) and never twice.
export function reconcile(
  txns: GatewayTxn[],
  vouchers: Array<Pick<Voucher, 'id' | 'total' | 'paid'>>,
): GatewayTxn[] {
  const paidNow = new Map(vouchers.map(v => [v.id, v.paid]));
  const totals = new Map(vouchers.map(v => [v.id, v.total]));
  return txns.map(t => {
    if (t.status === 'Matched' || t.status === 'Duplicate') {
      return t;
    }
    if (t.gatewayStatus === 'Failed') {
      return { ...t, status: 'Failed' as const };
    }
    if (t.gatewayStatus !== 'Confirmed') {
      return { ...t, status: 'Pending' as const };
    }
    const total = totals.get(t.voucherId);
    const paid = paidNow.get(t.voucherId) ?? 0;
    if (total === undefined) {
      return { ...t, status: 'Amount mismatch' as const };
    }
    if (paid >= total) {
      return { ...t, status: 'Duplicate' as const };
    }
    if (t.amount !== total - paid) {
      return { ...t, status: 'Amount mismatch' as const };
    }
    paidNow.set(t.voucherId, paid + t.amount);
    return { ...t, status: 'Matched' as const };
  });
}

// ---------- Dummy vouchers for every student ----------

const AYESHA = 'st2';

function studentLines(st: AdminStudent): VoucherLine[] {
  if (st.id === AYESHA) {
    return [
      { head: 'tuition', label: 'Tuition fee', sub: 'November', amount: 7500 },
      { head: 'transport', label: 'Transport fee', sub: 'Route 3 · Model Town', amount: 3500 },
      { head: 'discount', label: 'Sibling discount 25%', sub: 'Tuition only', amount: -1875 },
      { head: 'store', label: 'Store: uniform shirt', sub: 'Sale S-00118', amount: 250 },
    ];
  }
  return buildVoucherLines({
    className: st.className,
    monthKey: CURRENT_MONTH,
    transport: !!st.transport,
    transportRoute: st.transport,
    arrears: st.due > 9375 ? st.due - 9375 : 0,
  });
}

export const INITIAL_VOUCHERS: Voucher[] = ADMIN_STUDENTS.filter(s => s.status === 'Active').flatMap((st, i) => {
  const lines = studentLines(st);
  const total = sumLines(lines);
  const id = st.id === AYESHA ? 'V-26-000418' : `V-26-${String(500 + i).padStart(6, '0')}`;
  const unpaid = st.due > 0;
  const partial = !unpaid && i % 11 === 5;
  const paid = unpaid ? 0 : partial ? Math.round(total / 2) : total;
  const nov: Voucher = {
    id,
    studentId: st.id,
    monthKey: CURRENT_MONTH,
    title: monthLabel(CURRENT_MONTH),
    kind: 'Monthly',
    lines,
    total,
    paid,
    dueDay: 10,
    status: paid === 0 ? 'Unpaid' : paid < total ? 'Partially paid' : 'Paid',
    receipts:
      paid > 0
        ? [{ id: `R-26-${String(300 + i).padStart(6, '0')}`, amount: paid, mode: i % 3 === 0 ? 'Online' : i % 3 === 1 ? 'Bank' : 'Cash', date: `${(i % 21) + 1} Oct`, by: 'Kamran Yousaf' }]
        : [],
  };
  return [nov];
});

export function studentById(id: string) {
  return ADMIN_STUDENTS.find(s => s.id === id);
}

// ---------- Gateway transactions seed ----------

export const INITIAL_TXNS: GatewayTxn[] = [
  { id: 'JC-88412', gateway: 'JazzCash', voucherId: INITIAL_VOUCHERS[3]?.id ?? 'V-26-000503', amount: INITIAL_VOUCHERS[3]?.total ?? 0, when: 'Today 9:12', gatewayStatus: 'Confirmed', status: 'Matched' },
  { id: 'EP-55120', gateway: 'Easypaisa', voucherId: 'V-26-000418', amount: 9375, when: 'Today 10:05', gatewayStatus: 'Redirect only', status: 'Pending' },
  { id: '1L-30981', gateway: '1Link', voucherId: INITIAL_VOUCHERS[4]?.id ?? 'V-26-000504', amount: INITIAL_VOUCHERS[4]?.total ?? 0, when: 'Today 10:31', gatewayStatus: 'Confirmed', status: 'Pending' },
  { id: 'JC-88433', gateway: 'JazzCash', voucherId: INITIAL_VOUCHERS[3]?.id ?? 'V-26-000503', amount: INITIAL_VOUCHERS[3]?.total ?? 0, when: 'Today 11:02', gatewayStatus: 'Confirmed', status: 'Pending' },
  { id: 'EP-55167', gateway: 'Easypaisa', voucherId: INITIAL_VOUCHERS[11]?.id ?? 'V-26-000511', amount: 4000, when: 'Yesterday', gatewayStatus: 'Failed', status: 'Failed' },
];

// ---------- Expenses, cash and bank (S-08) ----------

export const EXPENSE_HEADS = ['Salaries', 'Utilities', 'Rent', 'Stationery', 'Repairs', 'Fuel', 'Events', 'Canteen purchases', 'Misc'];

export type Expense = {
  id: string;
  head: string;
  amount: number;
  campus: string;
  date: string;
  note: string;
  receipt?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  paidFrom: 'Cash' | 'Bank' | 'Petty cash';
};

export const INITIAL_EXPENSES: Expense[] = [
  { id: 'EX-1041', head: 'Utilities', amount: 186400, campus: 'main', date: '20 Oct', note: 'LESCO electricity bill October', receipt: 'lesco-oct.pdf', status: 'Approved', paidFrom: 'Bank' },
  { id: 'EX-1042', head: 'Stationery', amount: 24800, campus: 'main', date: '21 Oct', note: 'Chalk, markers, registers', receipt: 'inv-2231.jpg', status: 'Approved', paidFrom: 'Petty cash' },
  { id: 'EX-1043', head: 'Repairs', amount: 38500, campus: 'girls', date: '21 Oct', note: 'Water cooler compressor', receipt: 'repair-118.jpg', status: 'Pending', paidFrom: 'Cash' },
  { id: 'EX-1044', head: 'Fuel', amount: 61200, campus: 'main', date: '22 Oct', note: 'Diesel for routes 1–6 (posted from Transport)', status: 'Approved', paidFrom: 'Bank' },
  { id: 'EX-1045', head: 'Events', amount: 45000, campus: 'jt', date: '22 Oct', note: 'Sports day tents advance', status: 'Pending', paidFrom: 'Bank' },
  { id: 'EX-1046', head: 'Rent', amount: 350000, campus: 'jt', date: '5 Oct', note: 'Building rent October', receipt: 'rent-oct.pdf', status: 'Approved', paidFrom: 'Bank' },
];

export type BankAccount = { id: string; bank: string; title: string; number: string; balance: number; campus: string };

export const BANK_ACCOUNTS: BankAccount[] = CAMPUSES.map((c, i) => ({
  id: `bk${i + 1}`,
  bank: c.bank.split(' ')[0],
  title: `${c.name} collection`,
  number: c.bank.split(' ')[1],
  balance: [4820000, 2110000, 1365000][i] ?? 1000000,
  campus: c.id,
}));

export type CashTxn = {
  id: string;
  kind: 'Deposit' | 'Transfer' | 'Petty cash top-up' | 'Petty cash spend' | 'Other income';
  amount: number;
  from: string;
  to: string;
  date: string;
  note: string;
};

export const INITIAL_CASH_TXNS: CashTxn[] = [
  { id: 'CT-501', kind: 'Deposit', amount: 640000, from: 'Cash counter', to: 'Meezan 0123-0104567890', date: '21 Oct', note: 'Daily cash deposit' },
  { id: 'CT-502', kind: 'Transfer', amount: 300000, from: 'Meezan 0123-0104567890', to: 'UBL 2211-9988776', date: '20 Oct', note: 'Johar Town rent' },
  { id: 'CT-503', kind: 'Petty cash top-up', amount: 50000, from: 'Cash counter', to: 'Petty cash', date: '18 Oct', note: 'Monthly float' },
  { id: 'CT-504', kind: 'Petty cash spend', amount: 24800, from: 'Petty cash', to: 'Stationery', date: '21 Oct', note: 'EX-1042' },
  { id: 'CT-505', kind: 'Other income', amount: 85000, from: 'Canteen contractor', to: 'Meezan 0123-0104567890', date: '15 Oct', note: 'Canteen lease October' },
];

// Profit and loss for one campus and month (fee income from the Fee module).
export function profitAndLoss(income: Array<{ head: string; amount: number }>, expenses: Array<{ head: string; amount: number }>) {
  const totalIncome = income.reduce((s, x) => s + x.amount, 0);
  const totalExpense = expenses.reduce((s, x) => s + x.amount, 0);
  return { totalIncome, totalExpense, net: totalIncome - totalExpense };
}
