// Building blocks for the Owner / Admin app. Every list screen gets search,
// filters, pagination, Excel/PDF export and print (SOW 3.1).
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import {
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  Search,
  Share2,
  X,
} from 'lucide-react-native';
import {
  Button,
  Card,
  Chips,
  Field,
  IconButton,
  ListRow,
  Screen,
  toast,
} from './ui';
import { BottomSheet } from './Tabs';
import { colors, radius } from '../theme';
import { useI18n } from '../i18n';

// ---------- Export / print ----------

export function ExportButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const run = (what: string) => {
    setOpen(false);
    toast(`${title}: ${what} ready (demo)`);
  };
  return (
    <>
      <IconButton icon={Share2} onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text style={s.sheetTitle}>{title}</Text>
        <ListRow icon={FileSpreadsheet} title="Export to Excel" onPress={() => run('Excel file')} />
        <ListRow icon={FileText} title="Export to PDF" onPress={() => run('PDF')} />
        <ListRow icon={Printer} title="Print" onPress={() => run('Print preview')} last />
      </BottomSheet>
    </>
  );
}

// ---------- Picker (replaces native dropdowns) ----------

export function PickerField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <View style={s.pickerWrap}>
      {label ? <Text style={s.fieldLabel}>{t(label)}</Text> : null}
      <Pressable style={s.picker} onPress={() => setOpen(true)}>
        <Text style={[s.pickerText, !value && s.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color={colors.text} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text style={s.sheetTitle}>{label ?? placeholder}</Text>
        <ScrollView style={s.sheetList}>
          {options.map((o, i) => (
            <ListRow
              key={o}
              title={o}
              right={o === value ? <Check size={18} color={colors.primary} /> : undefined}
              onPress={() => {
                onChange(o);
                setOpen(false);
              }}
              last={i === options.length - 1}
            />
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

// ---------- Reason prompt (reversals, unlocks, deletes need a reason) ----------

export function useReasonPrompt() {
  const [state, setState] = useState<{
    title: string;
    onSubmit: (reason: string) => void;
  } | null>(null);
  const [reason, setReason] = useState('');
  const ask = (title: string, onSubmit: (reason: string) => void) => {
    setReason('');
    setState({ title, onSubmit });
  };
  const element = (
    <BottomSheet visible={!!state} onClose={() => setState(null)}>
      <Text style={s.sheetTitle}>{state?.title}</Text>
      <Field
        label="Reason (required)"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="Write the reason. It is saved in the audit log."
      />
      <View style={s.gap} />
      <Button
        label="Submit"
        onPress={() => {
          if (!reason.trim()) {
            toast('A reason is required');
            return;
          }
          state?.onSubmit(reason.trim());
          setState(null);
        }}
      />
    </BottomSheet>
  );
  return [element, ask] as const;
}

// ---------- Form sheet ----------

export function FormSheet({
  visible,
  onClose,
  title,
  children,
  submitLabel = 'Save',
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  submitLabel?: string;
  onSubmit: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={s.formHead}>
        <Text style={[s.sheetTitle, s.flex]}>{title}</Text>
        <IconButton icon={X} onPress={onClose} />
      </View>
      <ScrollView style={s.formBody} keyboardShouldPersistTaps="handled">
        <View style={s.formGap}>{children}</View>
      </ScrollView>
      <View style={s.gap} />
      <Button label={submitLabel} onPress={onSubmit} />
    </BottomSheet>
  );
}

// ---------- KPI and charts ----------

export function Kpi({
  label,
  value,
  sub,
  tone,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'success' | 'danger' | 'warn';
  onPress?: () => void;
}) {
  const subColor =
    tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : tone === 'warn' ? colors.warn : colors.textMuted;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.kpi, pressed && s.pressed]}>
      <Text style={s.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={s.kpiValue} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={[s.kpiSub, { color: subColor }]} numberOfLines={1}>{sub}</Text> : null}
    </Pressable>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <View style={s.kpiGrid}>{children}</View>;
}

export function BarChart({
  data,
  height = 140,
  format = (v: number) => String(v),
}: {
  data: Array<{ label: string; value: number; highlight?: boolean }>;
  height?: number;
  format?: (v: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...data.map(d => d.value));
  const gap = 8;
  const barW = data.length ? (width - gap * (data.length - 1)) / data.length : 0;
  const chartH = height - 34;
  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const h = Math.max(2, (d.value / max) * (chartH - 14));
            const x = i * (barW + gap);
            return (
              <React.Fragment key={d.label}>
                <Rect x={x} y={chartH - h} width={barW} height={h} rx={5} fill={d.highlight ? colors.primary : '#F2C9A8'} />
                <SvgText x={x + barW / 2} y={chartH - h - 4} fontSize={9.5} fontWeight="700" fill={colors.text} textAnchor="middle">
                  {format(d.value)}
                </SvgText>
                <SvgText x={x + barW / 2} y={height - 10} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

// ---------- Simple table (reports, sheets) ----------

export function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={[s.tr, s.thRow]}>
          {columns.map(c => (
            <Text key={c} style={[s.td, s.th]}>{c}</Text>
          ))}
        </View>
        {rows.map((r, i) => (
          <View key={i} style={[s.tr, i % 2 === 1 && s.trAlt]}>
            {r.map((c, j) => (
              <Text key={j} style={s.td} numberOfLines={2}>{String(c)}</Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ---------- List screen ----------

export type ListFilter<T> = {
  label: string;
  options: string[]; // first option should be 'All'
  get: (item: T) => string;
};

export function ListScreen<T>({
  title,
  subtitle,
  items,
  keyOf,
  searchText,
  filters = [],
  renderItem,
  pageSize = 10,
  onAdd,
  addLabel = 'Add',
  header,
  footer,
  right,
  empty = 'Nothing found',
}: {
  title: string;
  subtitle?: string;
  items: T[];
  keyOf: (item: T) => string;
  searchText: (item: T) => string;
  filters?: Array<ListFilter<T>>;
  renderItem: (item: T, last: boolean) => React.ReactNode;
  pageSize?: number;
  onAdd?: () => void;
  addLabel?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  right?: React.ReactNode;
  empty?: string;
}) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string[]>(() => filters.map(f => f.options[0]));
  const [shown, setShown] = useState(pageSize);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      it =>
        (!needle || searchText(it).toLowerCase().includes(needle)) &&
        filters.every((f, i) => sel[i] === f.options[0] || f.get(it) === sel[i]),
    );
  }, [items, q, sel, filters, searchText]);
  const page = list.slice(0, shown);
  return (
    <Screen
      title={title}
      subtitle={subtitle}
      right={
        <View style={s.headRight}>
          {right}
          <ExportButton title={title} />
        </View>
      }
      footer={
        footer ??
        (onAdd ? <Button label={addLabel} icon={Plus} onPress={onAdd} /> : undefined)
      }
    >
      {header}
      <Field
        icon={Search}
        value={q}
        onChangeText={v => {
          setQ(v);
          setShown(pageSize);
        }}
        placeholder="Search"
      />
      {filters.map((f, i) => (
        <ScrollView key={f.label} horizontal showsHorizontalScrollIndicator={false}>
          <Chips
            style={s.noWrap}
            options={f.options}
            value={sel[i]}
            onChange={v => {
              setSel(p => p.map((x, j) => (j === i ? v : x)));
              setShown(pageSize);
            }}
          />
        </ScrollView>
      ))}
      <Text style={s.count}>
        Showing {page.length} of {list.length}
      </Text>
      <Card>
        {page.length === 0 ? (
          <Text style={s.empty}>{empty}</Text>
        ) : (
          page.map((it, i) => (
            <React.Fragment key={keyOf(it)}>
              {renderItem(it, i === page.length - 1)}
            </React.Fragment>
          ))
        )}
      </Card>
      {shown < list.length ? (
        <Button
          label={`Load more (${list.length - shown} left)`}
          variant="outline"
          onPress={() => setShown(n => n + pageSize)}
        />
      ) : null}
    </Screen>
  );
}

// Key/value line used in detail screens.
export function KV({ k, v, last }: { k: string; v: React.ReactNode; last?: boolean }) {
  return (
    <View style={[s.kv, !last && s.kvDivider]}>
      <Text style={s.kvK}>{k}</Text>
      {typeof v === 'string' || typeof v === 'number' ? (
        <Text style={s.kvV}>{v}</Text>
      ) : (
        v
      )}
    </View>
  );
}

export const adminStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bold: { fontSize: 14, fontWeight: '800', color: colors.text },
  small: { fontSize: 12, color: colors.textMuted },
  section: { fontSize: 13, fontWeight: '800', color: colors.textMuted, marginTop: 4 },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
});

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  gap: { height: 12 },
  headRight: { flexDirection: 'row', gap: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 8 },
  sheetList: { maxHeight: 420 },
  formHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formBody: { maxHeight: 460 },
  formGap: { gap: 12, paddingBottom: 6 },
  pickerWrap: { gap: 6 },
  fieldLabel: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  picker: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  pickerText: { flex: 1, fontSize: 15, color: colors.text },
  placeholder: { color: colors.textFaint },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  kpiLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
  kpiValue: { fontSize: 19, fontWeight: '900', color: colors.text, marginTop: 2 },
  kpiSub: { fontSize: 11.5, fontWeight: '700', marginTop: 1 },
  tr: { flexDirection: 'row' },
  thRow: { backgroundColor: colors.neutralSoft, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  trAlt: { backgroundColor: '#FBF8F6' },
  td: { width: 112, paddingHorizontal: 8, paddingVertical: 8, fontSize: 12, color: colors.text },
  th: { fontWeight: '800', fontSize: 11.5 },
  noWrap: { flexWrap: 'nowrap' },
  count: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 12, textAlign: 'center' },
  kv: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 },
  kvDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  kvK: { flex: 1, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  kvV: { fontSize: 13.5, color: colors.text, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
});
