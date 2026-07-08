module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets plugin must be listed LAST (powers reanimated 4,
    // which react-native-keyboard-controller uses for native keyboard tracking).
    plugins: ['react-native-worklets/plugin'],
  }
}
