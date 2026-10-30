// Accounts panel, fee side (SOW 3.2 D, M-03, M-04).
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import {
  Banknote,
  Download,
  FileText,
  MessageCircle,
  Plus,
  Printer,
  QrCode,
  Receipt as ReceiptIcon,
  RotateCcw,
  Search,
  Send,
  TriangleAlert,
  Undo2,
} from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Chips,
  Field,
  InfoBanner,
  ListRow,
  QRCode,
  Screen,
  Segmented,
  Toggle,
  toast,
} from '../../../components/ui';
import {
  ExportButton,
  FormSheet,
  KV,
  Kpi,
  KpiGrid,
  ListScreen,
  PickerField,
  Table,
  useReasonPrompt,
} from '../../../components/admin';
import { BottomSheet } from '../../../components/Tabs';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import {
  ADMIN_STUDENTS,
  CAMPUSES,
  campusName,
  CLASSES,
  logAudit,
  requestApproval,
  useApprovals,
  useReadOnly,
  useRules,
  useStaffRole,
} from '../../../data/admin';
import {
  addMonths,
  applyPayment,
  buildVoucherLines,
  carryForward,
  checkDiscountCap,
  CURRENT_MONTH,
  daysLate,
  Discount,
  discountApplies,
  DiscountType,
  HeadKey,
  lateFine,
  monthLabel,
  SESSION_MONTHS,
  splitInstallments,
  studentById,
  sumLines,
  Voucher,
  VoucherLine,
} from '../../../data/admin-accounts';
import { useOpen } from '../core';
import {
  useDiscounts,
  useHeads,
  useHolds,
  useInstallments,
  useOverrides,
  useRuns,
  useStructure,
  useVouchers,
} from './state';
import {
  byLine,
  Money,
  MultiChips,
  Note,
  Right,
  STUDENT_OPTIONS,
  studentFromOption,
  toNumber,
  ws,
} from './widgets';

const HEAD_NAMES: Record<string, HeadKey> = {
  Tuition: 'tuition',
  Transport: 'transport',
  Lab: 'lab',
  Exam: 'exam',
  Annual: 'annual',
};

function ReadOnlyBanner() {
  const ro = useReadOnly();
  return ro ? (
    <InfoBanner tone="warn" text="This session is closed. Records are read-only." />
  ) : null;
}

function statusTone(s: Voucher['status']) {
  return s === 'Paid' ? 'success' : s === 'Partially paid' ? 'warn' : s === 'Unpaid' ? 'danger' : 'info';
}

function VoucherLines({ lines }: { lines: VoucherLine[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <ListRow
          key={`${l.label}-${i}`}
          title={l.label}
          subtitle={l.sub}
          right={<Money value={l.amount} tone={l.amount < 0 ? 'success' : undefined} />}
          last={i === lines.length - 1}
        />
      ))}
    </>
  );
}

// ---------- Fee heads & structure ----------

export function AdminFeeStructure(_: ScreenProps) {
  const ro = useReadOnly();
  const [role] = useStaffRole();
  const [tab, setTab] = useState('Fee heads');
  const [heads, setHeads] = useHeads();
  const [structure, setStructure] = useStructure();
  const [overrides, setOverrides] = useOverrides();
  const [approvals] = useApprovals();
  const [cls, setCls] = useState('Class 5');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [headName, setHeadName] = useState('');
  const [headFreq, setHeadFreq] = useState('One-time');
  const [ovOpen, setOvOpen] = useState(false);
  const [ovStudent, setOvStudent] = useState(STUDENT_OPTIONS[0]);
  const [ovHead, setOvHead] = useState('Tuition');
  const [ovAmount, setOvAmount] = useState('');
  const [ovReason, setOvReason] = useState('');

  const fee = structure[cls];
  const uniqueHeads = heads.filter((h, i) => heads.findIndex(x => x.key === h.key) === i);

  const saveStructure = () => {
    if (ro) {
      toast('Closed session: read-only');
      return;
    }
    const next = { ...fee };
    for (const h of uniqueHeads) {
      const raw = draft[h.key];
      if (raw === undefined) {
        continue;
      }
      const n = toNumber(raw);
      if (!Number.isFinite(n) || n < 0) {
        toast(`Enter a valid amount for ${h.name}`);
        return;
      }
      next[h.key] = n;
    }
    setStructure(prev => ({ ...prev, [cls]: next }));
    logAudit('Fee structure', `${cls}: ${uniqueHeads.map(h => `${h.name} ${fee[h.key]} → ${next[h.key]}`).join(', ')}`);
    setDraft({});
    toast(`${cls} fee structure saved`);
  };

  const addHead = () => {
    if (!headName.trim()) {
      toast('Enter the head name');
      return;
    }
    setHeads(prev => [...prev, { key: 'other', name: headName.trim(), frequency: headFreq === 'Monthly' ? 'Monthly' : 'One-time' }]);
    logAudit('Fee head', `Added ${headName.trim()} (${headFreq})`);
    setHeadName('');
    setAddOpen(false);
  };

  const requestOverride = () => {
    const st = studentFromOption(ovStudent);
    const amount = toNumber(ovAmount);
    if (!st || !Number.isFinite(amount) || amount < 0) {
      toast('Choose a student and enter the amount');
      return;
    }
    if (!ovReason.trim()) {
      toast('A reason is required');
      return;
    }
    const approvalId = requestApproval({
      type: 'Discount',
      title: `Fee override: ${st.name} · ${ovHead} Rs. ${amount.toLocaleString('en-US')}`,
      sub: ovReason.trim(),
      by: byLine(role),
    });
    setOverrides(prev => [
      { id: approvalId, studentId: st.id, head: ovHead, amount, reason: ovReason.trim(), approvalId },
      ...prev,
    ]);
    setOvOpen(false);
    setOvAmount('');
    setOvReason('');
    toast('Override sent for approval');
  };

  return (
    <Screen title="Fee heads & structure" subtitle="Session 2026-27" right={<ExportButton title="Fee structure" />}>
      <ReadOnlyBanner />
      <Segmented options={['Fee heads', 'Class-wise', 'Overrides']} value={tab} onChange={setTab} />
      {tab === 'Fee heads' ? (
        <>
          <Card>
            {heads.map((h, i) => (
              <ListRow
                key={`${h.name}-${i}`}
                icon={ReceiptIcon}
                title={h.name}
                subtitle="Tap to switch between monthly and one-time"
                right={<Badge label={h.frequency} tone={h.frequency === 'Monthly' ? 'info' : 'neutral'} />}
                onPress={() => {
                  if (ro) {
                    toast('Closed session: read-only');
                    return;
                  }
                  const frequency = h.frequency === 'Monthly' ? 'One-time' : 'Monthly';
                  setHeads(prev => prev.map((x, j) => (j === i ? { ...x, frequency } : x)));
                  logAudit('Fee head', `${h.name}: ${h.frequency} → ${frequency}`);
                }}
                last={i === heads.length - 1}
              />
            ))}
          </Card>
          <Button label="Add fee head" icon={Plus} variant="outline" onPress={() => setAddOpen(true)} />
        </>
      ) : null}
      {tab === 'Class-wise' ? (
        <>
          <PickerField label="Class" value={cls} options={CLASSES} onChange={c => { setCls(c); setDraft({}); }} />
          <Card title={`${cls} · amount per head`}>
            {uniqueHeads.map(h => (
              <View key={h.key} style={ws.buttons}>
                <View style={ws.flex}>
                  <Field
                    label={`${h.name} (${h.frequency.toLowerCase()})`}
                    value={draft[h.key] ?? String(fee[h.key] ?? 0)}
                    onChangeText={v => setDraft(d => ({ ...d, [h.key]: v }))}
                    keyboardType="number-pad"
                    editable={!ro}
                  />
                </View>
              </View>
            ))}
          </Card>
          <Button label={`Save ${cls}`} onPress={saveStructure} disabled={ro} />
          <Card title="All classes (monthly heads)">
            <Table
              columns={['Class', 'Tuition', 'Transport', 'Lab', 'Admission', 'Annual']}
              rows={CLASSES.map(c => [c, structure[c].tuition, structure[c].transport, structure[c].lab, structure[c].admission, structure[c].annual])}
            />
          </Card>
        </>
      ) : null}
      {tab === 'Overrides' ? (
        <>
          <InfoBanner text="A student-level amount different from the class structure is used only after approval." />
          <Card title="Student overrides">
            {overrides.length === 0 ? <Note>No overrides yet.</Note> : null}
            {overrides.map((o, i) => {
              const st = studentById(o.studentId);
              const a = approvals.find(x => x.id === o.approvalId);
              return (
                <ListRow
                  key={o.id}
                  title={`${st?.name ?? o.studentId} · ${o.head}`}
                  subtitle={o.reason}
                  right={
                    <Right>
                      <Money value={o.amount} />
                      <Badge label={a?.status ?? 'Pending'} tone={a?.status === 'Approved' ? 'success' : a?.status === 'Rejected' ? 'danger' : 'warn'} />
                    </Right>
                  }
                  last={i === overrides.length - 1}
                />
              );
            })}
          </Card>
          <Button label="Request override" icon={Plus} onPress={() => setOvOpen(true)} disabled={ro} />
        </>
      ) : null}
      <FormSheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add fee head" onSubmit={addHead}>
        <Field label="Head name" value={headName} onChangeText={setHeadName} placeholder="e.g. Computer lab fund" />
        <Chips options={['Monthly', 'One-time']} value={headFreq} onChange={setHeadFreq} />
      </FormSheet>
      <FormSheet visible={ovOpen} onClose={() => setOvOpen(false)} title="Student override" submitLabel="Send for approval" onSubmit={requestOverride}>
        <PickerField label="Student" value={ovStudent} options={STUDENT_OPTIONS} onChange={setOvStudent} />
        <PickerField label="Fee head" value={ovHead} options={Object.keys(HEAD_NAMES)} onChange={setOvHead} />
        <Field label="Amount for this student" value={ovAmount} onChangeText={setOvAmount} keyboardType="number-pad" />
        <Field label="Reason" value={ovReason} onChangeText={setOvReason} multiline />
      </FormSheet>
    </Screen>
  );
}

// ---------- Voucher generation ----------

const GEN_MONTHS = SESSION_MONTHS.filter(m => m >= CURRENT_MONTH);

export function AdminVoucherGeneration(_: ScreenProps) {
  const ro = useReadOnly();
  const [rules] = useRules();
  const [structure] = useStructure();
  const [discounts] = useDiscounts();
  const [vouchers, setVouchers] = useVouchers();
  const [runs, setRuns] = useRuns();
  const [kind, setKind] = useState('Bulk monthly');
  const [month, setMonth] = useState(monthLabel(GEN_MONTHS[1] ?? CURRENT_MONTH));
  const [dueDay, setDueDay] = useState(String(rules.dueDay));
  const [campus, setCampus] = useState('All campuses');
  const [cls, setCls] = useState('Class 5');
  const [student, setStudent] = useState(STUDENT_OPTIONS[1] ?? STUDENT_OPTIONS[0]);
  const [months, setMonths] = useState('3');
  const [title, setTitle] = useState('Annual trip fund');
  const [amount, setAmount] = useState('3000');

  const monthKey = GEN_MONTHS.find(m => monthLabel(m) === month) ?? CURRENT_MONTH;

  const targets = useMemo(() => {
    const active = ADMIN_STUDENTS.filter(s => s.status === 'Active');
    if (kind === 'Single' || kind === 'Advance') {
      const st = studentFromOption(student);
      return st ? [st] : [];
    }
    return active.filter(
      s =>
        (campus === 'All campuses' || campusName(s.campus) === campus) &&
        (cls === 'All classes' || s.className === cls),
    );
  }, [kind, student, campus, cls]);

  const linesFor = (stId: string): VoucherLine[] => {
    const st = studentById(stId);
    if (!st) {
      return [];
    }
    if (kind === 'Custom') {
      const n = toNumber(amount);
      return [{ head: 'custom', label: title || 'Custom voucher', sub: 'Event / fund', amount: Number.isFinite(n) ? n : 0 }];
    }
    const prev = vouchers.find(v => v.studentId === st.id && v.monthKey === CURRENT_MONTH);
    return buildVoucherLines({
      className: st.className,
      monthKey,
      structure,
      transport: !!st.transport,
      transportRoute: st.transport,
      arrears: prev && monthKey > CURRENT_MONTH ? carryForward(prev) : 0,
      discounts: discounts.filter(d => d.studentId === st.id),
      storeSales: st.id === 'st2' ? [{ label: 'winter sweater', amount: 1450 }] : [],
      months: kind === 'Advance' ? Number(months) : 1,
    });
  };

  const sample = targets[0];
  const sampleLines = sample ? linesFor(sample.id) : [];
  const total = targets.reduce((s, t) => s + sumLines(linesFor(t.id)), 0);
  const pendingDiscounts = discounts.filter(d => targets.some(t => t.id === d.studentId) && d.status === 'Pending').length;
  const notYet = discounts.filter(
    d => targets.some(t => t.id === d.studentId) && d.status === 'Approved' && !discountApplies(d, monthKey),
  ).length;

  const generate = () => {
    if (ro) {
      toast('Closed session: read-only');
      return;
    }
    if (!targets.length) {
      toast('No students match');
      return;
    }
    if (kind === 'Custom' && (!title.trim() || !(toNumber(amount) > 0))) {
      toast('Enter a title and an amount');
      return;
    }
    const label =
      kind === 'Bulk monthly'
        ? `${month} · bulk monthly · ${cls} · ${campus}`
        : kind === 'Custom'
        ? `${title} · ${cls} · custom`
        : kind === 'Advance'
        ? `${month} + ${Number(months) - 1} months · advance · ${sample?.name}`
        : `${month} · single · ${sample?.name}`;
    if (kind === 'Single' || kind === 'Advance') {
      const st = targets[0];
      const lines = linesFor(st.id);
      const v: Voucher = {
        id: `V-26-${String(900 + vouchers.length).padStart(6, '0')}`,
        studentId: st.id,
        monthKey,
        title: kind === 'Advance' ? `${month} (advance ${months} months)` : month,
        kind: kind === 'Advance' ? 'Advance' : 'Single',
        lines,
        total: sumLines(lines),
        paid: 0,
        dueDay: Number(dueDay),
        status: 'Unpaid',
        receipts: [],
      };
      setVouchers(prev => [v, ...prev]);
    }
    setRuns(prev => [{ id: `run${prev.length + 1}`, title: label, count: targets.length, total, when: 'Just now' }, ...prev]);
    logAudit('Voucher generation', `${label}: ${targets.length} vouchers, Rs. ${total.toLocaleString('en-US')}, due ${dueDay} ${month.split(' ')[0]}`);
    toast(`${targets.length} voucher(s) generated`);
  };

  return (
    <Screen
      title="Voucher generation"
      subtitle="Bulk, single, advance and custom vouchers"
      right={<ExportButton title="Voucher runs" />}
      footer={<Button label={`Generate ${targets.length} voucher(s)`} icon={ReceiptIcon} onPress={generate} disabled={ro} />}
    >
      <ReadOnlyBanner />
      <Segmented options={['Bulk monthly', 'Single', 'Advance', 'Custom']} value={kind} onChange={setKind} />
      {kind !== 'Custom' ? (
        <PickerField label="Month" value={month} options={GEN_MONTHS.map(monthLabel)} onChange={setMonth} />
      ) : null}
      {kind === 'Bulk monthly' || kind === 'Custom' ? (
        <>
          <PickerField label="Campus" value={campus} options={['All campuses', ...CAMPUSES.map(c => c.name)]} onChange={setCampus} />
          <PickerField label="Class" value={cls} options={['All classes', ...CLASSES]} onChange={setCls} />
        </>
      ) : (
        <PickerField label="Student" value={student} options={STUDENT_OPTIONS} onChange={setStudent} />
      )}
      {kind === 'Advance' ? (
        <>
          <Text style={ws.bold}>Months covered</Text>
          <Chips options={['2', '3', '6']} value={months} onChange={setMonths} />
        </>
      ) : null}
      {kind === 'Custom' ? (
        <>
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Amount per student" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
        </>
      ) : null}
      <PickerField label="Due date (day of month)" value={dueDay} options={['5', '10', '15', '20']} onChange={setDueDay} />
      <InfoBanner
        text={`After the due date a late fine of Rs. ${rules.lateFinePerDay} a day applies automatically (max Rs. ${rules.lateFineCap.toLocaleString('en-US')}). Arrears, approved discounts, transport fee and store sales are added automatically.`}
      />
      {pendingDiscounts || notYet ? (
        <InfoBanner
          tone="warn"
          icon={TriangleAlert}
          text={`${pendingDiscounts} discount(s) waiting for approval and ${notYet} approved after this month are not included. A discount applies only to vouchers generated after approval.`}
        />
      ) : null}
      <KpiGrid>
        <Kpi label="Vouchers" value={String(targets.length)} />
        <Kpi label="Total" value={`Rs. ${total.toLocaleString('en-US')}`} />
      </KpiGrid>
      {sample ? (
        <Card title={`Preview · ${sample.name} (${sample.className}-${sample.section})`}>
          <VoucherLines lines={sampleLines} />
          <View style={ws.totalRow}>
            <Text style={ws.bold}>Payable by {dueDay} {kind === 'Custom' ? '' : month.split(' ')[0]}</Text>
            <Money value={sumLines(sampleLines)} />
          </View>
        </Card>
      ) : null}
      <Card title="Recent runs">
        {runs.map((r, i) => (
          <ListRow
            key={r.id}
            icon={ReceiptIcon}
            title={r.title}
            subtitle={`${r.count} vouchers · ${r.when}`}
            right={<Money value={r.total} />}
            last={i === runs.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

// ---------- Voucher print & send ----------

export function AdminVoucherPrint(_: ScreenProps) {
  const nav = useNav();
  const [vouchers] = useVouchers();
  return (
    <ListScreen
      title="Voucher print & send"
      subtitle="3-copy vouchers, PDF, WhatsApp and portal"
      items={vouchers}
      keyOf={v => v.id}
      searchText={v => `${v.id} ${studentById(v.studentId)?.name ?? ''} ${studentById(v.studentId)?.gr ?? ''}`}
      filters={[
        { label: 'Status', options: ['All', 'Unpaid', 'Partially paid', 'Paid'], get: v => v.status },
        { label: 'Class', options: ['All', ...CLASSES.slice(3)], get: v => studentById(v.studentId)?.className ?? '' },
      ]}
      renderItem={(v, last) => {
        const st = studentById(v.studentId);
        return (
          <ListRow
            icon={ReceiptIcon}
            title={st?.name ?? v.studentId}
            subtitle={`${v.id} · ${v.title} · ${st?.className}-${st?.section}`}
            right={<Right><Money value={v.total} /><Badge label={v.status} tone={statusTone(v.status)} /></Right>}
            onPress={() => nav.push('AdminVoucherDetail', { id: v.id })}
            last={last}
          />
        );
      }}
      footer={
        <View style={ws.buttons}>
          <Button label="Print all" icon={Printer} variant="outline" style={ws.flex} onPress={() => { logAudit('Voucher print', 'Bulk 3-copy print of filtered vouchers'); toast('3-copy print of all vouchers ready (demo)'); }} />
          <Button label="Send all" icon={Send} style={ws.flex} onPress={() => { logAudit('Voucher send', 'Sent vouchers by WhatsApp and portal'); toast('Vouchers sent by WhatsApp and to the parent portal (demo)'); }} />
        </View>
      }
    />
  );
}

const COPIES = ['Bank copy', 'School copy', 'Parent copy'];

export function AdminVoucherDetail(_: ScreenProps) {
  const id = useParam('id', 'V-26-000418');
  const open = useOpen();
  const [rules] = useRules();
  const [vouchers] = useVouchers();
  const [copy, setCopy] = useState(COPIES[0]);
  const v = vouchers.find(x => x.id === id) ?? vouchers[0];
  const st = studentById(v.studentId);
  const campus = CAMPUSES.find(c => c.id === st?.campus) ?? CAMPUSES[0];
  return (
    <Screen
      title={v.id}
      subtitle={`${v.title} · ${st?.name}`}
      right={<ExportButton title={`Voucher ${v.id}`} />}
    >
      <Segmented options={COPIES} value={copy} onChange={setCopy} />
      <Card>
        <View style={ws.copyHead}>
          <Text style={ws.title}>Bright Future School · {campus.name}</Text>
          <Badge label={copy} tone="info" />
        </View>
        <KV k="Student" v={`${st?.name} · ${st?.gr}`} />
        <KV k="Class" v={`${st?.className}-${st?.section} · Roll ${st?.roll}`} />
        <KV k="Father" v={st?.father ?? ''} />
        <KV k="Month" v={v.title} last />
        <VoucherLines lines={v.lines} />
        <View style={ws.totalRow}>
          <Text style={ws.bold}>Payable by {v.dueDay} {monthLabel(v.monthKey).split(' ')[0]}</Text>
          <Money value={v.total} />
        </View>
        <Note>
          After the due date: Rs. {rules.lateFinePerDay} a day, max Rs. {rules.lateFineCap.toLocaleString('en-US')}.
        </Note>
        <View style={ws.qrRow}>
          <QRCode value={v.id} size={96} />
          <View style={ws.flex}>
            <Text style={ws.bold}>Pay at any branch</Text>
            <Text style={ws.small}>{campus.bank}. Show this QR or barcode at the counter.</Text>
            <Text style={ws.small}>||| {v.id.replace(/-/g, '')} |||</Text>
          </View>
        </View>
      </Card>
      <Note>All three copies (bank, school, parent) print on one A4 sheet.</Note>
      <View style={ws.buttons}>
        <Button label="PDF" icon={Download} variant="outline" style={ws.flex} onPress={() => toast('Voucher PDF ready (demo)')} />
        <Button label="Print" icon={Printer} variant="outline" style={ws.flex} onPress={() => { logAudit('Voucher print', `${v.id} 3 copies`); toast('Sent to printer (demo)'); }} />
      </View>
      <View style={ws.buttons}>
        <Button label="WhatsApp" icon={MessageCircle} variant="outline" style={ws.flex} onPress={() => { logAudit('Voucher send', `${v.id} by WhatsApp to ${st?.mobile}`); toast(`Sent to ${st?.mobile} on WhatsApp (demo)`); }} />
        <Button label="Portal" icon={Send} variant="outline" style={ws.flex} onPress={() => { logAudit('Voucher send', `${v.id} published to parent portal`); toast('Shown in the parent app'); }} />
      </View>
      {v.status !== 'Paid' ? (
        <Button label="Take payment" icon={Banknote} onPress={() => open('AdminFeeCounter', { id: v.id })} />
      ) : null}
    </Screen>
  );
}

// ---------- Fee collection counter ----------

const PAY_DATES = [
  { label: '22 Oct (today)', month: 202610, day: 22 },
  { label: '12 Nov', month: 202611, day: 12 },
  { label: '25 Nov', month: 202611, day: 25 },
  { label: '15 Dec', month: 202612, day: 15 },
];

export function AdminFeeCounter(_: ScreenProps) {
  const ro = useReadOnly();
  const [role] = useStaffRole();
  const [rules] = useRules();
  const initial = useParam('id', '');
  const [vouchers, setVouchers] = useVouchers();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(initial);
  const [payDate, setPayDate] = useState(PAY_DATES[0].label);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'Cash' | 'Bank' | 'Online'>('Cash');
  const [lastReceipt, setLastReceipt] = useState('');
  const [reasonEl, askReason] = useReasonPrompt();

  const needle = q.trim().toLowerCase();
  const results = needle
    ? vouchers
        .filter(v => {
          const st = studentById(v.studentId);
          return `${v.id} ${st?.name} ${st?.gr}`.toLowerCase().includes(needle);
        })
        .slice(0, 6)
    : [];
  const v = vouchers.find(x => x.id === selected);
  const st = v ? studentById(v.studentId) : undefined;
  const pd = PAY_DATES.find(d => d.label === payDate) ?? PAY_DATES[0];
  const hasFine = !!v?.lines.some(l => l.head === 'fine');
  const late = v ? daysLate({ month: v.monthKey, day: v.dueDay }, pd) : 0;
  const fine = v && !hasFine && v.status !== 'Paid' ? lateFine(late, rules.lateFinePerDay, rules.lateFineCap) : 0;
  const payable = v ? v.total + fine - v.paid : 0;

  const pick = (id: string) => {
    setSelected(id);
    setQ('');
    setAmount('');
    setLastReceipt('');
  };

  const receive = () => {
    if (!v) {
      return;
    }
    if (ro) {
      toast('Closed session: read-only');
      return;
    }
    const amt = amount.trim() ? toNumber(amount) : payable;
    const total = v.total + fine;
    const r = applyPayment(total, v.paid, amt);
    if (!r.ok) {
      toast(r.error);
      return;
    }
    const receiptId = `R-26-${String(612 + Math.floor(Math.random() * 300)).padStart(6, '0')}`;
    setVouchers(prev =>
      prev.map(x =>
        x.id === v.id
          ? {
              ...x,
              lines: fine ? [...x.lines, { head: 'fine', label: 'Late fine', sub: `${late} days × Rs. ${rules.lateFinePerDay}`, amount: fine }] : x.lines,
              total,
              paid: r.paid,
              status: r.status,
              receipts: [...x.receipts, { id: receiptId, amount: amt, mode, date: pd.label.replace(' (today)', ''), by: byLine(role) }],
            }
          : x,
      ),
    );
    logAudit('Fee collection', `${receiptId} · ${v.id} · Rs. ${amt.toLocaleString('en-US')} · ${mode}${fine ? ` · incl. late fine ${fine}` : ''}`);
    setLastReceipt(receiptId);
    setAmount('');
    toast(r.status === 'Paid' ? `Paid in full. Receipt ${receiptId}` : `Partial payment saved. Balance Rs. ${r.balance.toLocaleString('en-US')}`);
  };

  const reverse = () => {
    if (!v) {
      return;
    }
    askReason(`Reverse payment on ${v.id}`, reason => {
      requestApproval({ type: 'Voucher reversal', title: `Reverse ${v.id} · ${st?.name}`, sub: reason, by: byLine(role) });
      setVouchers(prev => prev.map(x => (x.id === v.id ? { ...x, status: 'Reversal requested' } : x)));
      toast('Reversal sent for approval');
    });
  };

  return (
    <Screen title="Fee collection counter" subtitle="Find a voucher by number, QR or student" right={<ExportButton title="Today's collection" />}>
      <ReadOnlyBanner />
      <Field icon={Search} value={q} onChangeText={setQ} placeholder="Voucher no., student name or GR No." />
      <Button
        label="Scan voucher QR"
        icon={QrCode}
        variant="outline"
        onPress={() => {
          const next = vouchers.find(x => x.status === 'Unpaid') ?? vouchers[0];
          pick(next.id);
          toast(`Scanned ${next.id}`);
        }}
      />
      {results.length ? (
        <Card>
          {results.map((r, i) => (
            <ListRow
              key={r.id}
              icon={ReceiptIcon}
              title={`${r.id} · ${studentById(r.studentId)?.name}`}
              subtitle={`${r.title} · ${r.status}`}
              right={<Money value={r.total - r.paid} />}
              onPress={() => pick(r.id)}
              last={i === results.length - 1}
            />
          ))}
        </Card>
      ) : null}
      {v && st ? (
        <>
          <Card title={`${v.id} · ${v.title}`}>
            <KV k="Student" v={`${st.name} · ${st.gr} · ${st.className}-${st.section}`} />
            <VoucherLines lines={v.lines} />
            <KV k="Total" v={<Money value={v.total} />} />
            <KV k="Paid" v={<Money value={v.paid} tone="success" />} />
            <KV k="Balance" v={<Money value={v.total - v.paid} tone={v.total - v.paid > 0 ? 'danger' : 'success'} />} last />
          </Card>
          {v.status === 'Paid' || v.status === 'Reversal requested' ? (
            <>
              <InfoBanner
                tone="success"
                text={
                  v.status === 'Paid'
                    ? 'This voucher is paid. A paid voucher cannot be edited or deleted; it can only be reversed with a reason and approval.'
                    : 'Reversal is waiting in the approvals inbox.'
                }
              />
              {v.status === 'Paid' ? <Button label="Request reversal" icon={Undo2} variant="danger" onPress={reverse} /> : null}
            </>
          ) : (
            <>
              <PickerField label="Payment date" value={payDate} options={PAY_DATES.map(d => d.label)} onChange={setPayDate} />
              {fine ? (
                <InfoBanner tone="warn" icon={TriangleAlert} text={`${late} days after the due date: late fine Rs. ${fine.toLocaleString('en-US')} is added automatically.`} />
              ) : null}
              <Field
                label={`Amount (payable Rs. ${payable.toLocaleString('en-US')}; less = partial payment)`}
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder={String(payable)}
              />
              <Chips options={['Cash', 'Bank', 'Online']} value={mode} onChange={m => setMode(m as typeof mode)} />
              <Button label="Receive payment" icon={Banknote} onPress={receive} disabled={ro} />
            </>
          )}
          {v.receipts.length ? (
            <Card title="Receipts">
              {v.receipts.map((r, i) => (
                <ListRow key={r.id} icon={ReceiptIcon} title={r.id} subtitle={`${r.date} · ${r.mode} · ${r.by}`} right={<Money value={r.amount} />} last={i === v.receipts.length - 1} />
              ))}
            </Card>
          ) : null}
          {lastReceipt ? (
            <Button label={`Print receipt ${lastReceipt}`} icon={Printer} variant="outline" onPress={() => toast('Receipt sent to printer (demo)')} />
          ) : null}
        </>
      ) : (
        <InfoBanner text="Search or scan a voucher to start." />
      )}
      {reasonEl}
    </Screen>
  );
}

// ---------- Defaulters ----------

type DefaulterRow = { voucher: Voucher; balance: number; aging: string };

export function AdminDefaulters(_: ScreenProps) {
  const [role] = useStaffRole();
  const [vouchers] = useVouchers();
  const [holds, setHolds] = useHolds();
  const [plans, setPlans] = useInstallments();
  const [sel, setSel] = useState<DefaulterRow | null>(null);
  const [parts, setParts] = useState('3');
  const [reasonEl, askReason] = useReasonPrompt();

  const rows: DefaulterRow[] = vouchers
    .filter(v => v.total - v.paid > 0 && v.status !== 'Reversal requested')
    .map(v => ({
      voucher: v,
      balance: v.total - v.paid,
      aging: v.lines.some(l => l.head === 'arrears') ? '2+ months' : 'Current month',
    }));
  const totalDue = rows.reduce((s, r) => s + r.balance, 0);
  const st = sel ? studentById(sel.voucher.studentId) : undefined;
  const hold = sel ? holds[sel.voucher.studentId] ?? { admit: false, result: false, certificate: false } : null;

  const setHold = (k: 'admit' | 'result' | 'certificate', on: boolean) => {
    if (!sel || !hold) {
      return;
    }
    setHolds(prev => ({ ...prev, [sel.voucher.studentId]: { ...hold, [k]: on } }));
    logAudit('Fee hold', `${st?.name}: ${k} hold ${on ? 'on' : 'off'}`);
  };

  return (
    <>
      <ListScreen
        title="Defaulters"
        subtitle="Dues, reminders, installments and holds"
        items={rows}
        keyOf={r => r.voucher.id}
        searchText={r => `${studentById(r.voucher.studentId)?.name} ${studentById(r.voucher.studentId)?.gr} ${r.voucher.id}`}
        filters={[
          { label: 'Class', options: ['All', ...CLASSES.slice(3)], get: r => studentById(r.voucher.studentId)?.className ?? '' },
          { label: 'Aging', options: ['All', 'Current month', '2+ months'], get: r => r.aging },
        ]}
        header={
          <>
            <KpiGrid>
              <Kpi label="Outstanding" value={`Rs. ${totalDue.toLocaleString('en-US')}`} tone="danger" />
              <Kpi label="Defaulters" value={String(rows.length)} sub={`${rows.filter(r => r.aging !== 'Current month').length} for 2+ months`} />
            </KpiGrid>
            <Button
              label={`Send reminders to all (${rows.length})`}
              icon={MessageCircle}
              variant="outline"
              onPress={() => {
                logAudit('Reminder', `Due reminders sent to ${rows.length} parents by SMS/WhatsApp`);
                toast(`Reminders sent to ${rows.length} parents (demo)`);
              }}
            />
          </>
        }
        renderItem={(r, last) => {
          const s2 = studentById(r.voucher.studentId);
          const h = holds[r.voucher.studentId];
          const held = h ? [h.admit && 'admit card', h.result && 'result', h.certificate && 'certificates'].filter(Boolean).join(', ') : '';
          return (
            <ListRow
              avatar={s2?.name ?? ''}
              title={s2?.name ?? ''}
              subtitle={`${s2?.className}-${s2?.section} · ${r.voucher.id} · ${r.aging}${plans[r.voucher.id] ? ` · ${plans[r.voucher.id].length} installments` : ''}${held ? ` · held: ${held}` : ''}`}
              right={<Money value={r.balance} tone="danger" />}
              onPress={() => setSel(r)}
              last={last}
            />
          );
        }}
      />
      <BottomSheet visible={!!sel} onClose={() => setSel(null)}>
        {sel && st && hold ? (
          <View style={ws.center}>
            <Text style={ws.title}>{st.name} · Rs. {sel.balance.toLocaleString('en-US')}</Text>
            <View style={ws.buttons}>
              <Button label="SMS" icon={MessageCircle} variant="outline" style={ws.flex} onPress={() => { logAudit('Reminder', `SMS to ${st.mobile}`); toast('Reminder sent by SMS (demo)'); }} />
              <Button label="WhatsApp" icon={Send} variant="outline" style={ws.flex} onPress={() => { logAudit('Reminder', `WhatsApp to ${st.mobile}`); toast('Reminder sent on WhatsApp (demo)'); }} />
            </View>
            <Text style={ws.bold}>Installment plan</Text>
            <Chips options={['2', '3', '4']} value={parts} onChange={setParts} />
            <Note>{splitInstallments(sel.balance, Number(parts)).map(a => `Rs. ${a.toLocaleString('en-US')}`).join(' + ')}</Note>
            <Button
              label="Save installment plan"
              onPress={() => {
                setPlans(prev => ({ ...prev, [sel.voucher.id]: splitInstallments(sel.balance, Number(parts)) }));
                logAudit('Installment plan', `${sel.voucher.id}: ${parts} installments`);
                toast('Installment plan saved');
              }}
            />
            <Text style={ws.bold}>Holds while dues are unpaid</Text>
            <ListRow title="Admit card" right={<Toggle value={hold.admit} onChange={v => setHold('admit', v)} />} />
            <ListRow title="Result" right={<Toggle value={hold.result} onChange={v => setHold('result', v)} />} />
            <ListRow title="Certificates" right={<Toggle value={hold.certificate} onChange={v => setHold('certificate', v)} />} last />
            <View style={ws.buttons}>
              <Button
                label="Fine waiver"
                icon={RotateCcw}
                variant="outline"
                style={ws.flex}
                onPress={() => {
                  const r = sel;
                  setSel(null);
                  askReason(`Fine waiver · ${st.name}`, reason => {
                    requestApproval({ type: 'Fine waiver', title: `Fine waiver · ${st.name} · ${r.voucher.id}`, sub: reason, by: byLine(role) });
                    toast('Waiver sent for approval');
                  });
                }}
              />
              <Button
                label="Refund"
                icon={Undo2}
                variant="outline"
                style={ws.flex}
                onPress={() => {
                  setSel(null);
                  askReason(`Refund (security / excess) · ${st.name}`, reason => {
                    requestApproval({ type: 'Refund', title: `Refund on leaving · ${st.name}`, sub: reason, by: byLine(role) });
                    toast('Refund sent for approval');
                  });
                }}
              />
            </View>
          </View>
        ) : null}
      </BottomSheet>
      {reasonEl}
    </>
  );
}

// ---------- Discounts (M-04) ----------

const DISCOUNT_TYPES: DiscountType[] = ['Sibling', 'Staff child', 'Merit', 'Need-based', 'Management'];

export function AdminDiscounts(_: ScreenProps) {
  const ro = useReadOnly();
  const open = useOpen();
  const [role] = useStaffRole();
  const [rules] = useRules();
  const [structure] = useStructure();
  const [list, setRaw] = useDiscounts();
  const [formOpen, setFormOpen] = useState(false);
  const [sel, setSel] = useState<Discount | null>(null);
  const [student, setStudent] = useState(STUDENT_OPTIONS[4] ?? STUDENT_OPTIONS[0]);
  const [type, setType] = useState<DiscountType>('Merit');
  const [mode, setMode] = useState<'%' | 'Fixed'>('%');
  const [value, setValue] = useState('');
  const [heads, setHeads] = useState<string[]>(['Tuition']);
  const [from, setFrom] = useState(monthLabel(addMonths(CURRENT_MONTH, 1)));
  const [to, setTo] = useState(monthLabel(202703));
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState('');
  const [newValue, setNewValue] = useState('');
  const [reasonEl, askReason] = useReasonPrompt();

  const baseFor = (stId: string) => {
    const st = studentById(stId);
    const f = structure[st?.className ?? 'Class 5'];
    return { tuition: f.tuition, transport: st?.transport ? f.transport : 0, lab: f.lab, exam: f.exam, annual: f.annual };
  };

  const submit = () => {
    const st = studentFromOption(student);
    const val = toNumber(value);
    const hk = heads.map(h => HEAD_NAMES[h]).filter(Boolean);
    const fromKey = SESSION_MONTHS.find(m => monthLabel(m) === from) ?? CURRENT_MONTH;
    const toKey = SESSION_MONTHS.find(m => monthLabel(m) === to) ?? 202703;
    if (!st || !(val > 0) || !hk.length) {
      toast('Choose a student, heads and a value');
      return;
    }
    if (mode === '%' && val > 100) {
      toast('Percentage cannot be more than 100');
      return;
    }
    if (toKey < fromKey) {
      toast('The end month is before the start month');
      return;
    }
    if (!reason.trim()) {
      toast('A reason is required');
      return;
    }
    const existing = list.filter(d => d.studentId === st.id && d.status === 'Approved');
    const cap = checkDiscountCap(baseFor(st.id), existing, { mode, value: val, heads: hk }, rules.maxDiscountPct);
    if (!cap.ok) {
      toast(`Blocked: combined discount would be ${cap.pct}%, above the ${rules.maxDiscountPct}% limit.`);
      return;
    }
    const approvalId = requestApproval({
      type: 'Discount',
      title: `${type} discount ${mode === '%' ? `${val}%` : `Rs. ${val}`} · ${st.name}`,
      sub: `${heads.join(', ')} · ${from} – ${to}${attachment ? ` · ${attachment}` : ''}`,
      by: byLine(role),
    });
    setRaw(prev => [
      { id: approvalId, studentId: st.id, type, mode, value: val, heads: hk, from: fromKey, to: toKey, status: 'Pending', approvalId, reason: reason.trim(), attachment: attachment || undefined },
      ...prev,
    ]);
    setFormOpen(false);
    setValue('');
    setReason('');
    setAttachment('');
    toast('Discount request sent for approval');
  };

  const runAuto = () => {
    // Siblings are linked by father CNIC; the second and later child get 25%.
    const groups = new Map<string, string[]>();
    ADMIN_STUDENTS.filter(s => s.status === 'Active').forEach(s => {
      groups.set(s.fatherCnic, [...(groups.get(s.fatherCnic) ?? []), s.id]);
    });
    const add: Discount[] = [];
    groups.forEach(ids => {
      ids.slice(1).forEach(id => {
        if (!list.some(d => d.studentId === id && d.type === 'Sibling' && d.status !== 'Removed')) {
          add.push({ id: `auto-${id}`, studentId: id, type: 'Sibling', mode: '%', value: 25, heads: ['tuition'], from: CURRENT_MONTH + 1, to: 202703, status: 'Approved', approvedAt: CURRENT_MONTH + 1, reason: 'Auto: sibling by father CNIC', auto: true });
        }
      });
    });
    if (!add.length) {
      toast('Sibling and staff-child discounts are up to date');
      logAudit('Discount rules', 'Automatic rules run: no change');
      return;
    }
    setRaw(prev => [...add, ...prev]);
    logAudit('Discount rules', `Automatic sibling discounts added for ${add.length} students`);
    toast(`${add.length} automatic discount(s) added`);
  };

  const change = () => {
    if (!sel) {
      return;
    }
    const val = toNumber(newValue);
    if (!(val > 0)) {
      toast('Enter the new value');
      return;
    }
    const others = list.filter(d => d.studentId === sel.studentId && d.status === 'Approved' && d.id !== sel.id);
    const cap = checkDiscountCap(baseFor(sel.studentId), others, { ...sel, value: val }, rules.maxDiscountPct);
    if (!cap.ok) {
      toast(`Blocked: combined discount would be ${cap.pct}%, above the ${rules.maxDiscountPct}% limit.`);
      return;
    }
    const d = sel;
    setSel(null);
    askReason(`Change ${d.type} discount`, r => {
      setRaw(prev => prev.map(x => (x.id === d.id ? { ...x, value: val } : x)));
      logAudit('Discount changed', `${studentById(d.studentId)?.name}: ${d.value} → ${val}. Reason: ${r}`);
      toast('Discount changed');
    });
  };

  const remove = () => {
    if (!sel) {
      return;
    }
    const d = sel;
    setSel(null);
    askReason(`Remove ${d.type} discount`, r => {
      setRaw(prev => prev.map(x => (x.id === d.id ? { ...x, status: 'Removed' } : x)));
      logAudit('Discount removed', `${studentById(d.studentId)?.name}: ${d.type}. Reason: ${r}`);
      toast('Discount removed');
    });
  };

  return (
    <>
      <ListScreen
        title="Discounts"
        subtitle="Requests, approvals and active discounts"
        items={list}
        keyOf={d => d.id}
        searchText={d => `${studentById(d.studentId)?.name} ${d.type} ${d.reason}`}
        filters={[
          { label: 'Status', options: ['All', 'Approved', 'Pending', 'Rejected', 'Removed'], get: d => d.status },
          { label: 'Type', options: ['All', ...DISCOUNT_TYPES], get: d => d.type },
        ]}
        onAdd={ro ? undefined : () => setFormOpen(true)}
        addLabel="Request discount"
        header={
          <>
            <InfoBanner
              text={`Combined discounts cannot exceed ${rules.maxDiscountPct}%. A discount applies only to vouchers generated after approval. Sibling and staff-child discounts are applied automatically.`}
            />
            <View style={ws.buttons}>
              <Button label="Run auto rules" variant="outline" style={ws.flex} onPress={runAuto} />
              <Button label="Discount report" icon={FileText} variant="outline" style={ws.flex} onPress={() => open('AdminReport', { id: 'r11' })} />
            </View>
          </>
        }
        renderItem={(d, last) => {
          const st = studentById(d.studentId);
          const review = d.status === 'Approved' && d.to - CURRENT_MONTH <= 1;
          return (
            <ListRow
              icon={ReceiptIcon}
              title={`${st?.name ?? d.studentId} · ${d.type}${d.auto ? ' (auto)' : ''}`}
              subtitle={`${d.mode === '%' ? `${d.value}%` : `Rs. ${d.value.toLocaleString('en-US')}`} on ${d.heads.join(', ')} · ${monthLabel(d.from)} – ${monthLabel(d.to)}${d.status === 'Approved' && d.approvedAt && d.approvedAt > CURRENT_MONTH ? ` · from ${monthLabel(d.approvedAt)} vouchers` : ''}`}
              right={
                <Right>
                  <Badge label={d.status} tone={d.status === 'Approved' ? 'success' : d.status === 'Pending' ? 'warn' : 'danger'} />
                  {review ? <Badge label="Review due" tone="info" /> : null}
                </Right>
              }
              onPress={() => {
                setSel(d);
                setNewValue(String(d.value));
              }}
              last={last}
            />
          );
        }}
      />
      <FormSheet visible={formOpen} onClose={() => setFormOpen(false)} title="Request discount" submitLabel="Send for approval" onSubmit={submit}>
        <PickerField label="Student" value={student} options={STUDENT_OPTIONS} onChange={setStudent} />
        <Chips options={DISCOUNT_TYPES} value={type} onChange={v => setType(v as DiscountType)} />
        <Chips options={['%', 'Fixed']} value={mode} onChange={v => setMode(v as '%' | 'Fixed')} />
        <Field label={mode === '%' ? 'Percentage' : 'Amount (Rs.)'} value={value} onChangeText={setValue} keyboardType="number-pad" />
        <Text style={ws.bold}>Applies to fee heads</Text>
        <MultiChips options={['Tuition', 'Transport', 'Lab', 'Exam', 'Annual']} value={heads} onChange={setHeads} />
        <PickerField label="From month" value={from} options={SESSION_MONTHS.map(monthLabel)} onChange={setFrom} />
        <PickerField label="To month" value={to} options={SESSION_MONTHS.map(monthLabel)} onChange={setTo} />
        <Field label="Reason" value={reason} onChangeText={setReason} multiline />
        <Button
          label={attachment ? `Attached: ${attachment}` : 'Attach document'}
          variant="outline"
          onPress={() => setAttachment(attachment ? '' : 'supporting-document.pdf')}
        />
      </FormSheet>
      <BottomSheet visible={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View>
            <Text style={ws.title}>{studentById(sel.studentId)?.name} · {sel.type}</Text>
            <KV k="Value" v={sel.mode === '%' ? `${sel.value}%` : `Rs. ${sel.value}`} />
            <KV k="Heads" v={sel.heads.join(', ')} />
            <KV k="Period" v={`${monthLabel(sel.from)} – ${monthLabel(sel.to)}`} />
            <KV k="Reason" v={sel.reason} />
            <KV k="Status" v={sel.status} last />
            {sel.status === 'Approved' && !ro ? (
              <>
                <Field label="New value" value={newValue} onChangeText={setNewValue} keyboardType="number-pad" />
                <View style={ws.gap} />
                <View style={ws.buttons}>
                  <Button label="Change" variant="outline" style={ws.flex} onPress={change} />
                  <Button label="Remove" variant="danger" style={ws.flex} onPress={remove} />
                </View>
              </>
            ) : (
              <Note>{sel.status === 'Pending' ? 'Waiting in the approvals inbox.' : 'No actions.'}</Note>
            )}
          </View>
        ) : null}
      </BottomSheet>
      {reasonEl}
    </>
  );
}

