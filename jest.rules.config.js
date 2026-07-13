// Rules tests run in plain Node against the Firestore EMULATOR — completely
// separate from the app's jest-expo suite (`npm test` never picks these up,
// they'd fail without an emulator). Entry point: `npm run test:rules`.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/rules-tests/**/*.test.js'],
  testTimeout: 20000,
}
