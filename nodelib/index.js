const { Writable, pipeline } = require('stream')
const { noop } = require('./common')
class Subscriber extends Writable {
    constructor(n, e, c) {
        super({ objectMode: true })
        this.n = n
        this.e = e
        this.c = c
    }
    _write(chunk, encoding, callback) {
        this.n(chunk)
        callback(null)
    }
    _final(callback) {
        this.c()
        callback()
    }
}

exports.subscribe = (n, e = noop, c = noop) => new Subscriber(n, e, c)
exports.pipe = pipeline || ((first, ...cbs) => cbs.reduce((aac, c) => aac.pipe(c), first));
Object.assign(exports, require('./producer'), require('./filtering'), require('./mathematical'), require('./transformation'))