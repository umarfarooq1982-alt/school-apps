import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Banknote,
  Check,
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
  Field,
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
import { colors } from '../../theme';
import { ScreenProps, useNav, useParam } from '../../navigation';
import { useI18n } from '../../i18n';
import { PARENT } from '../../data/school';
import { useCurrentChild } from '../../data/useChild';
import { Receipt, useChildFee, voucherLines } from '../shared';

function ReceiptsCard({ receipts }: { receipts: Receipt[] }) {
  return (
    <Card>
      {receipts.map((r, i) => (
        <ListRow
          key={r.id}
          icon={ReceiptIcon}
          title={r.id}
          subtitle={`${r.date} · ${r.mode}`}
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
      onPress={() => toast(t('Downloaded (demo)'))}
    />
  );
}

export function ParentFee(_: ScreenProps) {
  const nav = useNav();
  const child = useCurrentChild();
  const { t } = useI18n();
  const fee = useChildFee(child);
  const [tab, setTab] = useState('Vouchers');
  const open = fee.vouchers.filter(v => v.status === 'Unpaid').length;
  return (
    <Screen
      title="Fee"
      subtitle={`${child.name} · ${child.className}`}
      right={<BellButton count={4} />}
    >
      <View style={s.tiles}>
        <InfoTile
          label="Total due"
          value={formatRs(fee.due)}
          valueStyle={fee.due > 0 ? s.red : undefined}
          sub={`${open} ${t(open === 1 ? 'voucher open' : 'vouchers open')}`}
        />
        <InfoTile
          label="Paid this session"
          value={formatRs(fee.paidSession)}
          sub={`${fee.receipts.length} ${t('receipts')}`}
        />
      </View>
      <Segmented options={['Vouchers', 'Payments']} value={tab} onChange={setTab} />
      {tab === 'Vouchers' ? (
        <>
          <Card>
            {fee.vouchers.map((v, i) => (
              <ListRow
                key={v.id}
                icon={ReceiptIcon}
                title={v.month}
                subtitle={`${v.id} · ${v.note}`}
                right={
                  <View style={s.right}>
                    <Amount value={v.amount} />
                    <Badge
                      label={v.status}
                      tone={v.status === 'Paid' ? 'success' : 'danger'}
                    />
                  </View>
                }
                onPress={() => nav.push('ParentVoucher', { id: v.id })}
                last={i === fee.vouchers.length - 1}
              />
            ))}
          </Card>
          <InfoBanner
            tone="warn"
            icon={TriangleAlert}
            text={t('After the due date a late fine of Rs. 50 a day applies (max Rs. 1,000).')}
          />
        </>
      ) : (
        <>
          <ReceiptsCard receipts={fee.receipts} />
          <DownloadAll />
        </>
      )}
    </Screen>
  );
}

export function ParentVoucher(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const child = useCurrentChild();
  const fee = useChildFee(child);
  const id = useParam('id', fee.vouchers[0].id);
  const v = fee.vouchers.find(x => x.id === id) ?? fee.vouchers[0];
  const lines = voucherLines(child, v);
  const paid = v.status === 'Paid';
  return (
    <Screen
      title={v.id}
      subtitle={v.month}
      right={
        <IconButton icon={Download} onPress={() => toast(t('Downloaded (demo)'))} />
      }
    >
      <Card>
        {lines.map(l => (
          <ListRow
            key={l.title}
            title={l.title}
            subtitle={l.sub}
            right={
              <Amount value={l.amount} tone={l.amount < 0 ? 'success' : undefined} />
            }
          />
        ))}
        <View style={s.payable}>
          <Text style={s.payableLabel}>
            {paid ? t('Paid') : `${t('Payable by')} ${v.dueDate}`}
          </Text>
          <Text style={s.payableValue}>{formatRs(v.amount)}</Text>
        </View>
      </Card>
      {paid ? (
        <InfoBanner tone="success" icon={Check} text={`${t('This voucher is paid.')} ${v.note}.`} />
      ) : (
        <Card>
          <View style={s.qrRow}>
            <QRCode value={v.id} size={104} />
            <View style={s.flex}>
              <Text style={s.bold}>{t('Pay at any Meezan Bank branch')}</Text>
              <Text style={s.small}>
                A/C 0123-0104567890. {t('Show this QR at the counter.')}
              </Text>
            </View>
          </View>
        </Card>
      )}
      <View style={s.btnRow}>
        <Button
          label="PDF"
          variant="outline"
          icon={Download}
          style={s.pdfBtn}
          onPress={() => toast(t('Downloaded (demo)'))}
        />
        {paid ? (
          <Button
            label="Payment history"
            icon={ReceiptIcon}
            style={s.flex}
            onPress={() => nav.push('ParentPaymentHistory')}
          />
        ) : (
          <Button
            label="Pay online"
            icon={Banknote}
            style={s.flex}
            onPress={() => nav.push('ParentPayOnline', { id: v.id })}
          />
        )}
      </View>
    </Screen>
  );
}

export function ParentPaymentHistory(_: ScreenProps) {
  const nav = useNav();
  const child = useCurrentChild();
  const fee = useChildFee(child);
  return (
    <Screen title="Payment history" subtitle={child.name}>
      <Segmented
        options={['Vouchers', 'Payments']}
        value="Payments"
        onChange={v => v === 'Vouchers' && nav.pop()}
      />
      <ReceiptsCard receipts={fee.receipts} />
      <DownloadAll />
    </Screen>
  );
}

const METHODS = [
  { key: 'JazzCash', sub: 'Mobile account', icon: Phone, tone: 'danger' as const, wallet: true },
  { key: 'Easypaisa', sub: 'Mobile account', icon: Phone, tone: 'success' as const, wallet: true },
  { key: '1Link / 1Bill', sub: 'Any bank app, debit card', icon: CreditCard, tone: 'info' as const, wallet: false },
];

export function ParentPayOnline(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const child = useCurrentChild();
  const fee = useChildFee(child);
  const id = useParam('id', fee.vouchers[0].id);
  const v = fee.vouchers.find(x => x.id === id) ?? fee.vouchers[0];
  const [method, setMethod] = useState(METHODS[0].key);
  const [mobile, setMobile] = useState(PARENT.mobile);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);
  const m = METHODS.find(x => x.key === method) ?? METHODS[0];
  const short = m.wallet ? m.key : '1Link';

  const go = () => {
    if (m.wallet && mobile.replace(/\D/g, '').length !== 11) {
      toast(t('Enter an 11-digit mobile number'));
      return;
    }
    setLoading(true);
    timer.current = setTimeout(() => {
      const receipt = fee.pay(v.id, v.amount, `${short} online`);
      nav.replace('ParentPaymentStatus', {
        id: v.id,
        amount: v.amount,
        method: short,
        receipt,
        ref: `TXM${Math.floor(1000 + Math.random() * 8999)}K${v.id.slice(-1)}A2`,
      });
    }, 1500);
  };

  return (
    <Screen
      title={`${t('Pay')} ${formatRs(v.amount)}`}
      subtitle={`${t('Voucher')} ${v.id}`}
      footer={
        <Button
          label={`${t('Continue to')} ${short}`}
          loading={loading}
          onPress={go}
        />
      }
    >
      <Text style={s.label}>{t('Choose how to pay')}</Text>
      <Card>
        {METHODS.map((x, i) => (
          <ListRow
            key={x.key}
            icon={x.icon}
            iconTone={x.tone}
            title={x.key}
            subtitle={t(x.sub)}
            right={<Toggle value={method === x.key} onChange={() => setMethod(x.key)} />}
            onPress={() => setMethod(x.key)}
            last={i === METHODS.length - 1}
          />
        ))}
      </Card>
      {m.wallet ? (
        <Field
          label={`${m.key} ${t('mobile account')}`}
          icon={Phone}
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
        />
      ) : null}
      <InfoBanner
        icon={Info}
        text={
          m.wallet
            ? `${t('You approve the payment in the')} ${m.key} ${t('page with your MPIN. The voucher is marked paid only when')} ${m.key} ${t('confirms.')}`
            : t('Pay from any bank app using 1Bill consumer number 1001 2604 18. The voucher is marked paid when 1Link confirms.')
        }
      />
    </Screen>
  );
}

export function ParentPaymentStatus(_: ScreenProps) {
  const nav = useNav();
  const { t } = useI18n();
  const amount = useParam('amount', 0);
  const method = useParam('method', 'JazzCash');
  const receipt = useParam('receipt', 'R-26-000611');
  const ref = useParam('ref', 'TXM4K9A2');
  return (
    <Screen
      footer={
        <>
          <Button
            label="Download receipt"
            variant="outline"
            icon={Download}
            onPress={() => toast(t('Downloaded (demo)'))}
          />
          <Button label="Back to fee" onPress={() => nav.popTo('ParentTabs')} />
        </>
      }
    >
      <View style={s.okCircle}>
        <Check size={40} color={colors.success} strokeWidth={2.6} />
      </View>
      <Text style={s.okTitle}>{t('Payment received')}</Text>
      <Text style={s.okSub}>
        {method} {t('confirmed your payment. A receipt was sent by SMS.')}
      </Text>
      <Card>
        <ListRow title={t('Amount')} right={<Amount value={amount} />} />
        <ListRow title={t('Receipt')} right={<Text style={s.bold}>{receipt}</Text>} />
        <ListRow title={t('Reference')} right={<Text style={s.bold}>{ref}</Text>} />
        <ListRow title={t('Voucher')} right={<Badge label="Paid" tone="success" />} last />
      </Card>
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
  okTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  okSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
});
