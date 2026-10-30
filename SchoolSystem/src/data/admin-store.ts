// Dummy data for Store, Canteen & Library (SOW 3.2 H, M-15, S-07).
import { useCallback } from 'react';
import { ADMIN_STUDENTS } from './admin';
import { getShared, setShared, useShared } from '../store';

let seq = 700;
export const stId = (p: string) => `${p}${++seq}`;

// ---------- Items & suppliers ----------

export type ItemCategory = 'Uniform' | 'Book' | 'Stationery' | 'Canteen';

export type Item = {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  lowLevel: number;
  variants: string[];
  supplierId: string;
};

export const ITEMS: Item[] = [
  { id: 'i1', name: 'Uniform shirt', category: 'Uniform', price: 950, lowLevel: 10, variants: ['24', '26', '28', '30'], supplierId: 'su1' },
  { id: 'i2', name: 'Uniform trousers', category: 'Uniform', price: 1100, lowLevel: 8, variants: ['24', '26', '28', '30'], supplierId: 'su1' },
  { id: 'i3', name: 'School tie', category: 'Uniform', price: 250, lowLevel: 15, variants: ['Std'], supplierId: 'su1' },
  { id: 'i4', name: 'English Reader Class 5', category: 'Book', price: 650, lowLevel: 10, variants: ['Std'], supplierId: 'su2' },
  { id: 'i5', name: 'Mathematics Class 5', category: 'Book', price: 520, lowLevel: 10, variants: ['Std'], supplierId: 'su2' },
  { id: 'i6', name: 'Notebook', category: 'Stationery', price: 90, lowLevel: 20, variants: ['Single line', 'Four line'], supplierId: 'su3' },
  { id: 'i7', name: 'Geometry box', category: 'Stationery', price: 450, lowLevel: 5, variants: ['Std'], supplierId: 'su3' },
  { id: 'i8', name: 'Samosa', category: 'Canteen', price: 50, lowLevel: 20, variants: ['Std'], supplierId: 'su4' },
  { id: 'i9', name: 'Juice box', category: 'Canteen', price: 80, lowLevel: 24, variants: ['Std'], supplierId: 'su4' },
  { id: 'i10', name: 'Sandwich', category: 'Canteen', price: 120, lowLevel: 15, variants: ['Std'], supplierId: 'su4' },
  { id: 'i11', name: 'Chips', category: 'Canteen', price: 60, lowLevel: 20, variants: ['Std'], supplierId: 'su4' },
  { id: 'i12', name: 'Water bottle', category: 'Canteen', price: 40, lowLevel: 24, variants: ['Std'], supplierId: 'su4' },
];

export function useItems() {
  return useShared<Item[]>('admin.st.items', ITEMS);
}

export type Supplier = { id: string; name: string; contact: string; phone: string; supplies: string };

export const SUPPLIERS: Supplier[] = [
  { id: 'su1', name: 'Al-Noor Uniforms', contact: 'Haji Rafiq', phone: '0300 4455112', supplies: 'Shirts, trousers, ties' },
  { id: 'su2', name: 'Paramount Books', contact: 'Saleem Akhtar', phone: '042 35761234', supplies: 'Text books' },
  { id: 'su3', name: 'Stationery House', contact: 'Asif Javed', phone: '0321 7788123', supplies: 'Notebooks, geometry boxes' },
  { id: 'su4', name: 'Fresh Bites Catering', contact: 'Naeem Butt', phone: '0333 4422110', supplies: 'Canteen food and drinks' },
];

export function useSuppliers() {
  return useShared<Supplier[]>('admin.st.suppliers', SUPPLIERS);
}

// ---------- Stock (never below zero) ----------

export const stockKey = (itemId: string, variant: string) => `${itemId}:${variant}`;

const STOCK_SEED: Record<string, number> = {
  'i1:24': 34, 'i1:26': 41, 'i1:28': 6, 'i1:30': 18,
  'i2:24': 22, 'i2:26': 25, 'i2:28': 12, 'i2:30': 4,
  'i3:Std': 60, 'i4:Std': 45, 'i5:Std': 38,
  'i6:Single line': 240, 'i6:Four line': 8, 'i7:Std': 3,
  'i8:Std': 80, 'i9:Std': 96, 'i10:Std': 30, 'i11:Std': 70, 'i12:Std': 120,
};

export function useStock() {
  const [stock] = useShared<Record<string, number>>('admin.st.stock', STOCK_SEED);
  // Applies all deltas or none. Returns false (and changes nothing) if any line
  // would go below zero (M-15 key rule).
  const change = useCallback((deltas: Array<{ key: string; delta: number }>) => {
    const cur = getShared<Record<string, number>>('admin.st.stock', STOCK_SEED);
    const next = { ...cur };
    for (const d of deltas) {
      const v = (next[d.key] ?? 0) + d.delta;
      if (v < 0) {
        return false;
      }
      next[d.key] = v;
    }
    setShared('admin.st.stock', next);
    return true;
  }, []);
  return [stock, change] as const;
}

export function lineName(items: Item[], key: string) {
  const [id, variant] = key.split(':');
  const it = items.find(i => i.id === id);
  if (!it) {
    return key;
  }
  return variant === 'Std' ? it.name : `${it.name} · ${variant}`;
}

export function allLines(items: Item[]) {
  return items.flatMap(it => it.variants.map(v => ({ key: stockKey(it.id, v), item: it, variant: v })));
}

// ---------- Purchases ----------

export type PoLine = { key: string; qty: number; rate: number };
export type PurchaseOrder = {
  id: string;
  supplierId: string;
  lines: PoLine[];
  status: 'Draft' | 'Sent' | 'Received';
  date: string;
  grn?: string;
};

export const POS: PurchaseOrder[] = [
  { id: 'PO-26-0041', supplierId: 'su1', lines: [{ key: 'i1:28', qty: 40, rate: 720 }, { key: 'i2:30', qty: 30, rate: 840 }], status: 'Sent', date: '18 Oct 2026' },
  { id: 'PO-26-0042', supplierId: 'su3', lines: [{ key: 'i7:Std', qty: 50, rate: 320 }, { key: 'i6:Four line', qty: 300, rate: 62 }], status: 'Draft', date: '21 Oct 2026' },
  { id: 'PO-26-0038', supplierId: 'su2', lines: [{ key: 'i4:Std', qty: 60, rate: 500 }], status: 'Received', date: '2 Oct 2026', grn: 'GRN-26-0031' },
];

export function usePurchases() {
  return useShared<PurchaseOrder[]>('admin.st.pos', POS);
}

// ---------- Sales ----------

export type Sale = {
  id: string;
  studentId: string;
  lines: Array<{ key: string; qty: number; price: number }>;
  total: number;
  mode: 'Cash' | 'Fee voucher' | 'Wallet';
  date: string;
  where: 'Store' | 'Canteen';
};

export const SALES: Sale[] = [
  { id: 'S-00118', studentId: 'st2', lines: [{ key: 'i1:26', qty: 1, price: 250 }], total: 250, mode: 'Fee voucher', date: '20 Oct 2026', where: 'Store' },
  { id: 'S-00117', studentId: 'st5', lines: [{ key: 'i4:Std', qty: 1, price: 650 }, { key: 'i5:Std', qty: 1, price: 520 }], total: 1170, mode: 'Cash', date: '19 Oct 2026', where: 'Store' },
  { id: 'S-00116', studentId: 'st9', lines: [{ key: 'i2:28', qty: 2, price: 1100 }], total: 2200, mode: 'Fee voucher', date: '17 Oct 2026', where: 'Store' },
  { id: 'C-02210', studentId: 'st2', lines: [{ key: 'i8:Std', qty: 2, price: 50 }, { key: 'i9:Std', qty: 1, price: 80 }], total: 180, mode: 'Wallet', date: '22 Oct 2026', where: 'Canteen' },
];

export function useSales() {
  return useShared<Sale[]>('admin.st.sales', SALES);
}

// ---------- Student wallets (canteen) ----------

const WALLET_SEED: Record<string, number> = Object.fromEntries(
  ADMIN_STUDENTS.slice(0, 24).map((st, i) => [st.id, i === 1 ? 820 : (i * 137) % 1500]),
);

export function useWallets() {
  return useShared<Record<string, number>>('admin.st.wallets', WALLET_SEED);
}

// ---------- Stock adjustments (need approval) ----------

export type Adjustment = {
  id: string;
  key: string;
  delta: number;
  kind: 'Adjustment' | 'Write-off';
  reason: string;
  approvalId: string;
  state: 'Pending' | 'Applied' | 'Rejected' | 'Failed';
};

export function useAdjustments() {
  return useShared<Adjustment[]>('admin.st.adjust', []);
}

// ---------- Issue to staff ----------

export type StaffIssue = {
  id: string;
  staffId: string;
  key: string;
  qty: number;
  date: string;
  status: 'Issued' | 'Returned';
};

export const STAFF_ISSUES: StaffIssue[] = [
  { id: 'is1', staffId: 'EMP-0001', key: 'i6:Single line', qty: 10, date: '15 Oct 2026', status: 'Issued' },
  { id: 'is2', staffId: 'EMP-0004', key: 'i7:Std', qty: 1, date: '1 Oct 2026', status: 'Returned' },
];

export function useStaffIssues() {
  return useShared<StaffIssue[]>('admin.st.issues', STAFF_ISSUES);
}

// ---------- Assets register ----------

export type AssetCondition = 'Good' | 'Fair' | 'Needs repair' | 'Disposed';
export type Asset = {
  id: string;
  tag: string;
  name: string;
  category: string;
  location: string;
  condition: AssetCondition;
  value: number;
  bought: string;
};

export const LOCATIONS = ['Admin block', 'Computer lab', 'Science lab', 'Library', 'Staff room', 'Room R105', 'Auditorium', 'Store room'];

export const ASSETS: Asset[] = [
  { id: 'a1', tag: 'AST-0001', name: 'Dell OptiPlex desktop', category: 'IT', location: 'Computer lab', condition: 'Good', value: 145000, bought: 'Aug 2024' },
  { id: 'a2', tag: 'AST-0002', name: 'Epson multimedia projector', category: 'IT', location: 'Auditorium', condition: 'Fair', value: 98000, bought: 'Jan 2023' },
  { id: 'a3', tag: 'AST-0003', name: 'Microscope set (10)', category: 'Lab', location: 'Science lab', condition: 'Good', value: 210000, bought: 'Apr 2025' },
  { id: 'a4', tag: 'AST-0004', name: 'Split AC 1.5 ton', category: 'Electrical', location: 'Staff room', condition: 'Needs repair', value: 165000, bought: 'May 2021' },
  { id: 'a5', tag: 'AST-0005', name: 'Student desks (40)', category: 'Furniture', location: 'Room R105', condition: 'Good', value: 280000, bought: 'Mar 2022' },
  { id: 'a6', tag: 'AST-0006', name: 'Photocopier Canon IR', category: 'Office', location: 'Admin block', condition: 'Fair', value: 320000, bought: 'Sep 2020' },
  { id: 'a7', tag: 'AST-0007', name: 'Old CRT monitors (6)', category: 'IT', location: 'Store room', condition: 'Disposed', value: 0, bought: 'Feb 2012' },
];

export function useAssets() {
  return useShared<Asset[]>('admin.st.assets', ASSETS);
}

// ---------- Library ----------

export const FINE_PER_DAY = 10;
export const LOAN_DAYS = 14;

export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  copies: number;
  barcode: string;
};

export const BOOKS: Book[] = [
  { id: 'b1', title: 'Tales from Pakistan', author: 'Various', category: 'Stories', copies: 4, barcode: 'BFS-LIB-000101' },
  { id: 'b2', title: 'Junior Science Encyclopedia', author: 'DK', category: 'Reference', copies: 2, barcode: 'BFS-LIB-000102' },
  { id: 'b3', title: 'The Secret Garden', author: 'F. H. Burnett', category: 'Classics', copies: 3, barcode: 'BFS-LIB-000103' },
  { id: 'b4', title: 'Urdu Kahaniyan', author: 'Ishtiaq Ahmed', category: 'Urdu', copies: 5, barcode: 'BFS-LIB-000104' },
  { id: 'b5', title: 'Charlie and the Chocolate Factory', author: 'Roald Dahl', category: 'Stories', copies: 3, barcode: 'BFS-LIB-000105' },
  { id: 'b6', title: 'Atlas of the World', author: 'Oxford', category: 'Reference', copies: 1, barcode: 'BFS-LIB-000106' },
  { id: 'b7', title: 'Seerat-un-Nabi for Children', author: 'Various', category: 'Islamic', copies: 6, barcode: 'BFS-LIB-000107' },
  { id: 'b8', title: 'Teaching with Games', author: 'J. Harmer', category: 'Teacher resource', copies: 2, barcode: 'BFS-LIB-000108' },
];

export function useBooks() {
  return useShared<Book[]>('admin.st.books', BOOKS);
}

// Days are relative to today (22 Oct 2026): -10 means 10 days ago.
export type Loan = {
  id: string;
  bookId: string;
  memberType: 'Student' | 'Staff';
  memberId: string;
  issued: number;
  due: number;
  returned?: number;
  fine: number;
  finePaid?: 'Counter' | 'Voucher';
};

export const LOANS: Loan[] = [
  { id: 'l1', bookId: 'b1', memberType: 'Student', memberId: 'st2', issued: -12, due: 2, fine: 0 },
  { id: 'l2', bookId: 'b2', memberType: 'Student', memberId: 'st2', issued: -20, due: -6, fine: 0 },
  { id: 'l3', bookId: 'b5', memberType: 'Student', memberId: 'st7', issued: -5, due: 9, fine: 0 },
  { id: 'l4', bookId: 'b6', memberType: 'Student', memberId: 'st12', issued: -25, due: -11, fine: 0 },
  { id: 'l5', bookId: 'b8', memberType: 'Staff', memberId: 'EMP-0001', issued: -3, due: 11, fine: 0 },
  { id: 'l6', bookId: 'b3', memberType: 'Student', memberId: 'st2', issued: -40, due: -26, returned: -22, fine: 0 },
  { id: 'l7', bookId: 'b4', memberType: 'Student', memberId: 'st2', issued: -45, due: -31, returned: -28, fine: 30, finePaid: 'Voucher' },
];

export function useLoans() {
  return useShared<Loan[]>('admin.st.loans', LOANS);
}

export function overdueFine(loan: Loan) {
  if (loan.returned !== undefined) {
    return loan.fine;
  }
  return Math.max(0, -loan.due) * FINE_PER_DAY;
}

export function dayLabel(offset: number) {
  const d = new Date(2026, 9, 22 + offset);
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${d.getDate()} ${m}`;
}
