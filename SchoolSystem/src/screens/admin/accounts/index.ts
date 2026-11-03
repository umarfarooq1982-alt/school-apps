import { ScreenMap } from '../../../navigation';
import {
  AdminCashClosingLive,
  AdminDefaultersLive,
  AdminDiscountsLive,
  AdminExpensesLive,
  AdminFeeCounterLive,
  AdminFeeStructureLive,
  AdminOnlinePaymentsLive,
  AdminPayrollLive,
  AdminVoucherGenerationLive,
  AdminVoucherPrintLive,
  makeVoucherDetail,
} from './live';
import { notAvailableScreen as na } from './live-kit';

// Every route shows server data. Where the server has no API yet the screen
// says so plainly; no sample data is ever shown. The old "…Tools" routes stay
// registered for links that may still point at them.
export const adminAccountsScreens: ScreenMap = {
  AdminFeeStructure: AdminFeeStructureLive,
  AdminVoucherGeneration: AdminVoucherGenerationLive,
  AdminVoucherPrint: AdminVoucherPrintLive,
  AdminVoucherDetail: makeVoucherDetail(na('Voucher', 'Voucher not found', 'Open a voucher from the voucher list.')),
  AdminFeeCounter: AdminFeeCounterLive,
  AdminDefaulters: AdminDefaultersLive,
  AdminDiscounts: AdminDiscountsLive,
  AdminCashClosing: AdminCashClosingLive,
  AdminOnlinePayments: AdminOnlinePaymentsLive,
  AdminExpenses: AdminExpensesLive,
  AdminPayroll: AdminPayrollLive,
  AdminCashBank: na('Cash & bank', 'Petty cash, bank accounts and transfers'),
  AdminIncome: na('Other income', 'Other income'),
  AdminBooks: na('Day book', 'Day book, cash book and bank book'),
  AdminProfitLoss: na('Profit & loss', 'Profit and loss'),
  AdminPayrollSlip: na('Salary slip', 'Salary slip breakdown'),
  AdminPayrollBankSheet: na('Bank sheet', 'Bank transfer sheet'),
  AdminFeeStructureTools: na('Fee overrides', 'Student-level fee overrides'),
  AdminVoucherGenerationTools: na('Voucher preview', 'Voucher breakdown preview'),
  AdminVoucherPrintTools: na('Bulk print', 'Bulk 3-copy voucher print'),
  AdminFeeCounterTools: na('Voucher reversal', 'Voucher reversal'),
  AdminDefaultersTools: na('Reminders & installments', 'Reminders, installment plans and holds'),
  AdminDiscountsTools: na('Automatic discounts', 'Automatic sibling and staff-child discounts'),
  AdminCashClosingTools: na('Cash count', 'Counted cash by notes and difference flag'),
  AdminOnlinePaymentsTools: na('Reconciliation', 'Gateway reconciliation'),
  AdminExpensesTools: na('Expense approval', 'Expense approval and receipts'),
  AdminPayrollTools: na('Payroll rules', 'Payroll deductions, approval, lock and slips'),
};
