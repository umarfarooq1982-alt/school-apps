module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  testTimeout: 60000,
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/fixtures/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-svg|lucide-react-native)/)',
  ],
};
