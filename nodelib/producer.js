const { Readable } = require('stream')
class FromArray extends Readable {
    constructor(array) {
        super({ objectMode: true })
        this.array = array
        this.pos = 0
        this.size = array.length
    }
    _read(size) {
        if (this.pos < this.size) {
            this.push(this.array[this.pos++])
        } else
            this.push(null)
    }
}
exports.fromArray = array => new FromArray(array)

class Interval extends Readable {
    constructor(period) {
        super({ objectMode: true })
        this.period = period
        this.i = 0
    }
    _read(size) {
        setTimeout(() => this.push(this.i++), this.period)
    }
}
exports.interval = period => new Interval(period)