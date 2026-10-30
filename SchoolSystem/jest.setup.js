/* eslint-disable no-undef */
// Native-backed libraries replaced with plain components for Jest.
jest.mock('react-native-svg', () => {
  const R = require('react');
  const make = (name) => {
    const C = (props) =>
      R.createElement(name, null, props.children);
    return C;
  };
  return new Proxy(
    { __esModule: true },
    {
      get: (target, prop) =>
        prop in target ? target[prop] : make(`Svg${String(prop)}`),
    },
  );
});

jest.mock('lucide-react-native', () => {
  const R = require('react');
  const Icon = () => R.createElement('Icon');
  return new Proxy(
    { __esModule: true },
    {
      get: (target, prop) =>
        prop in target ? target[prop] : Icon,
    },
  );
});

jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaInsets: () => insets,
    SafeAreaView: ({ children }) =>
      R.createElement('View', null, children),
  };
});

