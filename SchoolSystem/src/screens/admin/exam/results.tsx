// Exam panel: admit cards, marks monitor, results and analysis (M-12).
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BellRing, FileText, IdCard, Lock, LockOpen, Printer, Send } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  InfoBanner,
  ListRow,
  ProgressBar,
  Screen,
  Segmented,
  formatRs,
  toast,
} from '../../../components/ui';
import { BottomSheet } from '../../../components/Tabs';
import {
  BarChart,
  Kpi,
  KpiGrid,
  ListScreen,
  PickerField,
  Table,
  adminStyles,
  useReasonPrompt,
} from '../../../components/admin';
import { colors, radius } from '../../../theme';
import { ScreenProps } from '../../../navigation';
import {
  ADMIN_STUDENTS,
  logAudit,
  requestApproval,
  roleInfo,
  useApprovals,
  useRules,
  useStaffRole,
} from '../../../data/admin';
import {
  MarkValue,
  RESULT_CLASSES,
  RESULT_SUBJECTS,
  ResultRow,
  StudentMarks,
  TERMS,
  annualPercentage,
  classMarks,
  compileResults,
  gradeFor,
  rank,
  round1,
  subjectAverages,
  useAdmitGenerated,
  useAdmitReleases,
  useExamTypes,
  useGrading,
  useMarksTasks,
  usePassRules,
  useResultState,
} from '../../../data/admin-exam';
import { ReadOnlyBanner, isNum, statusTone, useGuard } from '../frontdesk/util';
import { useShared } from '../../../store';

// Marks corrected on the Results screen, keyed 'class|term|studentId'.
const useOverrides = () => useShared<Record<string, Record<string, MarkValue>>>('exam.overrides', {});

// ---------- Admit cards ----------

const ADMIT_CLASSES = ['Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];

export function AdminAdmitCards(_: ScreenProps) {
  const { guard } = useGuard();
  const [rules] = useRules();
  const [releases, setReleases] = useAdmitReleases();
  const [generated, setGenerated] = useAdmitGenerated();
  const [cls, setCls] = useState('Class 5');
  const [reasonEl, ask] = useReasonPrompt();
  const students = ADMIN_STUDENTS.filter(s => s.className === cls && s.status === 'Active');
  const held = (id: string, due: number) => rules.holdAdmitCardForDefaulters && due > 0 && !releases[id];
  const heldCount = students.filter(s => held(s.id, s.due)).length;
  return (
    <ListScreen
      title="Admit cards"
      subtitle="Final term 2026 · generate, print, defaulter hold"
      items={students}
      keyOf={s => s.id}
      searchText={s => `${s.name} ${s.gr}`}
      filters={[{ label: 'Status', options: ['All', 'Ready', 'Held'], get: s => (held(s.id, s.due) ? 'Held' : 'Ready') }]}
      header={
        <>
          <ReadOnlyBanner />
          {reasonEl}
          <PickerField label="Class" value={cls} options={ADMIT_CLASSES} onChange={setCls} />
          <InfoBanner
            tone={rules.holdAdmitCardForDefaulters ? 'warn' : 'info'}
            text={
              rules.holdAdmitCardForDefaulters
                ? `Hold for fee defaulters is ON (School settings). ${heldCount} held in ${cls}.`
                : 'Hold for fee defaulters is OFF in School settings.'
            }
          />
          <View style={adminStyles.row}>
            <Button
              label={generated[cls] ? 'Regenerate' : 'Generate'}
              icon={IdCard}
              variant="outline"
              style={s.flex}
              onPress={guard(() => {
                setGenerated(m => ({ ...m, [cls]: true }));
                logAudit('Admit cards', `Generated for ${cls}: ${students.length - heldCount} ready, ${heldCount} held`);
                toast(`${students.length - heldCount} admit cards generated`);
              })}
            />
            <Button
              label="Print"
              icon={Printer}
              style={s.flex}
              onPress={() =>
                generated[cls]
                  ? toast(`${students.length - heldCount} admit cards sent to printer; ${heldCount} held (demo)`)
                  : toast('Generate the admit cards first')
              }
            />
          </View>
        </>
      }
      renderItem={(st, last) => {
        const h = held(st.id, st.due);
        return (
          <ListRow
            avatar={st.name}
            title={st.name}
            subtitle={`${st.gr} · Roll ${st.roll}${st.due ? ` · ${formatRs(st.due)} due` : ''}${releases[st.id] ? ` · released: ${releases[st.id]}` : ''}`}
            right={
              h ? (
                <Button
                  label="Release"
                  variant="outline"
                  style={s.smallBtn}
                  onPress={guard(() =>
                    ask(`Release admit card for ${st.name}`, reason => {
                      setReleases(m => ({ ...m, [st.id]: reason }));
                      logAudit('Admit cards', `Hold released for ${st.name}: ${reason}`);
                    }),
                  )}
                />
              ) : (
                <Badge label={generated[cls] ? 'Ready' : 'Not generated'} tone={generated[cls] ? 'success' : 'neutral'} />
              )
            }
            last={last}
          />
        );
      }}
    />
  );
}

// ---------- Marks monitor ----------

export function AdminMarksMonitor(_: ScreenProps) {
  const { guard } = useGuard();
  const [tasks, setTasks] = useMarksTasks();
  const [role] = useStaffRole();
  const [reasonEl, ask] = useReasonPrompt();
  const canUnlock = role === 'exam' || role === 'owner';
  const entered = tasks.reduce((n, t) => n + t.entered, 0);
  const total = tasks.reduce((n, t) => n + t.total, 0);
  const statusOf = (t: (typeof tasks)[number]) => (t.locked ? 'Locked' : t.entered === t.total ? 'Complete' : 'Incomplete');
  return (
    <ListScreen
      title="Marks monitor"
      subtitle="Entry progress by teacher and subject"
      items={tasks}
      keyOf={t => t.id}
      searchText={t => `${t.teacher} ${t.subject} ${t.cls}`}
      filters={[
        { label: 'Class', options: ['All classes', ...RESULT_CLASSES], get: t => t.cls },
        { label: 'Status', options: ['All', 'Incomplete', 'Complete', 'Locked'], get: statusOf },
      ]}
      header={
        <>
          <ReadOnlyBanner />
          {reasonEl}
          <Card>
            <Text style={adminStyles.bold}>Overall {Math.round((entered / total) * 100)}% entered</Text>
            <Text style={[adminStyles.small, s.mb]}>{entered} of {total} mark sheets · deadline 28 Oct</Text>
            <ProgressBar value={(entered / total) * 100} />
          </Card>
          <InfoBanner text="Locked marks can only be unlocked by the Exam Controller, with a reason." />
        </>
      }
      renderItem={(t, last) => {
        const st = statusOf(t);
        return (
          <View style={[s.task, !last && s.divider]}>
            <View style={adminStyles.row}>
              <View style={s.flex}>
                <Text style={adminStyles.bold}>{t.cls} · {t.subject}</Text>
                <Text style={adminStyles.small}>{t.teacher} · {t.entered}/{t.total} entered</Text>
              </View>
              <Badge label={st} tone={st === 'Locked' ? 'success' : st === 'Complete' ? 'info' : 'warn'} />
            </View>
            <View style={s.mv}>
              <ProgressBar value={(t.entered / t.total) * 100} />
            </View>
            <View style={adminStyles.row}>
              {st === 'Incomplete' ? (
                <Button label="Remind" icon={BellRing} variant="outline" style={[s.flex, s.smallBtn]} onPress={() => toast(`Reminder sent to ${t.teacher}`)} />
              ) : null}
              {t.locked ? (
                <Button
                  label="Unlock"
                  icon={LockOpen}
                  variant="outline"
                  style={[s.flex, s.smallBtn]}
                  onPress={guard(() => {
                    if (!canUnlock) {
                      toast('Only the Exam Controller can unlock marks');
                      return;
                    }
                    ask(`Unlock ${t.cls} ${t.subject}`, reason => {
                      setTasks(list => list.map(x => (x.id === t.id ? { ...x, locked: false } : x)));
                      logAudit('Marks', `Unlocked ${t.cls} ${t.subject}: ${reason}`);
                    });
                  })}
                />
              ) : (
                <Button
                  label="Lock"
                  icon={Lock}
                  style={[s.flex, s.smallBtn]}
                  onPress={guard(() => {
                    if (t.entered < t.total) {
                      toast(`${t.total - t.entered} students have no marks yet`);
                      return;
                    }
                    setTasks(list => list.map(x => (x.id === t.id ? { ...x, locked: true } : x)));
                    logAudit('Marks', `Locked ${t.cls} ${t.subject}`);
                  })}
                />
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

// ---------- Results ----------

function useCompiled(cls: string, term: string) {
  const [scale] = useGrading();
  const [rules] = usePassRules();
  const [types] = useExamTypes();
  const [overrides] = useOverrides();
  return useMemo(() => {
    const withOverrides = (t: string): StudentMarks[] =>
      classMarks(cls, t).map(st => ({ ...st, marks: { ...st.marks, ...(overrides[`${cls}|${t}|${st.id}`] ?? {}) } }));
    if (term !== 'Annual') {
      return { rows: compileResults(withOverrides(term), RESULT_SUBJECTS, scale, rules), marks: withOverrides(term) };
    }
    const per = TERMS.map(t => compileResults(withOverrides(t), RESULT_SUBJECTS, scale, rules));
    const base = per[0];
    const annual = base.map(r => {
      const pcts: Record<string, number> = {};
      TERMS.forEach((t, i) => {
        pcts[t] = per[i].find(x => x.id === r.id)?.percentage ?? 0;
      });
      const pct = annualPercentage(pcts, types);
      const pass = per.every(p => p.find(x => x.id === r.id)?.pass) && pct >= rules.overallPct;
      const band = gradeFor(pct, scale);
      return { ...r, percentage: pct, total: round1((pct / 100) * r.max), grade: pass ? band.grade : 'F', remark: pass ? band.remark : 'Fail in a term', pass };
    });
    const cp = rank(annual, x => x.percentage);
    const sections = Array.from(new Set(annual.map(x => x.section)));
    const sp = new Map<string, number>();
    sections.forEach(sec => {
      const list = annual.filter(x => x.section === sec);
      rank(list, x => x.percentage).forEach((p, i) => sp.set(list[i].id, p));
    });
    const rows: ResultRow[] = annual
      .map((r, i) => ({ ...r, classPosition: cp[i], sectionPosition: sp.get(r.id) ?? 0 }))
      .sort((a, b) => a.classPosition - b.classPosition);
    return { rows, marks: withOverrides(TERMS[1]) };
  }, [cls, term, scale, rules, types, overrides]);
}

export function AdminResults(_: ScreenProps) {
  const { guard } = useGuard();
  const [cls, setCls] = useState(RESULT_CLASSES[0]);
  const [term, setTerm] = useState('Mid-term');
  const [state, setState] = useResultState();
  const [approvals, setApprovals] = useApprovals();
  const [tasks] = useMarksTasks();
  const [role] = useStaffRole();
  const [overrides, setOverrides] = useOverrides();
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const { rows, marks } = useCompiled(cls, term);
  const key = `${cls}|${term}`;
  const approval = approvals.find(a => a.type === 'Result' && a.title.includes(`${cls} ${term}`));
  const st = approval?.status === 'Approved' ? 'Published' : state[key] ?? 'Draft';
  const unlocked = tasks.filter(t => t.cls === cls && !t.locked).length;
  const canPublish = role === 'principal' || role === 'owner';
  const passRate = Math.round((rows.filter(r => r.pass).length / Math.max(1, rows.length)) * 100);
  const avg = round1(rows.reduce((n, r) => n + r.percentage, 0) / Math.max(1, rows.length));
  const sel = rows.find(r => r.id === openId);
  const selMarks = marks.find(m => m.id === openId);

  const publish = () => {
    if (unlocked) {
      toast(`${unlocked} subjects in ${cls} are not locked yet`);
      return;
    }
    if (canPublish) {
      setState(m => ({ ...m, [key]: 'Published' }));
      if (approval && approval.status === 'Pending') {
        setApprovals(list => list.map(a => (a.id === approval.id ? { ...a, status: 'Approved' } : a)));
      }
      logAudit('Results', `${cls} ${term} results published by ${roleInfo(role).user}`);
      toast('Results published to the portals. Parents notified.');
    } else {
      requestApproval({ type: 'Result', title: `Publish results · ${cls} ${term}`, sub: `${rows.length} students · pass ${passRate}%`, by: `${roleInfo(role).user} (Exam)` });
      setState(m => ({ ...m, [key]: 'In review' }));
      toast('Sent to the Principal for review');
    }
  };

  return (
    <ListScreen
      title="Results"
      subtitle={`${cls} · ${term}`}
      items={rows}
      keyOf={r => r.id}
      searchText={r => r.name}
      filters={[
        { label: 'Section', options: ['All sections', 'A', 'B'], get: r => r.section },
        { label: 'Result', options: ['All', 'Pass', 'Fail'], get: r => (r.pass ? 'Pass' : 'Fail') },
      ]}
      pageSize={12}
      header={
        <>
          <ReadOnlyBanner />
          <PickerField label="Class" value={cls} options={RESULT_CLASSES} onChange={setCls} />
          <Segmented options={['Mid-term', 'Final term', 'Annual']} value={term} onChange={setTerm} />
          <KpiGrid>
            <Kpi label="Students" value={String(rows.length)} />
            <Kpi label="Pass rate" value={`${passRate}%`} tone={passRate >= 80 ? 'success' : 'warn'} />
            <Kpi label="Class average" value={`${avg}%`} />
            <Kpi label="Status" value={st} tone={st === 'Published' ? 'success' : 'warn'} />
          </KpiGrid>
          {unlocked ? <InfoBanner tone="warn" text={`Provisional: ${unlocked} subjects in ${cls} are not locked in the Marks monitor.`} /> : null}
          <View style={adminStyles.row}>
            <Button
              label={st === 'Published' ? 'Published' : canPublish ? 'Publish' : st === 'In review' ? 'In review' : 'Send for review'}
              icon={Send}
              style={s.flex}
              disabled={st === 'Published' || (st === 'In review' && !canPublish)}
              onPress={guard(publish)}
            />
            <Button
              label="Report cards"
              icon={FileText}
              variant="outline"
              style={s.flex}
              onPress={() =>
                st === 'Published'
                  ? toast(`${rows.length} report cards (PDF with QR) generated (demo)`)
                  : toast('Publish the results first')
              }
            />
          </View>
          <BottomSheet visible={!!sel} onClose={() => setOpenId(null)}>
            {sel && selMarks ? (
              <View style={s.gap}>
                <Text style={s.sheetTitle}>{sel.name}</Text>
                <Text style={adminStyles.small}>
                  {sel.percentage}% · {sel.grade} · position {sel.classPosition} in class, {sel.sectionPosition} in section {sel.section}
                </Text>
                {term === 'Annual' ? (
                  <InfoBanner text="Annual result is the weighted average of both terms. Edit marks in a term." />
                ) : (
                  RESULT_SUBJECTS.map(sub => {
                    const cur = selMarks.marks[sub.name];
                    const v = edit[sub.name] ?? String(cur ?? '');
                    const bad = v !== '' && v !== 'Abs' && (!isNum(v) || Number(v) > sub.max);
                    return (
                      <View key={sub.name} style={adminStyles.row}>
                        <Text style={[adminStyles.bold, s.flex]}>{sub.name}</Text>
                        <TextInput
                          value={v}
                          editable={st !== 'Published'}
                          onChangeText={x => setEdit(p => ({ ...p, [sub.name]: x }))}
                          style={[s.markInput, bad && s.markBad]}
                          maxLength={4}
                        />
                        <Text style={adminStyles.small}>/ {sub.max}</Text>
                      </View>
                    );
                  })
                )}
                {term !== 'Annual' && st !== 'Published' ? (
                  <Button
                    label="Save correction"
                    onPress={guard(() => {
                      const next: Record<string, MarkValue> = {};
                      for (const sub of RESULT_SUBJECTS) {
                        const v = edit[sub.name];
                        if (v === undefined) {
                          continue;
                        }
                        if (v === 'Abs') {
                          next[sub.name] = 'Abs';
                        } else if (!isNum(v) || Number(v) > sub.max) {
                          toast(`Marks cannot exceed ${sub.max} in ${sub.name}`);
                          return;
                        } else {
                          next[sub.name] = Number(v);
                        }
                      }
                      const k = `${cls}|${term}|${sel.id}`;
                      setOverrides(m => ({ ...m, [k]: { ...(m[k] ?? {}), ...next } }));
                      logAudit('Results', `Marks corrected for ${sel.name} (${cls} ${term})`);
                      setEdit({});
                      setOpenId(null);
                      toast('Saved. Totals and positions recalculated.');
                    })}
                  />
                ) : null}
                {overrides[`${cls}|${term}|${sel.id}`] ? <Text style={adminStyles.small}>Includes corrections made today.</Text> : null}
              </View>
            ) : null}
          </BottomSheet>
        </>
      }
      renderItem={(r, last) => (
        <ListRow
          title={`${r.classPosition}. ${r.name}`}
          subtitle={`Section ${r.section} · pos ${r.sectionPosition} · ${r.total}/${r.max} · ${r.percentage}% · ${r.remark}`}
          right={
            <View style={adminStyles.right}>
              <Badge label={r.grade} tone={r.pass ? 'success' : 'danger'} />
              <Badge label={r.pass ? 'Pass' : 'Fail'} tone={statusTone(r.pass ? 'Pass' : 'Fail')} />
            </View>
          }
          onPress={() => {
            setEdit({});
            setOpenId(r.id);
          }}
          last={last}
        />
      )}
    />
  );
}

// ---------- Result analysis ----------

export function AdminResultAnalysis(_: ScreenProps) {
  const [cls, setCls] = useState(RESULT_CLASSES[0]);
  const [term, setTerm] = useState('Mid-term');
  const { rows, marks } = useCompiled(cls, term);
  const avgs = subjectAverages(marks, RESULT_SUBJECTS);
  const mid = subjectAverages(classMarks(cls, TERMS[0]), RESULT_SUBJECTS);
  const fin = subjectAverages(classMarks(cls, TERMS[1]), RESULT_SUBJECTS);
  const toppers = rows.filter(r => r.classPosition <= 5);
  const fails = rows.filter(r => !r.pass);
  return (
    <Screen title="Result analysis" subtitle={`${cls} · ${term}`}>
      <PickerField label="Class" value={cls} options={RESULT_CLASSES} onChange={setCls} />
      <Segmented options={['Mid-term', 'Final term']} value={term} onChange={setTerm} />
      <Card title="Subject averages">
        <BarChart data={avgs.map(a => ({ label: a.name.slice(0, 4), value: a.avg, highlight: true }))} format={v => v.toFixed(0)} />
      </Card>
      <Card title="Toppers">
        {toppers.map((r, i) => (
          <ListRow key={r.id} title={`${r.classPosition}. ${r.name}`} subtitle={`Section ${r.section}`} right={<Text style={adminStyles.bold}>{r.percentage}%</Text>} last={i === toppers.length - 1} />
        ))}
      </Card>
      <Card title={`Fail list · ${fails.length}`}>
        {fails.length === 0 ? <Text style={adminStyles.small}>Everyone passed.</Text> : null}
        {fails.map((r, i) => (
          <ListRow key={r.id} title={r.name} subtitle={r.remark} right={<Badge label={`${r.percentage}%`} tone="danger" />} last={i === fails.length - 1} />
        ))}
      </Card>
      <Card title="Term comparison (average marks)">
        <Table
          columns={['Subject', 'Mid-term', 'Final term', 'Change']}
          rows={RESULT_SUBJECTS.map((sub, i) => [sub.name, mid[i].avg, fin[i].avg, `${fin[i].avg - mid[i].avg >= 0 ? '+' : ''}${round1(fin[i].avg - mid[i].avg)}`])}
        />
      </Card>
      <Button label="Open as report" variant="outline" icon={FileText} onPress={() => toast('Use Reports → Subject-wise result analysis for PDF / Excel')} />
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  mb: { marginBottom: 8 },
  mv: { marginVertical: 8 },
  smallBtn: { height: 36, paddingHorizontal: 10 },
  task: { paddingVertical: 11 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  markInput: {
    width: 64,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  markBad: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
});
