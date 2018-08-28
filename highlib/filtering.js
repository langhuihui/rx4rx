const {
    Sink,
    result
} = require('./common')
const {
    FusionSink,
    Filter
} = require('./fusion')

exports.filter = f => source => sink => source(sink instanceof FusionSink ? sink.fusionFilter(f) : new Filter(sink, f))

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

class TakeUntil extends Sink {
    init(defer) {
        this.defer = defer
    }
    complete(err) {
        this.defer()
        super.complete(err)
    }
}
class _TakeUntil extends Sink {
    next() {
        this.defer()
        this.defer2()
        this.complete()
    }
}
exports.takeUntil = sSrc => src => sink => {
    const _takeUntil = new _TakeUntil()
    const ssd = _takeUntil.subscribe(sSrc)
    const sd = _takeUntil.defer2 = src(new TakeUntil(sink, ssd))
    return () => (ssd(), sd())
}

class TakeWhile extends Sink {
    init(f) {
        this.f = f
    }
    next(data) {
        const f = this.f
        if (f(data)) {
            this.sink.next(data)
        } else {
            this.defer()
            this.complete()
        }
    }
}
exports.takeWhile = f => source => sink => new TakeWhile(sink, f).subscribe(source)

exports.takeLast = count => source => result((buffer, d) => {
    buffer.push(d)
    if (buffer.length > count) buffer.shift()
    return buffer
}, [], source)

class Skip extends Sink {
    init(count) {
        this.count = count
    }
    next(data) {
        if (--this.count === 0) {
            this.next = super.next
        }
    }
}
exports.skip = count => source => sink => source(new Skip(sink, count))

class SkipUntil extends Sink {
    init(defer) {
        this.defer = defer
    }
    next() {}
    complete(err) {
        this.defer()
        super.complete(err)
    }
}
class _SkipUntil extends Sink {
    next() {
        this.defer()
        delete this.sink.next
    }
    complete() {

    }
}

exports.skipUntil = sSrc => src => sink => {
    const ssd = new _SkipUntil().subscribe(sSrc)
    const sd = src(new SkipUntil(sink, ssd))
    return () => (ssd(), sd())
}

class SkipWhile extends Sink {
    init(f) {
        this.f = f
    }
    next(data) {
        const f = this.f
        if (!f(data)) {
            this.next = super.next
            this.next(data)
        }
    }
}
exports.skipWhile = f => source => sink => source(new SkipWhile(sink, f))