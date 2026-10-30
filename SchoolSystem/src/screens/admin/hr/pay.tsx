// HR panel: salary setup and exit & clearance (M-09, M-11).
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { BookOpen, Calculator, FileText, LogOut, Package, Plus, Wallet } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Chips,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  Toggle,
  toast,
} from '../../../components/ui';
import { FormSheet, KV, Kpi, KpiGrid, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { campusName, logAudit, useReadOnly } from '../../../data/admin';
import {
  Amount,
  applyIncrement,
  ExitCase,
  finalSettlement,
  HrStaff,
  loanSchedule,
} from '../../../data/admin-hr';
import { Money, Note, toNumber, ws } from '../accounts/widgets';
import { staffName, useExits, useHrStaff } from './state';

const EFFECTIVE = ['1 Nov 2026', '1 Dec 2026', '1 Jan 2027', '1 Jul 2027'];

function netOf(s: HrStaff) {
  return s.salary + s.allowances.reduce((a, x) => a + x.amount, 0) - s.deductions.reduce((a, x) => a + x.amount, 0) - (s.loan && s.loan.paid < s.loan.installments ? s.loan.each : 0);
}

// ---------- Salary setup ----------

export function AdminSalarySetup(_: ScreenProps) {
  const ro = useReadOnly();
  const [staff, setStaff] = useHrStaff();
  const [sel, setSel] = useState<HrStaff | null>(null);
  const [basic, setBasic] = useState('');
  const [hra, setHra] = useState('');
  const [conveyance, setConveyance] = useState('');
  const [medical, setMedical] = useState('');
  const [eobi, setEobi] = useState('');
  const [tax, setTax] = useState('');
  const [incMode, setIncMode] = useState<'%' | 'Fixed'>('%');
  const [incValue, setIncValue] = useState('');
  const [incDate, setIncDate] = useState(EFFECTIVE[0]);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanParts, setLoanParts] = useState('6');
  const active = staff.filter(s => s.status !== 'Left');
  const loans = active.filter(s => s.loan && s.loan.paid < s.loan.installments);
  const outstanding = loans.reduce((s, x) => s + (x.loan ? x.loan.each * (x.loan.installments - x.loan.paid) : 0), 0);

  const amt = (list: Amount[], name: string) => String(list.find(a => a.name === name)?.amount ?? 0);
  const pick = (s: HrStaff) => {
    setSel(s);
    setBasic(String(s.salary));
    setHra(amt(s.allowances, 'House rent allowance'));
    setConveyance(amt(s.allowances, 'Conveyance'));
    setMedical(amt(s.allowances, 'Medical'));
    setEobi(amt(s.deductions, 'EOBI'));
    setTax(amt(s.deductions, 'Income tax'));
    setIncValue('');
    setLoanAmount('');
  };

  const save = () => {
    if (!sel) {
      return;
    }
    if (ro) {
      toast('Closed session: read-only');
      return;
    }
    const b = toNumber(basic);
    const parts: Array<[string, string]> = [['House rent allowance', hra], ['Conveyance', conveyance], ['Medical', medical], ['EOBI', eobi], ['Income tax', tax]];
    if (!(b > 0) || parts.some(([, v]) => !(toNumber(v || '0') >= 0))) {
      toast('Enter valid amounts');
      return;
    }
    const allowances = parts.slice(0, 3).map(([name, v]) => ({ name, amount: toNumber(v || '0') })).filter(a => a.amount > 0);
    const deductions = parts.slice(3).map(([name, v]) => ({ name, amount: toNumber(v || '0') })).filter(a => a.amount > 0);
    setStaff(prev => prev.map(x => (x.id === sel.id ? { ...x, salary: b, allowances, deductions } : x)));
    logAudit('Salary structure', `${sel.name}: basic ${sel.salary} → ${b}; allowances ${allowances.map(a => `${a.name} ${a.amount}`).join(', ')}; deductions ${deductions.map(d => `${d.name} ${d.amount}`).join(', ')}`);
    setSel(null);
    toast('Salary structure saved');
  };

  const increment = () => {
    if (!sel) {
      return;
    }
    const v = toNumber(incValue);
    if (!(v > 0)) {
      toast('Enter the increment');
      return;
    }
    const to = applyIncrement(sel.salary, { mode: incMode, value: v });
    const entry = { date: incDate, from: sel.salary, to, note: incMode === '%' ? `${v}% increment` : `Rs. ${v} increment` };
    setStaff(prev => prev.map(x => (x.id === sel.id ? { ...x, salary: to, increments: [entry, ...x.increments] } : x)));
    setSel({ ...sel, salary: to, increments: [entry, ...sel.increments] });
    setBasic(String(to));
    setIncValue('');
    logAudit('Increment', `${sel.name}: ${sel.salary} → ${to} effective ${incDate}`);
    toast(`Basic is now Rs. ${to.toLocaleString('en-US')} from ${incDate}`);
  };

  const addLoan = () => {
    if (!sel) {
      return;
    }
    const a = toNumber(loanAmount);
    if (!(a > 0)) {
      toast('Enter the loan amount');
      return;
    }
    if (sel.loan && sel.loan.paid < sel.loan.installments) {
      toast('Finish the current loan first');
      return;
    }
    const sched = loanSchedule(a, Number(loanParts));
    const loan = { amount: a, installments: sched.length, paid: 0, each: sched[0] };
    setStaff(prev => prev.map(x => (x.id === sel.id ? { ...x, loan } : x)));
    setSel({ ...sel, loan });
    setLoanAmount('');
    logAudit('Loan / advance', `${sel.name}: Rs. ${a.toLocaleString('en-US')} in ${sched.length} installments of Rs. ${sched[0].toLocaleString('en-US')}`);
    toast('Loan added; installments deduct automatically in payroll');
  };

  return (
    <>
      <ListScreen
        title="Salary setup"
        subtitle="Structures, allowances, deductions, loans, increments"
        items={active}
        keyOf={s => s.id}
        searchText={s => `${s.name} ${s.id} ${s.designation}`}
        filters={[
          { label: 'Type', options: ['All', 'Permanent', 'Contract', 'Visiting'], get: s => s.type },
          { label: 'Loan', options: ['All', 'With loan', 'No loan'], get: s => (s.loan && s.loan.paid < s.loan.installments ? 'With loan' : 'No loan') },
        ]}
        header={
          <KpiGrid>
            <Kpi label="Monthly basic" value={`Rs. ${active.reduce((s, x) => s + x.salary, 0).toLocaleString('en-US')}`} />
            <Kpi label="Loans outstanding" value={`Rs. ${outstanding.toLocaleString('en-US')}`} sub={`${loans.length} employees`} tone="warn" />
          </KpiGrid>
        }
        renderItem={(s, last) => (
          <ListRow
            avatar={s.name}
            title={s.name}
            subtitle={`${s.id} · basic Rs. ${s.salary.toLocaleString('en-US')} · ${s.allowances.length} allowance(s)${s.loan && s.loan.paid < s.loan.installments ? ` · loan ${s.loan.paid}/${s.loan.installments}` : ''}`}
            right={<Money value={netOf(s)} />}
            onPress={() => pick(s)}
            last={last}
          />
        )}
      />
      <FormSheet visible={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.name} · salary` : ''} submitLabel="Save structure" onSubmit={save}>
        <Field label="Basic salary" value={basic} onChangeText={setBasic} keyboardType="number-pad" />
        <Text style={ws.bold}>Allowances</Text>
        <Field label="House rent allowance" value={hra} onChangeText={setHra} keyboardType="number-pad" />
        <Field label="Conveyance" value={conveyance} onChangeText={setConveyance} keyboardType="number-pad" />
        <Field label="Medical" value={medical} onChangeText={setMedical} keyboardType="number-pad" />
        <Text style={ws.bold}>Deductions</Text>
        <Field label="EOBI" value={eobi} onChangeText={setEobi} keyboardType="number-pad" />
        <Field label="Income tax" value={tax} onChangeText={setTax} keyboardType="number-pad" />
        <Text style={ws.bold}>Increment</Text>
        <Chips options={['%', 'Fixed']} value={incMode} onChange={v => setIncMode(v as '%' | 'Fixed')} />
        <Field label={incMode === '%' ? 'Increment %' : 'Increment amount'} value={incValue} onChangeText={setIncValue} keyboardType="number-pad" />
        <PickerField label="Effective date" value={incDate} options={EFFECTIVE} onChange={setIncDate} />
        <Button label="Apply increment" variant="outline" onPress={increment} />
        {sel?.increments.map(inc => (
          <Note key={inc.date + inc.to}>{inc.date}: Rs. {inc.from.toLocaleString('en-US')} → Rs. {inc.to.toLocaleString('en-US')} · {inc.note}</Note>
        ))}
        <Text style={ws.bold}>Loan / advance</Text>
        {sel?.loan ? <Note>Current: Rs. {sel.loan.amount.toLocaleString('en-US')}, {sel.loan.paid} of {sel.loan.installments} installments paid (Rs. {sel.loan.each.toLocaleString('en-US')} each).</Note> : null}
        <Field label="Loan amount" value={loanAmount} onChangeText={setLoanAmount} keyboardType="number-pad" />
        <Chips options={['3', '6', '12']} value={loanParts} onChange={setLoanParts} />
        {toNumber(loanAmount) > 0 ? <Note>Schedule: {loanSchedule(toNumber(loanAmount), Number(loanParts)).map(x => x.toLocaleString('en-US')).join(' + ')}</Note> : null}
        <Button label="Add loan" icon={Plus} variant="outline" onPress={addLoan} />
      </FormSheet>
    </>
  );
}

// ---------- Exit & clearance ----------

const LAST_DAYS = ['31 Oct', '15 Nov', '30 Nov', '31 Dec'];

export function AdminExitClearance(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [staff] = useHrStaff();
  const [exits, setExits] = useExits();
  const [open, setOpen] = useState(false);
  const active = staff.filter(s => s.status !== 'Left' && !exits.some(e => e.staffId === s.id && e.status === 'In progress'));
  const [who, setWho] = useState(active[1]?.name ?? '');
  const [lastDay, setLastDay] = useState(LAST_DAYS[1]);
  const [reason, setReason] = useState('');

  const add = () => {
    const s = staff.find(x => x.name === who);
    if (!s || !reason.trim()) {
      toast('Choose the employee and write the reason');
      return;
    }
    const c: ExitCase = { id: `ex${exits.length + 10}`, staffId: s.id, resigned: '22 Oct', lastDay, reason: reason.trim(), checks: { library: false, store: false, accounts: false }, status: 'In progress' };
    setExits(prev => [c, ...prev]);
    logAudit('Resignation', `${s.name}: last working day ${lastDay}. ${reason.trim()}`);
    setOpen(false);
    setReason('');
    nav.push('AdminExitCase', { id: c.id });
  };

  return (
    <>
      <ListScreen
        title="Exit & clearance"
        subtitle="Resignation, clearance, final settlement, experience letter"
        items={exits}
        keyOf={e => e.id}
        searchText={e => `${staffName(staff, e.staffId)} ${e.reason}`}
        filters={[{ label: 'Status', options: ['All', 'In progress', 'Completed'], get: e => e.status }]}
        onAdd={ro ? undefined : () => setOpen(true)}
        addLabel="Record resignation"
        header={<InfoBanner text="A staff member who leaves is marked Left and their login is disabled. Records are never deleted." />}
        renderItem={(e, last) => {
          const done = Object.values(e.checks).filter(Boolean).length;
          return (
            <ListRow
              avatar={staffName(staff, e.staffId)}
              title={staffName(staff, e.staffId)}
              subtitle={`Resigned ${e.resigned} · last day ${e.lastDay} · clearance ${done}/3`}
              right={<Badge label={e.status} tone={e.status === 'Completed' ? 'neutral' : 'warn'} />}
              onPress={() => nav.push('AdminExitCase', { id: e.id })}
              last={last}
            />
          );
        }}
      />
      <FormSheet visible={open} onClose={() => setOpen(false)} title="Resignation" onSubmit={add}>
        <PickerField label="Employee" value={who} options={active.map(s => s.name)} onChange={setWho} />
        <PickerField label="Last working day" value={lastDay} options={LAST_DAYS} onChange={setLastDay} />
        <Field label="Reason" value={reason} onChangeText={setReason} multiline />
      </FormSheet>
    </>
  );
}

export function AdminExitCase(_: ScreenProps) {
  const ro = useReadOnly();
  const id = useParam('id', 'ex2');
  const [staff, setStaff] = useHrStaff();
  const [exits, setExits] = useExits();
  const c = exits.find(e => e.id === id) ?? exits[0];
  const s = staff.find(x => x.id === c?.staffId);
  if (!c || !s) {
    return (
      <Screen title="Exit case">
        <InfoBanner tone="warn" text="Exit case not found." />
      </Screen>
    );
  }
  const cleared = c.checks.library && c.checks.store && c.checks.accounts;
  const years = 2026 - (Number(s.joined.split(' ').pop()) || 2026);
  const settlement = finalSettlement({
    basic: s.salary,
    allowances: s.allowances.reduce((a, x) => a + x.amount, 0),
    daysWorked: 15,
    leaveEncashDays: Math.max(0, s.leave.Annual.total - s.leave.Annual.used),
    years,
    permanent: s.type === 'Permanent',
    loanOutstanding: s.loan ? s.loan.each * (s.loan.installments - s.loan.paid) : 0,
  });
  const done = c.status === 'Completed';

  const toggle = (k: keyof ExitCase['checks'], on: boolean) => {
    if (done || ro) {
      toast('This exit is closed');
      return;
    }
    setExits(prev => prev.map(e => (e.id === c.id ? { ...e, checks: { ...e.checks, [k]: on } } : e)));
    logAudit('Clearance', `${s.name}: ${k} ${on ? 'cleared' : 'pending'}`);
  };

  const complete = () => {
    if (!cleared) {
      toast('Clear library, store and accounts first');
      return;
    }
    setExits(prev => prev.map(e => (e.id === c.id ? { ...e, status: 'Completed' } : e)));
    setStaff(prev => prev.map(x => (x.id === s.id ? { ...x, status: 'Left', login: undefined } : x)));
    logAudit('Staff exit', `${s.name} marked Left; login disabled; final settlement Rs. ${settlement.net.toLocaleString('en-US')}`);
    toast('Marked Left and login disabled. The record is kept.');
  };

  return (
    <Screen title={s.name} subtitle={`${s.id} · ${s.designation} · ${campusName(s.campus)}`}>
      <Card>
        <KV k="Resigned" v={c.resigned} />
        <KV k="Last working day" v={c.lastDay} />
        <KV k="Reason" v={c.reason} />
        <KV k="Status" v={<Badge label={done ? 'Completed · Left' : 'In progress'} tone={done ? 'neutral' : 'warn'} />} last />
      </Card>
      <Card title="Clearance checklist">
        <ListRow icon={BookOpen} title="Library" subtitle="All books returned, fines paid" right={<Toggle value={c.checks.library} onChange={v => toggle('library', v)} />} />
        <ListRow icon={Package} title="Store" subtitle="Laptop, keys and issued items returned" right={<Toggle value={c.checks.store} onChange={v => toggle('store', v)} />} />
        <ListRow icon={Wallet} title="Accounts" subtitle="Loans and advances settled" right={<Toggle value={c.checks.accounts} onChange={v => toggle('accounts', v)} />} last />
      </Card>
      <Card title="Final settlement">
        <KV k="Salary for 15 days" v={<Money value={settlement.salary} />} />
        <KV k="Leave encashment" v={<Money value={settlement.encash} />} />
        <KV k={`Gratuity (${years} year${years === 1 ? '' : 's'})`} v={<Money value={settlement.gratuity} />} />
        <KV k="Loan outstanding" v={<Money value={-settlement.deductions} tone="danger" />} />
        <View style={ws.totalRow}>
          <Text style={ws.bold}>Net payable</Text>
          <Money value={settlement.net} />
        </View>
      </Card>
      <View style={ws.buttons}>
        <Button
          label="Experience letter"
          icon={FileText}
          variant="outline"
          style={ws.flex}
          onPress={() => (cleared ? toast('Experience letter PDF ready (demo)') : toast('Available after clearance'))}
        />
        <Button label="Settlement slip" icon={Calculator} variant="outline" style={ws.flex} onPress={() => toast('Final settlement PDF ready (demo)')} />
      </View>
      {done ? (
        <InfoBanner tone="success" text="Exit completed. Login disabled; the record stays in the directory as Left." />
      ) : (
        <Button label="Complete exit and disable login" icon={LogOut} onPress={complete} />
      )}
    </Screen>
  );
}
