const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  // На GitHub Pages приложение раздаётся из подкаталога /matrix-eisenhower/,
  // поэтому в продакшен-сборке базовый путь должен указывать на него.
  publicPath: process.env.NODE_ENV === 'production' ? '/matrix-eisenhower/' : '/'
})
