const {
    Sink
} = require('./common')

function compose(g, f) {
    return x => g(f(x))
}

function and(a, b) {
    return x => a(x) && b(x)
}
class Filter extends Sink {
    init(f) {
        this.f = f
    }
    next(data) {
        const f = this.f
        f(data) && this.sink.next(data)
    }
    fusionFilter(f) {
        this.f = and(f, this.f)
        return this
        // return new Filter(this.sink, this.and(f, this.f))
    }
}
exports.Filter = Filter

class FilterMapSink extends Sink {
    init(f, m) {
        this.f = f
        this.m = m
    }
    next(data) {
        const f = this.f
        const m = this.m
        f(data) && this.sink.next(m(data))
    }
    fusionFilter(f) {
        this.f = and(f, this.f)
        return this
        // return new Filter(this, f)
    }
}
class MapSink extends Sink {
    init(f) {
        this.f = f
    }
    next(data) {
        const f = this.f
        this.sink.next(f(data))
    }
    fusionFilter(f) {
        this.disposePass = false
        this.dispose(false)
        return new FilterMapSink(this.sink, f, this.f)
    }
    fusionMap(f) {
        this.f = compose(this.f, f)
        return this
        // return new MapSink(this.sink, this.compose(this.f, f))
    }
}
exports.MapSink = MapSink