/**
 * Server-backed admin screens that need route params (voucher and staff
 * detail by server id, counter opened for a voucher). Renders each against
 * the fake API and presses every button.
 */
import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Navigator, rootNav } from '../src/navigation';
import { screens } from '../src/screens';
import { clearShared, setShared } from '../src/store';

const { setFakeRole, calls } = require('./fixtures/server');

let errors: string[] = [];

beforeAll(() => {
  jest.useFakeTimers();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' ').slice(0, 400));
  });
  jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    errors.push(`warn: ${args.map(String).join(' ').slice(0, 400)}`);
  });
});

afterAll(() => {
  jest.useRealTimers();
});

function session() {
  setShared('session.role', 'admin');
  setShared('admin.role', 'owner');
  setShared('api.session', {
    token: 'test.token.value',
    exp: Math.floor(Date.now() / 1000) + 24 * 3600,
    user: { id: '9', name: 'Test', role: 'owner', campusIds: ['4'], staffId: null, mustChangePw: false, permissions: [] },
    schoolCode: 'SBS',
    campusId: '4',
    sessionId: '3',
    campuses: [{ id: '4', name: 'Main Campus' }],
    sessions: [{ id: '3', name: '2026-27', isCurrent: true, isClosed: false }],
  });
}

// Opens the screen with params by pushing it onto the navigator.
async function renderWith(name: string, params: Record<string, unknown>) {
  let root!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    root = ReactTestRenderer.create(<Navigator screens={screens} initial="Notifications" />);
  });
  await ReactTestRenderer.act(async () => {
    rootNav.current?.push(name, params);
  });
  return root;
}

const cases: Array<[string, Record<string, unknown>, string]> = [
  ['AdminVoucherDetail', { id: '61' }, '/api/web/print/vouchers/61'],
  ['AdminStaffProfile', { id: '9' }, '/api/web/staff/9'],
  ['AdminFeeCounter', { voucherNo: 'V-26-000003' }, '/api/web/fees/vouchers'],
];

test.each(cases)('%s with server params', async (name, params, path) => {
  errors = [];
  clearShared();
  setFakeRole('admin');
  session();
  calls.length = 0;
  const root = await renderWith(name, params);
  expect(calls.some((c: { path: string }) => c.path === path)).toBe(true);
  const count = root.root.findAll(n => typeof n.props.onPress === 'function').length;
  for (let i = 0; i < count; i++) {
    const node = root.root.findAll(n => typeof n.props.onPress === 'function')[i];
    if (!node) {
      break;
    }
    await ReactTestRenderer.act(async () => {
      node.props.onPress({ nativeEvent: {}, preventDefault() {} });
      jest.advanceTimersByTime(3000);
    });
  }
  await ReactTestRenderer.act(async () => {
    root.unmount();
  });
  expect(errors).toEqual([]);
});
