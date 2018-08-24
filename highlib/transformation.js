const { Sink } = require('./common')
class Scan extends Sink {
    constructor(args) {
        super()
        const [reducer, seed] = args
        const hasSeed = args.length === 2
        this.aac = seed
        this.reducer = reducer
        if (!hasSeed) {
            this.next = d => {
                delete this.next
                this.aac = d
            }
        }
    }
    next(data) {
        this.aac = this.reducer(this.aac, data)
    }
    complete(err) {
        if (!err) this.sink.next(this.aac)
        this.sink.complete(err)
    }
}
exports.scan = (...args) => source => sink => source(sink.warp(Scan, args))
class MapSink extends Sink {
    constructor(f) {
        super()
        this.f = f
    }
    next(data) {
        this._next(this.f(data))
    }
}
exports.map = f => source => sink => source(sink.warp(MapSink, f));