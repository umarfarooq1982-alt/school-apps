/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

// Each Play Store app (Android flavor) opens straight on its own sign-in.
test.each([
  ['parent', 'Mobile number'],
  ['student', 'GR'],
  ['teacher', 'Password'],
  ['admin', 'School admin'],
] as const)('%s app opens its own sign-in', async (role, text) => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App appRole={role} />);
  });
  const shown = JSON.stringify(tree!.toJSON());
  expect(shown).not.toContain('Who is signing in?');
  expect(shown).toContain(text);
  await ReactTestRenderer.act(() => tree!.unmount());
});
