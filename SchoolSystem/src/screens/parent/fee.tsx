import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Banknote,
  Check,
  CircleAlert,
  CreditCard,
  Download,
  Info,
  Phone,
  Receipt as ReceiptIcon,
  TriangleAlert,
} from 'lucide-react-native';
import {
  Amount,
  Badge,
  BellButton,
  Button,
  Card,
  formatRs,
  IconButton,
  InfoBanner,
  InfoTile,
  ListRow,
  QRCode,
  Screen,
  Segmented,
  toast,
  Toggle,
} from '../../components/ui';
import { Empty, QueryView } from '../../components/states';
import { colors } from '../../theme';
import { ScreenProps, useNav, useParam } from '../../navigation';
import { useI18n } from '../../i18n';
import { useCurrentChild } from '../../data/useChild';
import { familyApi, OnlinePayDto, PaymentDto, VoucherDto } from '../../api/mobile';
import { useApi, useMutation } from '../../api/hooks';
import { cap, fmtDate, monthLabel, statusTone, useChildId, useFamily, useFees } from '../shared';

const isOpen = (v: VoucherDto) => v.status === 'unpaid' || v.status === 'partial';
const voucherTitle = (v: VoucherDto) => (v.month ? monthLabel(v.month) : v.title || v.voucherNo);

function ReceiptsCard({ receipts }: { receipts: PaymentDto[] }) {
  if (!receipts.length) {
    return <Empty text="No payments yet." />;
  }
  return (
    <Card>
      {receipts.map((r, i) => (
        <ListRow
          key={r.id}
          icon={ReceiptIcon}
          title={r.receiptNo}
          subtitle={`${fmtDate(r.date)} · ${cap(r.mode)}`}
          right={<Amount value={r.amount} />}
          last={i === receipts.length - 1}
        />
      ))}
    </Card>
  );
}

function DownloadAll() {
  const { t } = useI18n();
  return (
    <Button
      label="Download all receipts (PDF)"
      variant="outline"
      icon={Download}
      onPress={() => toast(t('PDF download is not available yet'))}
    />
  );
}

export function ParentFee(_: ScreenProps) {
  const nav = useNav();
  const child = useCurrentChild();
  const { t } = useI18n();
  const fees = useFees();
  const pays = useFamily('payments', familyApi.payments);
  const [tab, setTab] = useState('Vouchers');
  const vouchers = fees.data?.vouchers ?? [];
  const open = vouchers.filter(isOpen).length;
  const paidTotal = (pays.data ?? []).reduce((a, p) => a + p.amount, 0);
  return (
    <Screen
      title="Fee"
      subtitle={child.loaded ? `${child.name} · ${child.className}` : undefined}
      right={<BellButton />}
      refreshing={fees.refreshing}
      onRefresh={() => {
        fees.refresh();
        pays.refresh();
      }}
    >
      <View style={s.tiles}>
        <InfoTile
          label="Total due"
          value={formatRs(fees.data?.dues ?? 0)}
          valueStyle={(fees.data?.dues ?? 0) > 0 ? s.red : undefined}
          sub={`${open} ${t(open === 1 ? 'voucher open' : 'vouchers open')}`}
        />
        <InfoTile label="Paid" value={formatRs(paidTotal)} sub={`${pays.data?.length ?? 0} ${t('receipts')}`} />
      </View>
      <Segmented options={['Vouchers', 'Payments']} value={tab} onChange={setTab} />
      {tab === 'Vouchers' ? (
        <QueryView q={fees} isEmpty={d => d.vouchers.length === 0} emptyText="No vouchers yet.">
          {() => (
            <>
              <Card>
                {vouchers.map((v, i) => (
                  <ListRow
                    key={v.id}
                    icon={ReceiptIcon}
                    title={voucherTitle(v)}
                    subtitle={`${v.voucherNo} · ${isOpen(v) ? `${t('Due')} ${fmtDate(v.dueDate)}` : t('Paid')}`}
                    right={
                      <View style={s.right}>
                        <Amount value={isOpen(v) ? v.balance : v.amount} />
                        <Badge label={cap(v.status)} tone={statusTone(v.status)} />
                      </View>
                    }
                    onPress={() => nav.push('ParentVoucher', { id: v.id })}
                    last={i === vouchers.length - 1}
                  />
                ))}
              </Card>
              <InfoBanner tone="warn" icon={TriangleAlert} text={t('After the due date a late fine applies as per school rules.')} />
            </>
          )}
        </QueryView>
      ) : (
        <QueryView q={pays}>
          {list => (
            <>
              <ReceiptsCard receipts={list} />
              {list.length ? <DownloadAll /> : null}
            </>
          )}
        </QueryView>
      )}
    </Screen>
  );
}

export function ParentVoucher(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const id = useParam<number>('id', 0);
  const q = useFamily('voucher', cid => familyApi.voucher(id, cid), String(id));
  return (
    <Screen
      title={q.data?.voucherNo ?? 'Voucher'}
      subtitle={q.data ? voucherTitle(q.data) : undefined}
      right={<IconButton icon={Download} onPress={() => toast(t('PDF download is not available yet'))} />}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      <QueryView q={q}>
        {v => {
          const open = isOpen(v);
          return (
            <>
              <Card>
                {(v.lines ?? []).map((l, i) => (
                  <React.Fragment key={`${l.label}-${i}`}>
                    <ListRow title={l.label} right={<Amount value={l.amount} />} />
                    {l.discount ? (
                      <ListRow title={`${l.label} ${t('discount')}`} right={<Amount value={-l.discount} tone="success" />} />
                    ) : null}
                  </React.Fragment>
                ))}
                {v.paid > 0 && open ? <ListRow title={t('Already paid')} right={<Amount value={-v.paid} tone="success" />} /> : null}
                <View style={s.payable}>
                  <Text style={s.payableLabel}>{open ? `${t('Payable by')} ${fmtDate(v.dueDate)}` : t('Paid')}</Text>
                  <Text style={s.payableValue}>{formatRs(open ? v.balance : v.amount)}</Text>
                </View>
              </Card>
              {open ? (
                <Card>
                  <View style={s.qrRow}>
                    <QRCode value={v.qr} size={104} />
                    <View style={s.flex}>
                      <Text style={s.bold}>{t('Pay at the school bank')}</Text>
                      <Text style={s.small}>{t('Show this QR at the counter.')}</Text>
                    </View>
                  </View>
                </Card>
              ) : (
                <InfoBanner tone="success" icon={Check} text={t('This voucher is paid.')} />
              )}
              <View style={s.btnRow}>
                <Button
                  label="PDF"
                  variant="outline"
                  icon={Download}
                  style={s.pdfBtn}
                  onPress={() => toast(t('PDF download is not available yet'))}
                />
                {open ? (
                  <Button label="Pay online" icon={Banknote} style={s.flex} onPress={() => nav.push('ParentPayOnline', { id: v.id })} />
                ) : (
                  <Button label="Payment history" icon={ReceiptIcon} style={s.flex} onPress={() => nav.push('ParentPaymentHistory')} />
                )}
              </View>
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

export function ParentPaymentHistory(_: ScreenProps) {
  const nav = useNav();
  const child = useCurrentChild();
  const q = useFamily('payments', familyApi.payments);
  return (
    <Screen title="Payment history" subtitle={child.name} refreshing={q.refreshing} onRefresh={q.refresh}>
      <Segmented options={['Vouchers', 'Payments']} value="Payments" onChange={v => v === 'Vouchers' && nav.pop()} />
      <QueryView q={q}>
        {list => (
          <>
            <ReceiptsCard receipts={list} />
            {list.length ? <DownloadAll /> : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const METHODS = [
  { key: 'jazzcash', label: 'JazzCash', sub: 'Mobile account', icon: Phone, tone: 'danger' as const },
  { key: 'easypaisa', label: 'Easypaisa', sub: 'Mobile account', icon: Phone, tone: 'success' as const },
  { key: '1link', label: '1Link / 1Bill', sub: 'Any bank app, debit card', icon: CreditCard, tone: 'info' as const },
];

export function ParentPayOnline(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const id = useParam<number>('id', 0);
  const q = useFamily('voucher', cid => familyApi.voucher(id, cid), String(id));
  const childId = useChildId();
  const [method, setMethod] = useState(METHODS[0].key);
  const [result, setResult] = useState<OnlinePayDto | null>(null);
  const pay = useMutation((g: string) => familyApi.payOnline(id, g, childId));
  const m = METHODS.find(x => x.key === method) ?? METHODS[0];
  const go = async () => {
    const r = await pay.run(method);
    if (!r) {
      return;
    }
    setResult(r);
    if (r.status === 'paid' || r.status === 'success') {
      nav.replace('ParentPaymentStatus', { reference: r.reference });
    }
  };
  const gateway = result?.gateways.find(g => g.id === method);
  return (
    <Screen
      title={q.data ? `${t('Pay')} ${formatRs(q.data.balance)}` : t('Pay online')}
      subtitle={q.data ? `${t('Voucher')} ${q.data.voucherNo}` : undefined}
      footer={<Button label={`${t('Continue to')} ${m.label}`} loading={pay.busy} onPress={go} />}
    >
      <Text style={s.label}>{t('Choose how to pay')}</Text>
      <Card>
        {METHODS.map((x, i) => (
          <ListRow
            key={x.key}
            icon={x.icon}
            iconTone={x.tone}
            title={x.label}
            subtitle={t(x.sub)}
            right={<Toggle value={method === x.key} onChange={() => setMethod(x.key)} />}
            onPress={() => setMethod(x.key)}
            last={i === METHODS.length - 1}
          />
        ))}
      </Card>
      {result && result.status !== 'paid' && result.status !== 'success' ? (
        <>
          <InfoBanner tone="danger" icon={CircleAlert} text={result.message} />
          <Card title="Gateways">
            {result.gateways.map((g, i) => (
              <ListRow
                key={g.id}
                title={g.name}
                right={<Badge label={g.enabled ? 'Available' : 'Not enabled'} tone={g.enabled ? 'success' : 'neutral'} />}
                last={i === result.gateways.length - 1}
              />
            ))}
          </Card>
          {result.reference ? (
            <Button
              label="Check payment status"
              variant="outline"
              onPress={() => nav.push('ParentPaymentStatus', { reference: result.reference })}
            />
          ) : null}
          {gateway && !gateway.enabled ? (
            <InfoBanner text={t('Until online payment is enabled, pay at the bank with the voucher QR.')} />
          ) : null}
        </>
      ) : (
        <InfoBanner
          icon={Info}
          text={`${t('You approve the payment in the')} ${m.label} ${t('page. The voucher is marked paid only when')} ${m.label} ${t('confirms.')}`}
        />
      )}
    </Screen>
  );
}

export function ParentPaymentStatus(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const reference = useParam<string>('reference', '');
  const q = useApi(reference ? `pay-status:${reference}` : null, () => familyApi.payStatus(reference));
  const ok = q.data && (q.data.status === 'paid' || q.data.status === 'success');
  return (
    <Screen
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      footer={
        <>
          <Button label="Refresh status" variant="outline" onPress={q.refresh} />
          <Button label="Back to fee" onPress={() => nav.popTo('ParentTabs')} />
        </>
      }
    >
      {!reference ? (
        <Empty text="No payment reference." />
      ) : (
        <QueryView q={q}>
          {p => (
            <>
              <View style={[s.okCircle, !ok && s.warnCircle]}>
                {ok ? (
                  <Check size={40} color={colors.success} strokeWidth={2.6} />
                ) : (
                  <CircleAlert size={40} color={colors.warn} strokeWidth={2.4} />
                )}
              </View>
              <Text style={s.okTitle}>{ok ? t('Payment received') : t('Payment not completed')}</Text>
              <Text style={s.okSub}>{ok ? t('The voucher is marked paid.') : `${t('Status')}: ${cap(p.status)}`}</Text>
              <Card>
                {p.amount !== undefined ? <ListRow title={t('Amount')} right={<Amount value={Number(p.amount)} />} /> : null}
                <ListRow title={t('Voucher')} right={<Text style={s.bold}>{p.title}</Text>} />
                {p.gateway ? <ListRow title={t('Gateway')} right={<Text style={s.bold}>{String(p.gateway)}</Text>} /> : null}
                <ListRow title={t('Reference')} right={<Text style={s.bold}>{p.uuid.slice(0, 8).toUpperCase()}</Text>} last />
              </Card>
            </>
          )}
        </QueryView>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: 10 },
  red: { color: colors.danger },
  right: { alignItems: 'flex-end', gap: 3 },
  payable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: colors.text,
    paddingTop: 12,
    marginTop: 2,
  },
  payableLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  payableValue: { fontSize: 20, fontWeight: '900', color: colors.text },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bold: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  small: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  btnRow: { flexDirection: 'row', gap: 10 },
  pdfBtn: { width: 110 },
  label: { fontSize: 13, fontWeight: '800', color: colors.text },
  okCircle: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  warnCircle: { backgroundColor: colors.warnSoft },
  okTitle: { fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center' },
  okSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 6 },
});
