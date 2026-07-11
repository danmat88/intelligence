const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Bundled KaTeX/marked ride as assets. Their js/css files are renamed to
// .kjs/.kcss so Metro treats them as opaque assets (never as source code);
// woff2 (the KaTeX fonts) is not in Expo's default asset list either.
config.resolver.assetExts.push('kjs', 'kcss', 'woff2')

module.exports = config
