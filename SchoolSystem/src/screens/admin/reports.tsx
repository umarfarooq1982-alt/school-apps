// Reports Center (SOW 3.2 I, M-20 and Section 6). Each role sees only the
// reports the permission matrix allows; the Owner sees all of them.
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChartColumn, FileSpreadsheet, FileText, Lock, Printer } from 'lucide-react-native';
import { Badge, Button, Card, InfoBanner, ListRow, Screen, toast } from '../../components/ui';
import { ListScreen, PickerField, Table, adminStyles } from '../../components/admin';
import { colors } from '../../theme';
import { ScreenMap, ScreenProps, useNav, useParam } from '../../navigation';
import {
  ALL_CAMPUSES,
  CAMPUSES,
  CLASSES,
  SECTIONS,
  SESSIONS,
  campusName,
  roleInfo,
  useAdminSession,
  useCampus,
  useStaffRole,
} from '../../data/admin';
import { REPORTS, canSeeReport, reportData } from '../../data/admin-reports';

export function AdminReportsCenter(_: ScreenProps) {
  const nav = useNav();
  const [role] = useStaffRole();
  const list = REPORTS.filter(r => canSeeReport(role, r));
  return (
    <ListScreen
      title="Reports"
      subtitle={`${list.length} reports for ${roleInfo(role).label}`}
      items={list}
      keyOf={r => r.id}
      searchText={r => `${r.title} ${r.module}`}
      filters={[{ label: 'Phase', options: ['All phases', 'Phase 1', 'Phase 2', 'Phase 3'], get: r => `Phase ${r.phase}` }]}
      pageSize={15}
      header={<InfoBanner text="Every report has campus, session, class, section and date filters, with PDF, Excel and print." />}
      renderItem={(r, last) => (
        <ListRow
          icon={ChartColumn}
          title={`${r.no}. ${r.title}`}
          subtitle={`${r.module} · Phase ${r.phase} · ${r.users.join(', ')}`}
          onPress={() => nav.push('AdminReport', { id: r.id })}
          chevron
          last={last}
        />
      )}
    />
  );
}

const RANGES = ['Today', 'This week', 'This month', 'Last month', 'This session'];
const PAGE = 25;

function AdminReport(_: ScreenProps) {
  const id = useParam('id', 'r1');
  const [role] = useStaffRole();
  const [globalCampus] = useCampus();
  const [globalSession] = useAdminSession();
  const report = REPORTS.find(r => r.id === id);
  const [campus, setCampus] = useState(campusName(globalCampus));
  const [session, setSession] = useState(globalSession);
  const [cls, setCls] = useState('All classes');
  const [section, setSection] = useState('All sections');
  const [range, setRange] = useState('This month');
  const [shown, setShown] = useState(PAGE);
  const data = useMemo(() => reportData(id), [id]);

  const rows = useMemo(() => {
    const campusId = CAMPUSES.find(c => c.name === campus)?.id ?? ALL_CAMPUSES;
    return data.rows.filter(
      r =>
        (campusId === ALL_CAMPUSES || !r.campus || r.campus === campusId) &&
        (cls === 'All classes' || !r.cls || r.cls === cls) &&
        (section === 'All sections' || !r.section || r.section === section),
    );
  }, [data, campus, cls, section]);

  if (!report) {
    return (
      <Screen title="Report">
        <InfoBanner tone="warn" text="This report was not found." />
      </Screen>
    );
  }
  if (!canSeeReport(role, report)) {
    return (
      <Screen title={report.title}>
        <Card style={s.denied}>
          <Lock size={28} color={colors.danger} />
          <Text style={adminStyles.bold}>No access</Text>
          <Text style={[adminStyles.small, s.center]}>
            {roleInfo(role).label} cannot open this report. It is for {report.users.join(', ')}.
          </Text>
        </Card>
      </Screen>
    );
  }

  const exp = (what: string) => toast(`${report.title}: ${what} ready · ${rows.length} rows (demo)`);
  return (
    <Screen
      title={`${report.no}. ${report.title}`}
      subtitle={`${report.module} · Phase ${report.phase}`}
      footer={
        <View style={adminStyles.row}>
          <Button label="PDF" icon={FileText} variant="outline" style={s.flex} onPress={() => exp('PDF')} />
          <Button label="Excel" icon={FileSpreadsheet} variant="outline" style={s.flex} onPress={() => exp('Excel')} />
          <Button label="Print" icon={Printer} style={s.flex} onPress={() => exp('Print preview')} />
        </View>
      }
    >
      <Card>
        <View style={s.filters}>
          <View style={s.half}>
            <PickerField label="Campus" value={campus} options={['All campuses', ...CAMPUSES.map(c => c.name)]} onChange={v => { setCampus(v); setShown(PAGE); }} />
          </View>
          <View style={s.half}>
            <PickerField label="Session" value={session} options={SESSIONS.map(x => x.id)} onChange={setSession} />
          </View>
          <View style={s.half}>
            <PickerField label="Class" value={cls} options={['All classes', ...CLASSES]} onChange={v => { setCls(v); setShown(PAGE); }} />
          </View>
          <View style={s.half}>
            <PickerField label="Section" value={section} options={['All sections', ...SECTIONS]} onChange={v => { setSection(v); setShown(PAGE); }} />
          </View>
        </View>
        <PickerField label="Date range" value={range} options={RANGES} onChange={setRange} />
      </Card>
      <View style={adminStyles.row}>
        <Badge label={`${campus} · ${session} · ${range}`} tone="info" />
      </View>
      <Text style={adminStyles.bold}>{data.summary(rows)}</Text>
      <Card padded={false} style={s.table}>
        {rows.length ? (
          <Table columns={data.columns} rows={rows.slice(0, shown).map(r => r.cells)} />
        ) : (
          <Text style={[adminStyles.small, s.empty]}>No rows for these filters.</Text>
        )}
      </Card>
      {shown < rows.length ? (
        <Button label={`Load more (${rows.length - shown} left)`} variant="outline" onPress={() => setShown(n => n + PAGE)} />
      ) : null}
    </Screen>
  );
}

export const adminReportScreens: ScreenMap = { AdminReport };

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  denied: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  half: { width: '47%', flexGrow: 1 },
  table: { overflow: 'hidden', padding: 6 },
  empty: { padding: 14, textAlign: 'center' },
});
