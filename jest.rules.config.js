// Rules tests run in plain Node against the Firestore EMULATOR — completely
// separate from the app's jest-expo suite (`npm test` never picks these up,
// they'd fail without an emulator). Entry point: `npm run test:rules`.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/rules-tests/**/*.test.js'],
  // Starting both Java emulators and loading two independent test rule sets is
  // slow on cold Windows CI; individual assertions are still fast.
  testTimeout: 60000,
}
