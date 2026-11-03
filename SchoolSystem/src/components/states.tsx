// Loading, error, empty and "no API yet" states shared by every screen.
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CloudOff, Inbox, RefreshCw, ServerOff } from 'lucide-react-native';
import { Button, InfoBanner } from './ui';
import { colors } from '../theme';
import { useI18n } from '../i18n';
import type { Query } from '../api/hooks';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  const { t } = useI18n();
  return (
    <View style={s.box}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={s.muted}>{t(label)}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <View style={s.box}>
      <CloudOff size={34} color={colors.danger} />
      <Text style={s.title}>{t("Couldn't load")}</Text>
      <Text style={s.muted}>{message}</Text>
      {onRetry ? <Button label="Try again" icon={RefreshCw} variant="outline" onPress={onRetry} style={s.btn} /> : null}
    </View>
  );
}

export function Empty({ text = 'Nothing here yet.' }: { text?: string }) {
  const { t } = useI18n();
  return (
    <View style={s.boxSmall}>
      <Inbox size={26} color={colors.textFaint} />
      <Text style={s.muted}>{t(text)}</Text>
    </View>
  );
}

// Shown on screens whose data the server does not provide yet; the screen keeps
// working with sample data so nothing is missing for the user.
export function NoApiBanner({ what }: { what?: string }) {
  const { t } = useI18n();
  return (
    <InfoBanner
      tone="warn"
      icon={ServerOff}
      text={`${t('Sample data')}: ${what ? `${what} — ` : ''}${t('the school server has no API for this yet.')}`}
    />
  );
}

// Replaces a screen part whose data the server cannot give yet. It shows no
// sample rows, so real-school users never see made-up names or figures.
export function NotAvailable({ what, detail }: { what: string; detail?: string }) {
  const { t } = useI18n();
  return (
    <View style={s.na}>
      <ServerOff size={26} color={colors.textFaint} />
      <Text style={s.naTitle}>{t(what)}</Text>
      <Text style={s.muted}>
        {t(detail || 'This is not available from the school server yet. It will appear here once the school turns it on.')}
      </Text>
    </View>
  );
}

// Renders loading / error / data for a query. Old data stays on screen while
// it refreshes.
export function QueryView<T>({
  q,
  children,
  isEmpty,
  emptyText,
}: {
  q: Query<T>;
  children: (data: T) => React.ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyText?: string;
}) {
  if (q.data === undefined) {
    if (q.error) {
      return <ErrorView message={q.error} onRetry={q.refresh} />;
    }
    return <Loading />;
  }
  return (
    <>
      {q.error ? <InfoBanner tone="danger" text={q.error} /> : null}
      {isEmpty && isEmpty(q.data) ? <Empty text={emptyText} /> : children(q.data)}
    </>
  );
}

const s = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  boxSmall: { alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 6 },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  btn: { marginTop: 6, alignSelf: 'center' },
  na: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 26,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  naTitle: { fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' },
});
