// Library (SOW 3.2 H, S-07): catalog with barcodes, issue/return/renewal with
// issue limits, automatic overdue fines paid at the counter or on the voucher.
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BookOpen, Plus, Printer, ScanBarcode, Users } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  Segmented,
  formatRs,
  toast,
} from '../../../components/ui';
import { FormSheet, KV, ListScreen, PickerField } from '../../../components/admin';
import { colors } from '../../../theme';
import { ScreenMap, ScreenProps, useNav, useParam } from '../../../navigation';
import { ADMIN_STAFF, ADMIN_STUDENTS, logAudit, useReadOnly, useRules } from '../../../data/admin';
import {
  Book,
  FINE_PER_DAY,
  LOAN_DAYS,
  Loan,
  dayLabel,
  overdueFine,
  stId,
  useBooks,
  useLoans,
} from '../../../data/admin-store';
import { ReadOnlyBanner, SmallBtn } from '../transport/screens';

const STUDENTS = ADMIN_STUDENTS.filter(s => s.status === 'Active');
const STAFF = ADMIN_STAFF.filter(s => s.status !== 'Left');

function memberName(type: Loan['memberType'], id: string) {
  return type === 'Student'
    ? ADMIN_STUDENTS.find(s => s.id === id)?.name ?? id
    : ADMIN_STAFF.find(s => s.id === id)?.name ?? id;
}

function available(book: Book, loans: Loan[]) {
  return book.copies - loans.filter(l => l.bookId === book.id && l.returned === undefined).length;
}

function loanState(l: Loan) {
  if (l.returned !== undefined) {
    return 'Returned';
  }
  if (l.due < 0) {
    return 'Overdue';
  }
  return l.due <= 3 ? 'Due soon' : 'On time';
}

// Barcode-like label (demo; not scannable).
export function Barcode({ code }: { code: string }) {
  const bars = useMemo(
    () =>
      code.split('').flatMap((ch, i) => {
        const c = ch.charCodeAt(0);
        return [((c + i) % 3) + 1, (c % 2) + 1];
      }),
    [code],
  );
  return (
    <View style={s.barcodeWrap}>
      <View style={s.bars}>
        {bars.map((w, i) => (
          <View key={i} style={[s.bar, { width: w }, i % 2 === 1 && s.barGap]} />
        ))}
      </View>
      <Text style={s.barcodeText}>{code}</Text>
    </View>
  );
}

// ---------- Main library screen ----------

function BookForm({ onClose }: { onClose: () => void }) {
  const [books, setBooks] = useBooks();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Stories');
  const [copies, setCopies] = useState('1');
  const submit = () => {
    const n = Number(copies);
    if (!title.trim() || !author.trim()) {
      toast('Enter the title and author');
    } else if (!Number.isInteger(n) || n <= 0) {
      toast('Copies must be a whole number above 0');
    } else {
      const b: Book = {
        id: stId('b'),
        title: title.trim(),
        author: author.trim(),
        category,
        copies: n,
        barcode: `BFS-LIB-000${101 + books.length}`,
      };
      setBooks(list => [...list, b]);
      logAudit('Library', `Catalogued "${b.title}" (${n} copies) ${b.barcode}`);
      toast(`Added. Barcode ${b.barcode}`);
      onClose();
    }
  };
  return (
    <FormSheet visible onClose={onClose} title="Add book" onSubmit={submit}>
      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Author" value={author} onChangeText={setAuthor} />
      <PickerField label="Category" value={category} options={['Stories', 'Classics', 'Reference', 'Urdu', 'Islamic', 'Teacher resource']} onChange={setCategory} />
      <Field label="Copies" value={copies} onChangeText={setCopies} keyboardType="number-pad" />
    </FormSheet>
  );
}

function LoanSheet({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const [books] = useBooks();
  const [, setLoans] = useLoans();
  const [pay, setPay] = useState('Paid at counter');
  const book = books.find(b => b.id === loan.bookId);
  const fine = overdueFine(loan);
  const doReturn = () => {
    setLoans(list =>
      list.map(l =>
        l.id === loan.id
          ? { ...l, returned: 0, fine, finePaid: fine ? (pay === 'Add to fee voucher' ? 'Voucher' : 'Counter') : undefined }
          : l,
      ),
    );
    logAudit('Library', `Returned "${book?.title}" by ${memberName(loan.memberType, loan.memberId)}${fine ? `; fine ${formatRs(fine)} ${pay === 'Add to fee voucher' ? 'added to voucher' : 'paid at counter'}` : ''}`);
    toast(fine ? `Returned. Fine ${formatRs(fine)} ${pay === 'Add to fee voucher' ? 'added to the fee voucher' : 'received'}.` : 'Returned on time');
    onClose();
  };
  const renew = () => {
    if (fine > 0) {
      toast('This book is overdue. Return it and clear the fine before renewing.');
      return;
    }
    setLoans(list => list.map(l => (l.id === loan.id ? { ...l, due: Math.max(l.due, 0) + LOAN_DAYS } : l)));
    logAudit('Library', `Renewed "${book?.title}" for ${memberName(loan.memberType, loan.memberId)}`);
    toast(`Renewed until ${dayLabel(Math.max(loan.due, 0) + LOAN_DAYS)}`);
    onClose();
  };
  return (
    <FormSheet visible onClose={onClose} title={book?.title ?? 'Loan'} onSubmit={doReturn} submitLabel="Return book">
      <KV k="Member" v={`${memberName(loan.memberType, loan.memberId)} (${loan.memberType})`} />
      <KV k="Issued" v={dayLabel(loan.issued)} />
      <KV k="Due" v={dayLabel(loan.due)} />
      <KV k="Fine" v={fine ? `${formatRs(fine)} (${-loan.due} days × ${formatRs(FINE_PER_DAY)})` : 'None'} last />
      {fine ? (
        <Segmented options={['Paid at counter', 'Add to fee voucher']} value={pay} onChange={setPay} />
      ) : null}
      <Button label="Renew for 14 days" variant="outline" onPress={renew} />
    </FormSheet>
  );
}

export function AdminLibrary(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [rules] = useRules();
  const [tab, setTab] = useState('Catalog');
  const [books] = useBooks();
  const [loans] = useLoans();
  const [bookForm, setBookForm] = useState(false);
  const [loan, setLoan] = useState<Loan | null>(null);
  const active = loans.filter(l => l.returned === undefined);
  const overdue = active.filter(l => l.due < 0);
  const fines = overdue.reduce((a, l) => a + overdueFine(l), 0);

  const head = (
    <>
      {ro ? <ReadOnlyBanner /> : null}
      <Card>
        <KV k="Issued now" v={String(active.length)} />
        <KV k="Overdue" v={<Badge label={`${overdue.length} · ${formatRs(fines)} fines`} tone={overdue.length ? 'danger' : 'success'} />} />
        <KV k="Issue limit per member" v={`${rules.libraryIssueLimit} books`} last />
      </Card>
      {ro ? null : <Button label="Issue a book" icon={ScanBarcode} onPress={() => nav.push('AdminLibraryIssue')} />}
      <Segmented options={['Catalog', 'Issued', 'Members']} value={tab} onChange={setTab} />
    </>
  );

  const members = useMemo(
    () => [
      ...STUDENTS.map(x => ({ type: 'Student' as const, id: x.id, name: x.name, sub: `${x.gr} · ${x.className}-${x.section}` })),
      ...STAFF.map(x => ({ type: 'Staff' as const, id: x.id, name: x.name, sub: `${x.id} · ${x.designation}` })),
    ],
    [],
  );

  return (
    <>
      {tab === 'Catalog' ? (
        <ListScreen
          title="Library"
          subtitle={`${books.length} titles · ${books.reduce((a, b) => a + b.copies, 0)} copies`}
          items={books}
          keyOf={b => b.id}
          searchText={b => `${b.title} ${b.author} ${b.category} ${b.barcode}`}
          filters={[{ label: 'Category', options: ['All', ...Array.from(new Set(books.map(b => b.category)))], get: b => b.category }]}
          header={head}
          renderItem={(b, last) => {
            const av = available(b, loans);
            return (
              <ListRow
                icon={BookOpen}
                title={b.title}
                subtitle={`${b.author} · ${b.category} · ${b.barcode}`}
                right={<Badge label={`${av}/${b.copies} available`} tone={av ? 'success' : 'danger'} />}
                onPress={() => nav.push('AdminBookDetail', { id: b.id })}
                last={last}
              />
            );
          }}
          onAdd={ro ? undefined : () => setBookForm(true)}
          addLabel="Add book"
        />
      ) : tab === 'Issued' ? (
        <ListScreen
          title="Library"
          subtitle={`${active.length} books issued`}
          items={active}
          keyOf={l => l.id}
          searchText={l => `${books.find(b => b.id === l.bookId)?.title ?? ''} ${memberName(l.memberType, l.memberId)}`}
          filters={[
            { label: 'Status', options: ['All', 'Overdue', 'Due soon', 'On time'], get: loanState },
            { label: 'Member', options: ['All', 'Student', 'Staff'], get: l => l.memberType },
          ]}
          header={head}
          renderItem={(l, last) => {
            const st = loanState(l);
            const fine = overdueFine(l);
            return (
              <ListRow
                icon={BookOpen}
                title={books.find(b => b.id === l.bookId)?.title ?? l.bookId}
                subtitle={`${memberName(l.memberType, l.memberId)} · issued ${dayLabel(l.issued)} · due ${dayLabel(l.due)}`}
                right={<Badge label={fine ? `Overdue · ${formatRs(fine)}` : st} tone={st === 'Overdue' ? 'danger' : st === 'Due soon' ? 'warn' : 'success'} />}
                onPress={ro ? undefined : () => setLoan(l)}
                last={last}
              />
            );
          }}
        />
      ) : (
        <ListScreen
          title="Library"
          subtitle="Members and books they hold"
          items={members}
          keyOf={m => `${m.type}:${m.id}`}
          searchText={m => `${m.name} ${m.sub}`}
          filters={[
            { label: 'Type', options: ['All', 'Student', 'Staff'], get: m => m.type },
            { label: 'Books', options: ['All', 'Holding books', 'None'], get: m => (active.some(l => l.memberId === m.id) ? 'Holding books' : 'None') },
          ]}
          header={head}
          renderItem={(m, last) => {
            const n = active.filter(l => l.memberId === m.id).length;
            return (
              <ListRow
                avatar={m.name}
                title={m.name}
                subtitle={`${m.type} · ${m.sub}`}
                right={<Badge label={`${n}/${rules.libraryIssueLimit}`} tone={n >= rules.libraryIssueLimit ? 'warn' : 'neutral'} />}
                onPress={() => nav.push('AdminLibraryMember', { type: m.type, id: m.id })}
                last={last}
              />
            );
          }}
        />
      )}
      {bookForm ? <BookForm onClose={() => setBookForm(false)} /> : null}
      {loan ? <LoanSheet loan={loan} onClose={() => setLoan(null)} /> : null}
    </>
  );
}

// ---------- Issue (by barcode) ----------

export function AdminLibraryIssue(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [rules] = useRules();
  const [books] = useBooks();
  const [loans, setLoans] = useLoans();
  const preset = useParam('bookId', '');
  const [type, setType] = useState('Student');
  const [member, setMember] = useState(`${STUDENTS[0].name} · ${STUDENTS[0].gr}`);
  const [title, setTitle] = useState(books.find(b => b.id === preset)?.title ?? '');
  // Names repeat in the dummy data, so the picker shows a unique label.
  const people =
    type === 'Student'
      ? STUDENTS.map(x => ({ id: x.id, name: x.name, label: `${x.name} · ${x.gr}` }))
      : STAFF.map(x => ({ id: x.id, name: x.name, label: `${x.name} · ${x.id}` }));
  const who = people.find(p => p.label === member) ?? people[0];
  const holding = loans.filter(l => l.memberId === who.id && l.returned === undefined);
  const book = books.find(b => b.title === title);

  const scan = () => {
    const b = books.find(x => available(x, loans) > 0 && x.title !== title) ?? books.find(x => available(x, loans) > 0);
    if (!b) {
      toast('No copies available');
      return;
    }
    setTitle(b.title);
    toast(`Scanned ${b.barcode}`);
  };

  const issue = () => {
    if (!book) {
      toast('Scan or choose a book');
      return;
    }
    if (available(book, loans) <= 0) {
      toast('No copy of this book is available');
      return;
    }
    // S-07: a member cannot exceed the issue limit.
    if (holding.length >= rules.libraryIssueLimit) {
      toast(`${who.name} already has ${holding.length} books. Issue limit is ${rules.libraryIssueLimit}.`);
      return;
    }
    if (holding.some(l => l.bookId === book.id)) {
      toast(`${who.name} already has this book`);
      return;
    }
    const l: Loan = {
      id: stId('l'),
      bookId: book.id,
      memberType: type === 'Staff' ? 'Staff' : 'Student',
      memberId: who.id,
      issued: 0,
      due: LOAN_DAYS,
      fine: 0,
    };
    setLoans(list => [l, ...list]);
    logAudit('Library', `Issued "${book.title}" to ${who.name}, due ${dayLabel(LOAN_DAYS)}`);
    toast(`Issued to ${who.name}. Due ${dayLabel(LOAN_DAYS)}.`);
    nav.pop();
  };

  return (
    <Screen
      title="Issue a book"
      subtitle={`Loan ${LOAN_DAYS} days · fine ${formatRs(FINE_PER_DAY)} per late day`}
      footer={ro ? undefined : <Button label="Issue book" onPress={issue} />}
    >
      {ro ? <ReadOnlyBanner /> : null}
      <Segmented
        options={['Student', 'Staff']}
        value={type}
        onChange={v => {
          setType(v);
          setMember(v === 'Student' ? `${STUDENTS[0].name} · ${STUDENTS[0].gr}` : `${STAFF[0].name} · ${STAFF[0].id}`);
        }}
      />
      <PickerField label="Member" value={member} options={people.map(p => p.label)} onChange={setMember} />
      <InfoBanner
        tone={holding.length >= rules.libraryIssueLimit ? 'danger' : 'info'}
        icon={Users}
        text={`${who.name} holds ${holding.length} of ${rules.libraryIssueLimit} books${holding.length ? `: ${holding.map(l => books.find(b => b.id === l.bookId)?.title).join(', ')}` : ''}.`}
      />
      <Button label="Scan barcode" icon={ScanBarcode} variant="outline" onPress={scan} />
      <PickerField
        label="Book"
        value={title}
        options={books.filter(b => available(b, loans) > 0).map(b => b.title)}
        onChange={setTitle}
        placeholder="Choose an available book"
      />
      {book ? (
        <Card>
          <KV k="Barcode" v={book.barcode} />
          <KV k="Available" v={`${available(book, loans)} of ${book.copies}`} />
          <KV k="Due date" v={dayLabel(LOAN_DAYS)} last />
        </Card>
      ) : null}
    </Screen>
  );
}

// ---------- Book detail ----------

export function AdminBookDetail(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const id = useParam('id', 'b1');
  const [books, setBooks] = useBooks();
  const [loans] = useLoans();
  const book = books.find(b => b.id === id) ?? books[0];
  const out = loans.filter(l => l.bookId === book.id && l.returned === undefined);
  const setCopies = (d: number) => {
    const next = book.copies + d;
    if (next < out.length || next < 1) {
      toast(`${out.length} copies are issued. Copies cannot go below that.`);
      return;
    }
    setBooks(list => list.map(b => (b.id === book.id ? { ...b, copies: next } : b)));
    logAudit('Library', `"${book.title}" copies ${book.copies} → ${next}`);
  };
  return (
    <Screen title={book.title} subtitle={`${book.author} · ${book.category}`}>
      {ro ? <ReadOnlyBanner /> : null}
      <Card title="Barcode label">
        <Barcode code={book.barcode} />
        <Button label="Print label" icon={Printer} variant="outline" onPress={() => toast(`Label ${book.barcode} sent to printer (demo)`)} />
      </Card>
      <Card>
        <KV k="Copies" v={String(book.copies)} />
        <KV k="Available" v={String(book.copies - out.length)} last />
        {ro ? null : (
          <View style={s.row}>
            <SmallBtn label="− Copy" tone="outline" onPress={() => setCopies(-1)} />
            <SmallBtn label="+ Copy" onPress={() => setCopies(1)} />
          </View>
        )}
      </Card>
      <Card title="Issued to">
        {out.length === 0 ? <Text style={s.muted}>All copies are on the shelf.</Text> : null}
        {out.map((l, i) => (
          <ListRow
            key={l.id}
            avatar={memberName(l.memberType, l.memberId)}
            title={memberName(l.memberType, l.memberId)}
            subtitle={`${l.memberType} · due ${dayLabel(l.due)}`}
            right={<Badge label={loanState(l)} tone={l.due < 0 ? 'danger' : 'success'} />}
            last={i === out.length - 1}
          />
        ))}
      </Card>
      {ro ? null : (
        <Button label="Issue this book" icon={Plus} onPress={() => nav.push('AdminLibraryIssue', { bookId: book.id })} />
      )}
    </Screen>
  );
}

// ---------- Member view (portal view of issued books) ----------

export function AdminLibraryMember(_: ScreenProps) {
  const type = useParam<'Student' | 'Staff'>('type', 'Student');
  const id = useParam('id', 'st2');
  const [books] = useBooks();
  const [loans] = useLoans();
  const [rules] = useRules();
  const mine = loans.filter(l => l.memberId === id);
  const active = mine.filter(l => l.returned === undefined);
  const history = mine.filter(l => l.returned !== undefined);
  const name = memberName(type, id);
  return (
    <Screen title={name} subtitle={`${type} · ${active.length} of ${rules.libraryIssueLimit} books`}>
      <InfoBanner text="This is what the student and parent see in the portal." />
      <Card title="Issued now">
        {active.length === 0 ? <Text style={s.muted}>No books issued.</Text> : null}
        {active.map((l, i) => {
          const fine = overdueFine(l);
          return (
            <ListRow
              key={l.id}
              icon={BookOpen}
              title={books.find(b => b.id === l.bookId)?.title ?? l.bookId}
              subtitle={`Issued ${dayLabel(l.issued)} · due ${dayLabel(l.due)}`}
              right={<Badge label={fine ? `Overdue ${-l.due}d · ${formatRs(fine)}` : `Due in ${l.due}d`} tone={fine ? 'danger' : 'warn'} />}
              last={i === active.length - 1}
            />
          );
        })}
      </Card>
      <Card title="History">
        {history.length === 0 ? <Text style={s.muted}>No returned books yet.</Text> : null}
        {history.map((l, i) => (
          <ListRow
            key={l.id}
            icon={BookOpen}
            title={books.find(b => b.id === l.bookId)?.title ?? l.bookId}
            subtitle={`Returned ${dayLabel(l.returned ?? 0)}${l.fine ? ` · fine ${formatRs(l.fine)} (${l.finePaid === 'Voucher' ? 'on voucher' : 'paid'})` : ''}`}
            right={<Badge label={l.fine ? formatRs(l.fine) : 'On time'} tone={l.fine ? 'neutral' : 'success'} />}
            last={i === history.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

export const libraryScreens: ScreenMap = {
  AdminLibrary,
  AdminLibraryIssue,
  AdminBookDetail,
  AdminLibraryMember,
};

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  barcodeWrap: { alignItems: 'center', paddingVertical: 10, gap: 6 },
  bars: { flexDirection: 'row', height: 54, alignItems: 'stretch' },
  bar: { backgroundColor: '#000' },
  barGap: { backgroundColor: 'transparent' },
  barcodeText: { fontSize: 13, fontWeight: '700', color: colors.text, letterSpacing: 1 },
});
