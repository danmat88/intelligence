const { expo } = require('./app.json');

const isTruthy = (value) => value === '1' || value === 'true';
const isEasBuild = isTruthy(process.env.EAS_BUILD);
const useFastDevRuntime =
  isTruthy(process.env.EXPO_USE_FAST_DEV_RUNTIME) && !isEasBuild;

module.exports = ({ config }) => ({
  ...config,
  ...expo,
  runtimeVersion: useFastDevRuntime ? 'dev' : expo.runtimeVersion,
});
