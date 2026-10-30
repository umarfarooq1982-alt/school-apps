// Store & canteen (SOW 3.2 H, M-15): items, suppliers, purchases, sales,
// canteen POS with student wallet, stock with approvals, issue to staff, assets.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Coffee,
  Package,
  PackageCheck,
  Plus,
  Receipt,
  ShieldCheck,
  Trash2,
  Truck,
  Users,
  Wallet,
  Building,
  Minus,
} from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  InfoBanner,
  ListRow,
  Screen,
  Segmented,
  formatRs,
  toast,
} from '../../../components/ui';
import { FormSheet, KV, ListScreen, PickerField } from '../../../components/admin';
import { colors, radius } from '../../../theme';
import { ScreenMap, ScreenProps, useNav, useParam } from '../../../navigation';
import {
  ADMIN_STAFF,
  ADMIN_STUDENTS,
  logAudit,
  requestApproval,
  roleInfo,
  useApprovals,
  useReadOnly,
  useStaffRole,
} from '../../../data/admin';
import {
  Asset,
  AssetCondition,
  Item,
  ItemCategory,
  LOCATIONS,
  PoLine,
  Sale,
  allLines,
  lineName,
  stId,
  stockKey,
  useAdjustments,
  useAssets,
  useItems,
  usePurchases,
  useSales,
  useStaffIssues,
  useStock,
  useSuppliers,
  useWallets,
} from '../../../data/admin-store';
import { ReadOnlyBanner, SmallBtn } from '../transport/screens';

const ACTIVE_STUDENTS = ADMIN_STUDENTS.filter(s => s.status === 'Active');
const studentName = (id: string) => ADMIN_STUDENTS.find(s => s.id === id)?.name ?? id;
// Names repeat in the dummy data, so pickers show a unique label.
const studentLabel = (st: { name: string; gr: string }) => `${st.name} · ${st.gr}`;
const STUDENT_LABELS = ACTIVE_STUDENTS.map(studentLabel);
const byStudentLabel = (l: string) => ACTIVE_STUDENTS.find(st => studentLabel(st) === l) ?? ACTIVE_STUDENTS[0];
const staffName = (id: string) => ADMIN_STAFF.find(s => s.id === id)?.name ?? id;
const CATEGORIES: ItemCategory[] = ['Uniform', 'Book', 'Stationery', 'Canteen'];

function useLineOptions(filter?: (it: Item) => boolean) {
  const [items] = useItems();
  return useMemo(() => {
    const lines = allLines(items).filter(l => !filter || filter(l.item));
    return {
      names: lines.map(l => lineName(items, l.key)),
      keyOf: (name: string) => lines.find(l => lineName(items, l.key) === name)?.key ?? '',
      items,
    };
  }, [items, filter]);
}

// ---------- Items & suppliers ----------

function ItemForm({ initial, onClose }: { initial?: Item; onClose: () => void }) {
  const [items, setItems] = useItems();
  const [suppliers] = useSuppliers();
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<string>(initial?.category ?? 'Uniform');
  const [price, setPrice] = useState(String(initial?.price ?? ''));
  const [low, setLow] = useState(String(initial?.lowLevel ?? 10));
  const [variants, setVariants] = useState((initial?.variants ?? ['Std']).join(', '));
  const [supplier, setSupplier] = useState(suppliers.find(x => x.id === initial?.supplierId)?.name ?? suppliers[0].name);
  const submit = () => {
    const vs = Array.from(new Set(variants.split(',').map(v => v.trim()).filter(Boolean)));
    if (!name.trim()) {
      toast('Enter the item name');
    } else if (items.some(i => i.name.toLowerCase() === name.trim().toLowerCase() && i.id !== initial?.id)) {
      toast('An item with this name already exists');
    } else if (!(Number(price) > 0)) {
      toast('Enter the price');
    } else if (!(Number(low) >= 0)) {
      toast('Enter the low-stock level');
    } else if (!vs.length) {
      toast('Add at least one size or variant (use Std if none)');
    } else if (initial && initial.variants.some(v => !vs.includes(v))) {
      toast('Existing sizes cannot be removed because they have stock history');
    } else {
      const it: Item = {
        id: initial?.id ?? stId('i'),
        name: name.trim(),
        category: (CATEGORIES.find(c => c === category) ?? 'Uniform') as ItemCategory,
        price: Number(price),
        lowLevel: Number(low),
        variants: vs,
        supplierId: suppliers.find(x => x.name === supplier)?.id ?? suppliers[0].id,
      };
      setItems(list => (initial ? list.map(x => (x.id === it.id ? it : x)) : [...list, it]));
      logAudit('Item', `${initial ? 'Updated' : 'Added'} ${it.name} (${it.variants.join('/')}) at ${formatRs(it.price)}`);
      toast(initial ? 'Item updated' : 'Item added');
      onClose();
    }
  };
  return (
    <FormSheet visible onClose={onClose} title={initial ? `Edit ${initial.name}` : 'Add item'} onSubmit={submit}>
      <Field label="Item name" value={name} onChangeText={setName} />
      <PickerField label="Category" value={category} options={CATEGORIES} onChange={setCategory} />
      <Field label="Sale price (Rs.)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
      <Field label="Low-stock level" value={low} onChangeText={setLow} keyboardType="number-pad" />
      <Field label="Sizes / variants (comma separated)" value={variants} onChangeText={setVariants} placeholder="24, 26, 28 or Std" />
      <PickerField label="Supplier" value={supplier} options={suppliers.map(x => x.name)} onChange={setSupplier} />
    </FormSheet>
  );
}

function SupplierForm({ onClose }: { onClose: () => void }) {
  const [, setSuppliers] = useSuppliers();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [supplies, setSupplies] = useState('');
  const submit = () => {
    if (!name.trim() || !contact.trim()) {
      toast('Enter the supplier name and contact person');
    } else if (phone.replace(/\D/g, '').length < 10) {
      toast('Enter a valid phone number');
    } else {
      setSuppliers(list => [...list, { id: stId('su'), name: name.trim(), contact: contact.trim(), phone, supplies: supplies.trim() }]);
      logAudit('Supplier', `Added supplier ${name.trim()}`);
      toast('Supplier added');
      onClose();
    }
  };
  return (
    <FormSheet visible onClose={onClose} title="Add supplier" onSubmit={submit}>
      <Field label="Supplier name" value={name} onChangeText={setName} />
      <Field label="Contact person" value={contact} onChangeText={setContact} />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Supplies" value={supplies} onChangeText={setSupplies} />
    </FormSheet>
  );
}

export function AdminItems(_: ScreenProps) {
  const ro = useReadOnly();
  const [tab, setTab] = useState('Items');
  const [items] = useItems();
  const [suppliers] = useSuppliers();
  const [stock] = useStock();
  const [form, setForm] = useState<Item | 'new' | null>(null);
  const [supForm, setSupForm] = useState(false);
  const head = (
    <>
      {ro ? <ReadOnlyBanner /> : null}
      <Segmented options={['Items', 'Suppliers']} value={tab} onChange={setTab} />
    </>
  );
  return (
    <>
      {tab === 'Items' ? (
        <ListScreen
          title="Items & suppliers"
          subtitle={`${items.length} items`}
          items={items}
          keyOf={i => i.id}
          searchText={i => `${i.name} ${i.category} ${i.variants.join(' ')}`}
          filters={[{ label: 'Category', options: ['All', ...CATEGORIES], get: i => i.category }]}
          header={head}
          renderItem={(it, last) => {
            const qty = it.variants.reduce((a, v) => a + (stock[stockKey(it.id, v)] ?? 0), 0);
            const low = it.variants.some(v => (stock[stockKey(it.id, v)] ?? 0) <= it.lowLevel);
            return (
              <ListRow
                icon={Package}
                title={it.name}
                subtitle={`${it.category} · ${it.variants.length > 1 ? `sizes ${it.variants.join(', ')}` : 'one size'} · low at ${it.lowLevel} · ${suppliers.find(x => x.id === it.supplierId)?.name ?? ''}`}
                right={
                  <View style={s.right}>
                    <Text style={s.amount}>{formatRs(it.price)}</Text>
                    <Badge label={`${qty} in stock`} tone={low ? 'danger' : 'success'} />
                  </View>
                }
                onPress={ro ? undefined : () => setForm(it)}
                last={last}
              />
            );
          }}
          onAdd={ro ? undefined : () => setForm('new')}
          addLabel="Add item"
        />
      ) : (
        <ListScreen
          title="Items & suppliers"
          subtitle={`${suppliers.length} suppliers`}
          items={suppliers}
          keyOf={x => x.id}
          searchText={x => `${x.name} ${x.contact} ${x.supplies}`}
          header={head}
          renderItem={(x, last) => (
            <ListRow icon={Truck} title={x.name} subtitle={`${x.contact} · ${x.phone} · ${x.supplies}`} last={last} />
          )}
          onAdd={ro ? undefined : () => setSupForm(true)}
          addLabel="Add supplier"
        />
      )}
      {form ? <ItemForm initial={form === 'new' ? undefined : form} onClose={() => setForm(null)} /> : null}
      {supForm ? <SupplierForm onClose={() => setSupForm(false)} /> : null}
    </>
  );
}

// ---------- Purchases (PO and GRN) ----------

function PoForm({ onClose }: { onClose: () => void }) {
  const [suppliers] = useSuppliers();
  const [, setPos] = usePurchases();
  const opts = useLineOptions();
  const [supplier, setSupplier] = useState(suppliers[0].name);
  const [line, setLine] = useState(opts.names[0] ?? '');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [lines, setLines] = useState<PoLine[]>([]);
  const addLine = () => {
    const key = opts.keyOf(line);
    if (!key || !(Number(qty) > 0) || !(Number(rate) > 0)) {
      toast('Choose an item and enter quantity and rate');
      return;
    }
    setLines(l => [...l.filter(x => x.key !== key), { key, qty: Number(qty), rate: Number(rate) }]);
    setQty('');
    setRate('');
  };
  const submit = () => {
    if (!lines.length) {
      toast('Add at least one line');
      return;
    }
    const id = `PO-26-00${43 + Math.floor(Math.random() * 50)}`;
    setPos(list => [
      { id, supplierId: suppliers.find(x => x.name === supplier)?.id ?? suppliers[0].id, lines, status: 'Draft', date: '22 Oct 2026' },
      ...list,
    ]);
    logAudit('Purchase order', `${id} created (${lines.length} lines)`);
    toast(`${id} saved as draft`);
    onClose();
  };
  const total = lines.reduce((a, l) => a + l.qty * l.rate, 0);
  return (
    <FormSheet visible onClose={onClose} title="New purchase order" onSubmit={submit} submitLabel="Save draft">
      <PickerField label="Supplier" value={supplier} options={suppliers.map(x => x.name)} onChange={setSupplier} />
      <PickerField label="Item" value={line} options={opts.names} onChange={setLine} />
      <View style={s.row}>
        <View style={s.flex}>
          <Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="number-pad" />
        </View>
        <View style={s.flex}>
          <Field label="Rate (Rs.)" value={rate} onChangeText={setRate} keyboardType="number-pad" />
        </View>
      </View>
      <Button label="Add line" icon={Plus} variant="outline" onPress={addLine} />
      {lines.map(l => (
        <ListRow
          key={l.key}
          title={lineName(opts.items, l.key)}
          subtitle={`${l.qty} × ${formatRs(l.rate)}`}
          right={<IconButton icon={Trash2} onPress={() => setLines(x => x.filter(y => y.key !== l.key))} />}
        />
      ))}
      {lines.length ? <KV k="Total" v={formatRs(total)} last /> : null}
    </FormSheet>
  );
}

export function AdminPurchases(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [pos] = usePurchases();
  const [suppliers] = useSuppliers();
  const [form, setForm] = useState(false);
  return (
    <>
      <ListScreen
        title="Purchases"
        subtitle="Purchase orders and goods received"
        items={pos}
        keyOf={p => p.id}
        searchText={p => `${p.id} ${suppliers.find(x => x.id === p.supplierId)?.name ?? ''}`}
        filters={[{ label: 'Status', options: ['All', 'Draft', 'Sent', 'Received'], get: p => p.status }]}
        header={ro ? <ReadOnlyBanner /> : null}
        renderItem={(p, last) => (
          <ListRow
            icon={Truck}
            title={`${p.id} · ${suppliers.find(x => x.id === p.supplierId)?.name ?? ''}`}
            subtitle={`${p.date} · ${p.lines.length} lines · ${formatRs(p.lines.reduce((a, l) => a + l.qty * l.rate, 0))}`}
            right={<Badge label={p.status} tone={p.status === 'Received' ? 'success' : p.status === 'Sent' ? 'info' : 'neutral'} />}
            onPress={() => nav.push('AdminPurchaseDetail', { id: p.id })}
            last={last}
          />
        )}
        onAdd={ro ? undefined : () => setForm(true)}
        addLabel="New purchase order"
      />
      {form ? <PoForm onClose={() => setForm(false)} /> : null}
    </>
  );
}

export function AdminPurchaseDetail(_: ScreenProps) {
  const ro = useReadOnly();
  const id = useParam('id', 'PO-26-0041');
  const [pos, setPos] = usePurchases();
  const [suppliers] = useSuppliers();
  const [items] = useItems();
  const [, change] = useStock();
  const po = pos.find(p => p.id === id) ?? pos[0];
  const total = po.lines.reduce((a, l) => a + l.qty * l.rate, 0);
  const setStatus = (status: 'Sent' | 'Received', grn?: string) =>
    setPos(list => list.map(p => (p.id === po.id ? { ...p, status, grn: grn ?? p.grn } : p)));
  const send = () => {
    setStatus('Sent');
    logAudit('Purchase order', `${po.id} sent to supplier`);
    toast('Sent to the supplier (demo)');
  };
  const receive = () => {
    if (po.status === 'Received') {
      toast('Goods for this order were already received');
      return;
    }
    const ok = change(po.lines.map(l => ({ key: l.key, delta: l.qty })));
    if (!ok) {
      toast('Could not update stock');
      return;
    }
    const grn = `GRN-26-00${32 + Math.floor(Math.random() * 60)}`;
    setStatus('Received', grn);
    logAudit('Goods received', `${grn} for ${po.id}: stock increased for ${po.lines.length} lines`);
    toast(`${grn} saved. Stock updated.`);
  };
  return (
    <Screen title={po.id} subtitle={suppliers.find(x => x.id === po.supplierId)?.name}>
      {ro ? <ReadOnlyBanner /> : null}
      <Card>
        <KV k="Date" v={po.date} />
        <KV k="Status" v={<Badge label={po.status} tone={po.status === 'Received' ? 'success' : 'info'} />} />
        {po.grn ? <KV k="Goods received note" v={po.grn} /> : null}
        <KV k="Total" v={formatRs(total)} last />
      </Card>
      <Card title="Lines">
        {po.lines.map((l, i) => (
          <ListRow
            key={l.key}
            icon={Package}
            title={lineName(items, l.key)}
            subtitle={`${l.qty} × ${formatRs(l.rate)}`}
            right={<Text style={s.amount}>{formatRs(l.qty * l.rate)}</Text>}
            last={i === po.lines.length - 1}
          />
        ))}
      </Card>
      {po.status === 'Received' ? (
        <InfoBanner tone="success" icon={PackageCheck} text="Goods received and added to stock." />
      ) : ro ? null : (
        <>
          {po.status === 'Draft' ? <Button label="Send to supplier" icon={Truck} variant="outline" onPress={send} /> : null}
          <Button label="Receive goods (GRN) and update stock" icon={PackageCheck} onPress={receive} />
        </>
      )}
      <Button label="Print purchase order" variant="outline" onPress={() => toast('Print preview ready (demo)')} />
    </Screen>
  );
}

// ---------- Sales (cash or added to fee voucher) ----------

function SaleForm({ onClose }: { onClose: () => void }) {
  const opts = useLineOptions(it => it.category !== 'Canteen');
  const [stock, change] = useStock();
  const [, setSales] = useSales();
  const [student, setStudent] = useState(STUDENT_LABELS[0]);
  const [line, setLine] = useState(opts.names[0] ?? '');
  const [qty, setQty] = useState('1');
  const [mode, setMode] = useState('Cash');
  const key = opts.keyOf(line);
  const item = opts.items.find(i => i.id === key.split(':')[0]);
  const total = (item?.price ?? 0) * (Number(qty) || 0);
  const submit = () => {
    const n = Number(qty);
    if (!item || !Number.isInteger(n) || n <= 0) {
      toast('Choose an item and a whole quantity');
      return;
    }
    if (!change([{ key, delta: -n }])) {
      toast(`Only ${stock[key] ?? 0} in stock. Stock cannot go below zero.`);
      return;
    }
    const st = byStudentLabel(student);
    const sale: Sale = {
      id: `S-00${119 + Math.floor(Math.random() * 800)}`,
      studentId: st.id,
      lines: [{ key, qty: n, price: item.price }],
      total,
      mode: mode === 'Fee voucher' ? 'Fee voucher' : 'Cash',
      date: '22 Oct 2026',
      where: 'Store',
    };
    setSales(list => [sale, ...list]);
    logAudit('Store sale', `${sale.id} ${st.name}: ${lineName(opts.items, key)} × ${n} = ${formatRs(total)} (${sale.mode})`);
    toast(sale.mode === 'Cash' ? `Receipt ${sale.id} printed (demo)` : `${formatRs(total)} added to ${st.name}'s next fee voucher`);
    onClose();
  };
  return (
    <FormSheet visible onClose={onClose} title="New sale" onSubmit={submit} submitLabel={`Sell · ${formatRs(total)}`}>
      <PickerField label="Student" value={student} options={STUDENT_LABELS} onChange={setStudent} />
      <PickerField label="Item" value={line} options={opts.names} onChange={setLine} />
      <Text style={s.muted}>In stock: {stock[key] ?? 0} · price {formatRs(item?.price ?? 0)}</Text>
      <Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="number-pad" />
      <Segmented options={['Cash', 'Fee voucher']} value={mode} onChange={setMode} />
    </FormSheet>
  );
}

export function AdminSales(_: ScreenProps) {
  const ro = useReadOnly();
  const [sales] = useSales();
  const [items] = useItems();
  const [form, setForm] = useState(false);
  const store = sales.filter(x => x.where === 'Store');
  return (
    <>
      <ListScreen
        title="Sales"
        subtitle="Uniform and book sales"
        items={store}
        keyOf={x => x.id}
        searchText={x => `${x.id} ${studentName(x.studentId)} ${x.lines.map(l => lineName(items, l.key)).join(' ')}`}
        filters={[{ label: 'Payment', options: ['All', 'Cash', 'Fee voucher'], get: x => x.mode }]}
        header={ro ? <ReadOnlyBanner /> : null}
        renderItem={(x, last) => (
          <ListRow
            icon={Receipt}
            title={`${x.id} · ${studentName(x.studentId)}`}
            subtitle={`${x.date} · ${x.lines.map(l => `${lineName(items, l.key)} × ${l.qty}`).join(', ')}`}
            right={
              <View style={s.right}>
                <Text style={s.amount}>{formatRs(x.total)}</Text>
                <Badge label={x.mode} tone={x.mode === 'Cash' ? 'success' : 'info'} />
              </View>
            }
            onPress={() => toast(`Receipt ${x.id} reprinted (demo)`)}
            last={last}
          />
        )}
        onAdd={ro ? undefined : () => setForm(true)}
        addLabel="New sale"
      />
      {form ? <SaleForm onClose={() => setForm(false)} /> : null}
    </>
  );
}

// ---------- Canteen POS and student wallet ----------

export function AdminCanteenPos(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [items] = useItems();
  const [stock, change] = useStock();
  const [wallets, setWallets] = useWallets();
  const [, setSales] = useSales();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [mode, setMode] = useState('Cash');
  const [student, setStudent] = useState(STUDENT_LABELS[1]);
  const canteen = items.filter(i => i.category === 'Canteen');
  const st = byStudentLabel(student);
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const total = lines.reduce((a, [id, q]) => a + (items.find(i => i.id === id)?.price ?? 0) * q, 0);
  const balance = wallets[st.id] ?? 0;

  const add = (id: string, d: number) => {
    const have = stock[stockKey(id, 'Std')] ?? 0;
    setCart(c => {
      const q = Math.max(0, (c[id] ?? 0) + d);
      if (q > have) {
        toast(`Only ${have} left`);
        return c;
      }
      return { ...c, [id]: q };
    });
  };

  const pay = () => {
    if (!lines.length) {
      toast('Tap items to add them to the sale');
      return;
    }
    if (mode === 'Student wallet' && balance < total) {
      toast(`Wallet balance ${formatRs(balance)} is not enough. Top up first.`);
      return;
    }
    if (!change(lines.map(([id, q]) => ({ key: stockKey(id, 'Std'), delta: -q })))) {
      toast('Not enough stock for this sale');
      return;
    }
    if (mode === 'Student wallet') {
      setWallets(w => ({ ...w, [st.id]: (w[st.id] ?? 0) - total }));
    }
    const id = `C-0${2211 + Math.floor(Math.random() * 700)}`;
    setSales(list => [
      {
        id,
        studentId: mode === 'Student wallet' ? st.id : '',
        lines: lines.map(([iid, q]) => ({ key: stockKey(iid, 'Std'), qty: q, price: items.find(i => i.id === iid)?.price ?? 0 })),
        total,
        mode: mode === 'Student wallet' ? 'Wallet' : 'Cash',
        date: '22 Oct 2026',
        where: 'Canteen',
      },
      ...list,
    ]);
    logAudit('Canteen sale', `${id} ${formatRs(total)} ${mode === 'Student wallet' ? `from ${st.name}'s wallet` : 'cash'}`);
    toast(`Sale ${id}: ${formatRs(total)}`);
    setCart({});
  };

  return (
    <Screen
      title="Canteen POS"
      subtitle="Quick sale · cash or student wallet"
      right={<IconButton icon={Wallet} onPress={() => nav.push('AdminCanteenWallets')} />}
      footer={ro ? undefined : <Button label={`Charge ${formatRs(total)}`} icon={Coffee} onPress={pay} />}
    >
      {ro ? <ReadOnlyBanner /> : null}
      <View style={s.grid}>
        {canteen.map(it => {
          const have = stock[stockKey(it.id, 'Std')] ?? 0;
          const q = cart[it.id] ?? 0;
          return (
            <Pressable
              key={it.id}
              onPress={() => add(it.id, 1)}
              disabled={ro || have === 0}
              style={({ pressed }) => [s.tile, q > 0 && s.tileOn, (pressed || have === 0) && s.dim]}
            >
              <Text style={s.tileName}>{it.name}</Text>
              <Text style={s.tilePrice}>{formatRs(it.price)}</Text>
              <Text style={s.tileStock}>{have === 0 ? 'Out of stock' : `${have} left`}</Text>
              {q > 0 ? <Text style={s.tileQty}>× {q}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      <Card title="Current sale">
        {lines.length === 0 ? <Text style={s.muted}>Tap items above.</Text> : null}
        {lines.map(([id, q], i) => {
          const it = items.find(x => x.id === id);
          return (
            <ListRow
              key={id}
              title={it?.name ?? id}
              subtitle={`${q} × ${formatRs(it?.price ?? 0)}`}
              right={
                <View style={s.row}>
                  <IconButton icon={Minus} onPress={() => add(id, -1)} style={s.iconSm} />
                  <IconButton icon={Plus} onPress={() => add(id, 1)} style={s.iconSm} />
                </View>
              }
              last={i === lines.length - 1}
            />
          );
        })}
        <KV k="Total" v={formatRs(total)} last />
      </Card>
      <Segmented options={['Cash', 'Student wallet']} value={mode} onChange={setMode} />
      {mode === 'Student wallet' ? (
        <>
          <PickerField label="Student" value={student} options={STUDENT_LABELS} onChange={setStudent} />
          <InfoBanner
            tone={balance < total ? 'danger' : 'info'}
            icon={Wallet}
            text={`Wallet balance ${formatRs(balance)}${balance < total ? ' · not enough for this sale' : ''}. The wallet cannot go below zero.`}
          />
        </>
      ) : null}
    </Screen>
  );
}

export function AdminCanteenWallets(_: ScreenProps) {
  const ro = useReadOnly();
  const [wallets, setWallets] = useWallets();
  const [target, setTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState('500');
  const total = Object.values(wallets).reduce((a, b) => a + b, 0);
  const topUp = () => {
    const n = Number(amount);
    if (!target || !Number.isInteger(n) || n <= 0) {
      toast('Enter a top-up amount');
      return;
    }
    setWallets(w => ({ ...w, [target]: (w[target] ?? 0) + n }));
    logAudit('Wallet top-up', `${studentName(target)} +${formatRs(n)}`);
    toast(`${formatRs(n)} added to ${studentName(target)}'s wallet`);
    setTarget(null);
  };
  return (
    <>
      <ListScreen
        title="Student wallets"
        subtitle={`Total balance ${formatRs(total)}`}
        items={ACTIVE_STUDENTS}
        keyOf={x => x.id}
        searchText={x => `${x.name} ${x.gr}`}
        filters={[{ label: 'Balance', options: ['All', 'Low (under Rs. 200)', 'OK'], get: x => ((wallets[x.id] ?? 0) < 200 ? 'Low (under Rs. 200)' : 'OK') }]}
        header={ro ? <ReadOnlyBanner /> : null}
        renderItem={(x, last) => {
          const b = wallets[x.id] ?? 0;
          return (
            <ListRow
              avatar={x.name}
              title={x.name}
              subtitle={`${x.gr} · ${x.className}-${x.section}`}
              right={<Badge label={formatRs(b)} tone={b < 200 ? 'danger' : 'success'} />}
              onPress={ro ? undefined : () => setTarget(x.id)}
              last={last}
            />
          );
        }}
      />
      {target ? (
        <FormSheet visible onClose={() => setTarget(null)} title={`Top up · ${studentName(target)}`} onSubmit={topUp} submitLabel="Add to wallet">
          <KV k="Current balance" v={formatRs(wallets[target] ?? 0)} last />
          <Field label="Amount (Rs.)" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
        </FormSheet>
      ) : null}
    </>
  );
}

// ---------- Stock ----------

export function AdminStock(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [role] = useStaffRole();
  const [items] = useItems();
  const [stock, change] = useStock();
  const [adjust, setAdjust] = useAdjustments();
  const [approvals, setApprovals] = useApprovals();
  const [target, setTarget] = useState<string | null>(null);
  const [kind, setKind] = useState('Adjustment');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [issue, setIssue] = useState(false);
  const lines = allLines(items);
  const low = lines.filter(l => (stock[l.key] ?? 0) <= l.item.lowLevel);
  const pending = adjust.filter(a => a.state === 'Pending');
  const canApprove = role === 'owner' || role === 'principal';

  // Apply adjustments once the approval chain approves them.
  useEffect(() => {
    const done = adjust.filter(a => a.state === 'Pending' && approvals.some(x => x.id === a.approvalId && x.status !== 'Pending'));
    if (!done.length) {
      return;
    }
    const updates: Record<string, 'Applied' | 'Rejected' | 'Failed'> = {};
    done.forEach(a => {
      const status = approvals.find(x => x.id === a.approvalId)?.status;
      if (status === 'Rejected') {
        updates[a.id] = 'Rejected';
      } else {
        updates[a.id] = change([{ key: a.key, delta: a.delta }]) ? 'Applied' : 'Failed';
        logAudit('Stock', `${a.kind} ${lineName(items, a.key)} ${a.delta > 0 ? '+' : ''}${a.delta} ${updates[a.id] === 'Applied' ? 'applied' : 'failed (would go below zero)'}`);
      }
    });
    setAdjust(list => list.map(a => (updates[a.id] ? { ...a, state: updates[a.id] } : a)));
  }, [approvals, adjust, change, setAdjust, items]);

  const open = (key: string) => {
    setTarget(key);
    setKind('Adjustment');
    setQty('');
    setReason('');
  };

  const submit = () => {
    if (!target) {
      return;
    }
    const n = Number(qty);
    if (!Number.isInteger(n) || n === 0 || (kind === 'Write-off' && n < 0)) {
      toast(kind === 'Write-off' ? 'Enter how many to write off' : 'Enter a change like +5 or -3');
      return;
    }
    if (!reason.trim()) {
      toast('A reason is required');
      return;
    }
    const delta = kind === 'Write-off' ? -Math.abs(n) : n;
    if ((stock[target] ?? 0) + delta < 0) {
      toast(`Only ${stock[target] ?? 0} in stock. Stock cannot go below zero.`);
      return;
    }
    const approvalId = requestApproval({
      type: 'Stock adjustment',
      title: `${kind}: ${lineName(items, target)} ${delta > 0 ? '+' : ''}${delta}`,
      sub: `Reason: ${reason.trim()}`,
      by: `${roleInfo(role).user} (Store)`,
    });
    setAdjust(list => [
      { id: stId('ad'), key: target, delta, kind: kind === 'Write-off' ? 'Write-off' : 'Adjustment', reason: reason.trim(), approvalId, state: 'Pending' },
      ...list,
    ]);
    toast('Sent for approval. Stock changes after approval.');
    setTarget(null);
  };

  const decide = (approvalId: string, status: 'Approved' | 'Rejected') => {
    setApprovals(list => list.map(a => (a.id === approvalId ? { ...a, status } : a)));
    logAudit('Approval', `Stock adjustment ${status.toLowerCase()}`);
  };

  return (
    <>
      <ListScreen
        title="Stock"
        subtitle={`${lines.length} lines · ${low.length} low`}
        items={lines}
        keyOf={l => l.key}
        searchText={l => lineName(items, l.key)}
        filters={[
          {
            label: 'Level',
            options: ['All', 'Low stock', 'Out of stock', 'OK'],
            get: l => {
              const q = stock[l.key] ?? 0;
              return q === 0 ? 'Out of stock' : q <= l.item.lowLevel ? 'Low stock' : 'OK';
            },
          },
          { label: 'Category', options: ['All', ...CATEGORIES], get: l => l.item.category },
        ]}
        header={
          <>
            {ro ? <ReadOnlyBanner /> : null}
            {low.length ? (
              <InfoBanner
                tone="danger"
                text={`Low stock: ${low.map(l => `${lineName(items, l.key)} (${stock[l.key] ?? 0})`).join(', ')}`}
              />
            ) : null}
            {ro ? null : (
              <View style={s.row}>
                <View style={s.flex}>
                  <Button label="Issue to staff" icon={Users} variant="outline" onPress={() => setIssue(true)} />
                </View>
                <View style={s.flex}>
                  <Button label="Staff issues" variant="outline" onPress={() => nav.push('AdminStaffIssues')} />
                </View>
              </View>
            )}
            {adjust.length ? (
              <Card title="Adjustments and write-offs">
                {adjust.slice(0, 6).map((a, i, arr) => (
                  <ListRow
                    key={a.id}
                    icon={ShieldCheck}
                    title={`${a.kind}: ${lineName(items, a.key)} ${a.delta > 0 ? '+' : ''}${a.delta}`}
                    subtitle={a.reason}
                    right={
                      a.state === 'Pending' && canApprove && !ro ? (
                        <View style={s.row}>
                          <SmallBtn label="Approve" onPress={() => decide(a.approvalId, 'Approved')} />
                          <SmallBtn label="Reject" tone="danger" onPress={() => decide(a.approvalId, 'Rejected')} />
                        </View>
                      ) : (
                        <Badge
                          label={a.state === 'Pending' ? 'Waiting approval' : a.state}
                          tone={a.state === 'Applied' ? 'success' : a.state === 'Pending' ? 'warn' : 'danger'}
                        />
                      )
                    }
                    last={i === arr.length - 1}
                  />
                ))}
                {pending.length && !canApprove ? (
                  <Text style={s.muted}>The Principal approves these in the Approvals inbox.</Text>
                ) : null}
              </Card>
            ) : null}
          </>
        }
        renderItem={(l, last) => {
          const q = stock[l.key] ?? 0;
          return (
            <ListRow
              icon={Package}
              title={lineName(items, l.key)}
              subtitle={`${l.item.category} · low at ${l.item.lowLevel}`}
              right={<Badge label={`${q} in hand`} tone={q === 0 ? 'danger' : q <= l.item.lowLevel ? 'warn' : 'success'} />}
              onPress={ro ? undefined : () => open(l.key)}
              last={last}
            />
          );
        }}
      />
      {target ? (
        <FormSheet visible onClose={() => setTarget(null)} title={lineName(items, target)} onSubmit={submit} submitLabel="Send for approval">
          <KV k="In hand" v={String(stock[target] ?? 0)} last />
          <Segmented options={['Adjustment', 'Write-off']} value={kind} onChange={setKind} />
          <Field
            label={kind === 'Write-off' ? 'Quantity to write off' : 'Change (+ or −)'}
            value={qty}
            onChangeText={setQty}
            keyboardType="numbers-and-punctuation"
            placeholder={kind === 'Write-off' ? '2' : '+5 or -3'}
          />
          <Field label="Reason (required)" value={reason} onChangeText={setReason} multiline />
        </FormSheet>
      ) : null}
      {issue ? <IssueForm onClose={() => setIssue(false)} /> : null}
    </>
  );
}

function IssueForm({ onClose }: { onClose: () => void }) {
  const opts = useLineOptions(it => it.category !== 'Canteen');
  const [stock, change] = useStock();
  const [, setIssues] = useStaffIssues();
  const staff = ADMIN_STAFF.filter(x => x.status !== 'Left');
  const staffLabel = (x: { name: string; id: string }) => `${x.name} · ${x.id}`;
  const [who, setWho] = useState(staffLabel(staff[0]));
  const [line, setLine] = useState(opts.names[0] ?? '');
  const [qty, setQty] = useState('1');
  const submit = () => {
    const key = opts.keyOf(line);
    const n = Number(qty);
    if (!key || !Number.isInteger(n) || n <= 0) {
      toast('Choose an item and a whole quantity');
      return;
    }
    if (!change([{ key, delta: -n }])) {
      toast(`Only ${stock[key] ?? 0} in stock. Stock cannot go below zero.`);
      return;
    }
    const person = staff.find(x => staffLabel(x) === who) ?? staff[0];
    const sid = person.id;
    setIssues(list => [{ id: stId('is'), staffId: sid, key, qty: n, date: '22 Oct 2026', status: 'Issued' }, ...list]);
    logAudit('Stock issue', `${lineName(opts.items, key)} × ${n} issued to ${person.name}`);
    toast(`Issued to ${person.name}`);
    onClose();
  };
  return (
    <FormSheet visible onClose={onClose} title="Issue to staff" onSubmit={submit} submitLabel="Issue">
      <PickerField label="Staff member" value={who} options={staff.map(staffLabel)} onChange={setWho} />
      <PickerField label="Item" value={line} options={opts.names} onChange={setLine} />
      <Text style={s.muted}>In stock: {stock[opts.keyOf(line)] ?? 0}</Text>
      <Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="number-pad" />
    </FormSheet>
  );
}

export function AdminStaffIssues(_: ScreenProps) {
  const ro = useReadOnly();
  const [issues, setIssues] = useStaffIssues();
  const [items] = useItems();
  const [, change] = useStock();
  const ret = (id: string) => {
    const it = issues.find(x => x.id === id);
    if (!it || it.status === 'Returned') {
      return;
    }
    change([{ key: it.key, delta: it.qty }]);
    setIssues(list => list.map(x => (x.id === id ? { ...x, status: 'Returned' } : x)));
    logAudit('Stock return', `${lineName(items, it.key)} × ${it.qty} returned by ${staffName(it.staffId)}`);
    toast('Returned to stock');
  };
  return (
    <ListScreen
      title="Issued to staff"
      subtitle="Issue and return"
      items={issues}
      keyOf={x => x.id}
      searchText={x => `${staffName(x.staffId)} ${lineName(items, x.key)}`}
      filters={[{ label: 'Status', options: ['All', 'Issued', 'Returned'], get: x => x.status }]}
      header={ro ? <ReadOnlyBanner /> : null}
      renderItem={(x, last) => (
        <ListRow
          avatar={staffName(x.staffId)}
          title={`${lineName(items, x.key)} × ${x.qty}`}
          subtitle={`${staffName(x.staffId)} · ${x.date}`}
          right={
            x.status === 'Issued' && !ro ? (
              <SmallBtn label="Return" onPress={() => ret(x.id)} />
            ) : (
              <Badge label={x.status} tone={x.status === 'Returned' ? 'success' : 'info'} />
            )
          }
          last={last}
        />
      )}
    />
  );
}

// ---------- Assets register ----------

const CONDITIONS: AssetCondition[] = ['Good', 'Fair', 'Needs repair', 'Disposed'];
const condTone = (c: AssetCondition) => (c === 'Good' ? 'success' : c === 'Fair' ? 'info' : c === 'Needs repair' ? 'warn' : 'neutral');

function AssetForm({ initial, onClose }: { initial?: Asset; onClose: () => void }) {
  const [assets, setAssets] = useAssets();
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'IT');
  const [location, setLocation] = useState(initial?.location ?? LOCATIONS[0]);
  const [condition, setCondition] = useState<string>(initial?.condition ?? 'Good');
  const [value, setValue] = useState(String(initial?.value ?? ''));
  const submit = () => {
    if (!name.trim()) {
      toast('Enter the asset name');
      return;
    }
    if (!(Number(value) >= 0) || value === '') {
      toast('Enter the value');
      return;
    }
    const cond = (CONDITIONS.find(c => c === condition) ?? 'Good') as AssetCondition;
    const a: Asset = {
      id: initial?.id ?? stId('a'),
      tag: initial?.tag ?? `AST-${String(assets.length + 1).padStart(4, '0')}`,
      name: name.trim(),
      category: category.trim() || 'General',
      location,
      condition: cond,
      value: Number(value),
      bought: initial?.bought ?? 'Oct 2026',
    };
    setAssets(list => (initial ? list.map(x => (x.id === a.id ? a : x)) : [...list, a]));
    const changes = initial
      ? [
          initial.location !== a.location ? `location ${initial.location} → ${a.location}` : '',
          initial.condition !== a.condition ? `condition ${initial.condition} → ${a.condition}` : '',
        ].filter(Boolean).join(', ') || 'details updated'
      : 'added';
    logAudit('Asset', `${a.tag} ${a.name}: ${changes}`);
    toast(initial ? 'Asset updated' : `Asset ${a.tag} added`);
    onClose();
  };
  return (
    <FormSheet visible onClose={onClose} title={initial ? `${initial.tag} · ${initial.name}` : 'Add asset'} onSubmit={submit}>
      <Field label="Asset name" value={name} onChangeText={setName} />
      <Field label="Category" value={category} onChangeText={setCategory} />
      <PickerField label="Location" value={location} options={LOCATIONS} onChange={setLocation} />
      <PickerField label="Condition" value={condition} options={CONDITIONS} onChange={setCondition} />
      <Field label="Value (Rs.)" value={value} onChangeText={setValue} keyboardType="number-pad" />
    </FormSheet>
  );
}

export function AdminAssets(_: ScreenProps) {
  const ro = useReadOnly();
  const [assets] = useAssets();
  const [form, setForm] = useState<Asset | 'new' | null>(null);
  const value = assets.filter(a => a.condition !== 'Disposed').reduce((a, x) => a + x.value, 0);
  return (
    <>
      <ListScreen
        title="Assets register"
        subtitle={`${assets.length} assets · ${formatRs(value)} in use`}
        items={assets}
        keyOf={a => a.id}
        searchText={a => `${a.tag} ${a.name} ${a.location} ${a.category}`}
        filters={[
          { label: 'Condition', options: ['All', ...CONDITIONS], get: a => a.condition },
          { label: 'Location', options: ['All', ...LOCATIONS], get: a => a.location },
        ]}
        header={ro ? <ReadOnlyBanner /> : null}
        renderItem={(a, last) => (
          <ListRow
            icon={Building}
            title={`${a.tag} · ${a.name}`}
            subtitle={`${a.category} · ${a.location} · bought ${a.bought} · ${formatRs(a.value)}`}
            right={<Badge label={a.condition} tone={condTone(a.condition)} />}
            onPress={ro ? undefined : () => setForm(a)}
            last={last}
          />
        )}
        onAdd={ro ? undefined : () => setForm('new')}
        addLabel="Add asset"
      />
      {form ? <AssetForm initial={form === 'new' ? undefined : form} onClose={() => setForm(null)} /> : null}
    </>
  );
}

export const inventoryScreens: ScreenMap = {
  AdminItems,
  AdminPurchases,
  AdminPurchaseDetail,
  AdminSales,
  AdminCanteenPos,
  AdminCanteenWallets,
  AdminStock,
  AdminStaffIssues,
  AdminAssets,
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  right: { alignItems: 'flex-end', gap: 4 },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  amount: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  iconSm: { width: 32, height: 32, borderRadius: 9 },
  dim: { opacity: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    minHeight: 84,
  },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tileName: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  tilePrice: { fontSize: 13, fontWeight: '700', color: colors.primaryText, marginTop: 2 },
  tileStock: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  tileQty: { position: 'absolute', right: 8, top: 8, fontSize: 13, fontWeight: '900', color: colors.text },
});
