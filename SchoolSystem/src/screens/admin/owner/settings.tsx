// S-13 school settings, templates and integrations.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image as ImageIcon, MessageSquare, Plug, Plus, X } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  InfoBanner,
  ListRow,
  Placeholder,
  Screen,
  Segmented,
  toast,
  Toggle,
} from '../../../components/ui';
import { adminStyles as a, KV, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import { useShared } from '../../../store';
import { logAudit, SchoolRules, STAFF_ROLES, useRules } from '../../../data/admin';
import { Integration, INTEGRATIONS, TemplateDef, TEMPLATES } from '../../../data/admin-owner';
import { colors, radius } from '../../../theme';
import { ReadOnlyBanner, useGuard } from './shared';

// ---------- School settings ----------

type Profile = { name: string; short: string; color: string; grFormat: string; voucherFormat: string; receiptFormat: string };

const PROFILE: Profile = {
  name: 'Bright Future School',
  short: 'BFS',
  color: 'Orange',
  grFormat: 'GR-{CAMPUS}-{0000}',
  voucherFormat: 'V-{YY}-{000000}',
  receiptFormat: 'R-{YY}-{000000}',
};

const COLORS: Record<string, string> = { Orange: '#E8701E', Blue: '#1F4FC9', Green: '#1E7A3C', Maroon: '#8E1B3A' };

function preview(pattern: string, n: number) {
  return pattern
    .replace('{CAMPUS}', 'MC')
    .replace('{YY}', '26')
    .replace(/\{(0+)\}/, (_, z: string) => String(n).padStart(z.length, '0'));
}

type Chain = { item: string; steps: string[] };
const CHAINS: Chain[] = [
  { item: 'Admissions', steps: ['Principal'] },
  { item: 'Discounts', steps: ['Principal', 'Owner / Super Admin'] },
  { item: 'Fine waivers', steps: ['Principal'] },
  { item: 'Staff leaves', steps: ['Principal'] },
  { item: 'Results', steps: ['Exam Controller', 'Principal'] },
  { item: 'Payroll', steps: ['Accounts', 'Principal', 'Owner / Super Admin'] },
];

export function AdminSettings(_: ScreenProps) {
  const [profile, setProfile] = useShared<Profile>('admin.profile', PROFILE);
  const [rules, setRules] = useRules();
  const [chains, setChains] = useShared<Chain[]>('admin.chains', CHAINS);
  const { guard } = useGuard();
  const [p, setP] = useState(profile);
  const [r, setR] = useState<SchoolRules>(rules);
  const [tab, setTab] = useState('Profile');

  const num = (k: keyof SchoolRules) => (v: string) => setR(x => ({ ...x, [k]: Number(v.replace(/\D/g, '')) || 0 }));
  const txt = (k: keyof SchoolRules) => (v: string) => setR(x => ({ ...x, [k]: v }));
  const flag = (k: keyof SchoolRules) => (v: boolean) => setR(x => ({ ...x, [k]: v }));

  const saveProfile = guard(() => {
    const changed = (Object.keys(p) as Array<keyof Profile>).filter(k => p[k] !== profile[k]);
    setProfile(p);
    logAudit('Settings', changed.length ? changed.map(k => `${k}: ${profile[k]} → ${p[k]}`).join('; ') : 'Profile saved (no change)');
    toast('Profile saved');
  });
  const saveRules = guard(() => {
    if (r.lateFineCap < r.lateFinePerDay) {
      toast('Fine cap must be at least the daily fine');
      return;
    }
    if (r.maxDiscountPct > 100 || r.dueDay < 1 || r.dueDay > 28) {
      toast('Check max discount (≤ 100) and due day (1–28)');
      return;
    }
    const changed = (Object.keys(r) as Array<keyof SchoolRules>).filter(k => r[k] !== rules[k]);
    setRules(r);
    logAudit('Settings', changed.length ? changed.map(k => `${k}: ${String(rules[k])} → ${String(r[k])}`).join('; ') : 'Rules saved (no change)');
    toast('Rules saved. They apply without any code change.');
  });
  const setStep = (ci: number, si: number, v: string) =>
    guard(() => {
      setChains(cs => cs.map((c, i) => (i === ci ? { ...c, steps: c.steps.map((x, j) => (j === si ? v : x)) } : c)));
      logAudit('Approval chain', `${chains[ci].item} step ${si + 1}: ${chains[ci].steps[si]} → ${v}`);
    })();
  const addStep = (ci: number) =>
    guard(() => {
      setChains(cs => cs.map((c, i) => (i === ci ? { ...c, steps: [...c.steps, 'Owner / Super Admin'] } : c)));
      logAudit('Approval chain', `${chains[ci].item}: step added`);
    })();
  const removeStep = (ci: number, si: number) =>
    guard(() => {
      if (chains[ci].steps.length === 1) {
        toast('A chain needs at least one approver');
        return;
      }
      setChains(cs => cs.map((c, i) => (i === ci ? { ...c, steps: c.steps.filter((__, j) => j !== si) } : c)));
      logAudit('Approval chain', `${chains[ci].item}: step ${si + 1} removed`);
    })();

  return (
    <Screen title="School settings" subtitle="Profile, formats, rules and approval chains">
      <ReadOnlyBanner />
      <Segmented options={['Profile', 'Rules', 'Approvals']} value={tab} onChange={setTab} />
      {tab === 'Profile' ? (
        <>
          <Card title="School profile">
            <Field label="School name" value={p.name} onChangeText={v => setP(x => ({ ...x, name: v }))} />
            <View style={s.gap} />
            <Field label="Short name" value={p.short} onChangeText={v => setP(x => ({ ...x, short: v }))} />
            <View style={s.gap} />
            <Text style={a.bold}>Logo</Text>
            <View style={a.row}>
              <Placeholder icon={ImageIcon} label="logo.png" height={64} style={s.logo} />
              <Button label="Change logo" variant="outline" onPress={() => toast('Logo picker (demo)')} />
            </View>
            <View style={s.gap} />
            <Text style={a.bold}>Brand color</Text>
            <View style={a.rowWrap}>
              {Object.entries(COLORS).map(([name, hex]) => (
                <Pressable key={name} onPress={() => setP(x => ({ ...x, color: name }))} style={[s.swatch, { backgroundColor: hex }, p.color === name && s.swatchOn]}>
                  <Text style={s.swatchText}>{name}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
          <Card title="Number formats">
            <Field label="GR No." value={p.grFormat} onChangeText={v => setP(x => ({ ...x, grFormat: v }))} />
            <Text style={a.small}>Next: {preview(p.grFormat, 2381)}</Text>
            <View style={s.gap} />
            <Field label="Voucher No." value={p.voucherFormat} onChangeText={v => setP(x => ({ ...x, voucherFormat: v }))} />
            <Text style={a.small}>Next: {preview(p.voucherFormat, 419)}</Text>
            <View style={s.gap} />
            <Field label="Receipt No." value={p.receiptFormat} onChangeText={v => setP(x => ({ ...x, receiptFormat: v }))} />
            <Text style={a.small}>Next: {preview(p.receiptFormat, 612)}</Text>
          </Card>
          <Button label="Save profile and formats" onPress={saveProfile} />
        </>
      ) : null}
      {tab === 'Rules' ? (
        <>
          <Card title="Fee and fine">
            <Field label="Late fine per day (Rs.)" value={String(r.lateFinePerDay)} onChangeText={num('lateFinePerDay')} keyboardType="number-pad" />
            <View style={s.gap} />
            <Field label="Late fine maximum (Rs.)" value={String(r.lateFineCap)} onChangeText={num('lateFineCap')} keyboardType="number-pad" />
            <View style={s.gap} />
            <Field label="Due day of month" value={String(r.dueDay)} onChangeText={num('dueDay')} keyboardType="number-pad" />
            <View style={s.gap} />
            <Field label="Maximum combined discount (%)" value={String(r.maxDiscountPct)} onChangeText={num('maxDiscountPct')} keyboardType="number-pad" />
          </Card>
          <Card title="Attendance, diary, library">
            <Field label="Attendance cut-off" value={r.attendanceCutoff} onChangeText={txt('attendanceCutoff')} />
            <View style={s.gap} />
            <Field label="Diary edit cut-off" value={r.diaryCutoff} onChangeText={txt('diaryCutoff')} />
            <View style={s.gap} />
            <Field label="Library issue limit (books)" value={String(r.libraryIssueLimit)} onChangeText={num('libraryIssueLimit')} keyboardType="number-pad" />
            <View style={s.gap} />
            <Field label="Message quiet hours" value={r.quietHours} onChangeText={txt('quietHours')} />
          </Card>
          <Card title="Switches">
            <RuleToggle label="Hold admit cards of fee defaulters" value={r.holdAdmitCardForDefaulters} onChange={flag('holdAdmitCardForDefaulters')} />
            <RuleToggle label="Period-wise attendance" value={r.periodAttendance} onChange={flag('periodAttendance')} />
            <RuleToggle label="Admission final only after admission fee" value={r.admissionNeedsFee} onChange={flag('admissionNeedsFee')} last />
          </Card>
          <Button label="Save rules" onPress={saveRules} />
        </>
      ) : null}
      {tab === 'Approvals' ? (
        <>
          <InfoBanner text="Who approves each item, in order. A request moves to the next step after each approval." />
          {chains.map((c, ci) => (
            <Card key={c.item} title={c.item}>
              {c.steps.map((step, si) => (
                <View key={`${c.item}-${si}`} style={[a.row, s.step]}>
                  <Text style={s.stepNo}>{si + 1}</Text>
                  <View style={a.flex}>
                    <PickerField value={step} options={STAFF_ROLES.map(x => x.label)} onChange={v => setStep(ci, si, v)} />
                  </View>
                  <IconButton icon={X} onPress={() => removeStep(ci, si)} />
                </View>
              ))}
              <Button label="Add approver" variant="outline" icon={Plus} onPress={() => addStep(ci)} />
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function RuleToggle({ label, value, onChange, last }: { label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return <ListRow title={label} right={<Toggle value={value} onChange={onChange} />} last={last} />;
}

// ---------- Templates ----------

export const useTemplates = () => useShared<TemplateDef[]>('admin.templates', TEMPLATES);

const SAMPLE: Record<string, string> = {
  student_name: 'Ayesha Khan',
  gr_no: 'GR-MC-0012',
  class: 'Class 5-A',
  amount: 'Rs. 9,375',
  due_date: '10 Nov',
  voucher_no: 'V-26-000418',
  receipt_no: 'R-26-000611',
  mode: 'JazzCash',
  term: 'Mid-term 2026',
  total: '432 / 500',
  percentage: '86.4',
  grade: 'A',
  position: '2nd in section',
  qr: 'RC-26-AK0012',
  from: 'Apr 2019',
  to: 'Mar 2027',
  serial: 'LC-26-0041',
  valid_till: '31 Mar 2027',
  photo: '[photo]',
  date: '22 Oct',
  school: 'Bright Future School',
};

const fill = (text: string) => text.replace(/\{(\w+)\}/g, (m, k: string) => SAMPLE[k] ?? m);

export function AdminTemplates(_: ScreenProps) {
  const nav = useNav();
  const [list] = useTemplates();
  return (
    <ListScreen
      title="Templates"
      subtitle="Voucher, receipt, report card, certificate, ID card, messages"
      items={list}
      keyOf={t => t.id}
      searchText={t => `${t.name} ${t.kind}`}
      filters={[{ label: 'Kind', options: ['All', 'Voucher', 'Receipt', 'Report card', 'Certificate', 'ID card', 'Message'], get: t => t.kind }]}
      header={<ReadOnlyBanner />}
      renderItem={(t, last) => (
        <ListRow
          icon={MessageSquare}
          title={t.name}
          subtitle={`${t.kind} · English + Urdu · updated ${t.updated}`}
          onPress={() => nav.push('AdminTemplateEdit', { id: t.id })}
          chevron
          last={last}
        />
      )}
    />
  );
}

export function AdminTemplateEdit(_: ScreenProps) {
  const [list, setList] = useTemplates();
  const id = useParam('id', list[0].id);
  const t = list.find(x => x.id === id) ?? list[0];
  const { guard } = useGuard();
  const [lang, setLang] = useState('English');
  const [en, setEn] = useState(t.en);
  const [ur, setUr] = useState(t.ur);
  const text = lang === 'English' ? en : ur;
  const setText = lang === 'English' ? setEn : setUr;
  const save = guard(() => {
    if (!en.trim() || !ur.trim()) {
      toast('Both English and Urdu text are required');
      return;
    }
    setList(l => l.map(x => (x.id === t.id ? { ...x, en, ur, updated: 'Today' } : x)));
    logAudit('Templates', `${t.name} updated`);
    toast('Template saved');
  });
  return (
    <Screen title={t.name} subtitle={t.kind} footer={<Button label="Save template" onPress={save} />}>
      <ReadOnlyBanner />
      <Segmented options={['English', 'Urdu']} value={lang} onChange={setLang} />
      <Field label={`${lang} text`} value={text} onChangeText={setText} multiline />
      <Text style={a.bold}>Insert variable</Text>
      <View style={a.rowWrap}>
        {t.variables.map(v => (
          <Pressable key={v} onPress={() => setText(`${text}{${v}}`)} style={s.var}>
            <Text style={s.varText}>{`{${v}}`}</Text>
          </Pressable>
        ))}
      </View>
      <Card title="Preview with sample data">
        <Text style={[s.preview, lang === 'Urdu' && s.rtl]}>{fill(text)}</Text>
      </Card>
      <Button label="Download sample PDF" variant="outline" onPress={() => toast('Sample PDF ready (demo)')} />
    </Screen>
  );
}

// ---------- Integrations ----------

export const useIntegrations = () => useShared<Integration[]>('admin.integrations', INTEGRATIONS);

export function AdminIntegrations(_: ScreenProps) {
  const nav = useNav();
  const [list] = useIntegrations();
  return (
    <ListScreen
      title="Integrations"
      subtitle="SMS, WhatsApp, email, payment gateway, biometric"
      items={list}
      keyOf={i => i.id}
      searchText={i => `${i.name} ${i.kind}`}
      filters={[{ label: 'Kind', options: ['All', 'SMS', 'WhatsApp', 'Email', 'Payment gateway', 'Biometric'], get: i => i.kind }]}
      header={
        <>
          <ReadOnlyBanner />
          <Card>
            <KV k="SMS credit balance" v="18,420 SMS" />
            <KV k="WhatsApp messages this month" v="6,112" last />
          </Card>
        </>
      }
      renderItem={(i, last) => (
        <ListRow
          icon={Plug}
          title={i.name}
          subtitle={i.kind}
          right={<Badge label={i.enabled ? 'On' : 'Off'} tone={i.enabled ? 'success' : 'neutral'} />}
          onPress={() => nav.push('AdminIntegrationDetail', { id: i.id })}
          last={last}
        />
      )}
    />
  );
}

export function AdminIntegrationDetail(_: ScreenProps) {
  const [list, setList] = useIntegrations();
  const id = useParam('id', list[0].id);
  const it = list.find(x => x.id === id) ?? list[0];
  const { guard } = useGuard();
  const [f, setF] = useState(it);
  const [testing, setTesting] = useState(false);
  const test = () => {
    if (f.fields.some(x => !x.value.trim())) {
      toast('Fill every field before testing');
      return;
    }
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      toast(`${f.name}: connection OK (demo)`);
    }, 800);
  };
  const save = guard(() => {
    setList(l => l.map(x => (x.id === f.id ? f : x)));
    logAudit('Integrations', `${f.name} saved · ${f.enabled ? 'enabled' : 'disabled'}`);
    toast('Integration saved');
  });
  return (
    <Screen title={f.name} subtitle={f.kind} footer={<Button label="Save" onPress={save} />}>
      <ReadOnlyBanner />
      <Card>
        <ListRow title="Enabled" right={<Toggle value={f.enabled} onChange={v => setF(x => ({ ...x, enabled: v }))} />} last />
      </Card>
      {f.fields.map((fl, i) => (
        <Field
          key={fl.label}
          label={fl.label}
          value={fl.value}
          secureTextEntry={fl.secret}
          onChangeText={v => setF(x => ({ ...x, fields: x.fields.map((y, j) => (j === i ? { ...y, value: v } : y)) }))}
        />
      ))}
      <Button label="Test connection" variant="outline" loading={testing} onPress={test} />
      <InfoBanner text="Keys are stored encrypted on the server and never shown in full." />
    </Screen>
  );
}

const s = StyleSheet.create({
  gap: { height: 10 },
  logo: { width: 90 },
  swatch: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.text },
  swatchText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  step: { marginBottom: 8 },
  stepNo: { width: 22, fontWeight: '900', color: colors.primaryText, fontSize: 15 },
  var: { backgroundColor: colors.infoSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  varText: { color: colors.info, fontWeight: '700', fontSize: 12 },
  preview: { fontSize: 13.5, color: colors.text, lineHeight: 20 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
