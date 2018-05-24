const path = require('path');

const config = {
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'ts-loader'
    }]
  }
};

module.exports = [
  Object.assign({}, config, {
    entry: ['./src/index.ts'],
    output: {
      filename: 'yetch.js',
      path: path.resolve(__dirname, 'dist'),
      library: 'Yetch',
      libraryTarget: 'umd',
      globalObject: 'this'
    }
  }),
  Object.assign({}, config, {
    entry: ['./src/polyfill.ts'],
    output: {
      filename: 'yetch-polyfill.js',
      path: path.resolve(__dirname, 'dist'),
      library: 'Yetch',
      libraryTarget: 'umd',
      globalObject: 'this'
    }
  })
];
