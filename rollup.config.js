const nodeResolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const typescript = require('rollup-plugin-typescript2')
const { uglify } = require('rollup-plugin-uglify')

const plugins = [
    nodeResolve(),
    commonjs({
      include: 'node_modules/**'
    }),
    typescript({
      tsconfig: 'src/tsconfig.json',
      tsconfigOverride: {
        compilerOptions: {
          module: 'es2015'
        }
      }
    }),
    uglify()
]

module.exports = [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/yetch.js',
      format: 'umd',
      name: 'Yetch'
    },
    plugins
  },
  {
    input: 'src/polyfill.ts',
    output: {
      file: 'dist/yetch-polyfill.js',
      format: 'umd',
      name: 'Yetch'
    },
    plugins
  }
]
