import buble from 'rollup-plugin-buble'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
    entry: 'index.js',
    dest: 'dist/rxlite.js',
    format: 'umd',
    moduleName: 'rxlite',
    sourceMap: true,
    plugins: [
        buble(),
        nodeResolve({
            jsnext: true
        })
    ]
}