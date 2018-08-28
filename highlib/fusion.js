const {
    Sink
} = require('./common')
class FusionSink extends Sink {
    compose(g, f) {
        return x => g(f(x))
    }
    and(a, b) {
        return x => a(x) && b(x)
    }
}
exports.FusionSink = FusionSink
class Filter extends FusionSink {
    init(f) {
        this.f = f
    }
    next(data) {
        const f = this.f
        f(data) && this.sink.next(data)
    }
    fusionMap(f) {
        return new MapSink(this, f)
    }
    fusionFilter(f) {
        this.f = this.and(f, this.f)
        return this
            // return new Filter(this.sink, this.and(f, this.f))
    }
}
exports.Filter = Filter

class FilterMapSink extends FusionSink {
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
        this.f = this.and(f, this.f)
        return this
            // return new Filter(this, f)
    }
    fusionMap(f) {
        return new MapSink(this, f)
    }
}
class MapSink extends FusionSink {
    init(f) {
        this.f = f
    }
    next(data) {
        const f = this.f
        this.sink.next(f(data))
    }
    fusionFilter(f) {
        return new FilterMapSink(this, f, this.f)
    }
    fusionMap(f) {
        this.f = this.compose(this.f, f)
        return this
            // return new MapSink(this.sink, this.compose(this.f, f))
    }
}
exports.MapSink = MapSink