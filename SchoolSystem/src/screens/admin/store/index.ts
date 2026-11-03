import { ScreenMap } from '../../../navigation';
import { inventoryScreens as inv } from './inventory';
import { libraryScreens as lib } from './library';
import { AdminAssetsLive, AdminItemsLive, AdminLibraryLive, AdminPurchasesLive, AdminSalesLive } from './live';
import { sampleScreen } from '../accounts/live-kit';

// Contract routes open the server-backed screens; the earlier sample screens
// stay reachable as "tools" for rules the server has no API for yet.
export const adminStoreScreens: ScreenMap = {
  AdminItems: AdminItemsLive,
  AdminPurchases: AdminPurchasesLive,
  AdminPurchaseDetail: sampleScreen(inv.AdminPurchaseDetail, 'goods received'),
  AdminSales: AdminSalesLive,
  AdminCanteenPos: sampleScreen(inv.AdminCanteenPos, 'canteen POS'),
  AdminCanteenWallets: sampleScreen(inv.AdminCanteenWallets, 'student wallets'),
  AdminStock: sampleScreen(inv.AdminStock, 'stock adjustments and write-offs'),
  AdminStaffIssues: sampleScreen(inv.AdminStaffIssues, 'issue and return to staff'),
  AdminAssets: AdminAssetsLive,
  AdminLibrary: AdminLibraryLive,
  AdminLibraryIssue: sampleScreen(lib.AdminLibraryIssue, 'barcode issue and renewal'),
  AdminBookDetail: sampleScreen(lib.AdminBookDetail, 'barcode labels'),
  AdminLibraryMember: sampleScreen(lib.AdminLibraryMember, 'member view'),
  AdminItemsTools: sampleScreen(inv.AdminItems, 'variants and suppliers'),
  AdminPurchasesTools: sampleScreen(inv.AdminPurchases, 'purchase orders with goods received'),
  AdminSalesTools: sampleScreen(inv.AdminSales, 'sales added to fee voucher'),
  AdminAssetsTools: sampleScreen(inv.AdminAssets, 'asset moves'),
  AdminLibraryTools: sampleScreen(lib.AdminLibrary, 'barcode library'),
};
