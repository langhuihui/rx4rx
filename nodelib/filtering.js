const { Transform } = require('stream')

class Filter extends Transform {
    constructor(f) {
        super({ readableObjectMode: true, writableObjectMode: true })
        this.f = f
    }
    _transform(data, encoding, callback) {
        const f = this.f
        if (f(data)) {
            this.push(data);
        }
        callback();
    }
    _flush(callback) {
        callback()
    }
}
exports.filter = f => new Filter(f)