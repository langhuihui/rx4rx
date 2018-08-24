const { Sink } = require('./common')
class Filter extends Sink {
    constructor(f) {
        super()
        this.f = f
    }
    next(data) {
        if (this.f(data)) this._next(data)
    }
}
exports.filter = f => source => sink => source(sink.warp(Filter, f))

class Ignore extends Sink {
    next() {}
}
exports.ignoreElements = source => sink => source(sink.warp(Ignore))

class Take extends Sink {
    constructor(count) {
        super()
        this.count = count
    }
    next(data) {
        this._next(data)
        if (--this.count === 0) {
            this.defer()
            this._complete()
        }
    }
}
exports.take = count => source => sink => source(sink.warp(Take, count))