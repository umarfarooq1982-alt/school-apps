/**
 * Smoke test: renders every screen for its role, then presses every button
 * on it once. Fails on any thrown error or React console.error.
 */
import React from 'react';
import { Alert, Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { Navigator } from '../src/navigation';
import { screens } from '../src/screens';
import { authScreens } from '../src/screens/auth';
import { commonScreens } from '../src/screens/common';
import { sharedScreens } from '../src/screens/shared';
import { parentScreens } from '../src/screens/parent';
import { studentScreens } from '../src/screens/student';
import { teacherScreens } from '../src/screens/teacher';
import { adminScreens } from '../src/screens/admin';
import { clearShared, Role, setShared } from '../src/store';

type Case = { role: Role | null; name: string; lang: 'en' | 'ur' };

const cases: Case[] = [];
const add = (map: object, roles: Array<Role | null>) =>
  Object.keys(map).forEach(name =>
    roles.forEach(role =>
      (['en', 'ur'] as const).forEach(lang => cases.push({ role, name, lang })),
    ),
  );
add(authScreens, [null]);
add(commonScreens, ['parent', 'student', 'teacher', 'admin']);
add(sharedScreens, ['parent', 'student']);
add(parentScreens, ['parent']);
add(studentScreens, ['student']);
add(teacherScreens, ['teacher']);
// Admin screens run in English only (the admin panel is not translated).
Object.keys(adminScreens).forEach(name => cases.push({ role: 'admin', name, lang: 'en' }));

let errors: string[] = [];

beforeAll(() => {
  jest.useFakeTimers();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
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

declare const __dirname: string;

test('every route used by the app is registered', () => {
  const fs = require('fs');
  const path = require('path');
  const files: string[] = [];
  const walk = (d: string) =>
    fs.readdirSync(d).forEach((f: string) => {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) {
        walk(p);
      } else if (/\.tsx?$/.test(f)) {
        files.push(p);
      }
    });
  walk(path.join(__dirname, '..', 'src'));
  const source = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const used = new Set<string>();
  const navCall =
    /(?:nav\.(?:push|replace|reset|popTo)|(?<![.\w])open)\(\s*'([A-Z][A-Za-z]+)'/g;
  for (const m of source.matchAll(navCall)) {
    used.add(m[1]);
  }
  for (const m of source.matchAll(/route: '([A-Z][A-Za-z]+)'/g)) {
    used.add(m[1]);
  }
  const missing = [...used].filter(name => !screens[name]);
  expect(missing).toEqual([]);
  expect(used.size).toBeGreaterThan(150);
});

test.each(cases)('$name as $role ($lang)', async ({ role, name, lang }) => {
  errors = [];
  clearShared();
  setShared('session.role', role);
  setShared('session.lang', lang);

  let root!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    root = ReactTestRenderer.create(
      <Navigator screens={screens} initial={name} />,
    );
  });

  // Press every pressable once. Each press re-queries the tree because
  // earlier presses may navigate or change what is on screen.
  const count = root.root.findAll(
    n => typeof n.props.onPress === 'function',
  ).length;
  for (let i = 0; i < count; i++) {
    const nodes = root.root.findAll(
      n => typeof n.props.onPress === 'function',
    );
    const node = nodes[i];
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
