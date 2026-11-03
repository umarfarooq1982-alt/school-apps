// S-13 school settings, templates and integrations.
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image as ImageIcon, Plus, X } from 'lucide-react-native';
import {
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
import { adminStyles as a, KV, PickerField } from '../../../components/admin';
import { ScreenProps } from '../../../navigation';
import { useShared } from '../../../store';
import { logAudit, SchoolRules, STAFF_ROLES, useRules } from '../../../data/admin';
import { colors, radius } from '../../../theme';
import { ReadOnlyBanner, useGuard } from './shared';
import { useApi, useMutation } from '../../../api/hooks';
import { webA } from '../../../api/webA';
import { NotAvailable } from '../../../components/states';
import { logoUri, useTenant } from '../../../api/tenant';

// ---------- School settings ----------

type Profile = { name: string; short: string; color: string; grFormat: string; voucherFormat: string; receiptFormat: string };

const PROFILE: Profile = {
  name: '',
  short: '',
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
  const ctx = useApi('adm:context', webA.context);
  const logo = logoUri(useTenant());
  const loaded = useRef(false);
  const lastChains = useRef('');
  const saver = useMutation(webA.saveSettings);
  // Server settings (school.settings JSON) win over the phone's copy.
  useEffect(() => {
    const srv = ctx.data?.school;
    if (!srv || loaded.current) {
      return;
    }
    loaded.current = true;
    const st = srv.settings as Record<string, unknown>;
    const pick = <T,>(k: string, d: T): T => (st[k] === undefined || st[k] === null || st[k] === '' ? d : (st[k] as T));
    setP(x => ({ ...x, name: String(pick('schoolName', srv.name)), short: String(pick('shortName', x.short)), color: String(pick('brandName', x.color)), grFormat: String(pick('grFormat', x.grFormat)), voucherFormat: String(pick('voucherFormat', x.voucherFormat)), receiptFormat: String(pick('receiptFormat', x.receiptFormat)) }));
    setR(x => {
      const next = { ...x };
      (Object.keys(x) as Array<keyof SchoolRules>).forEach(k => {
        (next as Record<string, unknown>)[k] = pick(k, x[k]);
      });
      next.dueDay = Number(pick('dueDay', x.dueDay)) || x.dueDay;
      return next;
    });
    if (Array.isArray(st.approvalChains)) {
      lastChains.current = JSON.stringify(st.approvalChains);
      setChains(st.approvalChains as Chain[]);
    } else {
      lastChains.current = JSON.stringify(chains);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.data, setChains]);

  const num = (k: keyof SchoolRules) => (v: string) => setR(x => ({ ...x, [k]: Number(v.replace(/\D/g, '')) || 0 }));
  const txt = (k: keyof SchoolRules) => (v: string) => setR(x => ({ ...x, [k]: v }));
  const flag = (k: keyof SchoolRules) => (v: boolean) => setR(x => ({ ...x, [k]: v }));

  const saveProfile = guard(async () => {
    const changed = (Object.keys(p) as Array<keyof Profile>).filter(k => p[k] !== profile[k]);
    if ((await saver.run({ schoolName: p.name, shortName: p.short, brandName: p.color, brandColor: COLORS[p.color], grFormat: p.grFormat, voucherFormat: p.voucherFormat, receiptFormat: p.receiptFormat })) === undefined) {
      return;
    }
    setProfile(p);
    logAudit('Settings', changed.length ? changed.map(k => `${k}: ${profile[k]} → ${p[k]}`).join('; ') : 'Profile saved (no change)');
    toast('Profile saved');
  });
  const saveRules = guard(async () => {
    if (r.lateFineCap < r.lateFinePerDay) {
      toast('Fine cap must be at least the daily fine');
      return;
    }
    if (r.maxDiscountPct > 100 || r.dueDay < 1 || r.dueDay > 28) {
      toast('Check max discount (≤ 100) and due day (1–28)');
      return;
    }
    const changed = (Object.keys(r) as Array<keyof SchoolRules>).filter(k => r[k] !== rules[k]);
    if ((await saver.run({ ...r })) === undefined) {
      return;
    }
    setRules(r);
    logAudit('Settings', changed.length ? changed.map(k => `${k}: ${String(rules[k])} → ${String(r[k])}`).join('; ') : 'Rules saved (no change)');
    toast('Rules saved. They apply without any code change.');
  });
  // Approval chains are stored in the school settings JSON.
  const pushChains = (next: Chain[]) => {
    saver.run({ approvalChains: next });
  };
  useEffect(() => {
    const json = JSON.stringify(chains);
    if (loaded.current && ctx.data && json !== lastChains.current) {
      lastChains.current = json;
      pushChains(chains);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chains]);
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
    <Screen title="School settings" subtitle="Profile, formats, rules and approval chains" refreshing={ctx.refreshing} onRefresh={ctx.refresh}>
      <ReadOnlyBanner />
      {ctx.error ? <InfoBanner tone="danger" text={ctx.error} /> : null}
      <InfoBanner text="Saved to the school server (school settings). The server applies the due day and attendance cut-off; the other rules are enforced in the apps." />
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
              {logo ? <Image source={{ uri: logo }} style={s.logoImg} /> : <Placeholder icon={ImageIcon} label="No logo" height={64} style={s.logo} />}
              <Button label="Change logo" variant="outline" onPress={() => toast('Logo upload is done on the web panel (no app API yet)')} />
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
            <Text style={a.small}>Example: {preview(p.grFormat, 1)}</Text>
            <View style={s.gap} />
            <Field label="Voucher No." value={p.voucherFormat} onChangeText={v => setP(x => ({ ...x, voucherFormat: v }))} />
            <Text style={a.small}>Example: {preview(p.voucherFormat, 1)}</Text>
            <View style={s.gap} />
            <Field label="Receipt No." value={p.receiptFormat} onChangeText={v => setP(x => ({ ...x, receiptFormat: v }))} />
            <Text style={a.small}>Example: {preview(p.receiptFormat, 1)}</Text>
          </Card>
          <Button label="Save profile and formats" onPress={saveProfile} loading={saver.busy} />
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
          <Button label="Save rules" onPress={saveRules} loading={saver.busy} />
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

export function AdminTemplates(_: ScreenProps) {
  return (
    <Screen title="Templates" subtitle="Voucher, receipt, report card, certificate, ID card, messages">
      <NotAvailable
        what="Templates"
        detail="Voucher, receipt, report card, certificate, ID card and message templates cannot be read or saved through the school server yet."
      />
    </Screen>
  );
}

export function AdminTemplateEdit(_: ScreenProps) {
  return (
    <Screen title="Template">
      <NotAvailable what="Template editor" />
    </Screen>
  );
}

// ---------- Integrations ----------

export function AdminIntegrations(_: ScreenProps) {
  const gw = useApi('adm:outbox-status', webA.outboxStatus);
  return (
    <Screen title="Integrations" subtitle="SMS, WhatsApp, email, payment gateway, biometric" refreshing={gw.refreshing} onRefresh={gw.refresh}>
      <ReadOnlyBanner />
      <Card title="Message gateways (server)">
        {gw.error ? <InfoBanner tone="danger" text={gw.error} /> : null}
        <KV k="SMS" v={gw.data ? (gw.data.sms ? `On · ${gw.data.smsProvider ?? ''}` : 'Not set up') : '…'} />
        <KV k="WhatsApp" v={gw.data ? (gw.data.whatsapp ? `On · ${gw.data.whatsappProvider ?? ''}` : 'Not set up') : '…'} last />
      </Card>
      <NotAvailable
        what="Gateway keys, email, payment gateway and biometric settings"
        detail="These are set up on the school server by the platform administrator; the app cannot read or change them yet."
      />
    </Screen>
  );
}

export function AdminIntegrationDetail(_: ScreenProps) {
  return (
    <Screen title="Integration">
      <NotAvailable what="Integration settings" />
    </Screen>
  );
}

const s = StyleSheet.create({
  gap: { height: 10 },
  logo: { width: 90 },
  logoImg: { width: 64, height: 64, borderRadius: 12 },
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
