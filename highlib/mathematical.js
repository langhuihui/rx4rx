const { Sink, result } = require('./common')
exports.count = f => source => result((i, d) => f(d) ? i++ : i, 0, source)
exports.max = source => result((max, d) => !(d < max) ? d : max, NaN, source)
exports.min = source => result((min, d) => !(d > min) ? d : min, NaN, source)
class Reduce extends Sink {
    constructor(args) {
        super()
        const [reducer, seed] = args
        const hasSeed = args.length === 2
        this.aac = seed
        this.reducer = reducer
        if (!hasSeed) {
            this.next = d => {
                delete this.next
                this.sink.next(this.aac = d)
            }
        }
    }
    next(data) {
        this._next(this.aac = this.reducer(this.aac, data))
    }
    complete(err) {
        if (!err) this._next(this.aac)
        this._complete(err)
    }
}
exports.reduce = (...args) => source => sink => source(sink.warp(Reduce, args))