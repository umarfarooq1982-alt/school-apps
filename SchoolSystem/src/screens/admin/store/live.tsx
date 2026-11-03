// Store and Library screens backed by /api/web/modules/{items,purchases,sales,
// assets,library} and /api/web/library/issues.
import React, { useState } from 'react';
import { View } from 'react-native';
import { BookOpen, Building, Package, RotateCcw, ShoppingCart, Truck } from 'lucide-react-native';
import { Badge, Button, Card, Field, InfoBanner, ListRow, Segmented, toast } from '../../../components/ui';
import { FormSheet, Kpi, KpiGrid, PickerField } from '../../../components/admin';
import { Empty, QueryView } from '../../../components/states';
import { useApi, useMutation } from '../../../api/hooks';
import { libraryApi, modulesApi, num, WebBookIssue } from '../../../api/webB';
import { ScreenProps } from '../../../navigation';
import { logAudit, useReadOnly, useRules } from '../../../data/admin';
import { fmtDate, LiveScreen, liveStyles as ls, Money, ModuleRecordsScreen, SearchBox, StatusBadge, todayIso, useFiltered, useModule } from '../accounts/live-kit';

type ItemRow = { id: number; name: string; sku: string | null; stock: number; reorder_level: number; unit: string | null };
type RecRow = { id: number; title: string; status: string; recordDate: string; [k: string]: unknown };
type BookRow = { id: number; title: string; author: string | null; copies: number; isbn: string | null };

const FINE_PER_DAY = 10;

export function AdminItemsLive(_: ScreenProps) {
  return (
    <ModuleRecordsScreen<ItemRow>
      moduleKey="items"
      title="Items & suppliers"
      subtitle="Item master with stock and low-stock level"
      icon={Package}
      rowTitle={r => `${r.name}${r.sku ? ` · ${r.sku}` : ''}`}
      rowSub={r => `Low-stock level ${r.reorder_level} ${r.unit ?? ''}`}
      renderRight={r => <Badge label={`${r.stock} ${r.unit ?? ''}`.trim()} tone={r.stock <= r.reorder_level ? 'danger' : 'success'} />}
      searchText={r => `${r.name} ${r.sku ?? ''}`}
      fields={[
        { key: 'name', label: 'Item (with size/variant)', required: true, placeholder: 'Uniform shirt · 28' },
        { key: 'sku', label: 'SKU' },
        { key: 'stock', label: 'Opening stock', kind: 'number' },
        { key: 'reorderLevel', label: 'Low-stock level', kind: 'number' },
        { key: 'unit', label: 'Unit', kind: 'pick', options: ['pcs', 'set', 'box', 'pack', 'kg'] },
      ]}
      toBody={v => (Number(v.stock || 0) < 0 ? 'Stock cannot be below zero' : { name: v.name.trim(), sku: v.sku?.trim() || null, stock: Number(v.stock || 0), reorderLevel: Number(v.reorderLevel || 0), unit: v.unit || 'pcs' })}
      addLabel="Add item"
      toolsRoute="AdminItemsTools"
      renderHeader={rows => (
        <KpiGrid>
          <Kpi label="Items" value={String(rows.length)} />
          <Kpi label="Low stock" value={String(rows.filter(r => r.stock <= r.reorder_level).length)} tone="danger" />
        </KpiGrid>
      )}
    />
  );
}

function recordScreen(opts: {
  key: string;
  title: string;
  subtitle: string;
  icon: typeof Package;
  partyLabel: string;
  tools: string;
  addLabel: string;
}) {
  return function RecordsLive(_: ScreenProps) {
    const items = useModule<ItemRow>('items');
    return (
      <ModuleRecordsScreen<RecRow>
        moduleKey={opts.key}
        title={opts.title}
        subtitle={opts.subtitle}
        icon={opts.icon}
        rowTitle={r => `${r.title}${r.item ? ` · ${String(r.item)}` : ''}`}
        rowSub={r => `${fmtDate(r.recordDate)}${r.qty ? ` · qty ${String(r.qty)}` : ''}${r.payment ? ` · ${String(r.payment)}` : ''}`}
        renderRight={r => (
          <View style={ls.right}>
            <Money value={num(r.amount)} />
            <StatusBadge status={r.status} />
          </View>
        )}
        searchText={r => `${r.title} ${String(r.item ?? '')}`}
        fields={[
          { key: 'party', label: opts.partyLabel, required: true },
          { key: 'item', label: 'Item', kind: 'pick', options: (items.data ?? []).map(i => i.name) },
          { key: 'qty', label: 'Quantity', kind: 'number', required: true },
          { key: 'amount', label: 'Amount (Rs.)', kind: 'number', required: true },
          ...(opts.key === 'sales' ? [{ key: 'payment', label: 'Payment', kind: 'pick' as const, options: ['Cash', 'Add to fee voucher'] }] : []),
          { key: 'date', label: 'Date', kind: 'date' as const, placeholder: todayIso() },
        ]}
        toBody={v => {
          const qty = Number(v.qty);
          if (!(qty > 0)) {
            return 'Quantity must be more than 0';
          }
          if (opts.key === 'sales') {
            const item = (items.data ?? []).find(i => i.name === v.item);
            if (item && qty > item.stock) {
              return `Only ${item.stock} in stock. Stock cannot go below zero.`;
            }
          }
          return { title: v.party.trim(), item: v.item || null, qty, amount: Number(v.amount), payment: v.payment || undefined, date: v.date || todayIso(), status: opts.key === 'purchases' ? 'ordered' : 'done' };
        }}
        addLabel={opts.addLabel}
        toolsRoute={opts.tools}
        renderHeader={() =>
          opts.key === 'purchases' ? (
            <InfoBanner text="Goods received do not update stock on the server yet; stock changes are on the Stock tools screen." />
          ) : opts.key === 'sales' ? (
            <InfoBanner text="'Add to fee voucher' is recorded here; the server does not add it to the voucher yet." />
          ) : null
        }
      />
    );
  };
}

export const AdminPurchasesLive = recordScreen({ key: 'purchases', title: 'Purchases', subtitle: 'Purchase orders and goods received', icon: Truck, partyLabel: 'Supplier', tools: 'AdminPurchasesTools', addLabel: 'New purchase order' });
export const AdminSalesLive = recordScreen({ key: 'sales', title: 'Sales', subtitle: 'Uniform and book sales', icon: ShoppingCart, partyLabel: 'Student / buyer', tools: 'AdminSalesTools', addLabel: 'New sale' });

export function AdminAssetsLive(_: ScreenProps) {
  return (
    <ModuleRecordsScreen<RecRow>
      moduleKey="assets"
      title="Assets register"
      subtitle="Fixed assets with location and condition"
      icon={Building}
      rowTitle={r => `${r.title}${r.tag ? ` · ${String(r.tag)}` : ''}`}
      rowSub={r => `${String(r.location ?? '—')} · ${String(r.condition ?? r.status)}`}
      renderRight={r => <Money value={num(r.value)} />}
      searchText={r => `${r.title} ${String(r.tag ?? '')} ${String(r.location ?? '')}`}
      fields={[
        { key: 'name', label: 'Asset', required: true },
        { key: 'tag', label: 'Tag no.' },
        { key: 'location', label: 'Location', required: true },
        { key: 'condition', label: 'Condition', kind: 'pick', options: ['good', 'fair', 'repair', 'disposed'] },
        { key: 'value', label: 'Value (Rs.)', kind: 'number' },
      ]}
      toBody={v => ({ name: v.name.trim(), title: v.name.trim(), tag: v.tag?.trim(), location: v.location.trim(), condition: v.condition || 'good', status: v.condition || 'good', value: Number(v.value || 0) })}
      addLabel="Add asset"
      toolsRoute="AdminAssetsTools"
    />
  );
}

// ---------- Library ----------

export function AdminLibraryLive(_: ScreenProps) {
  const books = useApi('web:mod:library', () => modulesApi.list<BookRow>('library'));
  const issues = useApi('web:library:issues', () => libraryApi.issues());
  const [rules] = useRules();
  const readOnly = useReadOnly();
  const [tab, setTab] = useState('Issued');
  const [term, setTerm] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [b, setB] = useState<Record<string, string>>({});
  const [iss, setIss] = useState<Record<string, string>>({ days: '14' });
  const addBook = useMutation((body: Record<string, unknown>) => modulesApi.create('library', body), 'Book added');
  const issue = useMutation(libraryApi.issue, 'Book issued');
  const ret = useMutation(libraryApi.returnBook);

  const all = issues.data ?? [];
  const open = all.filter(i => !i.returned_on);
  const shownIssues = useFiltered(tab === 'Issued' ? open : all.filter(i => i.returned_on), term, i => `${i.bookTitle ?? ''} ${i.borrower}`);
  const shownBooks = useFiltered(books.data, term, x => `${x.title} ${x.author ?? ''} ${x.isbn ?? ''}`);
  const available = (book: BookRow) => book.copies - open.filter(i => i.book_id === book.id).length;
  const lateDays = (i: WebBookIssue) => Math.max(0, Math.floor((new Date(`${todayIso()}T00:00:00Z`).getTime() - new Date(`${i.due_on}T00:00:00Z`).getTime()) / 86400000));

  const doIssue = async () => {
    const book = (books.data ?? []).find(x => x.title === iss.book);
    if (!book) {
      toast('Pick a book');
      return;
    }
    const who = (iss.borrower ?? '').trim();
    if (!who) {
      toast('Enter the member (student or staff name / GR No.)');
      return;
    }
    if (available(book) <= 0) {
      toast('No copy of this book is available.');
      return;
    }
    // Issue limit from School settings (S-07).
    const held = open.filter(i => i.borrower.toLowerCase() === who.toLowerCase()).length;
    if (held >= rules.libraryIssueLimit) {
      toast(`${who} already has ${held} book(s). The limit is ${rules.libraryIssueLimit}.`);
      return;
    }
    if ((await issue.run({ bookId: book.id, borrower: who, days: Number(iss.days || 14) })) !== undefined) {
      logAudit('Library', `Issued "${book.title}" to ${who}`);
      setIssueOpen(false);
      setIss({ days: '14' });
      issues.refresh();
    }
  };

  const doReturn = async (i: WebBookIssue) => {
    const fine = lateDays(i) * FINE_PER_DAY;
    if ((await ret.run(i.id, fine)) !== undefined) {
      toast(fine ? `Returned · fine Rs. ${fine} (${lateDays(i)} days late)` : 'Returned on time');
      logAudit('Library', `Returned "${i.bookTitle ?? i.book_id}" from ${i.borrower}${fine ? `, fine Rs. ${fine}` : ''}`);
      issues.refresh();
    }
  };

  return (
    <LiveScreen
      title="Library"
      subtitle={`Catalog, issue/return and fines · limit ${rules.libraryIssueLimit} per member`}
      q={tab === 'Catalog' ? books : issues}
      toolsRoute="AdminLibraryTools"
      toolsLabel="Barcode labels, renewals & member view (sample)"
      exportTitle="Library"
      footer={
        <View style={ls.wrap}>
          <Button label="Issue book" icon={BookOpen} onPress={() => setIssueOpen(true)} disabled={readOnly} />
          <Button label="Add book" variant="outline" onPress={() => setBookOpen(true)} disabled={readOnly} />
        </View>
      }
    >
      <KpiGrid>
        <Kpi label="Titles" value={String((books.data ?? []).length)} />
        <Kpi label="Issued now" value={String(open.length)} />
        <Kpi label="Overdue" value={String(open.filter(i => i.overdue).length)} tone="danger" />
        <Kpi label="Fines collected" value={`Rs. ${all.reduce((a, i) => a + num(i.fine), 0).toLocaleString('en-US')}`} />
      </KpiGrid>
      <Segmented options={['Issued', 'Returned', 'Catalog']} value={tab} onChange={setTab} />
      <SearchBox value={term} onChange={setTerm} />
      {tab === 'Catalog' ? (
        <QueryView q={books} isEmpty={() => !shownBooks.length} emptyText="No books in the catalog yet.">
          {() => (
            <Card>
              {shownBooks.map((x, i) => (
                <ListRow key={x.id} icon={BookOpen} title={x.title} subtitle={`${x.author ?? '—'}${x.isbn ? ` · ISBN ${x.isbn}` : ''}`} right={<Badge label={`${available(x)}/${x.copies} free`} tone={available(x) > 0 ? 'success' : 'danger'} />} last={i === shownBooks.length - 1} />
              ))}
            </Card>
          )}
        </QueryView>
      ) : (
        <QueryView q={issues} isEmpty={() => !shownIssues.length} emptyText="Nothing here.">
          {() => (
            <Card>
              {shownIssues.map((x, i) => (
                <ListRow
                  key={x.id}
                  icon={BookOpen}
                  iconTone={x.overdue ? 'danger' : 'primary'}
                  title={`${x.bookTitle ?? `Book ${x.book_id}`} · ${x.borrower}`}
                  subtitle={x.returned_on ? `Returned ${fmtDate(x.returned_on)}${num(x.fine) ? ` · fine Rs. ${num(x.fine)}` : ''}` : `Issued ${fmtDate(x.issued_on)} · due ${fmtDate(x.due_on)}${x.overdue ? ` · ${lateDays(x)} days late (Rs. ${lateDays(x) * FINE_PER_DAY})` : ''}`}
                  right={x.returned_on ? <StatusBadge status="returned" /> : <Button label="Return" icon={RotateCcw} variant="outline" onPress={() => doReturn(x)} />}
                  last={i === shownIssues.length - 1}
                />
              ))}
            </Card>
          )}
        </QueryView>
      )}
      <FormSheet
        visible={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Add book"
        onSubmit={async () => {
          if (!b.title?.trim()) {
            toast('Enter the title');
            return;
          }
          if (!(Number(b.copies || 1) > 0)) {
            toast('Copies must be at least 1');
            return;
          }
          if ((await addBook.run({ title: b.title.trim(), author: b.author?.trim(), copies: Number(b.copies || 1), isbn: b.isbn?.trim() })) !== undefined) {
            setBookOpen(false);
            setB({});
            books.refresh();
          }
        }}
      >
        <Field label="Title *" value={b.title ?? ''} onChangeText={v => setB(p => ({ ...p, title: v }))} />
        <Field label="Author" value={b.author ?? ''} onChangeText={v => setB(p => ({ ...p, author: v }))} />
        <Field label="Copies" value={b.copies ?? ''} onChangeText={v => setB(p => ({ ...p, copies: v.replace(/\D/g, '') }))} keyboardType="numeric" placeholder="1" />
        <Field label="ISBN" value={b.isbn ?? ''} onChangeText={v => setB(p => ({ ...p, isbn: v }))} />
      </FormSheet>
      <FormSheet visible={issueOpen} onClose={() => setIssueOpen(false)} title="Issue book" submitLabel="Issue" onSubmit={doIssue}>
        <PickerField label="Book" value={iss.book ?? ''} options={(books.data ?? []).map(x => x.title)} onChange={v => setIss(p => ({ ...p, book: v }))} />
        <Field label="Member (student / staff)" value={iss.borrower ?? ''} onChangeText={v => setIss(p => ({ ...p, borrower: v }))} placeholder="Name or GR No." />
        <Field label="Days" value={iss.days ?? ''} onChangeText={v => setIss(p => ({ ...p, days: v.replace(/\D/g, '') }))} keyboardType="numeric" />
      </FormSheet>
      {!books.data?.length && !issues.data?.length ? <Empty text="No library data on the server yet." /> : null}
    </LiveScreen>
  );
}
