const { Transform, PassThrough } = require('stream')

class Scan extends Transform {
    constructor(f, hasSeed, seed) {
        super({ readableObjectMode: true, writableObjectMode: true })
        this.f = f
        this.aac = seed
        if (!hasSeed) {
            this._transform = (data, encoding, callback) => {
                delete this._transform
                this.aac = data
                callback()
            }
        }
    }
    _transform(data, encoding, callback) {
        const f = this.f
        this.aac = f(this.aac, data)
        this.push(this.aac)
        callback()
    }
    _flush(callback) {
        this.push(null)
        callback()
    }
}
exports.scan = (f, ...args) => new Scan(f, args.length == 1, ...args)

class Map extends Transform {
    constructor(f) {
        super({ readableObjectMode: true, writableObjectMode: true })
        this.f = f
    }
    _transform(data, encoding, callback) {
        const f = this.f
        this.push(f(data));
        callback();
    }
    _flush(callback) {
        callback()
    }
}
exports.map = f => new Map(f)