import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Banknote, BookOpen, Bus, MessageCircle, Phone } from 'lucide-react-native';
import {
  Badge,
  BellButton,
  Card,
  Chips,
  formatRs,
  IconButton,
  InfoTile,
  ListRow,
  Placeholder,
  Screen,
  toast,
} from '../../components/ui';
import { NoApiBanner, QueryView } from '../../components/states';
import { colors } from '../../theme';
import { ScreenProps } from '../../navigation';
import { useI18n } from '../../i18n';
import { useCurrentChild } from '../../data/useChild';
import { familyApi } from '../../api/mobile';
import { fmtDate, fmtDateTime, todayIso, useFamily } from './data';
import { useNotices } from './academics';

export function LibraryScreen(_: ScreenProps) {
  const child = useCurrentChild();
  const { t } = useI18n();
  const q = useFamily('library', familyApi.library);
  const first = child.name.split(' ')[0];
  const list = q.data ?? [];
  const issued = list.filter(b => !b.returnedOn);
  const history = list.filter(b => b.returnedOn);
  const fines = list.reduce((a, b) => a + (b.fine || 0), 0);
  const today = todayIso();
  return (
    <Screen title="Library" subtitle={child.name} refreshing={q.refreshing} onRefresh={q.refresh}>
      <View style={s.tiles}>
        <InfoTile label={`${t('Books with')} ${first}`} value={issued.length} />
        <InfoTile label="Fines" value={formatRs(fines)} valueStyle={fines ? s.red : undefined} sub={t('On next voucher')} />
      </View>
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No books issued.">
        {() => (
          <>
            <Card title="Issued now">
              {issued.length ? (
                issued.map((b, i) => {
                  const overdue = b.dueOn < today;
                  return (
                    <ListRow
                      key={b.id}
                      icon={BookOpen}
                      title={b.title}
                      subtitle={`${t('Issued')} ${fmtDate(b.issuedOn)} · ${t('due')} ${fmtDate(b.dueOn)}`}
                      right={<Badge label={overdue ? 'Overdue' : 'Issued'} tone={overdue ? 'danger' : 'warn'} />}
                      last={i === issued.length - 1}
                    />
                  );
                })
              ) : (
                <Text style={s.empty}>{t('No books with the child right now.')}</Text>
              )}
            </Card>
            {history.length ? (
              <Card title="History">
                {history.map((b, i) => (
                  <ListRow
                    key={b.id}
                    icon={BookOpen}
                    title={b.title}
                    subtitle={`${t('Returned')} ${fmtDate(b.returnedOn)}`}
                    right={b.fine ? <Badge label={formatRs(b.fine)} /> : <Badge label="On time" tone="success" />}
                    last={i === history.length - 1}
                  />
                ))}
              </Card>
            ) : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

async function call(phone: string) {
  try {
    await Linking.openURL(`tel:${phone.replace(/[\s-]/g, '')}`);
  } catch {
    toast(`Call ${phone}`);
  }
}

export function TransportScreen(_: ScreenProps) {
  const { t } = useI18n();
  const q = useFamily('transport', familyApi.transport);
  return (
    <Screen title="Transport" subtitle={q.data?.route?.name} refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q} isEmpty={d => !d.route && !d.vehicle} emptyText="No transport is assigned to this child.">
        {d => (
          <>
            <Placeholder label={t('Route map')} icon={Bus} height={140} style={s.map} />
            <Card>
              {d.route ? <ListRow icon={Bus} title={t('Route')} subtitle={d.route.name} /> : null}
              {d.vehicle ? <ListRow icon={Bus} title={t('Vehicle')} subtitle={`${d.vehicle.plate} · ${d.vehicle.type}`} /> : null}
              {d.route ? (
                <ListRow
                  icon={Banknote}
                  title={t('Monthly fee')}
                  subtitle={t('On your voucher')}
                  right={<Text style={s.time}>{formatRs(d.route.fare)}</Text>}
                  last
                />
              ) : null}
            </Card>
            {d.vehicle?.driver ? (
              <Card title="Contact">
                <ListRow
                  avatar={d.vehicle.driver}
                  title={d.vehicle.driver}
                  subtitle={`${t('Driver')} · ${d.vehicle.phone}`}
                  right={
                    d.vehicle.phone ? (
                      <IconButton icon={Phone} color={colors.success} style={s.call} onPress={() => call(d.vehicle?.phone ?? '')} />
                    ) : undefined
                  }
                  last
                />
              </Card>
            ) : null}
            <NoApiBanner what={t('Pickup and drop stop timings')} />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const FILTERS = ['All', 'School', 'Class teacher', 'Fee'];

// Server notices have an audience (all / parent / student / staff) but no
// category; "Fee" matches fee words in the title.
function matches(filter: string, n: { title: string; audience: string }) {
  if (filter === 'All') {
    return true;
  }
  if (filter === 'Fee') {
    return /fee|voucher|payment|dues/i.test(n.title);
  }
  if (filter === 'Class teacher') {
    return n.audience === 'parent' || n.audience === 'student';
  }
  return n.audience === 'all';
}

export function NoticesScreen(_: ScreenProps) {
  const { lang } = useI18n();
  const [filter, setFilter] = useState('All');
  const q = useNotices();
  const shown = (q.data ?? []).filter(n => matches(filter, n));
  return (
    <Screen title="Notices" right={<BellButton count={q.data?.length || undefined} />} refreshing={q.refreshing} onRefresh={q.refresh}>
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No notices yet.">
        {() => (
          <Card>
            {shown.length ? (
              shown.map((n, i) => {
                const body = lang === 'ur' && n.bodyUrdu ? n.bodyUrdu : n.body;
                return (
                  <ListRow
                    key={n.id}
                    icon={MessageCircle}
                    title={n.title}
                    subtitle={body}
                    right={<Text style={s.when}>{fmtDateTime(n.at)}</Text>}
                    last={i === shown.length - 1}
                  />
                );
              })
            ) : (
              <Text style={s.empty}>Nothing in this filter.</Text>
            )}
          </Card>
        )}
      </QueryView>
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
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 8 },
});
