const parentConfig = require('./karma.config')

module.exports = function(config) {
  parentConfig(config)
  config.set({
    basePath: '../',
    frameworks: ['mocha'],
    files: [
      'test/worker-adapter.js',
      {
        pattern: '{test,dist}/*.js',
        included: false
      },
      {
        pattern: 'node_modules/{mocha,chai,abortcontroller-polyfill/dist}/*.js',
        included: false,
        watched: false
      }
    ]
  })
}
