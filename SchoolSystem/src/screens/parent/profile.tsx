import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bell, CalendarDays, Clock, Flag, Heart, MapPin, Pencil, Phone, Shield, Star, User } from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  StatTile,
  toast,
} from '../../components/ui';
import { Empty, QueryView } from '../../components/states';
import { colors } from '../../theme';
import { ScreenProps, useNav } from '../../navigation';
import { useShared } from '../../store';
import { useI18n } from '../../i18n';
import { familyApi } from '../../api/mobile';
import { useMutation } from '../../api/hooks';
import { cap, fmtDate, useChildId, useFamily } from '../shared';

// The server has no list of sent change requests, so the last one sent from
// this phone is remembered to show the "waiting for the office" note.
type SentChange = { what: string; sent: string };
function useSentChanges() {
  return useShared<Record<number, SentChange>>('parent.changeReq', {});
}

export function useProfile() {
  return useFamily('profile', familyApi.profile);
}

export function ParentProfile(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const q = useProfile();
  const [sent] = useSentChanges();
  const req = q.data ? sent[q.data.id] : undefined;
  return (
    <Screen title="Profile" refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q}>
        {p => (
          <>
            <Card>
              <View style={s.head}>
                <Avatar name={p.name} size={58} ring />
                <View style={s.flex}>
                  <Text style={s.name}>{p.name}</Text>
                  <Text style={s.sub}>
                    {p.grNo} · {p.className}-{p.section}
                    {p.rollNo ? ` · ${t('Roll')} ${p.rollNo}` : ''}
                  </Text>
                  {p.gender ? (
                    <View style={s.badges}>
                      <Badge label={p.gender === 'F' ? 'Girl' : 'Boy'} tone="info" />
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>
            <Card>
              <ListRow icon={User} title={t('Father')} subtitle={p.father || '—'} />
              {p.mother ? <ListRow icon={User} title={t('Mother')} subtitle={p.mother} /> : null}
              <ListRow icon={Phone} title={t('Mobile')} subtitle={p.mobile || '—'} />
              <ListRow icon={MapPin} title={t('Address')} subtitle={p.address || '—'} />
              <ListRow icon={CalendarDays} title={t('Date of birth')} subtitle={fmtDate(p.dob, true)} last />
            </Card>
          </>
        )}
      </QueryView>
      <Button label="Request a change" variant="outline" icon={Pencil} onPress={() => nav.push('ParentChangeRequest')} />
      {req ? (
        <InfoBanner
          tone="warn"
          icon={Clock}
          text={`${t(req.what)} ${t('change sent on')} ${req.sent} ${t('is waiting for the office.')}`}
        />
      ) : null}
    </Screen>
  );
}

export function ParentChangeRequest(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const childId = useChildId();
  const q = useProfile();
  const [, setSent] = useSentChanges();
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (q.data) {
      setMobile(m => m || q.data?.mobile || '');
      setAddress(a => a || q.data?.address || '');
    }
  }, [q.data]);
  const send = useMutation(
    (b: { mobile?: string; address?: string; note?: string }) => familyApi.changeRequest(b, childId),
    'Request sent to the office',
  );
  const submit = async () => {
    const p = q.data;
    const changed = [
      mobile !== (p?.mobile ?? '') && 'Mobile',
      address !== (p?.address ?? '') && 'Address',
      note.trim() && 'Emergency contact',
    ].filter(Boolean) as string[];
    if (!changed.length) {
      toast(t('Nothing changed'));
      return;
    }
    if (mobile.replace(/\D/g, '').length !== 11) {
      toast(t('Enter an 11-digit mobile number'));
      return;
    }
    const r = await send.run({ mobile, address, note: note.trim() || undefined });
    if (r && p) {
      const d = new Date();
      setSent(m => ({
        ...m,
        [p.id]: { what: changed.length > 1 ? 'Contact details' : changed[0], sent: `${d.getDate()}/${d.getMonth() + 1}` },
      }));
      nav.pop();
    }
  };
  return (
    <Screen
      title="Request a change"
      subtitle={q.data?.name}
      footer={<Button label="Send request" onPress={submit} loading={send.busy} />}
    >
      <Field label="Mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      <Field label="Address" icon={MapPin} value={address} onChangeText={setAddress} />
      <Field label="Emergency contact" value={note} onChangeText={setNote} placeholder="0321 8899001 (Sana)" />
      <InfoBanner
        tone="warn"
        icon={Shield}
        text={t('The office checks and applies the change. You get a notification when it is done.')}
      />
    </Screen>
  );
}

export function ParentBehavior(_: ScreenProps) {
  const { t } = useI18n();
  const profile = useProfile();
  const q = useFamily('health', familyApi.health);
  const list = q.data ?? [];
  const isSick = (k: unknown) => /sick|health|bay/i.test(String(k ?? ''));
  const behavior = list.filter(r => !isSick(r.kind ?? r.status));
  const sick = list.filter(r => isSick(r.kind ?? r.status));
  const points = behavior.reduce((a, r) => a + (Number(r.points) || 0), 0);
  return (
    <Screen title="Behavior and health" subtitle={profile.data?.name} refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={s.stats}>
        <StatTile value={points > 0 ? `+${points}` : String(points)} label="Behavior points" active />
        <StatTile value={String(sick.length)} label="Sick-bay visit" />
        <StatTile value={String(behavior.length)} label="Notes" />
      </View>
      <QueryView q={q}>
        {() => (
          <>
            <Card title="Behavior notes">
              {behavior.length ? (
                behavior.map((n, i) => {
                  const pts = Number(n.points) || 0;
                  return (
                    <ListRow
                      key={n.id}
                      icon={pts < 0 ? Flag : Star}
                      title={String(n.note || n.title)}
                      subtitle={`${fmtDate(n.recordDate)}${pts ? ` · ${pts > 0 ? '+' : ''}${pts}` : ''}`}
                      right={<Badge label={pts < 0 ? 'Warning' : 'Positive'} tone={pts < 0 ? 'danger' : 'success'} />}
                      last={i === behavior.length - 1}
                    />
                  );
                })
              ) : (
                <Empty text="No behavior notes." />
              )}
            </Card>
            <Card title="Health">
              {sick.length ? (
                sick.map((n, i) => (
                  <ListRow
                    key={n.id}
                    icon={Heart}
                    iconTone="danger"
                    title={`${cap(String(n.kind ?? 'Sick bay'))} · ${fmtDate(n.recordDate)}`}
                    subtitle={String(n.note || n.title)}
                    last={i === sick.length - 1}
                  />
                ))
              ) : (
                <Empty text="No sick-bay visits." />
              )}
            </Card>
          </>
        )}
      </QueryView>
      <InfoBanner icon={Bell} text={t('You get a notification every time a note or sick-bay visit is recorded.')} />
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 1 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  stats: { flexDirection: 'row', gap: 8 },
});
