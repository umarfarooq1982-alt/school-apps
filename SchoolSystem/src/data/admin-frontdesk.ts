// Shared state for the Front Desk / Admission panel, built from server data
// (SOW 3.2 C: M-02, S-03, S-05, S-10).
import { getShared, setShared, useShared } from '../store';
import { AdminStudent } from './admin';
import { useApi } from '../api/hooks';
import { field, webA, WebStudent } from '../api/webA';
import { useModuleList } from '../screens/admin/owner/shared';
import { getSession } from '../api/session';

// ---------- Live classes (names <-> ids) ----------

export function useLiveClasses() {
  const q = useApi('adm:academic', webA.academic);
  const classes = q.data?.classes ?? [];
  const names = classes.map(c => c.name);
  return {
    names,
    classes,
    sectionsOf: (name: string) => classes.find(c => c.name === name)?.sections.map(x => x.name) ?? [],
    idOf: (name: string) => classes.find(c => c.name === name)?.id,
    nameOf: (id: unknown) => classes.find(c => String(c.id) === String(id))?.name ?? (id ? `Class #${id}` : '—'),
  };
}

// ---------- Inquiries (S-03) ----------

export type InquirySource = 'Walk-in' | 'Call' | 'Website' | 'Facebook';
export type InquiryStatus = 'New' | 'Contacted' | 'Visited' | 'Registered' | 'Lost';

export type Inquiry = {
  id: string;
  child: string;
  parent: string;
  mobile: string;
  cls: string;
  source: InquirySource;
  status: InquiryStatus;
  followUp: string;
  assigned: string;
  notes: string;
};

// Staff a follow-up can be assigned to: the school's own users from the server.
export function useFrontStaff(): string[] {
  const q = useApi('adm:users', webA.users);
  const names = (q.data ?? []).filter(u => !u.disabled && u.role !== 'parent' && u.role !== 'student').map(u => u.name);
  const me = getSession()?.user.name;
  return names.length ? names : me ? [me] : [];
}
export const FOLLOW_UP_DATES = ['Today', 'Tomorrow', 'In 2 days', 'In 3 days', 'Next week'];
export const SOURCES: InquirySource[] = ['Walk-in', 'Call', 'Website', 'Facebook'];
export const INQUIRY_STATUSES: InquiryStatus[] = ['New', 'Contacted', 'Visited', 'Registered', 'Lost'];

// /api/web/modules/inquiries (Inquiry model). The server has no follow-up or
// assigned-staff fields, so those two stay in this app.
export function useInquiries() {
  const cls = useLiveClasses();
  const [extra, setExtra] = useShared<Record<string, { followUp?: string; assigned?: string }>>('fd.inqExtra', {});
  const [list, setList, q] = useModuleList<Inquiry>(
    'inquiries',
    r => {
      const id = String(r.id);
      const source = field(r, 'source').toLowerCase();
      const status = field(r, 'status').toLowerCase();
      return {
        id,
        child: field(r, 'child_name', 'childName'),
        parent: field(r, 'parent_name', 'parentName'),
        mobile: field(r, 'mobile'),
        cls: cls.nameOf(r.class_id ?? r.classId),
        source: SOURCES.find(x => x.toLowerCase() === source) ?? 'Walk-in',
        status: INQUIRY_STATUSES.find(x => x.toLowerCase() === status) ?? 'New',
        followUp: extra[id]?.followUp ?? 'Tomorrow',
        assigned: extra[id]?.assigned ?? '',
        notes: field(r, 'notes'),
      };
    },
    // The update replaces every field, so the full record is always sent.
    i => ({
      childName: i.child,
      parentName: i.parent || null,
      mobile: i.mobile,
      classId: cls.idOf(i.cls) ? Number(cls.idOf(i.cls)) : null,
      source: i.source,
      status: i.status.toLowerCase(),
      notes: i.notes || null,
    }),
  );
  const set = (fn: Inquiry[] | ((l: Inquiry[]) => Inquiry[])) => {
    const next = typeof fn === 'function' ? fn(list) : fn;
    next.forEach(i => {
      const old = list.find(o => o.id === i.id);
      if (!old || old.followUp !== i.followUp || old.assigned !== i.assigned) {
        setExtra(m => ({ ...m, [i.id]: { followUp: i.followUp, assigned: i.assigned } }));
      }
    });
    setList(next);
  };
  return [list, set, q] as const;
}

// ---------- Registrations and entry test (M-02) ----------

export type Decision = 'Pending' | 'Selected' | 'Waiting' | 'Rejected';

export type Registration = {
  id: string;
  regNo: string;
  name: string;
  gender: 'M' | 'F';
  dob: string;
  bForm: string;
  father: string;
  fatherCnic: string;
  mobile: string;
  prevSchool: string;
  cls: string;
  classId: string;
  campus: string;
  feePaid: boolean;
  feeAmount: number;
  principal: string;
  status: string;
  testId?: string;
  marks?: Record<string, number>;
  interview?: string;
  decision: Decision;
  admission?: Admission;
};

export type Admission = {
  section: string;
  gr?: string;
  feePaid: boolean;
  logins?: { parent: string; student: string; parentPassword?: string; studentPassword?: string };
  final: boolean;
};

export const TEST_SUBJECTS = ['English', 'Mathematics', 'Urdu'];
export const TEST_MAX = 50;

const DECISION_FROM: Record<string, Decision> = { selected: 'Selected', accepted: 'Selected', waiting: 'Waiting', rejected: 'Rejected' };

// What the server does not return (previous school, campus, interview
// remarks, section choice, fee mark) is kept per registration in this app.
type RegExtra = Partial<Pick<Registration, 'prevSchool' | 'campus' | 'interview' | 'marks' | 'testId' | 'admission'>> & { feePaid?: boolean };

export function useRegistrations() {
  const q = useApi('adm:registrations', webA.registrations);
  const [extra, setExtra] = useShared<Record<string, RegExtra>>('fd.regExtra', {});
  const list: Registration[] = (q.data ?? []).map(r => {
    const x = extra[r.regNo] ?? {};
    const admitted = r.status === 'admitted';
    return {
      id: String(r.id),
      regNo: r.regNo,
      name: r.name,
      gender: r.gender === 'F' || r.gender === 'Female' ? 'F' : 'M',
      dob: r.dob ?? '',
      bForm: r.bform ?? '',
      father: r.fatherName ?? '',
      fatherCnic: r.fatherCnic ?? '',
      mobile: r.mobile ?? '',
      prevSchool: x.prevSchool ?? '',
      cls: r.className ?? '',
      classId: String(r.classId ?? ''),
      campus: x.campus ?? '',
      feePaid: x.feePaid ?? !!r.feePaid,
      feeAmount: Number(r.feeAmount) || 0,
      principal: r.principal ?? 'pending',
      status: r.status ?? 'registered',
      testId: x.testId,
      marks: x.marks,
      interview: x.interview,
      decision: DECISION_FROM[String(r.decision).toLowerCase()] ?? 'Pending',
      admission: admitted
        ? { section: x.admission?.section ?? '', gr: x.admission?.gr, feePaid: true, logins: x.admission?.logins, final: true }
        : x.admission,
    };
  });
  const patchLocal = (regNo: string, p: RegExtra) => setExtra(m => ({ ...m, [regNo]: { ...(m[regNo] ?? {}), ...p } }));
  return { list, q, patchLocal };
}

export type TestSchedule = {
  id: string;
  name: string;
  cls: string;
  classId: string;
  date: string;
  time: string;
  room: string;
  subjects: Array<{ name: string; max: number }>;
  published: boolean;
};

// /api/web/entry-tests. Publishing results has no endpoint yet, so the
// published flag stays in this app.
export function useTests() {
  const cls = useLiveClasses();
  const q = useApi('adm:entry-tests', webA.entryTests);
  const [published, setPublished] = useShared<Record<string, boolean>>('fd.testsPublished', {});
  const list: TestSchedule[] = (q.data ?? []).map(t => {
    const ids = Array.isArray(t.class_ids) ? t.class_ids : [];
    return {
      id: String(t.id),
      name: t.name,
      cls: ids.length ? cls.nameOf(ids[0]) : t.name,
      classId: ids.length ? String(ids[0]) : '',
      date: t.test_date,
      time: t.test_time ?? '',
      room: t.room ?? '',
      subjects: Array.isArray(t.subjects) && t.subjects.length ? t.subjects : TEST_SUBJECTS.map(name => ({ name, max: TEST_MAX })),
      published: !!published[String(t.id)],
    };
  });
  return { list, q, setPublished };
}

export const testTotal = (r: Pick<Registration, 'marks'>) =>
  r.marks ? Object.values(r.marks).reduce((s, v) => s + (Number(v) || 0), 0) : 0;

// Merit list: highest total first; equal totals share a rank (1, 1, 3).
export function meritList<T extends Pick<Registration, 'marks' | 'name'>>(regs: T[]) {
  const withMarks = regs.filter(r => r.marks && Object.keys(r.marks).length);
  const sorted = [...withMarks].sort((a, b) => testTotal(b) - testTotal(a) || a.name.localeCompare(b.name));
  return sorted.map(r => ({
    reg: r,
    total: testTotal(r),
    rank: 1 + sorted.filter(o => testTotal(o) > testTotal(r)).length,
  }));
}

// ---------- GR numbers: unique per campus, never reused (M-02) ----------


// Duplicate check on B-Form number and father CNIC (M-02 key rule).
// Same B-Form = same child. Same father CNIC with the same child name is also
// a duplicate; same CNIC with another name is a sibling and is only reported.
export function findDuplicate(
  regs: Registration[],
  name: string,
  bForm: string,
  fatherCnic: string,
): { error?: string; siblings: AdminStudent[] } {
  const digits = (x: string) => x.replace(/\D/g, '');
  const b = digits(bForm);
  const c = digits(fatherCnic);
  const n = name.trim().toLowerCase();
  const siblings = c ? siblingsOf(fatherCnic) : [];
  const student = liveStudents().find(
    s => (b && digits(s.bForm) === b) || (c && digits(s.fatherCnic) === c && s.name.toLowerCase() === n),
  );
  if (student) {
    return { error: `Duplicate: already enrolled as ${student.name} (${student.gr})`, siblings };
  }
  const reg = regs.find(
    r => (b && digits(r.bForm) === b) || (c && digits(r.fatherCnic) === c && r.name.toLowerCase() === n),
  );
  if (reg) {
    return { error: `Duplicate: already registered as ${reg.regNo} (${reg.name})`, siblings };
  }
  return { siblings };
}

export function siblingsOf(fatherCnic: string, exceptId?: string): AdminStudent[] {
  const c = fatherCnic.replace(/\D/g, '');
  return liveStudents().filter(s => s.id !== exceptId && s.fatherCnic.replace(/\D/g, '') === c);
}

// ---------- Student status history ----------

export type StatusChange = { when: string; from: string; to: string; reason: string; by: string };
export const useStudentStatus = () =>
  useShared<Record<string, { status: AdminStudent['status']; history: StatusChange[] }>>('fd.studentStatus', {});

export const useStudentDocs = () =>
  useShared<Record<string, string[]>>('fd.studentDocs', {});

// ---------- Certificates (S-05) ----------

export type CertType = 'Leaving' | 'Character' | 'Bonafide' | 'Other';
export const CERT_TYPES: CertType[] = ['Leaving', 'Character', 'Bonafide', 'Other'];

export type CertRequest = {
  id: string;
  studentId: string;
  type: CertType;
  purpose: string;
  status: 'Requested' | 'Issued' | 'Rejected' | 'Waiting approval';
  from: 'Parent portal' | 'Front desk';
  serial?: string;
};



export type IssueLog = { serial: string; studentId: string; type: CertType; by: string; when: string };

let certSeq = 0;
export function nextSerial(type: CertType) {
  certSeq += 1;
  const p = { Leaving: 'LC', Character: 'CC', Bonafide: 'BC', Other: 'OC' }[type];
  return `${p}-${String(new Date().getFullYear()).slice(2)}-${String(certSeq).padStart(4, '0')}`;
}

// ---------- Visitors, gate pass, call log (S-10) ----------

export type Visitor = { id: string; name: string; cnic: string; purpose: string; met: string; in: string; out?: string };


export type PickupPerson = { name: string; relation: string; cnic: string };



export type GatePass = { id: string; studentId: string; person: string; relation: string; time: string; reason: string };

export type Call = { id: string; dir: 'Incoming' | 'Outgoing'; name: string; number: string; purpose: string; time: string };

export const nowTime = () => {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`;
};


// ---------- Live students from the school server ----------
// /api/web/students (and /fees/defaulters for dues) mapped to the AdminStudent
// shape the Front Desk screens use. The helpers above read this list.

const STATUS_FROM: Record<string, AdminStudent['status']> = {
  active: 'Active',
  provisional: 'Active',
  struck_off: 'Struck off',
  left: 'Left',
  transferred: 'Transferred',
};
export const STATUS_TO: Record<AdminStudent['status'], string> = {
  Active: 'active',
  'Struck off': 'struck_off',
  Left: 'left',
  Transferred: 'transferred',
};

export function toAdminStudent(s: WebStudent, due = 0): AdminStudent {
  return {
    id: s.id,
    name: s.name,
    gender: s.gender === 'Female' || s.gender === 'F' ? 'F' : 'M',
    gr: s.grNo,
    className: s.className,
    section: s.section,
    roll: Number(s.rollNo) || 0,
    campus: getSession()?.campusId && getSession()?.campusId !== 'all' ? String(getSession()?.campusId) : 'all',
    father: s.fatherName ?? '',
    fatherCnic: s.fatherCnic ?? '',
    mobile: s.mobile ?? '',
    bForm: s.bform ?? '',
    status: STATUS_FROM[s.status] ?? 'Active',
    due,
    attendance: 0,
    result: 0,
    admitted: s.admissionDate ?? '',
  };
}

export function liveStudents(): AdminStudent[] {
  return getShared<AdminStudent[]>('fd.liveStudents', []);
}

// Loads every student of the selected campus (all statuses) once per screen.
export function useLiveStudents() {
  const q = useApi('adm:students:fd', async () => {
    const [list, dues] = await Promise.all([webA.students({ pageSize: 500 }), webA.defaulters().catch(() => [])]);
    const dueMap = new Map(dues.map(d => [String(d.id), Number(d.amount) || 0]));
    const out = list.items.map(s => toAdminStudent(s, dueMap.get(s.id) ?? 0));
    setShared('fd.liveStudents', out);
    return out;
  });
  return { list: q.data ?? [], q };
}

// ---------- Server-backed lists (module records) ----------
// Certificates, issue log, visitors, pickup persons, gate passes and calls are
// /api/web/modules/{key} records, so the parent app and web panel see them too.

const CERT_FROM: Record<string, CertType> = { leaving: 'Leaving', character: 'Character', bonafide: 'Bonafide' };
const certStatus = (s: string): CertRequest['status'] =>
  s === 'issued' ? 'Issued' : s === 'rejected' ? 'Rejected' : s === 'waiting' ? 'Waiting approval' : 'Requested';

export const useCertRequests = () =>
  useModuleList<CertRequest>(
    'certreqs',
    r => ({
      id: String(r.id),
      studentId: field(r, 'studentId'),
      type: CERT_FROM[field(r, 'kind', 'title').toLowerCase()] ?? 'Other',
      purpose: field(r, 'purpose', 'note') || '—',
      status: certStatus(field(r, 'status')),
      from: field(r, 'from') === 'Front desk' ? 'Front desk' : 'Parent portal',
      serial: field(r, 'serial') || undefined,
    }),
    x => ({
      title: x.type.toLowerCase(),
      kind: x.type.toLowerCase(),
      studentId: Number(x.studentId) || x.studentId,
      purpose: x.purpose,
      from: x.from,
      serial: x.serial,
      status: x.status === 'Issued' ? 'issued' : x.status === 'Rejected' ? 'rejected' : x.status === 'Waiting approval' ? 'waiting' : 'requested',
    }),
  );

export const useIssueLog = () =>
  useModuleList<IssueLog & { id: string }>(
    'cert-issues',
    r => ({ id: String(r.id), serial: field(r, 'serial', 'title'), studentId: field(r, 'studentId'), type: (field(r, 'type') as CertType) || 'Other', by: field(r, 'by'), when: field(r, 'when', 'recordDate', 'record_date') }),
    x => ({ title: x.serial, status: 'issued', serial: x.serial, studentId: x.studentId, type: x.type, by: x.by, when: x.when }),
  );

// The server's visitor row has name, purpose and person to meet; CNIC and the
// out time are kept in this app until the server stores them.
export function useVisitors() {
  const [extra, setExtra] = useShared<Record<string, { cnic?: string; out?: string }>>('fd.visitorExtra', {});
  const [list, setList, q] = useModuleList<Visitor>(
    'visitors',
    r => {
      const id = String(r.id);
      const at = field(r, 'in_at');
      return {
        id,
        name: field(r, 'name'),
        cnic: extra[id]?.cnic ?? field(r, 'cnic') ?? '',
        purpose: field(r, 'purpose'),
        met: field(r, 'person_to_meet', 'personToMeet', 'met'),
        in: at ? new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : field(r, 'in'),
        out: extra[id]?.out ?? (field(r, 'out_at') || undefined),
      };
    },
    v => ({ name: v.name, purpose: v.purpose, personToMeet: v.met, cnic: v.cnic }),
  );
  const set = (fn: (l: Visitor[]) => Visitor[]) => {
    const next = fn(list);
    const changedOnlyExtra = next.length === list.length && next.every((v, i) => v.id === list[i].id && v.name === list[i].name && v.purpose === list[i].purpose);
    next.forEach(v => {
      if (v.out || v.cnic) {
        setExtra(m => ({ ...m, [v.id]: { cnic: v.cnic, out: v.out } }));
      }
    });
    if (!changedOnlyExtra) {
      // New visitors keep their CNIC under the temporary id until reload.
      setList(next);
    }
  };
  return [list, set, q] as const;
}

// Pickup persons: "pickup" records with studentId (managed by parents in the
// parent app and checked here).
export function usePickupPersons() {
  const [rows, setRows, q] = useModuleList<PickupPerson & { id: string; studentId: string }>(
    'pickup',
    r => ({ id: String(r.id), studentId: field(r, 'studentId'), name: field(r, 'name', 'title'), relation: field(r, 'relation', 'status'), cnic: field(r, 'cnic', 'notes') }),
    p => ({ title: p.name, status: p.relation, name: p.name, relation: p.relation, cnic: p.cnic, notes: p.cnic, studentId: Number(p.studentId) || p.studentId }),
  );
  const map: Record<string, PickupPerson[]> = {};
  rows.forEach(r => {
    (map[r.studentId] ??= []).push({ name: r.name, relation: r.relation, cnic: r.cnic });
  });
  const set = (fn: (m: Record<string, PickupPerson[]>) => Record<string, PickupPerson[]>) => {
    const next = fn(map);
    const out: Array<PickupPerson & { id: string; studentId: string }> = [];
    Object.entries(next).forEach(([studentId, persons]) =>
      persons.forEach(p => {
        const existing = rows.find(r => r.studentId === studentId && r.name === p.name && r.cnic === p.cnic);
        out.push(existing ?? { ...p, id: `new-${studentId}-${p.cnic}-${out.length}`, studentId });
      }),
    );
    // Removed persons are deleted on the server.
    rows.filter(r => !out.some(o => o.id === r.id)).forEach(r => {
      webA.deleteModule('pickup', r.id).catch(() => undefined);
    });
    setRows(out);
  };
  return [map, set, q] as const;
}

export const useGatePasses = () =>
  useModuleList<GatePass>(
    'gatepass',
    r => ({ id: String(r.id), studentId: field(r, 'studentId'), person: field(r, 'person', 'title'), relation: field(r, 'relation'), time: field(r, 'time', 'recordDate'), reason: field(r, 'reason') }),
    g => ({ title: g.person, status: 'released', studentId: g.studentId, person: g.person, relation: g.relation, time: g.time, reason: g.reason }),
  );

export const useCalls = () =>
  useModuleList<Call>(
    'calls',
    r => ({ id: String(r.id), dir: field(r, 'dir') === 'Outgoing' ? 'Outgoing' : 'Incoming', name: field(r, 'name', 'title'), number: field(r, 'number'), purpose: field(r, 'purpose'), time: field(r, 'time') }),
    c => ({ title: c.name, status: c.dir.toLowerCase(), dir: c.dir, name: c.name, number: c.number, purpose: c.purpose, time: c.time }),
  );
