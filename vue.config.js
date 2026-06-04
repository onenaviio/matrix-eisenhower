const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  // Приложение раздаётся с кастомного домена eisenhower.simpleworkapps.ru
  // из корня, поэтому базовый путь — '/'.
  publicPath: '/'
})
