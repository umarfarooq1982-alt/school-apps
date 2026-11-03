import { ScreenMap } from '../../../navigation';
import { AdminAssetsLive, AdminItemsLive, AdminLibraryLive, AdminPurchasesLive, AdminSalesLive } from './live';
import { notAvailableScreen as na } from '../accounts/live-kit';

// Every route shows server data. Where the server has no API yet the screen
// says so plainly; no sample data is ever shown.
export const adminStoreScreens: ScreenMap = {
  AdminItems: AdminItemsLive,
  AdminPurchases: AdminPurchasesLive,
  AdminPurchaseDetail: na('Purchase order', 'Goods received'),
  AdminSales: AdminSalesLive,
  AdminCanteenPos: na('Canteen POS', 'Canteen point of sale'),
  AdminCanteenWallets: na('Student wallets', 'Student canteen wallets'),
  AdminStock: na('Stock', 'Stock in hand, adjustments and write-offs'),
  AdminStaffIssues: na('Staff issues', 'Issue and return to staff'),
  AdminAssets: AdminAssetsLive,
  AdminLibrary: AdminLibraryLive,
  AdminLibraryIssue: na('Barcode issue', 'Barcode issue and renewal'),
  AdminBookDetail: na('Book', 'Barcode labels'),
  AdminLibraryMember: na('Library member', 'Member view'),
  AdminItemsTools: na('Variants & suppliers', 'Item variants and suppliers'),
  AdminPurchasesTools: na('Goods received', 'Purchase orders with goods received'),
  AdminSalesTools: na('Sales to voucher', 'Sales added to the fee voucher'),
  AdminAssetsTools: na('Asset moves', 'Asset moves'),
  AdminLibraryTools: na('Barcode library', 'Barcode labels, renewals and member view'),
};
