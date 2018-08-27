const {
    Sink,
    result
} = require('./common')
exports.count = f => source => result((i, d) => f(d) ? i++ : i, 0, source)
exports.max = source => result((max, d) => !(d < max) ? d : max, NaN, source)
exports.min = source => result((min, d) => !(d > min) ? d : min, NaN, source)
class Reduce extends Sink {
    init(hasSeed, f, seed) {
        this.f = f
        this.aac = seed
        if (!hasSeed) {
            this.next = d => {
                delete this.next
                super.next(this.aac = d)
            }
        }
    }
    next(data) {
        this.sink.next(this.aac = this.f(this.aac, data))
    }
    complete(err) {
        if (!err) super.next(this.aac)
        super.complete(err)
    }
}
exports.reduce = (...args) => source => sink => source(new Reduce(sink, args.length === 2, ...args))