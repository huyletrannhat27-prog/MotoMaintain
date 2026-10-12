const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')
const config = getDefaultConfig(__dirname)
// The two apps install independently. Only share pure domain source, not web/node_modules.
config.watchFolders = [path.resolve(__dirname, '../shared')]
module.exports = config
