const path = require('path');

module.exports = {
  mode: 'production',
  entry: ['./src/polyfill.ts'],
  output: {
    filename: 'yetch-polyfill.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'Yetch',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
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
