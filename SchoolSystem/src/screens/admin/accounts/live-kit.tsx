// Building blocks for admin screens that read and write the school server.
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Plus, Search, Wrench } from 'lucide-react-native';
import { Badge, Button, Card, Field, ListRow, Screen, ScreenNoticeContext, toast } from '../../../components/ui';
import { ExportButton, FormSheet, PickerField } from '../../../components/admin';
import { Empty, NoApiBanner, QueryView } from '../../../components/states';
import { Query, useApi, useMutation } from '../../../api/hooks';
import { ModuleRow, modulesApi } from '../../../api/webB';
import { useNav } from '../../../navigation';
import { useReadOnly } from '../../../data/admin';
import { colors } from '../../../theme';
import type { Tone } from '../../../theme';
import type { IconType } from '../../../components/ui';

export const fmtDate = (iso?: string | null) => {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) {
    return String(iso);
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const todayIso = () => {
  // Pakistan date (UTC+5).
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};

export const thisMonth = () => todayIso().slice(0, 7);

export function statusTone(status?: string | null): Tone {
  const s = String(status || '').toLowerCase();
  if (['paid', 'approved', 'active', 'present', 'sent', 'delivered', 'returned', 'ok', 'received', 'done', 'closed'].includes(s)) {
    return 'success';
  }
  if (['unpaid', 'rejected', 'failed', 'absent', 'overdue', 'error', 'inactive'].includes(s)) {
    return 'danger';
  }
  if (['partial', 'pending', 'queued', 'late', 'draft', 'requested', 'open'].includes(s)) {
    return 'warn';
  }
  return 'neutral';
}

export function StatusBadge({ status }: { status?: string | null }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
  return <Badge label={label} tone={statusTone(status)} />;
}

// Screen that shows server data with pull-to-refresh and, when given, a link
// to the sample-data tools for rules the server does not provide yet.
export function LiveScreen({
  title,
  subtitle,
  q,
  children,
  toolsRoute,
  toolsLabel = 'More tools (sample data)',
  footer,
  exportTitle,
  right,
}: {
  title: string;
  subtitle?: string;
  q?: Pick<Query<unknown>, 'refreshing' | 'refresh'>;
  children: React.ReactNode;
  toolsRoute?: string;
  toolsLabel?: string;
  footer?: React.ReactNode;
  exportTitle?: string;
  right?: React.ReactNode;
}) {
  const nav = useNav();
  return (
    <Screen
      title={title}
      subtitle={subtitle}
      refreshing={q?.refreshing}
      onRefresh={q ? () => q.refresh() : undefined}
      footer={footer}
      right={
        <View style={s.headRight}>
          {right}
          {exportTitle ? <ExportButton title={exportTitle} /> : null}
        </View>
      }
    >
      {children}
      {toolsRoute ? (
        <Button label={toolsLabel} icon={Wrench} variant="outline" onPress={() => nav.push(toolsRoute)} />
      ) : null}
    </Screen>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Field icon={Search} value={value} onChangeText={onChange} placeholder={placeholder} />;
}

export function useFiltered<T>(items: T[] | undefined, q: string, text: (t: T) => string) {
  return useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items ?? []).filter(i => !needle || text(i).toLowerCase().includes(needle));
  }, [items, q, text]);
}

// ---------- Generic module records ----------

export type FieldDef = {
  key: string;
  label: string;
  kind?: 'text' | 'number' | 'date' | 'pick';
  options?: string[];
  required?: boolean;
  placeholder?: string;
};

// The web API returns generic records with `record_date`; the mobile API uses
// `recordDate`. Rows are normalised so screens can read `recordDate`.
export function useModule<T extends ModuleRow = ModuleRow>(key: string) {
  return useApi<T[]>(`web:mod:${key}`, async () =>
    (await modulesApi.list<T>(key)).map(r =>
      r.recordDate === undefined && r.record_date !== undefined ? { ...r, recordDate: r.record_date } : r,
    ),
  );
}

// Form in a bottom sheet that builds a body from FieldDefs.
export function RecordForm({
  visible,
  onClose,
  title,
  fields,
  initial,
  onSubmit,
  submitLabel = 'Save',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  fields: FieldDef[];
  initial?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => Promise<boolean | void> | boolean | void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial ?? {});
  const set = (k: string, v: string) => setValues(p => ({ ...p, [k]: v }));
  const submit = async () => {
    for (const f of fields) {
      const v = (values[f.key] ?? '').trim();
      if (f.required && !v) {
        toast(`${f.label} is required`);
        return;
      }
      if (f.kind === 'number' && v && !Number.isFinite(Number(v))) {
        toast(`${f.label} must be a number`);
        return;
      }
      if (f.kind === 'date' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        toast(`${f.label}: use YYYY-MM-DD`);
        return;
      }
    }
    const ok = await onSubmit(values);
    if (ok !== false) {
      setValues(initial ?? {});
      onClose();
    }
  };
  return (
    <FormSheet visible={visible} onClose={onClose} title={title} submitLabel={submitLabel} onSubmit={submit}>
      {fields.map(f =>
        f.kind === 'pick' ? (
          <PickerField key={f.key} label={f.label} value={values[f.key] ?? ''} options={f.options ?? []} onChange={v => set(f.key, v)} />
        ) : (
          <Field
            key={f.key}
            label={f.label + (f.required ? ' *' : '')}
            value={values[f.key] ?? ''}
            onChangeText={v => set(f.key, v)}
            keyboardType={f.kind === 'number' ? 'numeric' : 'default'}
            placeholder={f.placeholder ?? (f.kind === 'date' ? 'YYYY-MM-DD' : undefined)}
          />
        ),
      )}
    </FormSheet>
  );
}

// A whole screen for a /api/web/modules/{key} list with search and an add form.
export function ModuleRecordsScreen<T extends ModuleRow>({
  moduleKey,
  title,
  subtitle,
  icon,
  rowTitle,
  rowSub,
  renderRight,
  searchText,
  fields,
  toBody,
  addLabel = 'Add',
  toolsRoute,
  renderHeader,
  onRowPress,
  emptyText = 'No records on the server yet.',
}: {
  moduleKey: string;
  title: string;
  subtitle?: string;
  icon: IconType;
  rowTitle: (r: T) => string;
  rowSub?: (r: T) => string;
  renderRight?: (r: T) => React.ReactNode;
  searchText: (r: T) => string;
  fields: FieldDef[];
  toBody: (v: Record<string, string>) => Record<string, unknown> | string; // string = validation error
  addLabel?: string;
  toolsRoute?: string;
  renderHeader?: (rows: T[]) => React.ReactNode;
  onRowPress?: (r: T) => void;
  emptyText?: string;
}) {
  const q = useModule<T>(moduleKey);
  const readOnly = useReadOnly();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const save = useMutation((body: Record<string, unknown>) => modulesApi.create<T>(moduleKey, body), 'Saved');
  const list = useFiltered(q.data, term, searchText);
  return (
    <LiveScreen
      title={title}
      subtitle={subtitle}
      q={q}
      toolsRoute={toolsRoute}
      exportTitle={title}
      footer={
        <Button
          label={addLabel}
          icon={Plus}
          disabled={readOnly}
          loading={save.busy}
          onPress={() => (readOnly ? toast('This session is closed (read-only).') : setOpen(true))}
        />
      }
    >
      {renderHeader ? renderHeader(q.data ?? []) : null}
      <SearchBox value={term} onChange={setTerm} />
      <QueryView q={q}>
        {() =>
          list.length ? (
            <Card>
              {list.map((r, i) => (
                <ListRow
                  key={String(r.id)}
                  icon={icon}
                  title={rowTitle(r)}
                  subtitle={rowSub?.(r)}
                  right={renderRight?.(r)}
                  onPress={onRowPress ? () => onRowPress(r) : undefined}
                  last={i === list.length - 1}
                />
              ))}
            </Card>
          ) : (
            <Empty text={emptyText} />
          )
        }
      </QueryView>
      <RecordForm
        visible={open}
        onClose={() => setOpen(false)}
        title={addLabel}
        fields={fields}
        onSubmit={async v => {
          const body = toBody(v);
          if (typeof body === 'string') {
            toast(body);
            return false;
          }
          const out = await save.run(body);
          if (out !== undefined) {
            q.refresh();
            return true;
          }
          return false;
        }}
      />
    </LiveScreen>
  );
}

export const liveStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '800', color: colors.text },
  small: { fontSize: 12, color: colors.textMuted },
  label: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  section: { fontSize: 13, fontWeight: '800', color: colors.textMuted, marginTop: 4 },
  flex: { flex: 1 },
  wrapCol: { gap: 8 },
  amountBox: { width: 120 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 6 },
  danger: { color: colors.danger },
  success: { color: colors.success },
});

const s = StyleSheet.create({
  headRight: { flexDirection: 'row', gap: 8 },
});

export function Money({ value, tone }: { value: number; tone?: 'danger' | 'success' }) {
  return (
    <Text style={[liveStyles.amount, tone === 'danger' && liveStyles.danger, tone === 'success' && liveStyles.success]}>
      Rs. {Math.round(value).toLocaleString('en-US')}
    </Text>
  );
}

// Wraps a screen that still runs on sample data so it shows the
// "no API yet" notice at the top of its content.
export function sampleScreen<P extends object>(Comp: React.ComponentType<P>, what: string): React.ComponentType<P> {
  const Wrapped = (props: P) => (
    <ScreenNoticeContext.Provider value={<NoApiBanner what={what} />}>
      <Comp {...props} />
    </ScreenNoticeContext.Provider>
  );
  Wrapped.displayName = `Sample(${Comp.displayName || Comp.name || 'Screen'})`;
  return Wrapped;
}
