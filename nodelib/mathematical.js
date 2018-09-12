const { Duplex } = require('stream')
class Reduce extends Duplex {
    constructor(f, hasSeed, seed) {
        super({ readableObjectMode: true, writableObjectMode: true })
        this.f = f
        this.aac = seed
        if (!hasSeed) {
            this._write = (data, encoding, callback) => {
                delete this._write
                this.aac = data
                callback()
            }
        }
    }
    _read(size) {
        return null
    }
    _write(data, encoding, callback) {
        const f = this.f
        this.aac = f(this.aac, data)
        callback()
    }
    _final(callback) {
        this.push(this.aac)
        callback()
        this.push(null)
    }
}
exports.reduce = (f, ...args) => new Reduce(f, args.length == 1, ...args)