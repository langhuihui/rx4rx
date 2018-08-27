const {
    Sink
} = require('./common')
class Filter extends Sink {
    init(f) {
        this.f = f
    }
    next(data) {
        if (this.f(data)) this.sink.next(data)
    }
}
exports.filter = f => source => sink => source(new Filter(sink, f))

class Ignore extends Sink {
    next() {}
}
exports.ignoreElements = source => sink => source(new Ignore(sink))

class Take extends Sink {
    init(count) {
        this.count = count
    }
    next(data) {
        this.sink.next(data)
        if (--this.count === 0) {
            this.defer()
            super.complete()
        }
    }
}
exports.take = count => source => sink => new Take(sink, count).subscribe(source)