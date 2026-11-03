import { ScreenMap } from '../../../navigation';
import {
  AdminDefaulters,
  AdminDiscounts,
  AdminFeeCounter,
  AdminFeeStructure,
  AdminVoucherDetail,
  AdminVoucherGeneration,
  AdminVoucherPrint,
} from './fee';
import {
  AdminBooks,
  AdminCashBank,
  AdminCashClosing,
  AdminExpenses,
  AdminIncome,
  AdminOnlinePayments,
  AdminPayroll,
  AdminPayrollBankSheet,
  AdminPayrollSlip,
  AdminProfitLoss,
} from './finance';
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
import { sampleScreen } from './live-kit';

// Contract routes open the server-backed screens. The earlier screens hold
// rules the server has no API for yet; they stay reachable as "tools" and
// show a sample-data notice.
export const adminAccountsScreens: ScreenMap = {
  AdminFeeStructure: AdminFeeStructureLive,
  AdminVoucherGeneration: AdminVoucherGenerationLive,
  AdminVoucherPrint: AdminVoucherPrintLive,
  AdminVoucherDetail: makeVoucherDetail(sampleScreen(AdminVoucherDetail, 'voucher reversal and fine preview')),
  AdminFeeCounter: AdminFeeCounterLive,
  AdminDefaulters: AdminDefaultersLive,
  AdminDiscounts: AdminDiscountsLive,
  AdminCashClosing: AdminCashClosingLive,
  AdminOnlinePayments: AdminOnlinePaymentsLive,
  AdminExpenses: AdminExpensesLive,
  AdminPayroll: AdminPayrollLive,
  AdminCashBank: sampleScreen(AdminCashBank, 'petty cash, bank accounts and transfers'),
  AdminIncome: sampleScreen(AdminIncome, 'other income'),
  AdminBooks: sampleScreen(AdminBooks, 'day book, cash book and bank book'),
  AdminProfitLoss: sampleScreen(AdminProfitLoss, 'profit and loss'),
  AdminPayrollSlip: sampleScreen(AdminPayrollSlip, 'salary slip breakdown'),
  AdminPayrollBankSheet: sampleScreen(AdminPayrollBankSheet, 'bank transfer sheet'),
  AdminFeeStructureTools: sampleScreen(AdminFeeStructure, 'student-level overrides'),
  AdminVoucherGenerationTools: sampleScreen(AdminVoucherGeneration, 'breakdown preview with arrears and discounts'),
  AdminVoucherPrintTools: sampleScreen(AdminVoucherPrint, 'bulk 3-copy print'),
  AdminFeeCounterTools: sampleScreen(AdminFeeCounter, 'voucher reversal'),
  AdminDefaultersTools: sampleScreen(AdminDefaulters, 'reminders, installment plans and holds'),
  AdminDiscountsTools: sampleScreen(AdminDiscounts, 'automatic sibling/staff discounts and expiry reminders'),
  AdminCashClosingTools: sampleScreen(AdminCashClosing, 'counted cash by notes and difference flag'),
  AdminOnlinePaymentsTools: sampleScreen(AdminOnlinePayments, 'gateway reconciliation'),
  AdminExpensesTools: sampleScreen(AdminExpenses, 'expense approval and receipts'),
  AdminPayrollTools: sampleScreen(AdminPayroll, 'deductions, approval chain, lock and slips'),
};
