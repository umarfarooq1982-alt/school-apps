// Front Desk: students and profiles (M-02), certificates and ID cards (S-05),
// visitors, gate pass and call log (S-10).
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  DoorOpen,
  FileBadge,
  FileClock,
  IdCard,
  LogOut,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Printer,
  ShieldCheck,
  Upload,
  UserPlus,
  X,
} from 'lucide-react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chips,
  Field,
  IconButton,
  InfoBanner,
  ListRow,
  Placeholder,
  QRCode,
  Screen,
  Segmented,
  formatRs,
  toast,
} from '../../../components/ui';
import { BottomSheet } from '../../../components/Tabs';
import {
  BarChart,
  FormSheet,
  KV,
  Kpi,
  KpiGrid,
  ListScreen,
  PickerField,
  adminStyles,
  useReasonPrompt,
} from '../../../components/admin';
import { colors, radius } from '../../../theme';
import { ScreenProps, useNav, useParam } from '../../../navigation';
import {
  ADMIN_STUDENTS,
  ALL_CAMPUSES,
  AdminStudent,
  CAMPUSES,
  CLASSES,
  SECTIONS,
  SUBJECTS,
  campusName,
  logAudit,
  requestApproval,
  roleInfo,
  useApprovals,
  useCampus,
  useStaffRole,
} from '../../../data/admin';
import {
  CERT_FEE,
  CERT_TYPES,
  CertType,
  nextSerial,
  nowTime,
  siblingsOf,
  useCalls,
  useCertRequests,
  useGatePasses,
  useIssueLog,
  usePickupPersons,
  useStudentDocs,
  useStudentStatus,
  useVisitors,
} from '../../../data/admin-frontdesk';
import { useOpen } from '../core';
import { ReadOnlyBanner, statusTone, useGuard } from './util';

const STATUSES: AdminStudent['status'][] = ['Active', 'Struck off', 'Left', 'Transferred'];
const DOCS = ['B-Form', 'Photo', 'Previous result', 'Leaving certificate'];
const studentLabel = (s: AdminStudent) => `${s.name} · ${s.gr}`;
const PICK_STUDENTS = ADMIN_STUDENTS.slice(0, 30);

// Applies status changes made in this session on top of the seed data.
function useStudents() {
  const [status] = useStudentStatus();
  return useMemo(
    () => ADMIN_STUDENTS.map(s => (status[s.id] ? { ...s, status: status[s.id].status } : s)),
    [status],
  );
}

// ---------- Students ----------

export function AdminStudents(_: ScreenProps) {
  const nav = useNav();
  const [campus] = useCampus();
  const students = useStudents().filter(s => campus === ALL_CAMPUSES || s.campus === campus);
  return (
    <ListScreen
      title="Students"
      subtitle={`${campusName(campus)} · ${students.length} students`}
      items={students}
      keyOf={s => s.id}
      searchText={s => `${s.name} ${s.gr} ${s.father} ${s.fatherCnic} ${s.mobile}`}
      filters={[
        { label: 'Class', options: ['All classes', ...CLASSES], get: s => s.className },
        { label: 'Section', options: ['All sections', ...SECTIONS], get: s => s.section },
        { label: 'Campus', options: ['All campuses', ...CAMPUSES.map(c => c.name)], get: s => campusName(s.campus) },
        { label: 'Status', options: ['All statuses', ...STATUSES], get: s => s.status },
      ]}
      renderItem={(s, last) => (
        <ListRow
          avatar={s.name}
          title={s.name}
          subtitle={`${s.gr} · ${s.className}-${s.section} · Roll ${s.roll}\n${campusName(s.campus)} · Father ${s.father}`}
          right={
            <View style={adminStyles.right}>
              <Badge label={s.status} tone={statusTone(s.status)} />
              {s.due ? <Text style={st.due}>{formatRs(s.due)} due</Text> : null}
            </View>
          }
          onPress={() => nav.push('AdminStudentProfile', { id: s.id })}
          last={last}
        />
      )}
    />
  );
}

export function AdminStudentProfile(_: ScreenProps) {
  const nav = useNav();
  const open = useOpen();
  const { guard } = useGuard();
  const id = useParam('id', ADMIN_STUDENTS[0].id);
  const students = useStudents();
  const s = students.find(x => x.id === id) ?? students[0];
  const [statusMap, setStatusMap] = useStudentStatus();
  const [docs, setDocs] = useStudentDocs();
  const [tab, setTab] = useState('Personal');
  const [statusSheet, setStatusSheet] = useState(false);
  const [reasonEl, ask] = useReasonPrompt();
  const [role] = useStaffRole();
  const siblings = siblingsOf(s.fatherCnic, s.id);
  const uploaded = docs[s.id] ?? ['B-Form', 'Photo'];
  const history = statusMap[s.id]?.history ?? [];
  const seed = Number(s.id.replace(/\D/g, '')) || 1;

  const changeStatus = (to: AdminStudent['status']) => {
    setStatusSheet(false);
    if (to === s.status) {
      return;
    }
    ask(`Change status to ${to}`, reason => {
      setStatusMap(m => ({
        ...m,
        [s.id]: {
          status: to,
          history: [
            { when: 'Today', from: s.status, to, reason, by: roleInfo(role).user },
            ...(m[s.id]?.history ?? []),
          ],
        },
      }));
      logAudit('Student status', `${s.name} (${s.gr}): ${s.status} → ${to}. Reason: ${reason}`);
      toast(`Status changed to ${to}. History kept.`);
    });
  };

  const subjects = SUBJECTS.slice(0, 6).map((sub, i) => ({
    name: sub.name,
    marks: Math.max(30, Math.min(99, s.result + ((seed * (i + 3)) % 17) - 8)),
  }));

  return (
    <Screen title={s.name} subtitle={`${s.gr} · ${s.className}-${s.section} · ${campusName(s.campus)}`}>
      <ReadOnlyBanner />
      {reasonEl}
      <Card style={st.head}>
        <Avatar name={s.name} size={56} ring />
        <View style={st.flex}>
          <Text style={adminStyles.bold}>{s.name}</Text>
          <Text style={adminStyles.small}>Roll {s.roll} · admitted {s.admitted}</Text>
          <View style={[adminStyles.row, st.mt4]}>
            <Badge label={s.status} tone={statusTone(s.status)} />
            {s.transport ? <Badge label={s.transport} tone="info" /> : null}
          </View>
        </View>
      </Card>
      <Chips
        options={['Personal', 'Guardian', 'Fee', 'Attendance', 'Results', 'Documents', 'History']}
        value={tab}
        onChange={setTab}
      />

      {tab === 'Personal' ? (
        <>
          <Card>
            <KV k="Gender" v={s.gender === 'F' ? 'Female' : 'Male'} />
            <KV k="GR No." v={s.gr} />
            <KV k="Class" v={`${s.className}-${s.section}`} />
            <KV k="Roll No." v={String(s.roll)} />
            <KV k="B-Form" v={s.bForm} />
            <KV k="Campus" v={campusName(s.campus)} />
            <KV k="Transport" v={s.transport ?? 'Not using'} last />
          </Card>
          <Button label="Change status" variant="outline" onPress={guard(() => setStatusSheet(true))} />
        </>
      ) : null}

      {tab === 'Guardian' ? (
        <>
          <Card>
            <KV k="Father" v={s.father} />
            <KV k="Father CNIC" v={s.fatherCnic} />
            <KV k="Mobile" v={s.mobile} />
            <KV k="Parent portal login" v={s.mobile} last />
          </Card>
          <Card title={`Siblings (linked by father CNIC) · ${siblings.length}`}>
            {siblings.length === 0 ? <Text style={adminStyles.small}>No siblings in the school.</Text> : null}
            {siblings.map((x, i) => (
              <ListRow
                key={x.id}
                avatar={x.name}
                title={x.name}
                subtitle={`${x.gr} · ${x.className}-${x.section}`}
                onPress={() => nav.push('AdminStudentProfile', { id: x.id })}
                last={i === siblings.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}

      {tab === 'Fee' ? (
        <>
          <KpiGrid>
            <Kpi label="Outstanding" value={formatRs(s.due)} tone={s.due ? 'danger' : 'success'} sub={s.due ? 'holds apply' : 'clear'} />
            <Kpi label="Paid this session" value={formatRs(8500 * 6)} sub="6 vouchers" />
          </KpiGrid>
          <Card title="Vouchers">
            {['November 2026', 'October 2026', 'September 2026', 'August 2026'].map((m, i) => {
              const unpaid = i === 0 && s.due > 0;
              return (
                <ListRow
                  key={m}
                  title={m}
                  subtitle={`V-26-${String(400 + seed * 4 + i).padStart(6, '0')}`}
                  right={<Badge label={unpaid ? 'Unpaid' : 'Paid'} tone={unpaid ? 'danger' : 'success'} />}
                  last={i === 3}
                />
              );
            })}
          </Card>
          <Button label="Open fee collection counter" variant="outline" onPress={() => open('AdminFeeCounter')} />
        </>
      ) : null}

      {tab === 'Attendance' ? (
        <>
          <KpiGrid>
            <Kpi label="This session" value={`${s.attendance}%`} tone={s.attendance < 75 ? 'danger' : 'success'} sub={s.attendance < 75 ? 'shortage' : 'ok'} />
            <Kpi label="Absent" value={String(Math.round((100 - s.attendance) * 1.1))} sub="days" />
          </KpiGrid>
          <Card title="Monthly attendance %">
            <BarChart
              data={['Apr', 'May', 'Aug', 'Sep', 'Oct'].map((m, i) => ({
                label: m,
                value: Math.min(100, s.attendance + ((seed + i * 5) % 9) - 4),
                highlight: m === 'Oct',
              }))}
              format={v => `${v}%`}
            />
          </Card>
        </>
      ) : null}

      {tab === 'Results' ? (
        <Card title={`Mid-term 2026 · ${s.result}%`}>
          {subjects.map((x, i) => (
            <ListRow key={x.name} title={x.name} right={<Text style={adminStyles.bold}>{x.marks} / 100</Text>} last={i === subjects.length - 1} />
          ))}
        </Card>
      ) : null}

      {tab === 'Documents' ? (
        <Card>
          {DOCS.map((d, i) => {
            const has = uploaded.includes(d);
            return (
              <ListRow
                key={d}
                icon={FileBadge}
                title={d}
                subtitle={has ? 'Uploaded' : 'Missing'}
                right={
                  has ? (
                    <Badge label="Uploaded" tone="success" />
                  ) : (
                    <Button
                      label="Upload"
                      icon={Upload}
                      variant="outline"
                      style={st.smallBtn}
                      onPress={guard(() => {
                        setDocs(m => ({ ...m, [s.id]: [...uploaded, d] }));
                        logAudit('Student documents', `${s.name}: ${d} uploaded`);
                        toast(`${d} uploaded (demo)`);
                      })}
                    />
                  )
                }
                last={i === DOCS.length - 1}
              />
            );
          })}
        </Card>
      ) : null}

      {tab === 'History' ? (
        <Card>
          {history.map((h, i) => (
            <ListRow key={`${h.to}${i}`} icon={FileClock} title={`${h.from} → ${h.to}`} subtitle={`${h.when} · ${h.by} · ${h.reason}`} />
          ))}
          <ListRow icon={FileClock} title={`Promoted to ${s.className}`} subtitle="1 Apr 2026 · session 2026-27" />
          <ListRow icon={FileClock} title={`Admitted · ${s.gr}`} subtitle={`${s.admitted} · ${campusName(s.campus)}`} last />
        </Card>
      ) : null}

      <BottomSheet visible={statusSheet} onClose={() => setStatusSheet(false)}>
        <Text style={st.sheetTitle}>Student status</Text>
        {STATUSES.map((x, i) => (
          <ListRow
            key={x}
            title={x}
            right={x === s.status ? <Badge label="Current" tone="success" /> : undefined}
            onPress={() => changeStatus(x)}
            last={i === STATUSES.length - 1}
          />
        ))}
      </BottomSheet>
    </Screen>
  );
}

// ---------- Certificates and ID cards (S-05) ----------

export function AdminCertificates(_: ScreenProps) {
  const nav = useNav();
  const { guard } = useGuard();
  const [reqs, setReqs] = useCertRequests();
  const [, setLog] = useIssueLog();
  const [approvals] = useApprovals();
  const [role] = useStaffRole();
  const students = useStudents();
  const name = (id: string) => students.find(x => x.id === id)?.name ?? id;

  const issue = (id: string) => {
    const r = reqs.find(x => x.id === id);
    if (!r) {
      return;
    }
    const stu = students.find(x => x.id === r.studentId);
    const exception = approvals.find(a => a.type === 'Leaving certificate' && a.title.includes(stu?.name ?? '') && a.status === 'Approved');
    if (r.type === 'Leaving' && (stu?.due ?? 0) > 0 && !exception) {
      if (r.status === 'Waiting approval') {
        toast('Waiting for Principal approval of the exception');
        return;
      }
      requestApproval({
        type: 'Leaving certificate',
        title: `Leaving certificate with dues: ${stu?.name}`,
        sub: `${formatRs(stu?.due ?? 0)} outstanding · ${r.purpose}`,
        by: `${roleInfo(role).user} (Front Desk)`,
      });
      setReqs(list => list.map(x => (x.id === id ? { ...x, status: 'Waiting approval' } : x)));
      toast('Dues are not cleared. Sent to the Principal for approval.');
      return;
    }
    const serial = nextSerial(r.type);
    setReqs(list => list.map(x => (x.id === id ? { ...x, status: 'Issued', serial } : x)));
    setLog(l => [{ serial, studentId: r.studentId, type: r.type, by: roleInfo(role).user, when: 'Today' }, ...l]);
    logAudit('Certificate', `${r.type} certificate ${serial} issued to ${stu?.name}`);
    toast(
      r.from === 'Parent portal'
        ? `${serial} issued. Fee ${formatRs(CERT_FEE[r.type])} added to the next voucher.`
        : `${serial} issued with QR verification.`,
    );
  };

  return (
    <ListScreen
      title="Certificates & ID cards"
      subtitle="Requests from parents and the front desk"
      items={reqs}
      keyOf={r => r.id}
      searchText={r => `${name(r.studentId)} ${r.type} ${r.purpose} ${r.serial ?? ''}`}
      filters={[
        { label: 'Status', options: ['All', 'Requested', 'Waiting approval', 'Issued', 'Rejected'], get: r => r.status },
        { label: 'Type', options: ['All types', ...CERT_TYPES], get: r => r.type },
      ]}
      header={
        <>
          <ReadOnlyBanner />
          <View style={adminStyles.rowWrap}>
            <Button label="Issue certificate" icon={FileBadge} style={st.flex} onPress={guard(() => nav.push('AdminCertificateIssue'))} />
            <Button label="Issue log" icon={FileClock} variant="outline" style={st.flex} onPress={() => nav.push('AdminCertificateLog')} />
          </View>
          <Button label="Print student ID cards" icon={IdCard} variant="outline" onPress={() => nav.push('AdminIdCards')} />
          <InfoBanner text="A leaving certificate is issued only after dues are cleared, unless the Principal approves." />
        </>
      }
      renderItem={(r, last) => (
        <View style={[st.req, !last && st.divider]}>
          <View style={adminStyles.row}>
            <View style={st.flex}>
              <Text style={adminStyles.bold}>{r.type} · {name(r.studentId)}</Text>
              <Text style={adminStyles.small}>{r.purpose} · {r.from}{r.serial ? ` · ${r.serial}` : ''}</Text>
            </View>
            <Badge label={r.status} tone={statusTone(r.status)} />
          </View>
          {r.status === 'Requested' || r.status === 'Waiting approval' ? (
            <View style={[adminStyles.row, st.mt8]}>
              <Button label="Reject" variant="danger" style={[st.flex, st.smallBtn]} onPress={guard(() => {
                setReqs(list => list.map(x => (x.id === r.id ? { ...x, status: 'Rejected' } : x)));
                logAudit('Certificate', `${r.type} request rejected for ${name(r.studentId)}`);
              })} />
              <Button label="Issue" style={[st.flex, st.smallBtn]} onPress={guard(() => issue(r.id))} />
            </View>
          ) : null}
        </View>
      )}
    />
  );
}

export function AdminCertificateIssue(_: ScreenProps) {
  const nav = useNav();
  const { guard } = useGuard();
  const [, setReqs] = useCertRequests();
  const [, setLog] = useIssueLog();
  const [role] = useStaffRole();
  const [studentLbl, setStudentLbl] = useState(studentLabel(PICK_STUDENTS[0]));
  const [type, setType] = useState<CertType>('Character');
  const [purpose, setPurpose] = useState('');
  const stu = PICK_STUDENTS.find(x => studentLabel(x) === studentLbl) ?? PICK_STUDENTS[0];
  const blocked = type === 'Leaving' && stu.due > 0;
  return (
    <Screen
      title="Issue certificate"
      subtitle="From template, with serial number and QR"
      footer={
        <Button
          label={blocked ? 'Send for Principal approval' : 'Issue and print'}
          icon={Printer}
          onPress={guard(() => {
            if (!purpose.trim()) {
              toast('Write what the certificate is needed for');
              return;
            }
            if (blocked) {
              requestApproval({ type: 'Leaving certificate', title: `Leaving certificate with dues: ${stu.name}`, sub: `${formatRs(stu.due)} outstanding · ${purpose}`, by: `${roleInfo(role).user} (Front Desk)` });
              setReqs(l => [{ id: `cr${Date.now()}`, studentId: stu.id, type, purpose, status: 'Waiting approval', from: 'Front desk' }, ...l]);
              toast('Dues not cleared. Sent for approval.');
              nav.pop();
              return;
            }
            const serial = nextSerial(type);
            setReqs(l => [{ id: `cr${Date.now()}`, studentId: stu.id, type, purpose, status: 'Issued', from: 'Front desk', serial }, ...l]);
            setLog(l => [{ serial, studentId: stu.id, type, by: roleInfo(role).user, when: 'Today' }, ...l]);
            logAudit('Certificate', `${type} certificate ${serial} issued to ${stu.name}`);
            toast(`${serial} issued and sent to printer (demo)`);
            nav.pop();
          })}
        />
      }
    >
      <PickerField label="Student" value={studentLbl} options={PICK_STUDENTS.map(studentLabel)} onChange={setStudentLbl} />
      <Chips options={CERT_TYPES} value={type} onChange={v => setType(v as CertType)} />
      <Field label="Needed for" value={purpose} onChangeText={setPurpose} placeholder="e.g. Visa application" />
      {blocked ? <InfoBanner tone="danger" text={`${formatRs(stu.due)} is outstanding. A leaving certificate needs the dues cleared or Principal approval.`} /> : null}
      <Card>
        <Text style={st.certTitle}>Bright Future School</Text>
        <Text style={st.certSub}>{type} Certificate · Serial on issue</Text>
        <Text style={st.certBody}>
          This is to certify that {stu.name}, {stu.gender === 'F' ? 'daughter' : 'son'} of {stu.father}, GR No. {stu.gr}, is a
          {type === 'Leaving' ? ' former' : ' bonafide'} student of {stu.className} at {campusName(stu.campus)}.
          {type === 'Character' ? ' Conduct and character remained good.' : ''}
        </Text>
        <View style={adminStyles.row}>
          <QRCode value={`${type}-${stu.gr}`} size={72} />
          <Text style={[adminStyles.small, st.flex]}>Scan to verify on the public verification page.</Text>
        </View>
      </Card>
    </Screen>
  );
}

export function AdminCertificateLog(_: ScreenProps) {
  const [log] = useIssueLog();
  const name = (id: string) => ADMIN_STUDENTS.find(x => x.id === id)?.name ?? id;
  return (
    <ListScreen
      title="Certificate issue log"
      items={log}
      keyOf={l => l.serial}
      searchText={l => `${l.serial} ${name(l.studentId)} ${l.by}`}
      filters={[{ label: 'Type', options: ['All types', ...CERT_TYPES], get: l => l.type }]}
      renderItem={(l, last) => (
        <ListRow icon={FileBadge} title={`${l.serial} · ${l.type}`} subtitle={`${name(l.studentId)} · issued by ${l.by} · ${l.when}`} last={last} />
      )}
    />
  );
}

export function AdminIdCards(_: ScreenProps) {
  const [cls, setCls] = useState('Class 5');
  const list = ADMIN_STUDENTS.filter(x => x.className === cls && x.status === 'Active');
  return (
    <Screen
      title="Student ID cards"
      subtitle="Bulk print with photo, QR and validity"
      footer={
        <Button
          label={`Print ${list.length} cards`}
          icon={Printer}
          onPress={() => {
            logAudit('ID cards', `${list.length} ID cards printed for ${cls}`);
            toast(`${list.length} ID cards sent to printer (demo)`);
          }}
        />
      }
    >
      <PickerField label="Class" value={cls} options={CLASSES.slice(3)} onChange={setCls} />
      {list.slice(0, 4).map(x => (
        <Card key={x.id} style={st.idCard}>
          <Placeholder icon={Camera} height={74} style={st.idPhoto} />
          <View style={st.flex}>
            <Text style={adminStyles.bold}>{x.name}</Text>
            <Text style={adminStyles.small}>{x.gr} · {x.className}-{x.section}</Text>
            <Text style={adminStyles.small}>Valid till 31 Mar 2027</Text>
          </View>
          <QRCode value={x.gr} size={60} />
        </Card>
      ))}
      {list.length > 4 ? <Text style={adminStyles.small}>+ {list.length - 4} more cards in this print run</Text> : null}
      {list.length === 0 ? <InfoBanner text="No active students in this class." /> : null}
    </Screen>
  );
}

// ---------- Visitors, gate pass and call log (S-10) ----------

export function AdminVisitors(_: ScreenProps) {
  const nav = useNav();
  const { guard } = useGuard();
  const [visitors, setVisitors] = useVisitors();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', cnic: '', purpose: '', met: 'Front Desk' });
  return (
    <ListScreen
      title="Visitors & gate pass"
      subtitle={`${visitors.filter(v => !v.out).length} visitors inside now`}
      items={visitors}
      keyOf={v => v.id}
      searchText={v => `${v.name} ${v.cnic} ${v.purpose} ${v.met}`}
      filters={[{ label: 'Status', options: ['All', 'Inside', 'Left'], get: v => (v.out ? 'Left' : 'Inside') }]}
      onAdd={guard(() => setAdding(true))}
      addLabel="Log visitor"
      header={
        <>
          <ReadOnlyBanner />
          <View style={adminStyles.rowWrap}>
            <Button label="Early pickup gate pass" icon={DoorOpen} style={st.flex} onPress={() => nav.push('AdminGatePass')} />
            <Button label="Call log" icon={PhoneCall} variant="outline" style={st.flex} onPress={() => nav.push('AdminCallLog')} />
          </View>
          <FormSheet
            visible={adding}
            onClose={() => setAdding(false)}
            title="Log visitor"
            onSubmit={() => {
              if (!f.name.trim() || f.cnic.replace(/\D/g, '').length !== 13 || !f.purpose.trim()) {
                toast('Enter name, 13-digit CNIC and purpose');
                return;
              }
              setVisitors(l => [{ id: `v${Date.now()}`, ...f, in: nowTime() }, ...l]);
              logAudit('Visitor', `${f.name} in · meeting ${f.met}`);
              setAdding(false);
              setF({ name: '', cnic: '', purpose: '', met: 'Front Desk' });
            }}
          >
            <Field label="Visitor name" value={f.name} onChangeText={v => setF(p => ({ ...p, name: v }))} />
            <Field label="CNIC" value={f.cnic} keyboardType="numbers-and-punctuation" onChangeText={v => setF(p => ({ ...p, cnic: v }))} />
            <Field label="Purpose" value={f.purpose} onChangeText={v => setF(p => ({ ...p, purpose: v }))} />
            <PickerField label="Person to meet" value={f.met} options={['Front Desk', 'Principal', 'Accounts', 'Class teacher 5-A', 'HR', 'Store']} onChange={v => setF(p => ({ ...p, met: v }))} />
          </FormSheet>
        </>
      }
      renderItem={(v, last) => (
        <ListRow
          icon={UserPlus}
          title={v.name}
          subtitle={`${v.cnic} · ${v.purpose} · meets ${v.met}\nIn ${v.in}${v.out ? ` · Out ${v.out}` : ''}`}
          right={
            v.out ? (
              <Badge label="Left" tone="neutral" />
            ) : (
              <Button
                label="Mark out"
                icon={LogOut}
                variant="outline"
                style={st.smallBtn}
                onPress={guard(() => {
                  setVisitors(l => l.map(x => (x.id === v.id ? { ...x, out: nowTime() } : x)));
                  logAudit('Visitor', `${v.name} out`);
                })}
              />
            )
          }
          last={last}
        />
      )}
    />
  );
}

export function AdminGatePass(_: ScreenProps) {
  const { guard } = useGuard();
  const [pickup, setPickup] = usePickupPersons();
  const [passes, setPasses] = useGatePasses();
  const [studentLbl, setStudentLbl] = useState(studentLabel(PICK_STUDENTS[1]));
  const stu = PICK_STUDENTS.find(x => studentLabel(x) === studentLbl) ?? PICK_STUDENTS[0];
  const persons = pickup[stu.id] ?? [];
  const OTHER = 'Someone else (not on the list)';
  const [person, setPerson] = useState('');
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [np, setNp] = useState({ name: '', relation: '', cnic: '' });
  const chosen = persons.find(p => p.name === person);
  const notAuthorized = person === OTHER;

  return (
    <Screen
      title="Early pickup gate pass"
      subtitle="Students are released only to authorized pickup persons"
      footer={
        <Button
          label="Issue gate pass"
          icon={ShieldCheck}
          onPress={guard(() => {
            if (!person) {
              toast('Choose who is collecting the student');
              return;
            }
            if (notAuthorized || !chosen) {
              toast('Not authorized. The student cannot be released.');
              return;
            }
            if (!reason.trim()) {
              toast('Write the reason for early pickup');
              return;
            }
            setPasses(l => [{ id: `gp${Date.now()}`, studentId: stu.id, person: chosen.name, relation: chosen.relation, time: `Today ${nowTime()}`, reason }, ...l]);
            logAudit('Gate pass', `${stu.name} released to ${chosen.name} (${chosen.relation})`);
            toast(`Gate pass issued. Parent notified by SMS and app (demo).`);
            setPerson('');
            setReason('');
          })}
        />
      }
    >
      <ReadOnlyBanner />
      <PickerField
        label="Student"
        value={studentLbl}
        options={PICK_STUDENTS.map(studentLabel)}
        onChange={v => {
          setStudentLbl(v);
          setPerson('');
        }}
      />
      <Card title="Authorized pickup persons" action={{ label: 'Add', onPress: guard(() => setAdding(true)) }}>
        {persons.length === 0 ? <Text style={adminStyles.small}>No authorized persons. Parents add them in the parent app.</Text> : null}
        {persons.map((p, i) => (
          <ListRow
            key={`${p.name}${i}`}
            avatar={p.name}
            title={p.name}
            subtitle={`${p.relation} · ${p.cnic} · photo on file`}
            right={
              p.relation === 'Father' ? undefined : (
                <IconButton
                  icon={X}
                  onPress={guard(() => {
                    setPickup(m => ({ ...m, [stu.id]: persons.filter(x => x !== p) }));
                    logAudit('Pickup persons', `${p.name} removed for ${stu.name}`);
                    if (person === p.name) {
                      setPerson('');
                    }
                  })}
                />
              )
            }
            last={i === persons.length - 1}
          />
        ))}
      </Card>
      <PickerField label="Who is collecting?" value={person} options={[...persons.map(p => p.name), OTHER]} onChange={setPerson} placeholder="Choose a person" />
      {chosen ? (
        <Card style={st.verify}>
          <Placeholder icon={Camera} label="Photo on file" height={80} style={st.verifyPhoto} />
          <View style={st.flex}>
            <Text style={adminStyles.bold}>{chosen.name}</Text>
            <Text style={adminStyles.small}>{chosen.relation} · CNIC {chosen.cnic}</Text>
            <Badge label="Authorized" tone="success" style={st.alignStart} />
          </View>
        </Card>
      ) : null}
      {notAuthorized ? <InfoBanner tone="danger" text="This person is not authorized. Do not release the student. Call the parent." /> : null}
      <Field label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. Doctor appointment" />
      <Card title="Gate passes">
        {passes.map((g, i) => (
          <ListRow
            key={g.id}
            icon={DoorOpen}
            title={`${ADMIN_STUDENTS.find(x => x.id === g.studentId)?.name ?? g.studentId} → ${g.person}`}
            subtitle={`${g.relation} · ${g.time} · ${g.reason}`}
            last={i === passes.length - 1}
          />
        ))}
      </Card>
      <FormSheet
        visible={adding}
        onClose={() => setAdding(false)}
        title={`Add pickup person for ${stu.name}`}
        onSubmit={() => {
          if (!np.name.trim() || !np.relation.trim() || np.cnic.replace(/\D/g, '').length !== 13) {
            toast('Enter name, relation and 13-digit CNIC');
            return;
          }
          setPickup(m => ({ ...m, [stu.id]: [...persons, np] }));
          logAudit('Pickup persons', `${np.name} (${np.relation}) added for ${stu.name}`);
          setAdding(false);
          setNp({ name: '', relation: '', cnic: '' });
        }}
      >
        <Field label="Full name" value={np.name} onChangeText={v => setNp(p => ({ ...p, name: v }))} />
        <Field label="Relation" value={np.relation} onChangeText={v => setNp(p => ({ ...p, relation: v }))} />
        <Field label="CNIC" value={np.cnic} keyboardType="numbers-and-punctuation" onChangeText={v => setNp(p => ({ ...p, cnic: v }))} />
      </FormSheet>
    </Screen>
  );
}

export function AdminCallLog(_: ScreenProps) {
  const { guard } = useGuard();
  const [calls, setCalls] = useCalls();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ dir: 'Incoming' as 'Incoming' | 'Outgoing', name: '', number: '', purpose: '' });
  return (
    <ListScreen
      title="Call log"
      items={calls}
      keyOf={c => c.id}
      searchText={c => `${c.name} ${c.number} ${c.purpose}`}
      filters={[{ label: 'Direction', options: ['All', 'Incoming', 'Outgoing'], get: c => c.dir }]}
      onAdd={guard(() => setAdding(true))}
      addLabel="Log call"
      header={
        <FormSheet
          visible={adding}
          onClose={() => setAdding(false)}
          title="Log call"
          onSubmit={() => {
            if (!f.name.trim() || f.number.replace(/\D/g, '').length < 7 || !f.purpose.trim()) {
              toast('Enter name, number and purpose');
              return;
            }
            setCalls(l => [{ id: `c${Date.now()}`, ...f, time: nowTime() }, ...l]);
            logAudit('Call log', `${f.dir} call: ${f.name}`);
            setAdding(false);
            setF(p => ({ ...p, name: '', number: '', purpose: '' }));
          }}
        >
          <Segmented options={['Incoming', 'Outgoing']} value={f.dir} onChange={v => setF(p => ({ ...p, dir: v as 'Incoming' | 'Outgoing' }))} />
          <Field label="Name" value={f.name} onChangeText={v => setF(p => ({ ...p, name: v }))} />
          <Field label="Number" value={f.number} keyboardType="phone-pad" onChangeText={v => setF(p => ({ ...p, number: v }))} />
          <Field label="Purpose" value={f.purpose} onChangeText={v => setF(p => ({ ...p, purpose: v }))} />
        </FormSheet>
      }
      renderItem={(c, last) => (
        <ListRow
          icon={c.dir === 'Incoming' ? PhoneIncoming : PhoneOutgoing}
          title={`${c.name} · ${c.number}`}
          subtitle={`${c.dir} · ${c.time} · ${c.purpose}`}
          last={last}
        />
      )}
    />
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  alignStart: { alignSelf: 'flex-start', marginTop: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  due: { fontSize: 11, fontWeight: '800', color: colors.danger },
  smallBtn: { height: 36, paddingHorizontal: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 8 },
  req: { paddingVertical: 11 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  certTitle: { fontSize: 17, fontWeight: '900', color: colors.text, textAlign: 'center' },
  certSub: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 10 },
  certBody: { fontSize: 13.5, color: colors.text, lineHeight: 20, marginBottom: 10 },
  idCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.primary },
  idPhoto: { width: 60, borderRadius: radius.sm },
  verify: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  verifyPhoto: { width: 72 },
});
