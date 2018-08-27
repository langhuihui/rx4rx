const {
    Sink
} = require('./common')
class Scan extends Sink {
    init(hasSeed, f, seed) {
        this.f = f
        this.aac = seed
        if (!hasSeed) {
            this.next = d => {
                delete this.next
                this.aac = d
            }
        }
    }
    next(data) {
        this.aac = this.f(this.aac, data)
    }
    complete(err) {
        if (!err) super.next(this.aac)
        super.complete(err)
    }
}
exports.scan = (...args) => source => sink => source(new Scan(sink, args.length == 2, ...args))
class MapSink extends Sink {
    init(f) {
        this.f = f
    }
    next(data) {
        this.sink.next(this.f(data))
    }
}
exports.map = f => source => sink => source(new MapSink(sink, f));