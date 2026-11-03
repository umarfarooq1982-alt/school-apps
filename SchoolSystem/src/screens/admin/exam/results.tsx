// Exam panel: admit cards, marks monitor, results and analysis (M-12).
// Marks come from /api/web/results per exam; locking and publishing use
// /api/web/exams/{id}/lock; corrections are saved with POST /api/web/marks.
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
import { NoApiBanner, QueryView } from '../../../components/states';
import { colors, radius } from '../../../theme';
import { ScreenProps } from '../../../navigation';
import { logAudit, requestApproval, useRules, useStaffRole } from '../../../data/admin';
import {
  ExamResults,
  LiveExam,
  ResultRow,
  StudentMarks,
  SubjectMax,
  compileResults,
  examWeight,
  gradeFor,
  rank,
  round1,
  subjectAverages,
  useExamTypes,
  useGrading,
  useLiveResults,
  usePassRules,
  useResultState,
} from '../../../data/admin-exam';
import { useLiveStudents } from '../../../data/admin-frontdesk';
import { useModuleList } from '../owner/shared';
import { invalidate, useApi } from '../../../api/hooks';
import { errorMessage } from '../../../api/client';
import { useApiSession } from '../../../api/session';
import { field, webA } from '../../../api/webA';
import { ReadOnlyBanner, isNum, statusTone, useGuard } from '../frontdesk/util';

const ANNUAL = 'Annual (weighted)';

const examState = (e?: LiveExam) => (e?.status === 'published' ? 'Published' : e?.locked ? 'Locked' : 'Open');

function useRole() {
  const [role] = useStaffRole();
  const [session] = useApiSession();
  return session?.user.role ?? role;
}

// ---------- Admit cards ----------
// Generated batches and hold releases are "admit-cards" module records.

type AdmitRec = { id: string; kind: 'batch' | 'release'; cls: string; studentId: string; reason: string; examId: string };

export function AdminAdmitCards(_: ScreenProps) {
  const { guard } = useGuard();
  const [rules] = useRules();
  const { list: all, q } = useLiveStudents();
  const { results } = useLiveResults();
  const exam = results[results.length - 1]?.exam;
  const [recs, setRecs, recsQ] = useModuleList<AdmitRec>(
    'admit-cards',
    r => ({
      id: String(r.id),
      kind: field(r, 'kind') === 'release' ? 'release' : 'batch',
      cls: field(r, 'cls'),
      studentId: field(r, 'studentId'),
      reason: field(r, 'reason'),
      examId: field(r, 'examId'),
    }),
    x => ({ title: x.kind === 'batch' ? `Admit cards ${x.cls}` : `Hold released ${x.studentId}`, status: x.kind, ...x }),
  );
  const classes = Array.from(new Set(all.filter(x => x.status === 'Active').map(x => x.className))).sort();
  const [clsSel, setCls] = useState('');
  const cls = clsSel || classes[0] || '';
  const [reasonEl, ask] = useReasonPrompt();
  const examId = exam?.id ?? '';
  const releases = new Map(recs.filter(r => r.kind === 'release' && r.examId === examId).map(r => [r.studentId, r.reason]));
  const generated = recs.some(r => r.kind === 'batch' && r.cls === cls && r.examId === examId);
  const students = all.filter(x => x.className === cls && x.status === 'Active');
  const held = (id: string, due: number) => rules.holdAdmitCardForDefaulters && due > 0 && !releases.has(id);
  const heldCount = students.filter(x => held(x.id, x.due)).length;
  return (
    <ListScreen
      title="Admit cards"
      subtitle={`${exam?.name ?? 'Next exam'} · generate, print, defaulter hold`}
      items={students}
      keyOf={x => x.id}
      searchText={x => `${x.name} ${x.gr}`}
      filters={[{ label: 'Status', options: ['All', 'Ready', 'Held'], get: x => (held(x.id, x.due) ? 'Held' : 'Ready') }]}
      empty="No active students in this class"
      header={
        <>
          <ReadOnlyBanner />
          {reasonEl}
          <QueryView q={q}>{() => null}</QueryView>
          {recsQ.error ? <InfoBanner tone="danger" text={recsQ.error} /> : null}
          <PickerField label="Class" value={cls} options={classes} onChange={setCls} />
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
              label={generated ? 'Regenerate' : 'Generate'}
              icon={IdCard}
              variant="outline"
              style={s.flex}
              onPress={guard(() => {
                if (!exam) {
                  toast('Add an exam in Exam setup first');
                  return;
                }
                if (!generated) {
                  setRecs(list => [...list, { id: `new-${Date.now()}`, kind: 'batch', cls, studentId: '', reason: `${students.length - heldCount} ready, ${heldCount} held`, examId }]);
                }
                logAudit('Admit cards', `Generated for ${cls}: ${students.length - heldCount} ready, ${heldCount} held`);
                toast(`${students.length - heldCount} admit cards generated`);
              })}
            />
            <Button
              label="Print"
              icon={Printer}
              style={s.flex}
              onPress={() =>
                generated
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
            subtitle={`${st.gr} · Roll ${st.roll || '—'}${st.due ? ` · ${formatRs(st.due)} due` : ''}${releases.get(st.id) ? ` · released: ${releases.get(st.id)}` : ''}`}
            right={
              h ? (
                <Button
                  label="Release"
                  variant="outline"
                  style={s.smallBtn}
                  onPress={guard(() =>
                    ask(`Release admit card for ${st.name}`, reason => {
                      setRecs(list => [...list, { id: `new-${Date.now()}`, kind: 'release', cls, studentId: st.id, reason, examId }]);
                      logAudit('Admit cards', `Hold released for ${st.name}: ${reason}`);
                    }),
                  )}
                />
              ) : (
                <Badge label={generated ? 'Ready' : 'Not generated'} tone={generated ? 'success' : 'neutral'} />
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
// Progress per class and subject = students with marks / active students.
// The server locks a whole exam; there is no per-subject lock or unlock.

type MarksTask = { id: string; cls: string; subject: string; teacher: string; entered: number; total: number };

export function AdminMarksMonitor(_: ScreenProps) {
  const { guard } = useGuard();
  const role = useRole();
  const [reasonEl, ask] = useReasonPrompt();
  const { results, students, q } = useLiveResults();
  const teaching = useApi('adm:teaching', webA.teaching);
  const [examSel, setExamSel] = useState('');
  const er = results.find(r => r.exam.name === examSel) ?? results[results.length - 1];
  const exam = er?.exam;
  const canUnlock = role === 'exam' || role === 'owner';
  const tasks: MarksTask[] = er
    ? Object.entries(er.byClass).flatMap(([cls, data]) => {
        const total = students.filter(x => x.className === cls && x.status === 'Active').length || data.students.length;
        return data.subjects.map(sub => {
          const t = (teaching.data ?? []).find(x => x.Class?.name === cls && x.Subject?.name === sub.name);
          return {
            id: `${cls}|${sub.name}`,
            cls,
            subject: sub.name,
            teacher: t?.Staff?.name ?? 'Not assigned',
            entered: data.students.filter(x => x.marks[sub.name] !== undefined).length,
            total,
          };
        });
      })
    : [];
  const entered = tasks.reduce((n, t) => n + t.entered, 0);
  const total = tasks.reduce((n, t) => n + t.total, 0);
  const statusOf = (t: MarksTask) => (exam?.locked ? 'Locked' : t.entered >= t.total ? 'Complete' : 'Incomplete');
  const classes = Array.from(new Set(tasks.map(t => t.cls)));

  const lockAll = async () => {
    if (!exam) {
      return;
    }
    const missing = tasks.filter(t => t.entered < t.total);
    if (missing.length) {
      toast(`${missing.length} subjects still have students without marks`);
      return;
    }
    try {
      await webA.lockExam(exam.id, false);
      logAudit('Marks', `Locked all marks for ${exam.name}`);
      invalidate('adm:results');
      invalidate('adm:mod:exams');
      toast('Marks locked');
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  return (
    <ListScreen
      title="Marks monitor"
      subtitle={`${exam?.name ?? 'No exam yet'} · entry progress by class and subject`}
      items={tasks}
      keyOf={t => t.id}
      searchText={t => `${t.teacher} ${t.subject} ${t.cls}`}
      filters={[
        { label: 'Class', options: ['All classes', ...classes], get: t => t.cls },
        { label: 'Status', options: ['All', 'Incomplete', 'Complete', 'Locked'], get: statusOf },
      ]}
      empty="No marks entered for this exam yet"
      header={
        <>
          <ReadOnlyBanner />
          {reasonEl}
          <QueryView q={q}>{() => null}</QueryView>
          {results.length ? (
            <PickerField label="Exam" value={exam?.name ?? ''} options={results.map(r => r.exam.name)} onChange={setExamSel} />
          ) : null}
          <Card>
            <Text style={adminStyles.bold}>Overall {total ? Math.round((entered / total) * 100) : 0}% entered</Text>
            <Text style={[adminStyles.small, s.mb]}>
              {entered} of {total} marks · {exam ? `${examState(exam)}${exam.end ? ` · exam ends ${exam.end}` : ''}` : '—'}
            </Text>
            <ProgressBar value={total ? (entered / total) * 100 : 0} />
          </Card>
          <InfoBanner text="Locked marks can only be unlocked by the Exam Controller, with a reason." />
          {exam ? (
            exam.locked ? (
              <Button
                label="Unlock marks"
                icon={LockOpen}
                variant="outline"
                onPress={guard(() => {
                  if (!canUnlock) {
                    toast('Only the Exam Controller can unlock marks');
                    return;
                  }
                  ask(`Unlock ${exam.name}`, reason => {
                    logAudit('Marks', `Unlock requested for ${exam.name}: ${reason}`);
                    toast('The server has no unlock yet. Request logged.');
                  });
                })}
              />
            ) : (
              <Button label="Lock all marks" icon={Lock} onPress={guard(lockAll)} />
            )
          ) : null}
          {exam?.locked ? <NoApiBanner what="Unlocking marks" /> : null}
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
              <ProgressBar value={t.total ? (t.entered / t.total) * 100 : 0} />
            </View>
            {st === 'Incomplete' ? (
              <Button label="Remind" icon={BellRing} variant="outline" style={s.smallBtn} onPress={() => toast(`Reminder sent to ${t.teacher} (demo)`)} />
            ) : null}
          </View>
        );
      }}
    />
  );
}

// ---------- Results ----------

type Compiled = { rows: ResultRow[]; marks: StudentMarks[]; subjects: SubjectMax[]; exam?: LiveExam; error?: string };

function useCompiled(results: ExamResults[], cls: string, term: string): Compiled {
  const [scale] = useGrading();
  const [rules] = usePassRules();
  const [types] = useExamTypes();
  return useMemo(() => {
    const compile = (r: ExamResults) => {
      const data = r.byClass[cls] ?? { students: [], subjects: [] };
      return { rows: compileResults(data.students, data.subjects, scale, rules), data };
    };
    try {
      if (term !== ANNUAL) {
        const r = results.find(x => x.exam.name === term) ?? results[results.length - 1];
        if (!r) {
          return { rows: [], marks: [], subjects: [] };
        }
        const { rows, data } = compile(r);
        return { rows, marks: data.students, subjects: data.subjects, exam: r.exam };
      }
      const per = results.map(compile);
      const weights = results.map(r => examWeight(r.exam.name, types));
      const useEqual = weights.every(w => w === 0);
      const ids = Array.from(new Set(per.flatMap(p => p.rows.map(x => x.id))));
      const annual = ids.map(id => {
        const base = per.map(p => p.rows.find(x => x.id === id)).find(Boolean) as ResultRow;
        let sum = 0;
        let wsum = 0;
        let pass = true;
        per.forEach((p, i) => {
          const row = p.rows.find(x => x.id === id);
          const w = useEqual ? 1 : weights[i];
          if (row && w) {
            sum += row.percentage * w;
            wsum += w;
            pass = pass && row.pass;
          }
        });
        const pct = wsum ? round1(sum / wsum) : 0;
        pass = pass && pct >= rules.overallPct;
        const band = gradeFor(pct, scale);
        return { ...base, percentage: pct, total: round1((pct / 100) * base.max), grade: pass ? band.grade : 'F', remark: pass ? band.remark : 'Fail in an exam', pass };
      });
      const cp = rank(annual, x => x.percentage);
      const sp = new Map<string, number>();
      Array.from(new Set(annual.map(x => x.section))).forEach(sec => {
        const list = annual.filter(x => x.section === sec);
        rank(list, x => x.percentage).forEach((p, i) => sp.set(list[i].id, p));
      });
      const rows = annual
        .map((r, i) => ({ ...r, classPosition: cp[i], sectionPosition: sp.get(r.id) ?? 0 }))
        .sort((a, b) => a.classPosition - b.classPosition);
      const last = per[per.length - 1]?.data;
      return { rows, marks: last?.students ?? [], subjects: last?.subjects ?? [] };
    } catch (e) {
      return { rows: [], marks: [], subjects: [], error: (e as Error).message };
    }
  }, [results, cls, term, scale, rules, types]);
}

export function AdminResults(_: ScreenProps) {
  const { guard } = useGuard();
  const role = useRole();
  const { results, classes, q } = useLiveResults();
  const academic = useApi('adm:academic', webA.academic);
  const [clsSel, setCls] = useState('');
  const cls = clsSel || classes[0] || '';
  const [termSel, setTerm] = useState('');
  const term = termSel || results[results.length - 1]?.exam.name || '';
  const [state, setState] = useResultState();
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { rows, marks, subjects, exam, error } = useCompiled(results, cls, term);
  const key = `${exam?.id ?? 'annual'}|${cls}`;
  const st = exam?.status === 'published' ? 'Published' : state[key] ?? 'Draft';
  const canPublish = role === 'principal' || role === 'owner';
  const passRate = Math.round((rows.filter(r => r.pass).length / Math.max(1, rows.length)) * 100);
  const avg = round1(rows.reduce((n, r) => n + r.percentage, 0) / Math.max(1, rows.length));
  const sel = rows.find(r => r.id === openId);
  const selMarks = marks.find(m => m.id === openId);

  const publish = async () => {
    if (!exam) {
      toast('Pick an exam (the annual view is not published by itself)');
      return;
    }
    if (!exam.locked) {
      toast('Lock the marks in the Marks monitor first');
      return;
    }
    if (canPublish) {
      try {
        await webA.lockExam(exam.id, true);
        logAudit('Results', `${exam.name} results published`);
        invalidate('adm:results');
        invalidate('adm:mod:exams');
        toast('Results published to the portals.');
      } catch (e) {
        toast(errorMessage(e));
      }
    } else {
      requestApproval({ type: 'Result', title: `Publish results · ${exam.name}`, sub: `${rows.length} students in ${cls} · pass ${passRate}%`, by: 'Exam' });
      setState(m => ({ ...m, [key]: 'In review' }));
      toast('Sent to the Principal for review');
    }
  };

  const saveCorrection = async () => {
    if (!sel || !exam) {
      return;
    }
    const subjectIds = new Map((academic.data?.subjects ?? []).map(x => [x.name, x.id]));
    const jobs: Array<{ name: string; marks: number; max: number }> = [];
    for (const sub of subjects) {
      const v = edit[sub.name];
      if (v === undefined) {
        continue;
      }
      if (v === 'Abs') {
        toast('Absent cannot be saved on the server yet. Enter 0 or leave it.');
        return;
      }
      if (!isNum(v) || Number(v) > sub.max) {
        toast(`Marks cannot exceed ${sub.max} in ${sub.name}`);
        return;
      }
      jobs.push({ name: sub.name, marks: Number(v), max: sub.max });
    }
    setSaving(true);
    try {
      for (const j of jobs) {
        const sid = subjectIds.get(j.name);
        await webA.saveMarks({
          examId: exam.id,
          subjectId: sid,
          subjectName: j.name,
          entries: [{ studentId: sel.id, marks: j.marks, max: j.max }],
        });
      }
      logAudit('Results', `Marks corrected for ${sel.name} (${exam.name})`);
      invalidate('adm:results');
      setEdit({});
      setOpenId(null);
      toast('Saved. Totals and positions recalculated.');
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ListScreen
      title="Results"
      subtitle={`${cls || '—'} · ${term || '—'}`}
      items={rows}
      keyOf={r => r.id}
      searchText={r => r.name}
      filters={[
        { label: 'Section', options: ['All sections', ...Array.from(new Set(rows.map(r => r.section))).sort()], get: r => r.section },
        { label: 'Result', options: ['All', 'Pass', 'Fail'], get: r => (r.pass ? 'Pass' : 'Fail') },
      ]}
      pageSize={12}
      empty="No marks for this class yet"
      header={
        <>
          <ReadOnlyBanner />
          <QueryView q={q}>{() => null}</QueryView>
          {error ? <InfoBanner tone="danger" text={error} /> : null}
          <PickerField label="Class" value={cls} options={classes} onChange={setCls} />
          <PickerField label="Exam" value={term} options={[...results.map(r => r.exam.name), ANNUAL]} onChange={setTerm} />
          <KpiGrid>
            <Kpi label="Students" value={String(rows.length)} />
            <Kpi label="Pass rate" value={`${passRate}%`} tone={passRate >= 80 ? 'success' : 'warn'} />
            <Kpi label="Class average" value={`${avg}%`} />
            <Kpi label="Status" value={exam ? st : 'Annual'} tone={st === 'Published' ? 'success' : 'warn'} />
          </KpiGrid>
          {exam && !exam.locked ? <InfoBanner tone="warn" text={`Provisional: marks for ${exam.name} are not locked in the Marks monitor.`} /> : null}
          <View style={adminStyles.row}>
            <Button
              label={st === 'Published' ? 'Published' : canPublish ? 'Publish' : st === 'In review' ? 'In review' : 'Send for review'}
              icon={Send}
              style={s.flex}
              disabled={!exam || st === 'Published' || (st === 'In review' && !canPublish)}
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
                {!exam ? (
                  <InfoBanner text="Annual result is the weighted average of the exams. Edit marks in an exam." />
                ) : (
                  subjects.map(sub => {
                    const cur = selMarks.marks[sub.name];
                    const v = edit[sub.name] ?? String(cur ?? '');
                    const bad = v !== '' && v !== 'Abs' && (!isNum(v) || Number(v) > sub.max);
                    return (
                      <View key={sub.name} style={adminStyles.row}>
                        <Text style={[adminStyles.bold, s.flex]}>{sub.name}</Text>
                        <TextInput
                          value={v}
                          editable={!exam.locked}
                          onChangeText={x => setEdit(p => ({ ...p, [sub.name]: x }))}
                          style={[s.markInput, bad && s.markBad]}
                          maxLength={4}
                        />
                        <Text style={adminStyles.small}>/ {sub.max}</Text>
                      </View>
                    );
                  })
                )}
                {exam && !exam.locked ? (
                  <Button label={saving ? 'Saving…' : 'Save correction'} onPress={guard(() => (saving ? undefined : saveCorrection()))} />
                ) : null}
                {exam?.locked ? <Text style={adminStyles.small}>Marks are locked for this exam.</Text> : null}
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
  const { results, classes, q } = useLiveResults();
  const [clsSel, setCls] = useState('');
  const cls = clsSel || classes[0] || '';
  const [termSel, setTerm] = useState('');
  const term = termSel || results[results.length - 1]?.exam.name || '';
  const { rows, marks, subjects } = useCompiled(results, cls, term);
  const avgs = subjectAverages(marks, subjects);
  // Compare the last two exams of the class.
  const last2 = results.filter(r => r.byClass[cls]).slice(-2);
  const [ea, eb] = last2.length === 2 ? last2 : [undefined, undefined];
  const subjA = ea ? subjectAverages(ea.byClass[cls].students, subjects) : [];
  const subjB = eb ? subjectAverages(eb.byClass[cls].students, subjects) : [];
  const toppers = rows.filter(r => r.classPosition <= 5);
  const fails = rows.filter(r => !r.pass);
  return (
    <Screen title="Result analysis" subtitle={`${cls || '—'} · ${term || '—'}`} refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q}>{() => null}</QueryView>
      <PickerField label="Class" value={cls} options={classes} onChange={setCls} />
      <PickerField label="Exam" value={term} options={results.map(r => r.exam.name)} onChange={setTerm} />
      <Card title="Subject averages">
        {avgs.length ? (
          <BarChart data={avgs.map(a => ({ label: a.name.slice(0, 4), value: a.avg, highlight: true }))} format={v => v.toFixed(0)} />
        ) : (
          <Text style={adminStyles.small}>No marks yet.</Text>
        )}
      </Card>
      <Card title="Toppers">
        {toppers.length === 0 ? <Text style={adminStyles.small}>No results yet.</Text> : null}
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
      <Card title="Exam comparison (average marks)">
        {ea && eb ? (
          <Table
            columns={['Subject', ea.exam.name, eb.exam.name, 'Change']}
            rows={subjects.map((sub, i) => [sub.name, subjA[i].avg, subjB[i].avg, `${subjB[i].avg - subjA[i].avg >= 0 ? '+' : ''}${round1(subjB[i].avg - subjA[i].avg)}`])}
          />
        ) : (
          <Text style={adminStyles.small}>Needs marks from two exams for this class.</Text>
        )}
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
