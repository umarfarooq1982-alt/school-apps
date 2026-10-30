// Small pieces shared by the Accounts and HR screens.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, radius } from '../../../theme';
import { formatRs } from '../../../components/ui';
import { ADMIN_STUDENTS, roleInfo, StaffRole } from '../../../data/admin';

export function MultiChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <View style={s.wrap}>
      {options.map(o => {
        const on = value.includes(o);
        return (
          <Pressable
            key={o}
            onPress={() => onChange(on ? value.filter(x => x !== o) : [...value, o])}
            style={[s.chip, on && s.chipOn]}
          >
            {on ? <Check size={13} color={colors.text} /> : null}
            <Text style={[s.chipText, on && s.chipTextOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}

export function Money({ value, tone }: { value: number; tone?: 'danger' | 'success' | 'muted' }) {
  return (
    <Text
      style={[
        s.money,
        tone === 'danger' && s.danger,
        tone === 'success' && s.success,
        tone === 'muted' && s.muted,
      ]}
    >
      {formatRs(value)}
    </Text>
  );
}

export function Right({ children }: { children: React.ReactNode }) {
  return <View style={s.right}>{children}</View>;
}

export function Note({ children }: { children: React.ReactNode }) {
  return <Text style={s.note}>{children}</Text>;
}

// "Ayesha Khan · GR-MC-0012" labels for pickers, and the reverse lookup.
export const STUDENT_OPTIONS = ADMIN_STUDENTS.filter(st => st.status === 'Active').map(
  st => `${st.name} · ${st.gr}`,
);

export function studentFromOption(label: string) {
  const gr = label.split(' · ')[1];
  return ADMIN_STUDENTS.find(st => st.gr === gr);
}

export function optionFor(studentId: string) {
  const st = ADMIN_STUDENTS.find(x => x.id === studentId);
  return st ? `${st.name} · ${st.gr}` : '';
}

export function byLine(role: StaffRole) {
  const r = roleInfo(role);
  return `${r.user} (${r.label})`;
}

export function toNumber(v: string) {
  const n = Number(v.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

export const ws = StyleSheet.create({
  gap: { height: 4 },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  bold: { fontSize: 14, fontWeight: '800', color: colors.text },
  small: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  title: { fontSize: 15, fontWeight: '800', color: colors.text },
  big: { fontSize: 22, fontWeight: '900', color: colors.text },
  center: { alignItems: 'center', gap: 6 },
  copyHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: colors.text,
    paddingTop: 8,
    marginTop: 4,
  },
  qrRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 10 },
  idCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  idBand: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 6,
    alignItems: 'center',
  },
});

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  chipTextOn: { fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  money: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  danger: { color: colors.danger },
  success: { color: colors.success },
  muted: { color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: 4 },
  note: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
});
