// Accounts screens backed by the school server (/api/web/fees, payroll,
// modules/expenses, modules/online-pay). Rules the server does not cover stay
// on the sample "tools" screens linked from here.
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Banknote, Building, CalendarDays, CreditCard, FileSpreadsheet, Lock, Plus, Printer, Receipt, Search, UserMinus, Wallet } from 'lucide-react-native';
import { Badge, Button, Card, Chips, Field, InfoBanner, ListRow, Segmented, toast } from '../../../components/ui';
import { FormSheet, KV, Kpi, KpiGrid, PickerField } from '../../../components/admin';
import { Empty, QueryView } from '../../../components/states';
import { useApi, useMutation } from '../../../api/hooks';
import { contextApi, feesApi, num, payrollApi, studentsApi, WebStudentRow, WebVoucher } from '../../../api/webB';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { logAudit, useReadOnly, useRules } from '../../../data/admin';
import {
  fmtDate,
  LiveScreen,
  liveStyles as ls,
  Money,
  ModuleRecordsScreen,
  SearchBox,
  StatusBadge,
  thisMonth,
  todayIso,
  useFiltered,
  useModule,
} from './live-kit';

const monthsAround = () => {
  const base = thisMonth();
  const [y, m] = base.split('-').map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 + i - 1, 1));
    return d.toISOString().slice(0, 7);
  });
};

function useClasses() {
  return useApi('web:context', () => contextApi.get());
}

// Search students on the server and pick one.
export function StudentPicker({ value, onChange }: { value: WebStudentRow | null; onChange: (s: WebStudentRow) => void }) {
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const q = useApi(query ? `web:students:${query}` : null, () => studentsApi.list({ search: query, pageSize: 10 }));
  return (
    <View style={ls.wrapCol}>
      <Text style={ls.label}>Student *</Text>
      {value ? (
        <ListRow avatar={value.name} title={value.name} subtitle={`${value.grNo} · ${value.className}-${value.section}`} right={<Badge label="Selected" tone="success" />} last />
      ) : null}
      <View style={ls.row}>
        <View style={ls.flex}>
          <Field icon={Search} value={term} onChangeText={setTerm} placeholder="Name or GR No." />
        </View>
        <Button label="Find" variant="outline" onPress={() => setQuery(term.trim())} />
      </View>
      {query ? (
        <QueryView q={q} isEmpty={d => !d.items.length} emptyText="No student found.">
          {d => (
            <Card>
              {d.items.map((s, i) => (
                <ListRow key={s.id} avatar={s.name} title={s.name} subtitle={`${s.grNo} · ${s.className}-${s.section}`} onPress={() => onChange(s)} last={i === d.items.length - 1} />
              ))}
            </Card>
          )}
        </QueryView>
      ) : null}
    </View>
  );
}

// ---------- Fee heads & structure ----------

export function AdminFeeStructureLive(_: ScreenProps) {
  const heads = useApi('web:fees:heads', () => feesApi.heads());
  const ctx = useClasses();
  const readOnly = useReadOnly();
  const [className, setClassName] = useState('');
  const klass = ctx.data?.classes.find(c => c.name === className) ?? ctx.data?.classes[0];
  const structure = useApi(klass ? `web:fees:structure:${klass.id}` : null, () => feesApi.structure(Number(klass?.id)));
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [headOpen, setHeadOpen] = useState(false);
  const [headName, setHeadName] = useState('');
  const [headType, setHeadType] = useState('monthly');
  const saveHead = useMutation(feesApi.saveHead, 'Fee head saved');
  const saveStructure = useMutation(feesApi.saveStructure, 'Fee structure saved');

  const current = useMemo(() => {
    const m: Record<string, number> = {};
    (structure.data ?? []).filter(r => String(r.class_id) === String(klass?.id)).forEach(r => {
      m[String(r.fee_head_id)] = num(r.amount);
    });
    return m;
  }, [structure.data, klass]);

  const save = async () => {
    if (!klass) {
      return;
    }
    const amounts: Record<string, number> = { ...current };
    for (const [k, v] of Object.entries(edit)) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        toast('Amounts must be 0 or more');
        return;
      }
      amounts[k] = n;
    }
    if ((await saveStructure.run(Number(klass.id), amounts)) !== undefined) {
      logAudit('Fee structure', `${klass.name}: ${JSON.stringify(amounts)}`);
      setEdit({});
      structure.refresh();
    }
  };

  return (
    <LiveScreen title="Fee heads & structure" subtitle="Class-wise amount per head for this session" q={heads} toolsRoute="AdminFeeStructureTools" exportTitle="Fee structure">
      <Card title="Fee heads" action={{ label: 'Add head', onPress: () => (readOnly ? toast('Read-only session') : setHeadOpen(true)) }}>
        <QueryView q={heads} isEmpty={d => !d.length} emptyText="No fee heads yet.">
          {d =>
            d.map((h, i) => (
              <ListRow
                key={h.id}
                icon={Receipt}
                title={h.name}
                subtitle={`${h.type === 'monthly' ? 'Monthly / recurring' : 'One-time'}${h.is_discountable ? ' · discountable' : ''}`}
                right={<Badge label={h.is_active ? 'Active' : 'Inactive'} tone={h.is_active ? 'success' : 'neutral'} />}
                onPress={async () => {
                  if (readOnly) {
                    return;
                  }
                  if ((await saveHead.run({ name: h.name, type: h.type, discountable: h.is_discountable, active: !h.is_active }, h.id)) !== undefined) {
                    heads.refresh();
                  }
                }}
                last={i === d.length - 1}
              />
            ))
          }
        </QueryView>
        <Text style={ls.small}>Tap a head to activate or deactivate it (heads with records are never deleted).</Text>
      </Card>
      <QueryView q={ctx}>
        {c => (
          <PickerField label="Class" value={klass?.name ?? ''} options={c.classes.map(x => x.name)} onChange={setClassName} />
        )}
      </QueryView>
      {klass ? (
        <Card title={`Amounts · ${klass.name}`}>
          <QueryView q={structure}>
            {() =>
              (heads.data ?? []).map(h => (
                <View key={h.id} style={ls.row}>
                  <Text style={[ls.label, ls.flex]}>{h.name}</Text>
                  <View style={ls.amountBox}>
                    <Field
                      value={edit[String(h.id)] ?? String(current[String(h.id)] ?? '')}
                      onChangeText={v => setEdit(p => ({ ...p, [String(h.id)]: v.replace(/[^\d.]/g, '') }))}
                      keyboardType="numeric"
                      placeholder="0"
                      editable={!readOnly}
                    />
                  </View>
                </View>
              ))
            }
          </QueryView>
          <Button label="Save structure" onPress={save} loading={saveStructure.busy} disabled={readOnly || !Object.keys(edit).length} />
        </Card>
      ) : null}
      <FormSheet
        visible={headOpen}
        onClose={() => setHeadOpen(false)}
        title="New fee head"
        onSubmit={async () => {
          if (!headName.trim()) {
            toast('Enter a name');
            return;
          }
          if ((await saveHead.run({ name: headName.trim(), type: headType })) !== undefined) {
            setHeadName('');
            setHeadOpen(false);
            heads.refresh();
          }
        }}
      >
        <Field label="Name" value={headName} onChangeText={setHeadName} placeholder="e.g. Lab fee" />
        <Segmented options={['monthly', 'one-time']} value={headType} onChange={setHeadType} />
      </FormSheet>
    </LiveScreen>
  );
}

// ---------- Voucher generation ----------

export function AdminVoucherGenerationLive(_: ScreenProps) {
  const readOnly = useReadOnly();
  const [month, setMonth] = useState(thisMonth());
  const [kind, setKind] = useState<'Monthly' | 'Advance' | 'Custom'>('Monthly');
  const [student, setStudent] = useState<WebStudentRow | null>(null);
  const [months, setMonths] = useState('3');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [last, setLast] = useState<string | null>(null);
  const bulk = useMutation(feesApi.generate);
  const single = useMutation(feesApi.createVoucher, 'Voucher saved');

  const runBulk = async () => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast('Month must be YYYY-MM');
      return;
    }
    const r = await bulk.run(month);
    if (r) {
      setLast(`${r.count} voucher(s) generated for ${month}. Students who already had one were skipped.`);
      logAudit('Voucher generation', `Bulk monthly ${month}: ${r.count}`);
    }
  };

  const runSingle = async () => {
    if (!student) {
      toast('Pick a student');
      return;
    }
    if (kind === 'Custom' && (!title.trim() || !(Number(amount) > 0))) {
      toast('Enter a title and an amount');
      return;
    }
    if (kind === 'Advance' && !(Number(months) >= 2 && Number(months) <= 12)) {
      toast('Advance months must be 2 to 12');
      return;
    }
    const r = await single.run({
      studentId: Number(student.id),
      type: kind === 'Monthly' ? 'monthly' : kind === 'Advance' ? 'advance' : 'other',
      month,
      months: kind === 'Advance' ? Number(months) : undefined,
      title: kind === 'Custom' ? title.trim() : undefined,
      amount: kind === 'Custom' ? Number(amount) : undefined,
    });
    if (r !== undefined) {
      setLast(`${kind} voucher saved for ${student.name}.`);
      logAudit('Voucher generation', `${kind} for ${student.grNo} ${month}`);
    }
  };

  return (
    <LiveScreen title="Voucher generation" subtitle="Arrears, discounts, transport and store sales are added by the server" toolsRoute="AdminVoucherGenerationTools">
      {readOnly ? <InfoBanner tone="warn" icon={Lock} text="This session is closed (read-only)." /> : null}
      <PickerField label="Month" value={month} options={monthsAround()} onChange={setMonth} />
      <Card title="Bulk monthly · whole campus">
        <Text style={ls.small}>Creates one monthly voucher for every active student who does not have one for this month.</Text>
        <Button label={`Generate ${month}`} icon={Receipt} onPress={runBulk} loading={bulk.busy} disabled={readOnly} />
      </Card>
      <Card title="Single / advance / custom">
        <Chips options={['Monthly', 'Advance', 'Custom']} value={kind} onChange={v => setKind(v as typeof kind)} />
        <StudentPicker value={student} onChange={setStudent} />
        {kind === 'Advance' ? <Field label="Months" value={months} onChangeText={setMonths} keyboardType="numeric" /> : null}
        {kind === 'Custom' ? (
          <>
            <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Annual trip fund" />
            <Field label="Amount (Rs.)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          </>
        ) : null}
        <Button label="Create voucher" icon={Plus} onPress={runSingle} loading={single.busy} disabled={readOnly} />
      </Card>
      {last ? <InfoBanner tone="success" text={last} /> : null}
    </LiveScreen>
  );
}

// ---------- Vouchers list / print & send ----------

export function AdminVoucherPrintLive(_: ScreenProps) {
  const nav = useNav();
  const [status, setStatus] = useState('All');
  const [month, setMonth] = useState('All');
  const [term, setTerm] = useState('');
  const q = useApi(`web:fees:vouchers:${status}:${month}`, () =>
    feesApi.vouchers({ status: status === 'All' ? undefined : status.toLowerCase(), month: month === 'All' ? undefined : month }),
  );
  const list = useFiltered(q.data, term, v => `${v.voucherNo} ${v.studentName ?? ''} ${v.grNo ?? ''} ${v.title ?? ''}`);
  const exp = useMutation(feesApi.exportCsv);
  return (
    <LiveScreen
      title="Vouchers · print & send"
      subtitle="3-copy voucher with QR; tap a voucher to print or send"
      q={q}
      toolsRoute="AdminVoucherPrintTools"
      right={
        <Button
          label="CSV"
          icon={FileSpreadsheet}
          variant="outline"
          loading={exp.busy}
          onPress={async () => {
            const r = await exp.run();
            if (r) {
              toast(`Export ready: ${Math.max(0, r.csv.split('\n').length - 1)} vouchers (CSV)`);
            }
          }}
        />
      }
    >
      <Chips options={['All', 'Unpaid', 'Partial', 'Paid']} value={status} onChange={setStatus} />
      <PickerField label="Month" value={month} options={['All', ...monthsAround()]} onChange={setMonth} />
      <SearchBox value={term} onChange={setTerm} placeholder="Voucher no., student or GR No." />
      <QueryView q={q}>
        {() =>
          list.length ? (
            <Card>
              {list.map((v, i) => (
                <ListRow
                  key={v.id}
                  icon={Receipt}
                  title={`${v.voucherNo} · ${v.studentName ?? '—'}`}
                  subtitle={`${v.grNo ?? ''} · ${v.title ?? v.month ?? ''} · due ${fmtDate(v.dueDate)}`}
                  right={
                    <View style={ls.right}>
                      <Money value={v.amount} />
                      <StatusBadge status={v.status} />
                    </View>
                  }
                  onPress={() => nav.push('AdminVoucherDetail', { id: v.id })}
                  last={i === list.length - 1}
                />
              ))}
            </Card>
          ) : (
            <Empty text="No vouchers match." />
          )
        }
      </QueryView>
    </LiveScreen>
  );
}

// Live voucher detail for numeric ids; sample ids fall back to the sample screen.
export function makeVoucherDetail(Sample: React.ComponentType<ScreenProps>) {
  return function AdminVoucherDetailLive(props: ScreenProps) {
    const id = String(useParam('id', ''));
    if (!/^\d+$/.test(id)) {
      return <Sample {...props} />;
    }
    return <VoucherDetail id={id} />;
  };
}

function VoucherDetail({ id }: { id: string }) {
  const nav = useNav();
  const q = useApi(`web:print:voucher:${id}`, () => feesApi.print(id));
  const [copy, setCopy] = useState('');
  return (
    <LiveScreen title="Voucher" subtitle="3 copies: office, bank and parent" q={q}>
      <QueryView q={q}>
        {v => {
          const balance = v.amount - v.paid;
          const shown = copy || v.copies[0];
          return (
            <>
              <Segmented options={v.copies} value={shown} onChange={setCopy} />
              <Card title={`${v.school} · ${shown} copy`}>
                <KV k="Voucher no." v={v.voucherNo} />
                <KV k="Student" v={`${v.student.name} (${v.student.grNo})`} />
                <KV k="Father" v={v.student.father ?? '—'} />
                <KV k="Class" v={`${v.student.className}-${v.student.section}`} />
                <KV k="Month" v={v.month ?? '—'} />
                <KV k="Issue / due" v={`${fmtDate(v.issueDate)} / ${fmtDate(v.dueDate)}`} last />
              </Card>
              <Card title="Breakdown">
                {v.lines.map((l, i) => (
                  <KV key={`${l.head}${i}`} k={`${l.head}${l.discount ? ` (− Rs. ${l.discount.toLocaleString('en-US')} discount)` : ''}`} v={`Rs. ${(l.amount - l.discount).toLocaleString('en-US')}`} />
                ))}
                <KV k="Total" v={`Rs. ${v.amount.toLocaleString('en-US')}`} />
                <KV k="Paid" v={`Rs. ${v.paid.toLocaleString('en-US')}`} />
                <KV k="Balance" v={<StatusBadge status={balance > 0 ? v.status : 'paid'} />} last />
              </Card>
              <View style={ls.wrap}>
                <Button label="Print 3 copies" icon={Printer} variant="outline" onPress={() => toast('Print preview ready (demo)')} />
                <Button label="WhatsApp / portal" variant="outline" onPress={() => toast('Voucher shared to the parent portal (demo)')} />
              </View>
              {balance > 0 ? (
                <Button label="Collect payment" icon={Banknote} onPress={() => nav.push('AdminFeeCounter', { voucherNo: v.voucherNo })} />
              ) : (
                <InfoBanner icon={Lock} text="A paid voucher cannot be edited. Reversal needs a reason and approval (no API yet)." />
              )}
            </>
          );
        }}
      </QueryView>
    </LiveScreen>
  );
}

// ---------- Fee collection counter ----------

export function AdminFeeCounterLive(_: ScreenProps) {
  const first = String(useParam('voucherNo', ''));
  const summary = useApi('web:fees:counter', () => feesApi.counter());
  const [term, setTerm] = useState(first);
  const [query, setQuery] = useState(first);
  const found = useApi(query ? `web:fees:find:${query}` : null, () => feesApi.vouchers({ search: query }));
  const [pick, setPick] = useState<WebVoucher | null>(null);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'cash' | 'bank' | 'online'>('cash');
  const [ref, setRef] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const collect = useMutation(feesApi.collect, 'Payment received');
  const readOnly = useReadOnly();

  const take = async () => {
    if (!pick) {
      return;
    }
    const a = Number(amount || pick.balance);
    if (!(a > 0)) {
      toast('Enter an amount');
      return;
    }
    if (a > pick.balance) {
      toast(`Amount is more than the balance (Rs. ${pick.balance.toLocaleString('en-US')})`);
      return;
    }
    if (mode !== 'cash' && !ref.trim()) {
      toast('Enter the bank / transaction reference');
      return;
    }
    const r = await collect.run({ voucherId: Number(pick.id), amount: a, mode, reference: ref.trim() || undefined });
    if (r) {
      setReceipt(`Receipt ${r.receiptNo} · voucher is now ${r.voucherStatus}`);
      logAudit('Fee collection', `${r.receiptNo} · ${pick.voucherNo} · Rs. ${a} · ${mode}`);
      setPick(null);
      setAmount('');
      setRef('');
      summary.refresh();
      found.refresh();
    }
  };

  return (
    <LiveScreen title="Fee collection counter" subtitle="Find a voucher by number or QR; full or partial payment" q={summary} toolsRoute="AdminFeeCounterTools">
      <QueryView q={summary}>
        {s => (
          <KpiGrid>
            <Kpi label="Collected today" value={`Rs. ${s.collectedToday.toLocaleString('en-US')}`} />
            <Kpi label="Cash" value={`Rs. ${s.cashToday.toLocaleString('en-US')}`} />
            <Kpi label="Bank" value={`Rs. ${s.bankToday.toLocaleString('en-US')}`} />
            <Kpi label="Online" value={`Rs. ${s.onlineToday.toLocaleString('en-US')}`} />
          </KpiGrid>
        )}
      </QueryView>
      <View style={ls.row}>
        <View style={ls.flex}>
          <Field icon={Search} value={term} onChangeText={setTerm} placeholder="Voucher no. e.g. V-26-000003" />
        </View>
        <Button label="Find" variant="outline" onPress={() => setQuery(term.trim())} />
      </View>
      <Button label="Scan QR" variant="outline" onPress={() => toast('Camera scanning needs a native scanner (not in this build). Type the voucher number.')} />
      {receipt ? <InfoBanner tone="success" text={receipt} /> : null}
      {query ? (
        <QueryView q={found} isEmpty={d => !d.length} emptyText="No voucher found.">
          {d => (
            <Card>
              {d.map((v, i) => (
                <ListRow
                  key={v.id}
                  icon={Receipt}
                  title={`${v.voucherNo} · ${v.studentName ?? ''}`}
                  subtitle={`${v.title ?? v.month ?? ''} · balance Rs. ${v.balance.toLocaleString('en-US')}`}
                  right={<StatusBadge status={v.status} />}
                  onPress={() => (v.balance <= 0 ? toast('This voucher is already paid.') : setPick(v))}
                  last={i === d.length - 1}
                />
              ))}
            </Card>
          )}
        </QueryView>
      ) : null}
      {pick ? (
        <Card title={`Collect · ${pick.voucherNo}`}>
          <KV k="Student" v={pick.studentName ?? '—'} />
          <KV k="Total / paid" v={`Rs. ${pick.amount.toLocaleString('en-US')} / Rs. ${pick.paid.toLocaleString('en-US')}`} />
          <KV k="Balance" v={`Rs. ${pick.balance.toLocaleString('en-US')}`} last />
          <Field label="Amount (leave empty for full)" value={amount} onChangeText={v => setAmount(v.replace(/[^\d]/g, ''))} keyboardType="numeric" placeholder={String(pick.balance)} />
          <Chips options={['cash', 'bank', 'online']} value={mode} onChange={v => setMode(v as typeof mode)} />
          {mode !== 'cash' ? <Field label="Reference" value={ref} onChangeText={setRef} /> : null}
          <Button label="Take payment & print receipt" icon={Banknote} onPress={take} loading={collect.busy} disabled={readOnly} />
        </Card>
      ) : null}
    </LiveScreen>
  );
}

// ---------- Defaulters + waivers/refunds ----------

export function AdminDefaultersLive(_: ScreenProps) {
  const q = useApi('web:fees:defaulters', () => feesApi.defaulters());
  const waivers = useApi('web:fees:waivers', () => feesApi.waivers());
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'fine' | 'refund' | 'adjustment'>('fine');
  const [student, setStudent] = useState<WebStudentRow | null>(null);
  const [wAmount, setWAmount] = useState('');
  const [reason, setReason] = useState('');
  const save = useMutation(feesApi.saveWaiver, 'Sent for approval');
  const list = useFiltered(
    (q.data ?? []).filter(d => d.amount > 0),
    term,
    d => `${d.name} ${d.grNo} ${d.mobile ?? ''}`,
  );
  const total = list.reduce((a, d) => a + d.amount, 0);
  return (
    <LiveScreen title="Defaulters" subtitle="Students with unpaid or partial vouchers" q={q} toolsRoute="AdminDefaultersTools" toolsLabel="Reminders, installments & holds (sample)" exportTitle="Defaulters">
      <KpiGrid>
        <Kpi label="Defaulters" value={String(list.length)} tone="danger" />
        <Kpi label="Outstanding" value={`Rs. ${total.toLocaleString('en-US')}`} tone="danger" />
      </KpiGrid>
      <SearchBox value={term} onChange={setTerm} placeholder="Name, GR No. or mobile" />
      <QueryView q={q}>
        {() =>
          list.length ? (
            <Card>
              {list.map((d, i) => (
                <ListRow
                  key={d.id}
                  icon={UserMinus}
                  iconTone="danger"
                  title={d.name}
                  subtitle={`${d.grNo} · section ${d.section} · ${d.vouchers} voucher(s)${d.mobile ? ` · ${d.mobile}` : ''}`}
                  right={<Money value={d.amount} tone="danger" />}
                  last={i === list.length - 1}
                />
              ))}
            </Card>
          ) : (
            <Empty text="No dues outstanding." />
          )
        }
      </QueryView>
      <Card title="Fine waivers, adjustments & refunds" action={{ label: 'New request', onPress: () => setOpen(true) }}>
        <QueryView q={waivers} isEmpty={d => !d.length} emptyText="No requests yet.">
          {d =>
            d.map((w, i) => (
              <ListRow
                key={w.id}
                icon={Wallet}
                title={`${w.type} · Rs. ${num(w.amount).toLocaleString('en-US')}`}
                subtitle={w.reason ?? ''}
                right={<StatusBadge status={w.status} />}
                last={i === d.length - 1}
              />
            ))
          }
        </QueryView>
      </Card>
      <FormSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Waiver / refund request"
        submitLabel="Send for approval"
        onSubmit={async () => {
          if (!(Number(wAmount) > 0)) {
            toast('Enter an amount');
            return;
          }
          if (!reason.trim()) {
            toast('A reason is required');
            return;
          }
          const r = await save.run({ type: kind, amount: Number(wAmount), reason: reason.trim(), studentId: student ? Number(student.id) : undefined });
          if (r !== undefined) {
            logAudit('Fee waiver', `${kind} Rs. ${wAmount}: ${reason.trim()}`);
            setOpen(false);
            setWAmount('');
            setReason('');
            waivers.refresh();
          }
        }}
      >
        <Chips options={['fine', 'adjustment', 'refund']} value={kind} onChange={v => setKind(v as typeof kind)} />
        <StudentPicker value={student} onChange={setStudent} />
        <Field label="Amount (Rs.)" value={wAmount} onChangeText={setWAmount} keyboardType="numeric" />
        <Field label="Reason *" value={reason} onChangeText={setReason} multiline />
      </FormSheet>
    </LiveScreen>
  );
}

// ---------- Discounts ----------

const DISCOUNT_TYPES = ['sibling', 'staff child', 'merit', 'need', 'management'];

export function AdminDiscountsLive(_: ScreenProps) {
  const q = useApi('web:fees:discounts', () => feesApi.discounts());
  const [rules] = useRules();
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState<WebStudentRow | null>(null);
  const [type, setType] = useState('need');
  const [mode, setMode] = useState<'pct' | 'fixed'>('pct');
  const [value, setValue] = useState('');
  const [from, setFrom] = useState(thisMonth());
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const save = useMutation(feesApi.saveDiscount, 'Discount sent for approval');
  const submit = async () => {
    if (!student) {
      toast('Pick a student');
      return;
    }
    const v = Number(value);
    if (!(v > 0)) {
      toast('Enter a value');
      return;
    }
    // Combined cap from School settings (M-04).
    const existing = (q.data ?? [])
      .filter(d => String(d.student_id) === student.id && d.mode === 'pct' && d.status !== 'rejected')
      .reduce((a, d) => a + num(d.value), 0);
    if (mode === 'pct' && existing + v > rules.maxDiscountPct) {
      toast(`Combined discounts cannot exceed ${rules.maxDiscountPct}% (this student already has ${existing}%).`);
      return;
    }
    if (!reason.trim()) {
      toast('A reason is required');
      return;
    }
    const r = await save.run({ studentId: Number(student.id), type, mode, value: v, from: from ? `${from}-01` : undefined, to: to ? `${to}-28` : undefined, reason: reason.trim() });
    if (r !== undefined) {
      logAudit('Discount request', `${student.grNo} ${type} ${v}${mode === 'pct' ? '%' : ' Rs.'}`);
      setOpen(false);
      setValue('');
      setReason('');
      q.refresh();
    }
  };
  return (
    <LiveScreen
      title="Discounts"
      subtitle={`Requests go to approval · combined cap ${rules.maxDiscountPct}%`}
      q={q}
      toolsRoute="AdminDiscountsTools"
      exportTitle="Discounts"
      footer={<Button label="Request discount" icon={Plus} onPress={() => setOpen(true)} />}
    >
      <InfoBanner text="A discount applies only to vouchers generated after it is approved." />
      <QueryView q={q} isEmpty={d => !d.length} emptyText="No discounts yet.">
        {d => (
          <Card>
            {d.map((x, i) => (
              <ListRow
                key={x.id}
                icon={CreditCard}
                title={`${x.Student?.name ?? `Student ${x.student_id}`} · ${x.type}`}
                subtitle={`${x.mode === 'pct' ? `${num(x.value)}%` : `Rs. ${num(x.value).toLocaleString('en-US')}`} · ${fmtDate(x.valid_from)} – ${fmtDate(x.valid_to)}${x.reason ? ` · ${x.reason}` : ''}`}
                right={<StatusBadge status={x.status} />}
                last={i === d.length - 1}
              />
            ))}
          </Card>
        )}
      </QueryView>
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Request discount" submitLabel="Send for approval" onSubmit={submit}>
        <StudentPicker value={student} onChange={setStudent} />
        <PickerField label="Type" value={type} options={DISCOUNT_TYPES} onChange={setType} />
        <Chips options={['pct', 'fixed']} value={mode} onChange={v => setMode(v as typeof mode)} />
        <Field label={mode === 'pct' ? 'Percent' : 'Amount (Rs.)'} value={value} onChangeText={setValue} keyboardType="numeric" />
        <PickerField label="From month" value={from} options={monthsAround()} onChange={setFrom} />
        <PickerField label="To month" value={to} options={monthsAround()} onChange={setTo} />
        <Field label="Reason *" value={reason} onChangeText={setReason} multiline />
      </FormSheet>
    </LiveScreen>
  );
}

// ---------- Cash closing ----------

export function AdminCashClosingLive(_: ScreenProps) {
  const q = useApi('web:fees:closings', () => feesApi.closings());
  const counter = useApi('web:fees:counter', () => feesApi.counter());
  const [note, setNote] = useState('');
  const close = useMutation(feesApi.closeDay, 'Day closed and handed over');
  const readOnly = useReadOnly();
  const today = todayIso();
  const done = (q.data ?? []).some(c => String(c.close_date).slice(0, 10) === today);
  return (
    <LiveScreen title="Cash closing" subtitle="Cashier closes the day and hands over to Accounts" q={q} toolsRoute="AdminCashClosingTools" toolsLabel="Count cash by notes & flag differences (sample)">
      <QueryView q={counter}>
        {s => (
          <KpiGrid>
            <Kpi label="Cash today" value={`Rs. ${s.cashToday.toLocaleString('en-US')}`} />
            <Kpi label="Bank today" value={`Rs. ${s.bankToday.toLocaleString('en-US')}`} />
            <Kpi label="Online today" value={`Rs. ${s.onlineToday.toLocaleString('en-US')}`} />
            <Kpi label="Total" value={`Rs. ${s.collectedToday.toLocaleString('en-US')}`} />
          </KpiGrid>
        )}
      </QueryView>
      {done ? (
        <InfoBanner tone="success" text="Today is already closed." />
      ) : (
        <Card title="Close today">
          <Field label="Note for Accounts" value={note} onChangeText={setNote} placeholder="e.g. counted twice, all correct" />
          <Button
            label="Close day & hand over"
            icon={Lock}
            loading={close.busy}
            disabled={readOnly}
            onPress={async () => {
              if ((await close.run(note.trim())) !== undefined) {
                logAudit('Cash closing', `${today}: ${note.trim()}`);
                setNote('');
                q.refresh();
              }
            }}
          />
        </Card>
      )}
      <QueryView q={q} isEmpty={d => !d.length} emptyText="No closings yet.">
        {d => (
          <Card title="Closings">
            {d.map((c, i) => (
              <ListRow
                key={c.id}
                icon={CalendarDays}
                title={fmtDate(c.close_date)}
                subtitle={`Cash Rs. ${num(c.cash_amount).toLocaleString('en-US')} · bank Rs. ${num(c.bank_amount).toLocaleString('en-US')} · online Rs. ${num(c.online_amount).toLocaleString('en-US')}${c.note ? ` · ${c.note}` : ''}`}
                last={i === d.length - 1}
              />
            ))}
          </Card>
        )}
      </QueryView>
    </LiveScreen>
  );
}

// ---------- Online payments (gateway records) ----------

export function AdminOnlinePaymentsLive(_: ScreenProps) {
  const q = useModule('online-pay');
  const [tab, setTab] = useState('All');
  const list = (q.data ?? []).filter(r => tab === 'All' || String(r.status).toLowerCase() === tab.toLowerCase());
  return (
    <LiveScreen title="Online payments" subtitle="Gateway transactions started from the parent app" q={q} toolsRoute="AdminOnlinePaymentsTools" toolsLabel="Reconciliation (sample)">
      <InfoBanner text="A voucher is marked paid only when the gateway confirms. JazzCash, Easypaisa and 1Link keys are not enabled on the server yet." />
      <Chips options={['All', 'Unavailable', 'Pending', 'Paid', 'Failed']} value={tab} onChange={setTab} />
      <QueryView q={q} isEmpty={() => !list.length} emptyText="No online payments yet.">
        {() => (
          <Card>
            {list.map((r, i) => (
              <ListRow
                key={String(r.id)}
                icon={CreditCard}
                title={`${String(r.title ?? '')} · ${String(r.gateway || '—')}`}
                subtitle={`Rs. ${num(r.amount).toLocaleString('en-US')} · ${fmtDate(String(r.recordDate ?? ''))}`}
                right={<StatusBadge status={String(r.status)} />}
                last={i === list.length - 1}
              />
            ))}
          </Card>
        )}
      </QueryView>
    </LiveScreen>
  );
}

// ---------- Expenses ----------

const EXP_CATS = ['Salaries', 'Utilities', 'Rent', 'Stationery', 'Repairs', 'Fuel', 'Events', 'Canteen purchases', 'Misc'];

type ExpenseRow = { id: number; category: string; title: string; amount: string | number; exp_date: string; status: string };

export function AdminExpensesLive(_: ScreenProps) {
  return (
    <ModuleRecordsScreen<ExpenseRow>
      moduleKey="expenses"
      title="Expenses"
      subtitle="Expense entries (approval via Accounts)"
      icon={Wallet}
      rowTitle={r => `${r.title} · ${r.category}`}
      rowSub={r => fmtDate(r.exp_date)}
      renderRight={r => (
        <View style={ls.right}>
          <Money value={num(r.amount)} />
          <StatusBadge status={r.status} />
        </View>
      )}
      searchText={r => `${r.title} ${r.category}`}
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'category', label: 'Head', kind: 'pick', options: EXP_CATS },
        { key: 'amount', label: 'Amount (Rs.)', kind: 'number', required: true },
        { key: 'date', label: 'Date', kind: 'date', required: true, placeholder: todayIso() },
      ]}
      toBody={v => (Number(v.amount) > 0 ? { title: v.title.trim(), category: v.category || 'Misc', amount: Number(v.amount), date: v.date } : 'Amount must be more than 0')}
      addLabel="Add expense"
      toolsRoute="AdminExpensesTools"
      renderHeader={rows => (
        <KpiGrid>
          <Kpi label="Entries" value={String(rows.length)} />
          <Kpi label="Total" value={`Rs. ${rows.reduce((a, r) => a + num(r.amount), 0).toLocaleString('en-US')}`} />
        </KpiGrid>
      )}
    />
  );
}

// ---------- Payroll ----------

export function AdminPayrollLive(_: ScreenProps) {
  const [month, setMonth] = useState(thisMonth());
  const q = useApi(`web:payroll:${month}`, () => payrollApi.list(month));
  const gen = useMutation(payrollApi.generate, 'Payroll generated');
  const readOnly = useReadOnly();
  const list = q.data ?? [];
  const total = list.reduce((a, s) => a + num(s.net), 0);
  const locked = list.some(s => String(s.status).toLowerCase() === 'approved' || String(s.status).toLowerCase() === 'locked');
  return (
    <LiveScreen title="Payroll processing" subtitle="Monthly run from salary structures" q={q} toolsRoute="AdminPayrollTools" toolsLabel="Deductions, approval, lock & bank sheet (sample)">
      <PickerField label="Month" value={month} options={monthsAround()} onChange={setMonth} />
      <KpiGrid>
        <Kpi label="Slips" value={String(list.length)} />
        <Kpi label="Net payable" value={`Rs. ${total.toLocaleString('en-US')}`} />
      </KpiGrid>
      {locked ? (
        <InfoBanner icon={Lock} text="This month is approved and locked. Only the Owner can unlock it, with a reason." />
      ) : (
        <Button
          label={list.length ? `Re-run payroll ${month}` : `Run payroll ${month}`}
          icon={Building}
          loading={gen.busy}
          disabled={readOnly}
          onPress={async () => {
            if ((await gen.run(month)) !== undefined) {
              logAudit('Payroll', `Run for ${month}`);
              q.refresh();
            }
          }}
        />
      )}
      <QueryView q={q} isEmpty={d => !d.length} emptyText="No payroll for this month yet.">
        {d => (
          <Card>
            {d.map((s, i) => (
              <ListRow
                key={s.id}
                avatar={s.staffName ?? ''}
                title={`${s.staffName ?? `Staff ${s.staff_id}`} · ${s.empId ?? ''}`}
                subtitle={`Basic Rs. ${num(s.basic).toLocaleString('en-US')} + allowances Rs. ${num(s.allowances).toLocaleString('en-US')} − deductions Rs. ${num(s.deductions).toLocaleString('en-US')}`}
                right={
                  <View style={ls.right}>
                    <Money value={num(s.net)} />
                    <StatusBadge status={s.status} />
                  </View>
                }
                last={i === d.length - 1}
              />
            ))}
          </Card>
        )}
      </QueryView>
      <InfoBanner text="The server run uses basic + allowances only. Late, unpaid-leave and loan deductions are not applied by the server yet." />
    </LiveScreen>
  );
}
