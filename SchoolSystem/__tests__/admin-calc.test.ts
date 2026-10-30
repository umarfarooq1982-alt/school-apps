/**
 * Fee, fine, discount, payment and payroll calculations (SOW 7.2, 10.4).
 * Each expected value is worked out by hand in the comment next to it.
 */
import {
  addMonths,
  applyPayment,
  buildVoucherLines,
  carryForward,
  checkDiscountCap,
  closingDifference,
  combinedDiscountPct,
  countCash,
  daysLate,
  Discount,
  discountAmount,
  discountApplies,
  lateFine,
  monthLabel,
  profitAndLoss,
  reconcile,
  splitInstallments,
  sumLines,
} from '../src/data/admin-accounts';
import {
  applyIncrement,
  calcPayroll,
  carryForwardLeave,
  classifyAttendance,
  finalSettlement,
  loanSchedule,
  nextEmployeeId,
  splitLeave,
  validCnic,
} from '../src/data/admin-hr';

const sibling: Discount = {
  id: 'd1',
  studentId: 'st2',
  type: 'Sibling',
  mode: '%',
  value: 25,
  heads: ['tuition'],
  from: 202604,
  to: 202703,
  status: 'Approved',
  approvedAt: 202604,
  reason: 'Auto: sibling',
};

describe('months', () => {
  test('labels and arithmetic', () => {
    expect(monthLabel(202611)).toBe('November 2026');
    expect(addMonths(202611, 2)).toBe(202701);
    expect(addMonths(202601, -1)).toBe(202512);
  });
});

describe('voucher', () => {
  test("Ayesha's November voucher: 7,500 + 3,500 - 1,875 + 250 = 9,375", () => {
    const lines = buildVoucherLines({
      className: 'Class 5',
      monthKey: 202611,
      transport: true,
      transportRoute: 'Route 3 · Model Town',
      discounts: [sibling],
      storeSales: [{ label: 'uniform shirt', amount: 250 }],
    });
    expect(lines.map(l => l.amount)).toEqual([7500, 3500, -1875, 250]);
    expect(sumLines(lines)).toBe(9375);
  });

  test('arrears are added and lab fee appears from Class 6 up', () => {
    // Class 6 tuition 8,000 + lab 600 + arrears 9,375 = 17,975
    const lines = buildVoucherLines({ className: 'Class 6', monthKey: 202611, arrears: 9375 });
    expect(sumLines(lines)).toBe(17975);
    expect(lines.find(l => l.head === 'arrears')?.amount).toBe(9375);
  });

  test('advance voucher for 3 months multiplies monthly heads', () => {
    // Class 5: 7,500 x 3 = 22,500 (no transport)
    expect(sumLines(buildVoucherLines({ className: 'Class 5', monthKey: 202611, months: 3 }))).toBe(22500);
  });

  test('unpaid balance carries forward', () => {
    expect(carryForward({ total: 9375, paid: 5000 })).toBe(4375);
    expect(carryForward({ total: 9375, paid: 9375 })).toBe(0);
  });
});

describe('late fine', () => {
  test('Rs 50 a day after the due date, capped at Rs 1,000', () => {
    expect(lateFine(0, 50, 1000)).toBe(0);
    expect(lateFine(2, 50, 1000)).toBe(100); // 2 x 50
    expect(lateFine(15, 50, 1000)).toBe(750); // 15 x 50
    expect(lateFine(35, 50, 1000)).toBe(1000); // 1,750 capped
  });

  test('days late counts across months', () => {
    expect(daysLate({ month: 202611, day: 10 }, { month: 202611, day: 10 })).toBe(0);
    expect(daysLate({ month: 202611, day: 10 }, { month: 202611, day: 25 })).toBe(15);
    expect(daysLate({ month: 202611, day: 10 }, { month: 202612, day: 15 })).toBe(35);
    expect(daysLate({ month: 202611, day: 10 }, { month: 202610, day: 22 })).toBe(0);
  });
});

describe('discounts', () => {
  const base = { tuition: 7500, transport: 3500 };

  test('percentage and fixed amounts on scoped heads only', () => {
    expect(discountAmount(base, { mode: '%', value: 25, heads: ['tuition'] })).toBe(1875);
    expect(discountAmount(base, { mode: 'Fixed', value: 1000, heads: ['transport'] })).toBe(1000);
    // fixed can never exceed the head amount
    expect(discountAmount(base, { mode: 'Fixed', value: 9000, heads: ['transport'] })).toBe(3500);
  });

  test('combined cap: 25% sibling + 30% merit = 55% > 50% is blocked', () => {
    const merit = { mode: '%' as const, value: 30, heads: ['tuition' as const] };
    expect(combinedDiscountPct(base, [sibling, merit])).toBe(55);
    expect(checkDiscountCap(base, [sibling], merit, 50).ok).toBe(false);
    expect(checkDiscountCap(base, [sibling], { ...merit, value: 20 }, 50)).toEqual({ ok: true, pct: 45 });
  });

  test('applies only when approved, in period, and after approval', () => {
    expect(discountApplies(sibling, 202611)).toBe(true);
    expect(discountApplies({ ...sibling, status: 'Pending' }, 202611)).toBe(false);
    expect(discountApplies({ ...sibling, to: 202610 }, 202611)).toBe(false);
    // approved in December: November voucher is not affected
    expect(discountApplies({ ...sibling, approvedAt: 202612 }, 202611)).toBe(false);
  });
});

describe('payments', () => {
  test('full and partial payment', () => {
    expect(applyPayment(9375, 0, 5000)).toEqual({ ok: true, paid: 5000, balance: 4375, status: 'Partially paid' });
    expect(applyPayment(9375, 5000, 4375)).toEqual({ ok: true, paid: 9375, balance: 0, status: 'Paid' });
  });

  test('a paid voucher cannot be paid twice; over-payment and zero are refused', () => {
    expect(applyPayment(9375, 9375, 100).ok).toBe(false);
    expect(applyPayment(9375, 0, 10000).ok).toBe(false);
    expect(applyPayment(9375, 0, 0).ok).toBe(false);
  });

  test('installments add up exactly', () => {
    expect(splitInstallments(18750, 4)).toEqual([4687, 4687, 4687, 4689]);
    expect(splitInstallments(18750, 4).reduce((a, b) => a + b, 0)).toBe(18750);
  });

  test('cash closing counts notes and flags a difference', () => {
    const counted = countCash({ 5000: 10, 1000: 25, 500: 4, 100: 7 }); // 50,000 + 25,000 + 2,000 + 700
    expect(counted).toBe(77700);
    expect(closingDifference(78000, counted)).toEqual({ diff: -300, flagged: true, label: 'Short' });
    expect(closingDifference(77700, counted).flagged).toBe(false);
  });

  test('reconciliation: confirmed matches, redirect stays pending, second payment is duplicate', () => {
    const vouchers = [{ id: 'V1', total: 9375, paid: 0 }];
    const out = reconcile(
      [
        { id: 'a', gateway: 'JazzCash', voucherId: 'V1', amount: 9375, when: '', gatewayStatus: 'Redirect only', status: 'Pending' },
        { id: 'b', gateway: 'JazzCash', voucherId: 'V1', amount: 9375, when: '', gatewayStatus: 'Confirmed', status: 'Pending' },
        { id: 'c', gateway: 'Easypaisa', voucherId: 'V1', amount: 9375, when: '', gatewayStatus: 'Confirmed', status: 'Pending' },
        { id: 'd', gateway: '1Link', voucherId: 'V1', amount: 100, when: '', gatewayStatus: 'Failed', status: 'Pending' },
      ],
      vouchers,
    );
    expect(out.map(t => t.status)).toEqual(['Pending', 'Matched', 'Duplicate', 'Failed']);
  });

  test('profit and loss', () => {
    expect(profitAndLoss([{ head: 'Fee', amount: 900000 }], [{ head: 'Rent', amount: 350000 }, { head: 'Fuel', amount: 61200 }])).toEqual({
      totalIncome: 900000,
      totalExpense: 411200,
      net: 488800,
    });
  });
});

describe('payroll', () => {
  test('Sadia Anwar: 54,000 + 5,000; 3 lates = 1 day; loan 5,000; EOBI 370', () => {
    // gross 59,000; per day 59,000/30 = 1,967; net 59,000 - 1,967 - 5,000 - 370 = 51,663
    const r = calcPayroll({
      basic: 54000,
      allowances: [{ name: 'House rent allowance', amount: 5000 }],
      deductions: [{ name: 'EOBI', amount: 370 }],
      lates: 3,
      unpaidLeaveDays: 0,
      absentDays: 0,
      loanInstallment: 5000,
      arrears: 0,
      bonus: 0,
    });
    expect(r.gross).toBe(59000);
    expect(r.perDay).toBe(1967);
    expect(r.lateDeduction).toBe(1967);
    expect(r.net).toBe(51663);
  });

  test('unpaid leave, absents, arrears, bonus and adjustments', () => {
    // gross 40,000; per day 1,333; 5 lates = 1 day; 2 unpaid + 1 absent = 3 days
    // net = 40,000 - 1,333 - 2,666 - 1,333 - 370 + 2,000 + 3,000 - 500 = 38,798
    const r = calcPayroll({
      basic: 36000,
      allowances: [{ name: 'HRA', amount: 4000 }],
      deductions: [{ name: 'EOBI', amount: 370 }],
      lates: 5,
      unpaidLeaveDays: 2,
      absentDays: 1,
      loanInstallment: 0,
      arrears: 2000,
      bonus: 3000,
      adjustments: [{ label: 'Uniform', amount: -500 }],
    });
    expect(r.perDay).toBe(1333);
    expect(r.lateDays).toBe(1);
    expect(r.net).toBe(38798);
    expect(r.lines.reduce((s, l) => s + l.amount, 0)).toBe(r.net);
  });

  test('increments and loan schedules', () => {
    expect(applyIncrement(50000, { mode: '%', value: 8 })).toBe(54000);
    expect(applyIncrement(50000, { mode: 'Fixed', value: 2500 })).toBe(52500);
    expect(loanSchedule(20000, 3)).toEqual([6666, 6666, 6668]);
  });

  test('final settlement', () => {
    // salary (40,000+4,000)/30 x 15 = 22,000; encash 40,000/30 x 5 = 6,667;
    // gratuity 40,000 x 3 = 120,000; minus loan 10,000 = 138,667
    expect(
      finalSettlement({ basic: 40000, allowances: 4000, daysWorked: 15, leaveEncashDays: 5, years: 3.6, permanent: true, loanOutstanding: 10000 }),
    ).toEqual({ salary: 22000, encash: 6667, gratuity: 120000, deductions: 10000, net: 138667 });
  });
});

describe('leave and attendance', () => {
  test('leave beyond balance only as unpaid', () => {
    expect(splitLeave(7, 2, 'Casual')).toEqual({ paid: 2, unpaid: 0 });
    expect(splitLeave(1, 3, 'Casual')).toEqual({ paid: 1, unpaid: 2 });
    expect(splitLeave(5, 2, 'Unpaid')).toEqual({ paid: 0, unpaid: 2 });
    expect(carryForwardLeave(16, 10)).toBe(10);
  });

  test('timing rules', () => {
    expect(classifyAttendance('07:40', null)).toBe('Present');
    expect(classifyAttendance('07:55', null)).toBe('Present'); // within 10 min grace
    expect(classifyAttendance('08:06', null)).toBe('Late');
    expect(classifyAttendance('10:15', null)).toBe('Half day');
    expect(classifyAttendance('07:40', '13:20')).toBe('Early leave');
    expect(classifyAttendance('07:40', '12:15')).toBe('Short leave');
    expect(classifyAttendance('07:40', '11:00')).toBe('Half day');
    expect(classifyAttendance(null, null)).toBe('Absent');
    expect(classifyAttendance(null, null, undefined, true)).toBe('Leave');
  });

  test('CNIC format and employee ids', () => {
    expect(validCnic('35202-1234567-1')).toBe(true);
    expect(validCnic('3520212345671')).toBe(true);
    expect(validCnic('35202-123-1')).toBe(false);
    expect(nextEmployeeId(['EMP-0001', 'EMP-0032'])).toBe('EMP-0033');
  });
});
