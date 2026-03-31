const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Tell Metro to recognize WebAssembly files
config.resolver.assetExts.push('wasm');

module.exports = config;