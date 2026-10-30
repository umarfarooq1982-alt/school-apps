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

export const adminAccountsScreens: ScreenMap = {
  AdminFeeStructure,
  AdminVoucherGeneration,
  AdminVoucherPrint,
  AdminVoucherDetail,
  AdminFeeCounter,
  AdminDefaulters,
  AdminDiscounts,
  AdminCashClosing,
  AdminOnlinePayments,
  AdminExpenses,
  AdminCashBank,
  AdminIncome,
  AdminBooks,
  AdminProfitLoss,
  AdminPayroll,
  AdminPayrollSlip,
  AdminPayrollBankSheet,
};
