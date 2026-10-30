/**
 * Result compilation (M-12) checked against a manual calculation.
 */
import {
  GRADING_SEED,
  PASS_SEED,
  annualPercentage,
  classMarks,
  compileResults,
  gradeFor,
  rank,
  RESULT_SUBJECTS,
  subjectAverages,
  StudentMarks,
} from '../src/data/admin-exam';

const subjects = [
  { name: 'English', max: 100 },
  { name: 'Maths', max: 50 },
];

const students: StudentMarks[] = [
  { id: 'a', name: 'Ali', section: 'A', marks: { English: 90, Maths: 45 } }, // 135/150 = 90.0
  { id: 'b', name: 'Bina', section: 'B', marks: { English: 85, Maths: 50 } }, // 135/150 = 90.0 (tie)
  { id: 'c', name: 'Chand', section: 'A', marks: { English: 70, Maths: 30 } }, // 100/150 = 66.7
  { id: 'd', name: 'Dua', section: 'B', marks: { English: 80, Maths: 10 } }, // 90/150 = 60.0, Maths 20% < 33% -> fail
  { id: 'e', name: 'Eman', section: 'A', marks: { English: 'Abs', Maths: 40 } }, // 40/150 = 26.7 -> fail
];

describe('result compilation', () => {
  const rows = compileResults(students, subjects, GRADING_SEED, PASS_SEED);
  const by = (id: string) => rows.find(r => r.id === id)!;

  test('totals and percentage', () => {
    expect(by('a').total).toBe(135);
    expect(by('a').max).toBe(150);
    expect(by('a').percentage).toBe(90);
    expect(by('c').percentage).toBe(66.7);
    expect(by('e').total).toBe(40); // absent counts as 0
    expect(by('e').percentage).toBe(26.7);
  });

  test('grades follow the scale', () => {
    expect(by('a').grade).toBe('A+');
    expect(by('c').grade).toBe('C');
    expect(gradeFor(79.9, GRADING_SEED).grade).toBe('B');
    expect(gradeFor(80, GRADING_SEED).grade).toBe('A');
    expect(gradeFor(0, GRADING_SEED).grade).toBe('F');
  });

  test('pass and fail rules', () => {
    expect(by('a').pass).toBe(true);
    expect(by('d').pass).toBe(false); // failed one subject
    expect(by('d').failed).toEqual(['Maths']);
    expect(by('d').grade).toBe('F');
    expect(by('e').pass).toBe(false); // overall below 40%
  });

  test('positions share ties (1, 1, 3)', () => {
    expect(by('a').classPosition).toBe(1);
    expect(by('b').classPosition).toBe(1);
    expect(by('c').classPosition).toBe(3);
    expect(by('d').classPosition).toBe(4);
    expect(by('e').classPosition).toBe(5);
    // Section A: Ali 135, Chand 100, Eman 40
    expect(by('a').sectionPosition).toBe(1);
    expect(by('c').sectionPosition).toBe(2);
    expect(by('e').sectionPosition).toBe(3);
    // Section B: Bina 135, Dua 90
    expect(by('b').sectionPosition).toBe(1);
    expect(by('d').sectionPosition).toBe(2);
  });

  test('rows are sorted by position', () => {
    expect(rows.map(r => r.classPosition)).toEqual([1, 1, 3, 4, 5]);
  });

  test('marks above maximum are rejected', () => {
    expect(() =>
      compileResults(
        [{ id: 'x', name: 'X', section: 'A', marks: { English: 101, Maths: 10 } }],
        subjects,
        GRADING_SEED,
        PASS_SEED,
      ),
    ).toThrow();
  });

  test('annual percentage uses weightage', () => {
    const types = [
      { name: 'Mid-term', weight: 40, window: '' },
      { name: 'Final term', weight: 60, window: '' },
    ];
    // 0.4 * 80 + 0.6 * 90 = 86
    expect(annualPercentage({ 'Mid-term': 80, 'Final term': 90 }, types)).toBe(86);
  });

  test('rank helper and averages', () => {
    const r = rank([5, 9, 9, 1], x => x);
    expect(r).toEqual([3, 1, 1, 4]);
    const avg = subjectAverages(students, subjects);
    expect(avg[1]).toEqual({ name: 'Maths', avg: 35 });
  });

  test('dummy class compiles without errors and has ties and fails', () => {
    const res = compileResults(classMarks('Class 5', 'Mid-term'), RESULT_SUBJECTS, GRADING_SEED, PASS_SEED);
    expect(res.length).toBe(24);
    expect(res.some(x => !x.pass)).toBe(true);
    const positions = res.map(x => x.classPosition);
    expect(new Set(positions).size).toBeLessThan(positions.length);
  });
});
