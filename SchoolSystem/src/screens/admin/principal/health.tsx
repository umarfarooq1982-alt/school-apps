// S-12 Health and discipline records.
import React, { useState } from 'react';
import { Flag, HeartPulse, Lock, Star, Stethoscope } from 'lucide-react-native';
import { Badge, Field, InfoBanner, ListRow, Screen, Segmented, toast, Toggle } from '../../../components/ui';
import { FormSheet, ListScreen, PickerField } from '../../../components/admin';
import { ScreenProps } from '../../../navigation';
import { useShared } from '../../../store';
import { ADMIN_STUDENTS, logAudit, useStaffRole } from '../../../data/admin';
import { HEALTH, HealthProfile, Incident, INCIDENTS, SICK_VISITS, SickVisit } from '../../../data/admin-principal';
import { localId, ReadOnlyBanner, useGuard } from '../owner/shared';

const STUDENT_OPTIONS = ADMIN_STUDENTS.filter(s => s.status === 'Active').slice(0, 30).map(s => `${s.name} · ${s.className.replace('Class ', '')}-${s.section}`);
const TABS = ['Discipline', 'Sick bay', 'Health profiles'];

export function AdminHealthDiscipline(_: ScreenProps) {
  const [tab, setTab] = useState(TABS[0]);
  const [role] = useStaffRole();
  const allowed = role === 'owner' || role === 'principal';
  const header = (
    <>
      <ReadOnlyBanner />
      <Segmented options={TABS} value={tab} onChange={setTab} />
    </>
  );
  if (tab !== 'Discipline' && !allowed) {
    return (
      <Screen title="Health & discipline">
        {header}
        <InfoBanner icon={Lock} tone="warn" text="Health records are visible only to roles allowed in the permission matrix." />
      </Screen>
    );
  }
  if (tab === 'Sick bay') {
    return <SickBay key="sick" header={header} />;
  }
  if (tab === 'Health profiles') {
    return <Profiles key="health" header={header} />;
  }
  return <Discipline key="disc" header={header} />;
}

function Discipline({ header }: { header: React.ReactNode }) {
  const [list, setList] = useShared<Incident[]>('admin.incidents', INCIDENTS);
  const { guard } = useGuard();
  const [f, setF] = useState<Incident | null>(null);
  const save = () => {
    if (!f || !f.student || !f.text.trim()) {
      toast('Choose the student and write what happened');
      return;
    }
    setList(l => [f, ...l]);
    logAudit('Discipline', `${f.kind} for ${f.student} (${f.points > 0 ? '+' : ''}${f.points}): ${f.text}${f.notified ? ' · parent notified' : ''}`);
    toast(f.notified ? 'Saved. Parent notified.' : 'Saved');
    setF(null);
  };
  return (
    <>
      <ListScreen
        title="Health & discipline"
        subtitle="Incidents, warnings and behavior points"
        items={list}
        keyOf={x => x.id}
        searchText={x => `${x.student} ${x.text} ${x.by}`}
        filters={[{ label: 'Kind', options: ['All', 'Incident', 'Warning', 'Positive'], get: x => x.kind }]}
        onAdd={guard(() => setF({ id: localId('in'), student: '', kind: 'Incident', points: -1, text: '', by: 'Principal', when: 'Today', notified: true }))}
        addLabel="Add record"
        header={header}
        renderItem={(x, last) => (
          <ListRow
            icon={x.kind === 'Positive' ? Star : Flag}
            iconTone={x.kind === 'Positive' ? 'success' : 'danger'}
            title={x.student}
            subtitle={`${x.when} · ${x.text} · ${x.by}${x.notified ? ' · parent notified' : ''}`}
            right={<Badge label={`${x.kind} ${x.points > 0 ? '+' : ''}${x.points}`} tone={x.kind === 'Positive' ? 'success' : x.kind === 'Warning' ? 'warn' : 'danger'} />}
            last={last}
          />
        )}
      />
      {f ? (
        <FormSheet visible onClose={() => setF(null)} title="Discipline record" onSubmit={save}>
          <PickerField label="Student" value={f.student} options={STUDENT_OPTIONS} onChange={v => setF({ ...f, student: v })} />
          <Segmented options={['Incident', 'Warning', 'Positive']} value={f.kind} onChange={v => setF({ ...f, kind: v as Incident['kind'], points: v === 'Positive' ? 2 : v === 'Warning' ? -1 : -2 })} />
          <Field label="Points" value={String(f.points)} keyboardType="numbers-and-punctuation" onChangeText={v => setF({ ...f, points: Number(v) || 0 })} />
          <Field label="What happened" value={f.text} onChangeText={v => setF({ ...f, text: v })} multiline />
          <ListRow title="Notify the parent" right={<Toggle value={f.notified} onChange={v => setF({ ...f, notified: v })} />} last />
        </FormSheet>
      ) : null}
    </>
  );
}

function SickBay({ header }: { header: React.ReactNode }) {
  const [list, setList] = useShared<SickVisit[]>('admin.sickVisits', SICK_VISITS);
  const { guard } = useGuard();
  const [f, setF] = useState<SickVisit | null>(null);
  const save = () => {
    if (!f || !f.student || !f.complaint.trim() || !f.action.trim()) {
      toast('Fill student, complaint and action taken');
      return;
    }
    setList(l => [f, ...l]);
    logAudit('Sick bay', `${f.student}: ${f.complaint} → ${f.action}${f.notified ? ' · parent notified' : ''}`);
    toast('Visit saved. Parent notified.');
    setF(null);
  };
  return (
    <>
      <ListScreen
        title="Health & discipline"
        subtitle="Sick-bay log"
        items={list}
        keyOf={x => x.id}
        searchText={x => `${x.student} ${x.complaint}`}
        onAdd={guard(() => setF({ id: localId('sb'), student: '', when: 'Today', complaint: '', action: '', notified: true }))}
        addLabel="Log visit"
        header={header}
        renderItem={(x, last) => (
          <ListRow icon={Stethoscope} iconTone="danger" title={`${x.student} · ${x.when}`} subtitle={`${x.complaint}\n${x.action}`} right={x.notified ? <Badge label="Parent notified" tone="info" /> : undefined} last={last} />
        )}
      />
      {f ? (
        <FormSheet visible onClose={() => setF(null)} title="Sick-bay visit" onSubmit={save}>
          <PickerField label="Student" value={f.student} options={STUDENT_OPTIONS} onChange={v => setF({ ...f, student: v })} />
          <Field label="Complaint" value={f.complaint} onChangeText={v => setF({ ...f, complaint: v })} />
          <Field label="Action taken" value={f.action} onChangeText={v => setF({ ...f, action: v })} multiline />
          <ListRow title="Notify the parent" right={<Toggle value={f.notified} onChange={v => setF({ ...f, notified: v })} />} last />
        </FormSheet>
      ) : null}
    </>
  );
}

function Profiles({ header }: { header: React.ReactNode }) {
  const [list, setList] = useShared<HealthProfile[]>('admin.health', HEALTH);
  const { guard } = useGuard();
  const [f, setF] = useState<HealthProfile | null>(null);
  const save = () => {
    if (!f || !f.blood.trim() || !f.emergency.trim()) {
      toast('Blood group and emergency contact are required');
      return;
    }
    setList(l => l.map(x => (x.id === f.id ? f : x)));
    logAudit('Health profile', `${f.student}: blood ${f.blood}, allergies ${f.allergies || 'none'}`);
    toast('Saved. Teachers see the alert in My students.');
    setF(null);
  };
  return (
    <>
      <ListScreen
        title="Health & discipline"
        subtitle="Health profiles · teachers see alerts in My students"
        items={list}
        keyOf={x => x.id}
        searchText={x => `${x.student} ${x.allergies} ${x.notes}`}
        filters={[{ label: 'Alerts', options: ['All', 'Has alert', 'No alert'], get: x => (x.allergies !== 'None' || x.notes ? 'Has alert' : 'No alert') }]}
        header={header}
        renderItem={(x, last) => (
          <ListRow
            icon={HeartPulse}
            iconTone={x.allergies !== 'None' || x.notes ? 'danger' : 'primary'}
            title={`${x.student} · ${x.cls}`}
            subtitle={`Blood ${x.blood} · allergies ${x.allergies}${x.notes ? ` · ${x.notes}` : ''}\nEmergency ${x.emergency}`}
            onPress={guard(() => setF(x))}
            last={last}
          />
        )}
      />
      {f ? (
        <FormSheet visible onClose={() => setF(null)} title={f.student} onSubmit={save}>
          <Field label="Blood group" value={f.blood} onChangeText={v => setF({ ...f, blood: v })} />
          <Field label="Allergies" value={f.allergies} onChangeText={v => setF({ ...f, allergies: v })} />
          <Field label="Health notes" value={f.notes} onChangeText={v => setF({ ...f, notes: v })} multiline />
          <Field label="Emergency contact" value={f.emergency} onChangeText={v => setF({ ...f, emergency: v })} keyboardType="phone-pad" />
        </FormSheet>
      ) : null}
    </>
  );
}
