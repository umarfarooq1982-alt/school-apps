import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import {
  Banknote,
  BookOpen,
  Bus,
  GraduationCap,
  MapPin,
  MessageCircle,
  Phone,
  Receipt,
  Shield,
  Users,
} from 'lucide-react-native';
import {
  Badge,
  BellButton,
  Card,
  Chips,
  formatRs,
  IconButton,
  IconType,
  InfoTile,
  ListRow,
  Placeholder,
  Screen,
  toast,
} from '../../components/ui';
import { colors } from '../../theme';
import { ScreenProps } from '../../navigation';
import { useSession } from '../../store';
import { useI18n } from '../../i18n';
import { LIBRARY, Notice, NOTICES, TRANSPORT } from '../../data/school';
import { useCurrentChild } from '../../data/useChild';

export function LibraryScreen(_: ScreenProps) {
  const child = useCurrentChild();
  const { t } = useI18n();
  const first = child.name.split(' ')[0];
  return (
    <Screen title="Library" subtitle={child.name}>
      <View style={s.tiles}>
        <InfoTile
          label={`${t('Books with')} ${first}`}
          value={LIBRARY.issued.length}
          sub={`${t('Limit')} ${LIBRARY.limit}`}
        />
        <InfoTile
          label="Fines"
          value={formatRs(LIBRARY.fine)}
          valueStyle={s.red}
          sub={t('On next voucher')}
        />
      </View>
      <Card title="Issued now">
        {LIBRARY.issued.map((b, i) => (
          <ListRow
            key={b.title}
            icon={BookOpen}
            title={b.title}
            subtitle={b.sub}
            right={<Badge label={b.badge} tone={b.tone} />}
            last={i === LIBRARY.issued.length - 1}
          />
        ))}
      </Card>
      <Card title="History">
        {LIBRARY.history.map((b, i) => (
          <ListRow
            key={b.title}
            icon={BookOpen}
            title={b.title}
            subtitle={b.sub}
            right={<Badge label={b.badge} tone={b.tone} />}
            last={i === LIBRARY.history.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

async function call(phone: string) {
  try {
    await Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  } catch {
    toast(`Call ${phone}`);
  }
}

export function TransportScreen(_: ScreenProps) {
  const { t } = useI18n();
  return (
    <Screen title="Transport" subtitle={TRANSPORT.route}>
      <Placeholder label={t('Route map')} icon={Bus} height={140} style={s.map} />
      <Card>
        <ListRow
          icon={MapPin}
          title={t('Pickup')}
          subtitle={TRANSPORT.pickup.stop}
          right={<Text style={s.time}>{TRANSPORT.pickup.time}</Text>}
        />
        <ListRow
          icon={MapPin}
          title={t('Drop')}
          subtitle={TRANSPORT.drop.stop}
          right={<Text style={s.time}>{TRANSPORT.drop.time}</Text>}
        />
        <ListRow icon={Bus} title={t('Vehicle')} subtitle={TRANSPORT.vehicle} />
        <ListRow
          icon={Banknote}
          title={t('Monthly fee')}
          subtitle={t('On your voucher')}
          right={<Text style={s.time}>{formatRs(TRANSPORT.fee)}</Text>}
          last
        />
      </Card>
      <Card title="Contact">
        {TRANSPORT.contacts.map((c, i) => (
          <ListRow
            key={c.name}
            avatar={c.name}
            title={c.name}
            subtitle={`${t(c.role)} · ${c.phone}`}
            right={
              <IconButton
                icon={Phone}
                color={colors.success}
                style={s.call}
                onPress={() => call(c.phone)}
              />
            }
            last={i === TRANSPORT.contacts.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

const NOTICE_ICON: Record<Notice['icon'], IconType> = {
  result: GraduationCap,
  message: MessageCircle,
  fee: Receipt,
  ptm: Users,
  pickup: Shield,
};

export function NoticesScreen(_: ScreenProps) {
  const { role } = useSession();
  const [filter, setFilter] = useState('All');
  const shown = NOTICES.filter(n => filter === 'All' || n.kind === filter);
  return (
    <Screen title="Notices" right={<BellButton count={role === 'student' ? 3 : 4} />}>
      <Chips
        options={['All', 'School', 'Class teacher', 'Fee']}
        value={filter}
        onChange={setFilter}
      />
      <Card>
        {shown.map((n, i) => (
          <ListRow
            key={n.title}
            icon={NOTICE_ICON[n.icon]}
            title={n.title}
            subtitle={n.text}
            right={<Text style={s.when}>{n.when}</Text>}
            last={i === shown.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  red: { color: colors.danger },
  map: { borderWidth: 1, borderColor: colors.border },
  time: { fontSize: 16, fontWeight: '800', color: colors.text },
  call: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  when: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, alignSelf: 'flex-start' },
});
