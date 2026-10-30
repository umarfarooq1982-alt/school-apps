import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  CalendarDays,
  Clock,
  Flag,
  Heart,
  MapPin,
  Pencil,
  Phone,
  Shield,
  Star,
  User,
} from 'lucide-react-native';
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
import { colors } from '../../theme';
import { ScreenProps, useNav } from '../../navigation';
import { useShared } from '../../store';
import { useI18n } from '../../i18n';
import { PARENT } from '../../data/school';
import { useCurrentChild } from '../../data/useChild';

type ChangeReq = {
  what: string;
  sent: string;
  mobile: string;
  address: string;
  emergency: string;
};

const CURRENT = {
  mobile: PARENT.mobile,
  address: 'House 12, Street 4, Model Town',
  emergency: '0321 8899001 (Sana Imran)',
};

function useChangeRequests() {
  return useShared<Record<string, ChangeReq>>('parent.changeReq', {
    ayesha: {
      what: 'Address',
      sent: '20 Oct',
      mobile: CURRENT.mobile,
      address: 'House 21, Street 9, Peoples Colony',
      emergency: CURRENT.emergency,
    },
  });
}

export function ParentProfile(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const child = useCurrentChild();
  const [reqs] = useChangeRequests();
  const req = reqs[child.id];
  return (
    <Screen title="Profile">
      <Card>
        <View style={s.head}>
          <Avatar name={child.name} size={58} ring />
          <View style={s.flex}>
            <Text style={s.name}>{child.name}</Text>
            <Text style={s.sub}>
              {child.gr} · {child.className} · {child.campus}
            </Text>
            <View style={s.badges}>
              <Badge label={`${t('Blood')} ${child.bloodGroup}`} tone="danger" />
              <Badge label="Transport" tone="info" />
            </View>
          </View>
        </View>
      </Card>
      <Card>
        <ListRow icon={User} title={t('Father')} subtitle={PARENT.name} />
        <ListRow icon={Phone} title={t('Mobile')} subtitle={CURRENT.mobile} />
        <ListRow icon={MapPin} title={t('Address')} subtitle={CURRENT.address} />
        <ListRow icon={CalendarDays} title={t('Date of birth')} subtitle={child.dob} last />
      </Card>
      <Button
        label="Request a change"
        variant="outline"
        icon={Pencil}
        onPress={() => nav.push('ParentChangeRequest')}
      />
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
  const child = useCurrentChild();
  const [reqs, setReqs] = useChangeRequests();
  const prev = reqs[child.id];
  const [mobile, setMobile] = useState(prev?.mobile ?? CURRENT.mobile);
  const [address, setAddress] = useState(prev?.address ?? CURRENT.address);
  const [emergency, setEmergency] = useState(prev?.emergency ?? CURRENT.emergency);
  const send = () => {
    const changed = [
      mobile !== CURRENT.mobile && 'Mobile',
      address !== CURRENT.address && 'Address',
      emergency !== CURRENT.emergency && 'Emergency contact',
    ].filter(Boolean) as string[];
    if (!changed.length) {
      toast(t('Nothing changed'));
      return;
    }
    if (mobile.replace(/\D/g, '').length !== 11) {
      toast(t('Enter an 11-digit mobile number'));
      return;
    }
    setReqs(r => ({
      ...r,
      [child.id]: {
        what: changed.length > 1 ? 'Contact details' : changed[0],
        sent: '22 Oct',
        mobile,
        address,
        emergency,
      },
    }));
    toast(t('Request sent to the office'));
    nav.pop();
  };
  return (
    <Screen
      title="Request a change"
      subtitle={child.name}
      footer={<Button label="Send request" onPress={send} />}
    >
      <Field label="Mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      <Field label="Address" icon={MapPin} value={address} onChangeText={setAddress} />
      <Field label="Emergency contact" value={emergency} onChangeText={setEmergency} />
      <InfoBanner
        tone="warn"
        icon={Shield}
        text={t('The office checks and applies the change. You get a notification when it is done.')}
      />
    </Screen>
  );
}

const NOTES = [
  { title: 'Helped a classmate', sub: '20 Oct · Ms. Sadia · +2', positive: true },
  { title: 'Homework not done', sub: '7 Oct · Ms. Asma · -1', positive: false },
  { title: 'Class monitor duty', sub: '29 Sep · +2', positive: true },
];

export function ParentBehavior(_: ScreenProps) {
  const { t } = useI18n();
  const child = useCurrentChild();
  return (
    <Screen title="Behavior and health" subtitle={child.name}>
      <View style={s.stats}>
        <StatTile value="+3" label="Behavior points" active />
        <StatTile value="1" label="Sick-bay visit" />
        <StatTile value={child.bloodGroup} label="Blood group" />
      </View>
      <Card title="Behavior notes">
        {NOTES.map((n, i) => (
          <ListRow
            key={n.title}
            icon={n.positive ? Star : Flag}
            title={n.title}
            subtitle={n.sub}
            right={
              <Badge
                label={n.positive ? 'Positive' : 'Warning'}
                tone={n.positive ? 'success' : 'danger'}
              />
            }
            last={i === NOTES.length - 1}
          />
        ))}
      </Card>
      <Card title="Health">
        <ListRow
          icon={Heart}
          iconTone="danger"
          title="Sick bay · 15 Oct, 10:40"
          subtitle="Headache. Rested 30 min, given water. Back to class."
          last
        />
      </Card>
      <InfoBanner
        icon={Bell}
        text={t('You get a notification every time a note or sick-bay visit is recorded.')}
      />
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
